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

    const forms = formsRes.rows.map((f) => ({
      ...f,
      start: f.start ? new Date(f.start).toISOString().slice(0, 16) : '',
      end: f.end ? new Date(f.end).toISOString().slice(0, 16) : '',
      questions: questionsByForm[f.id] || [],
    }))

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

    const feedbacksRes = await pool.query(
      `SELECT r.id, r.docente_id AS "docenteId", r.docente_id AS "teacherId", r.curso AS course, 
              r.fecha_inicio AS start, r.fecha_cierre AS end, r.creada_en AS "createdAt",
              p.enunciado AS text, p.tipo_respuesta AS type, p.dimension
       FROM retroalimentaciones r
       JOIN preguntas p ON p.id = r.pregunta_id
       ORDER BY r.creada_en DESC`
    )

    const feedbacks = feedbacksRes.rows.map((f) => ({
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

    return {
      users: usersRes.rows,
      cadis: cadisRes.rows,
      forms,
      formResponses,
      feedbacks,
      feedbackResponses: feedbackRespRes.rows,
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
