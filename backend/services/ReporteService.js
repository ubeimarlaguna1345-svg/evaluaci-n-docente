import { pool, initSchema } from '../config/db.js'

export class ReporteService {
  async obtenerHealth() {
    const result = await pool.query(
      'SELECT current_database() AS database, current_user AS db_user, version() AS pg_version'
    )
    return {
      database: result.rows[0].database,
      user: result.rows[0].db_user,
    }
  }

  async obtenerBootstrap() {
    await initSchema()

    const usersRes = await pool.query(
      "SELECT id, nombre AS name, correo AS email, contrasena AS password, rol AS role, activo AS active, COALESCE(sede, 'Sede Facatativá') AS sede, COALESCE(carrera, 'Ingeniería de Sistemas y Computación') AS carrera FROM usuarios WHERE activo = TRUE AND LOWER(correo) != 'admin@ucundinamarca.edu.co' ORDER BY rol, nombre"
    )

    const cadisRes = await pool.query(
      'SELECT id, codigo, nombre, semestre, COALESCE(tipo, \'CADI\') AS tipo, COALESCE(es_articulador, false) AS "esArticulador", docente_id AS "docenteId" FROM cadis ORDER BY semestre, nombre'
    )

    const formsRes = await pool.query(
      `SELECT id, tipo AS kind, titulo AS title, descripcion AS description, periodo AS period, cadi_id AS "cadiId", fecha_inicio AS start, fecha_cierre AS end 
       FROM formularios 
       WHERE id NOT IN (SELECT id FROM formularios_eliminados) 
       ORDER BY fecha_inicio DESC`
    )

    const questionsRes = await pool.query(
      "SELECT id, formulario_id, enunciado AS text, tipo_respuesta AS type, dimension, COALESCE(bloque, 'docente') AS bloque, obligatoria AS required, orden FROM preguntas ORDER BY orden"
    )

    const optionsRes = await pool.query(
      'SELECT pregunta_id, texto, orden FROM opciones ORDER BY orden'
    )

    const optionsByQ = {}
    for (const opt of optionsRes.rows) {
      if (!optionsByQ[opt.pregunta_id]) optionsByQ[opt.pregunta_id] = []
      optionsByQ[opt.pregunta_id].push(opt.texto)
    }

    const questionsByForm = {}
    for (const q of questionsRes.rows) {
      const qObj = {
        id: q.id,
        text: q.text,
        type: q.type,
        dimension: q.dimension || 'General',
        bloque: q.bloque || 'docente',
        required: Boolean(q.required),
        options: optionsByQ[q.id] || [],
      }
      if (q.formulario_id) {
        if (!questionsByForm[q.formulario_id]) questionsByForm[q.formulario_id] = []
        questionsByForm[q.formulario_id].push(qObj)
      }
    }

    const forms = formsRes.rows.map((f) => {
      let title = f.title || ''
      if (f.id === 'form-eval-2026' || title.toLowerCase().includes('evaluación docente 2026-i') || title.toLowerCase().includes('evaluacion docente 2026-i')) {
        title = 'Instrumento de Evaluación Integral del Desempeño Docente y Mediaciones MEDIT'
      } else if (f.id === 'form-auto-2026' || title.toLowerCase().includes('autoevaluación docente 2026-i') || title.toLowerCase().includes('autoevaluacion docente 2026-i')) {
        title = 'Instrumento de Autoevaluación Integral del Desempeño Docente MEDIT'
      }
      const rawEnd = f.end ? new Date(f.end).toISOString().slice(0, 16) : ''
      const isExpired = !rawEnd || new Date(rawEnd).getTime() < Date.now()
      const end = isExpired ? '2026-11-30T23:59' : rawEnd
      const start = f.start ? new Date(f.start).toISOString().slice(0, 16) : '2026-08-01T00:00'
      return {
        ...f,
        title,
        start,
        end,
        questions: questionsByForm[f.id] || [],
      }
    })

    const responsesRes = await pool.query(
      'SELECT id, formulario_id AS "formId", usuario_id AS "userId", docente_id AS "docenteId", docente_id AS "teacherId", observacion AS observation, fecha AS date FROM respuestas_formulario'
    )

    const detailsRes = await pool.query(
      'SELECT respuesta_id, pregunta_id, valor FROM detalle_respuesta'
    )

    const answersByResp = {}
    for (const d of detailsRes.rows) {
      if (!answersByResp[d.respuesta_id]) answersByResp[d.respuesta_id] = {}
      answersByResp[d.respuesta_id][d.pregunta_id] = d.valor
    }

    const formResponses = responsesRes.rows.map((r) => ({
      ...r,
      date: r.date ? new Date(r.date).toISOString() : '',
      answers: answersByResp[r.id] || {},
    }))

    let feedbacks = []
    let feedbackResponses = []
    try {
      const feedbacksRes = await pool.query(
        `SELECT r.id, r.docente_id AS "docenteId", r.docente_id AS "teacherId", r.curso AS course, 
                r.fecha_inicio AS start, r.fecha_cierre AS end, r.creada_en AS "createdAt",
                p.enunciado AS text, p.tipo_respuesta AS type, p.dimension
         FROM retroalimentaciones r
         JOIN preguntas p ON p.id = r.pregunta_id
         ORDER BY r.creada_en DESC`
      )

      feedbacks = feedbacksRes.rows.map((f) => ({
        id: f.id,
        docenteId: f.docenteId,
        teacherId: f.docenteId,
        course: f.course,
        start: f.start ? new Date(f.start).toISOString().slice(0, 16) : '',
        end: f.end ? new Date(f.end).toISOString().slice(0, 16) : '',
        createdAt: f.createdAt ? new Date(f.createdAt).toISOString() : '',
        question: {
          text: f.text,
          type: f.type,
          dimension: f.dimension,
          options: optionsByQ[f.id] || [],
        },
      }))

      const feedbackRespRes = await pool.query(
        'SELECT id, retroalimentacion_id AS "feedbackId", estudiante_id AS "studentId", valor AS value, fecha AS date FROM respuestas_retroalimentacion'
      )
      feedbackResponses = feedbackRespRes.rows
    } catch (fbErr) {
      console.warn('Aviso no crítico al consultar retroalimentaciones:', fbErr.message)
    }

    return {
      users: usersRes.rows,
      cadis: cadisRes.rows,
      forms,
      formResponses: formResponses.filter((r) => !r.id.startsWith('rf-')),
      feedbacks,
      feedbackResponses,
    }
  }

  obtenerFallbackBootstrap() {
    const defaultForms = [
      {
        id: 'form-eval-2026',
        kind: 'evaluacion',
        title: 'Instrumento de Evaluación Integral del Desempeño Docente y Mediaciones MEDIT',
        description: 'Evaluación integral de desempeño docente bajo dimensiones MEDIT.',
        period: '2026-I',
        start: '2026-08-01T00:00:00Z',
        end: '2026-11-30T23:59:59Z',
        questions: [
          { id: 'q-claridad', text: 'Claridad conceptual y explicación de temas complejos', type: 'escala', dimension: 'Claridad conceptual y explicación', required: true, bloque: 'docente', options: [] },
          { id: 'q-doc-expositiva', text: 'Estrategias de exposición y resolución estructurada de dudas', type: 'escala', dimension: 'Claridad conceptual y explicación', required: true, bloque: 'docente', options: [] },
          { id: 'q-organizacion', text: 'Cumplimiento de planeación didáctica y socialización de rúbricas', type: 'escala', dimension: 'Organización y cumplimiento del programa', required: true, bloque: 'docente', options: [] },
          { id: 'q-retro', text: 'Oportunidad y pertinencia en la retroalimentación de tareas y evaluaciones', type: 'escala', dimension: 'Retroalimentación y entrega oportuna de notas', required: true, bloque: 'docente', options: [] },
          { id: 'q-doc-comunicacion', text: 'Disposición al diálogo respetuoso, motivación y escucha activa', type: 'escala', dimension: 'Retroalimentación y entrega oportuna de notas', required: true, bloque: 'docente', options: [] },
          { id: 'q-tic', text: 'Integración efectiva de recursos digitales y aulas virtuales', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
          { id: 'q-metodologia', text: 'Articulación de contenidos con contextos reales de ingeniería y proyectos formativos', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
          { id: 'q-medit-autonomo', text: 'Fomento del pensamiento crítico, aprendizaje autónomo y trabajo colaborativo', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
          { id: 'q-medit-cadi', text: 'Promoción de la articulación transdisciplinar a través del CADI / CAI', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
          { id: 'q-medit-etica', text: 'Inculcación de valores éticos, responsabilidad social y ambiental', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
          { id: 'q-campus', text: 'Calidad de las aulas, laboratorios y espacios físicos de aprendizaje', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
          { id: 'q-redes', text: 'Disponibilidad y velocidad de la conectividad institucional a internet', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
          { id: 'q-infraestructura', text: 'Disponibilidad, dotación, iluminación y condiciones físicas adecuadas en las aulas y laboratorios de la sede.', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
          { id: 'q-conectividad', text: 'Calidad y estabilidad de la conectividad a internet, redes institucionales y soporte técnico provisto.', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
          { id: 'q-facultad-comunicacion', text: '¿La facultad y sus dependencias comunicaron oportunamente el calendario académico, trámites y lineamientos institucionales?', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
        ],
      },
      {
        id: 'form-auto-2026',
        kind: 'autoevaluacion',
        title: 'Instrumento de Autoevaluación Integral del Desempeño Docente MEDIT',
        description: 'Instrumento de reflexión pedagógica y autoevaluación docente.',
        period: '2026-I',
        start: '2026-08-01T00:00:00Z',
        end: '2026-11-30T23:59:59Z',
        questions: [
          { id: 'q-auto-1', text: 'Autoevaluación: Claridad didáctica y mediación pedagógica', type: 'escala', dimension: 'Claridad conceptual y explicación', required: true, bloque: 'docente', options: [] },
          { id: 'q-auto-2', text: 'Autoevaluación: Cumplimiento de planeación y rúbricas', type: 'escala', dimension: 'Organización y cumplimiento del programa', required: true, bloque: 'docente', options: [] },
          { id: 'q-auto-3', text: 'Autoevaluación: Oportunidad en retroalimentación formativa', type: 'escala', dimension: 'Retroalimentación y entrega oportuna de notas', required: true, bloque: 'docente', options: [] },
          { id: 'q-auto-4', text: 'Autoevaluación: Innovación en prácticas y proyectos MEDIT', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
        ],
      },
    ]

    const defaultCadis = [
      { id: 'cadi-calc-101', codigo: 'MAT101', nombre: 'Cálculo Diferencial', semestre: 1, tipo: 'CADI', esArticulador: false, docenteId: 'doc-salazar' },
      { id: 'cai-lect-101', codigo: 'CAI101', nombre: 'Lectura Crítica y Competencias Comunicativas', semestre: 1, tipo: 'CAI', esArticulador: false, docenteId: 'doc-prieto' },
      { id: 'cai-etica-201', codigo: 'CAI201', nombre: 'Ética y Ciudadanía', semestre: 2, tipo: 'CAI', esArticulador: false, docenteId: 'doc-cifuentes' },
      { id: 'cadi-prog-301', codigo: 'SIS301', nombre: 'Programación II', semestre: 3, tipo: 'CADI', esArticulador: true, docenteId: 'doc-navarro' },
      { id: 'cadi-elec-302', codigo: 'ELC301', nombre: 'Electrónica Básica', semestre: 3, tipo: 'CADI', esArticulador: false, docenteId: 'doc-mendoza' },
    ]

    const defaultUsers = [
      { id: 'doc-salazar', name: 'Diana Salazar', email: 'salazar@ucundinamarca.edu.co', role: 'docente', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'doc-prieto', name: 'Gabriel Prieto', email: 'prieto@ucundinamarca.edu.co', role: 'docente', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'doc-cifuentes', name: 'Mariana Cifuentes', email: 'cifuentes@ucundinamarca.edu.co', role: 'docente', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'doc-navarro', name: 'Andrés Navarro', email: 'navarro@ucundinamarca.edu.co', role: 'docente', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'doc-mendoza', name: 'Javier Mendoza', email: 'mendoza@ucundinamarca.edu.co', role: 'docente', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'est-1', name: 'Carlos Morales', email: 'estudiante@ucundinamarca.edu.co', role: 'estudiante', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'est-2', name: 'Laura Gómez', email: 'lgomez@ucundinamarca.edu.co', role: 'estudiante', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'est-3', name: 'Mateo Rodríguez', email: 'mrodriguez@ucundinamarca.edu.co', role: 'estudiante', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'est-4', name: 'Valentina Torres', email: 'vtorres@ucundinamarca.edu.co', role: 'estudiante', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'est-5', name: 'Santiago Ramírez', email: 'sramirez@ucundinamarca.edu.co', role: 'estudiante', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
      { id: 'coord-facatativa', name: 'Coordinador Facatativá', email: 'coordinador@ucundinamarca.edu.co', role: 'coordinador', active: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
    ]

    return {
      users: defaultUsers,
      cadis: defaultCadis,
      forms: defaultForms,
      formResponses: [],
      feedbacks: [],
      feedbackResponses: [],
    }
  }

  async ejecutarSql(query) {
    if (!query?.trim()) {
      const error = new Error('Consulta SQL no proporcionada.')
      error.statusCode = 400
      throw error
    }
    const result = await pool.query(query.trim())
    const columns = result.fields ? result.fields.map((f) => f.name) : []
    const values = result.rows.map((r) => columns.map((c) => r[c]))
    return { columns, values }
  }

  async obtenerCalificacionesConsolidadas(periodo) {
    let sql = 'SELECT * FROM v_calificaciones_consolidadas'
    const params = []
    if (periodo && periodo !== 'General') {
      sql += ' WHERE periodo = $1'
      params.push(periodo)
    }
    sql += ' ORDER BY nota_final_consolidada DESC, docente_nombre ASC'
    const result = await pool.query(sql, params)
    return result.rows
  }

  async obtenerReporteMejora(periodo) {
    let sql = `
      SELECT 
        v.docente_id,
        v.docente_nombre,
        v.docente_correo,
        v.periodo,
        v.promedio_estudiantes,
        v.promedio_autoevaluacion,
        v.nota_final_consolidada,
        v.requiere_plan_mejora,
        CASE
          WHEN v.nota_final_consolidada < 3.0 THEN 'Atención Inmediata - Desempeño Crítico'
          WHEN v.nota_final_consolidada <= 3.9 THEN 'Plan de Fortalecimiento Pedagógico'
          WHEN v.nota_final_consolidada <= 4.4 THEN 'Desempeño Destacado - Mantener Buenas Prácticas'
          ELSE 'Desempeño Sobresaliente - Buenas Prácticas y Mentoría'
        END AS recomendacion,
        COUNT(d.pregunta_id) FILTER (WHERE NULLIF(BTRIM(d.valor), '')::NUMERIC < 3.5) AS preguntas_bajas
      FROM v_calificaciones_consolidadas v
      LEFT JOIN respuestas_formulario rf ON rf.docente_id = v.docente_id
      LEFT JOIN detalle_respuesta d ON d.respuesta_id = rf.id
    `
    const params = []
    if (periodo && periodo !== 'General') {
      sql += ' WHERE v.periodo = $1'
      params.push(periodo)
    }
    sql += `
      GROUP BY 
        v.docente_id, v.docente_nombre, v.docente_correo, v.periodo,
        v.promedio_estudiantes, v.promedio_autoevaluacion,
        v.nota_final_consolidada, v.requiere_plan_mejora
      ORDER BY v.nota_final_consolidada ASC
    `
    const result = await pool.query(sql, params)
    return result.rows
  }
}

export const reporteService = new ReporteService()
