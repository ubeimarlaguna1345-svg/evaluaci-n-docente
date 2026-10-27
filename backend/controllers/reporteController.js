import { pool, initSchema } from '../config/db.js'
import { UsuarioFactory, Evaluacion } from '../models/index.js'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}


export async function getHealth(_req, res) {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, current_user AS db_user, version() AS pg_version'
    )
    sendJson(res, 200, {
      ok: true,
      connected: true,
      database: result.rows[0].database,
      user: result.rows[0].db_user,
    })
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      connected: false,
      message: 'No fue posible conectar con PostgreSQL.',
      detail: error.message,
    })
  }
}


export async function getBootstrap(_req, res) {
  try {
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
      'SELECT id, formulario_id, enunciado AS text, tipo_respuesta AS type, dimension, obligatoria AS required, orden FROM preguntas ORDER BY orden'
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

    const formResponses = responsesRes.rows.map((r) => {
      const answers = answersByResp[r.id] || {}
      const ev = new Evaluacion({
        id: r.id,
        formularioId: r.formId,
        usuarioId: r.userId,
        docenteId: r.docenteId || r.teacherId,
        observacion: r.observation,
        fecha: r.date,
        respuestas: answers,
      })
      return {
        ...r,
        docenteId: r.docenteId || r.teacherId,
        teacherId: r.docenteId || r.teacherId,
        answers,
        promedio: ev.calcularPromedio(),
        desempeno: ev.obtenerDesempeno(),
        requierePlanMejora: ev.requierePlanMejora(),
      }
    })

    const feedbacksRes = await pool.query(
      'SELECT id, docente_id AS "docenteId", docente_id AS "teacherId", pregunta_id AS "questionId", curso AS course, fecha_inicio AS start, fecha_cierre AS end, creada_en AS "createdAt" FROM retroalimentaciones ORDER BY creada_en DESC'
    )

    const feedbacks = feedbacksRes.rows.map((fb) => {
      const q = questionsRes.rows.find((x) => x.id === fb.questionId)
      return {
        id: fb.id,
        docenteId: fb.docenteId || fb.teacherId,
        teacherId: fb.docenteId || fb.teacherId,
        course: fb.course,
        start: fb.start ? new Date(fb.start).toISOString().slice(0, 16) : '',
        end: fb.end ? new Date(fb.end).toISOString().slice(0, 16) : '',
        createdAt: fb.createdAt ? new Date(fb.createdAt).toISOString() : '',
        question: q ? {
          id: q.id,
          text: q.text,
          type: q.type,
          dimension: q.dimension,
          required: Boolean(q.required),
          options: optionsByQ[q.id] || [],
        } : null,
      }
    })


    const feedbackResponsesRes = await pool.query(
      'SELECT id, retroalimentacion_id AS "feedbackId", estudiante_id AS "studentId", valor AS value, fecha AS date FROM respuestas_retroalimentacion'
    )

    const usuariosDominio = usersRes.rows.map((u) => UsuarioFactory.crearUsuario(u).toJSON())

    sendJson(res, 200, {
      ok: true,
      connected: true,
      users: usuariosDominio,
      cadis: cadisRes.rows,
      forms,
      formResponses,
      feedbacks,
      feedbackResponses: feedbackResponsesRes.rows,
    })
  } catch (error) {
    console.error('Error cargando datos de PostgreSQL:', error.message)
    sendJson(res, 500, {
      ok: false,
      connected: false,
      message: 'Error al conectar con la base de datos PostgreSQL.',
      detail: error.message,
      users: [],
      cadis: [],
      forms: [],
      formResponses: [],
      feedbacks: [],
      feedbackResponses: [],
    })
  }
}


export async function executeSql(req, res) {
  const { query } = req.body || {}
  if (typeof query !== 'string' || !query.trim()) {
    return sendJson(res, 400, { ok: false, message: 'Consulta SQL vacía.' })
  }

  try {
    const result = await pool.query(query)
    const columns = result.fields ? result.fields.map((f) => f.name) : []
    const values = result.rows ? result.rows.map((row) => columns.map((col) => row[col])) : []
    sendJson(res, 200, {
      ok: true,
      columns,
      values,
      rowCount: result.rowCount,
    })
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      message: error.message,
    })
  }
}


export async function getCalificacionesConsolidadas(req, res) {
  const { period } = req.query || {}
  try {
    const teachersRes = await pool.query(
      "SELECT id, nombre AS name, correo AS email, sede, carrera FROM usuarios WHERE rol = 'docente' AND activo = TRUE ORDER BY nombre"
    )

    const evalQuery = `
      SELECT
        rf.docente_id,
        ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS promedio_estudiantes,
        COUNT(DISTINCT rf.id) AS total_evaluaciones
      FROM detalle_respuesta d
      JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
      JOIN preguntas p ON p.id = d.pregunta_id
      JOIN formularios f ON f.id = rf.formulario_id
      WHERE p.tipo_respuesta = 'escala'
        AND f.tipo = 'evaluacion'
        ${period ? 'AND f.periodo = $1' : ''}
      GROUP BY rf.docente_id
    `
    const evalRes = await pool.query(evalQuery, period ? [period] : [])
    const evalByTeacher = {}
    for (const r of evalRes.rows) {
      evalByTeacher[r.docente_id] = {
        promedio: Number(r.promedio_estudiantes),
        count: Number(r.total_evaluaciones),
      }
    }

    const autoQuery = `
      SELECT
        COALESCE(rf.docente_id, rf.usuario_id) AS docente_id,
        ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS promedio_autoevaluacion,
        COUNT(DISTINCT rf.id) AS total_autoevaluaciones
      FROM detalle_respuesta d
      JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
      JOIN preguntas p ON p.id = d.pregunta_id
      JOIN formularios f ON f.id = rf.formulario_id
      WHERE p.tipo_respuesta = 'escala'
        AND f.tipo = 'autoevaluacion'
        ${period ? 'AND f.periodo = $1' : ''}
      GROUP BY COALESCE(rf.docente_id, rf.usuario_id)
    `
    const autoRes = await pool.query(autoQuery, period ? [period] : [])
    const autoByTeacher = {}
    for (const r of autoRes.rows) {
      autoByTeacher[r.docente_id] = {
        promedio: Number(r.promedio_autoevaluacion),
        count: Number(r.total_autoevaluaciones),
      }
    }

    const data = teachersRes.rows.map((t) => {
      const ev = evalByTeacher[t.id]
      const au = autoByTeacher[t.id]

      const studentAvg = ev ? ev.promedio : null
      const autoAvg = au ? au.promedio : null

      const studentWeighted = studentAvg !== null ? Number((studentAvg * 0.70).toFixed(2)) : null
      const autoWeighted = autoAvg !== null ? Number((autoAvg * 0.30).toFixed(2)) : null

      let finalScore = 0
      let status = 'sin_evaluar'
      let statusLabel = 'Sin evaluar'
      let isProvisional = false
      let hasEvaluations = false

      if (studentAvg !== null && autoAvg !== null) {
        finalScore = Number(((studentAvg * 0.70) + (autoAvg * 0.30)).toFixed(2))
        status = 'completo'
        statusLabel = 'Consolidado (100%)'
        hasEvaluations = true
      } else if (studentAvg !== null && autoAvg === null) {
        finalScore = studentAvg
        status = 'pendiente_autoevaluacion'
        statusLabel = 'Pendiente Autoevaluación'
        isProvisional = true
        hasEvaluations = true
      } else if (studentAvg === null && autoAvg !== null) {
        finalScore = autoAvg
        status = 'pendiente_estudiantes'
        statusLabel = 'Pendiente Estudiantes'
        isProvisional = true
        hasEvaluations = true
      }

      const requierePlanMejora = hasEvaluations && finalScore <= 3.9

      return {
        docenteId: t.id,
        teacherId: t.id,
        docenteName: t.name,
        teacherName: t.name,
        email: t.email,
        sede: t.sede,
        carrera: t.carrera,
        studentAvg,
        studentWeighted,
        autoAvg,
        autoWeighted,
        finalScore,
        isProvisional,
        status,
        statusLabel,
        hasEvaluations,
        requierePlanMejora,
        studentResponsesCount: ev ? ev.count : 0,
        autoResponsesCount: au ? au.count : 0,
      }
    })

    sendJson(res, 200, { ok: true, data })
  } catch (error) {
    console.error('Error calculando calificaciones consolidadas:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al calcular calificaciones.', detail: error.message })
  }
}


export async function getReporteMejora(req, res) {
  const { period } = req.query || {}
  try {
    const teachersRes = await pool.query(
      "SELECT id, nombre AS name, correo AS email, sede, carrera FROM usuarios WHERE rol = 'docente' AND activo = TRUE ORDER BY nombre"
    )

    const evalQuery = `
      SELECT
        rf.docente_id,
        ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS promedio_estudiantes,
        COUNT(DISTINCT rf.id) AS total_evaluaciones
      FROM detalle_respuesta d
      JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
      JOIN preguntas p ON p.id = d.pregunta_id
      JOIN formularios f ON f.id = rf.formulario_id
      WHERE p.tipo_respuesta = 'escala'
        AND f.tipo = 'evaluacion'
        ${period ? 'AND f.periodo = $1' : ''}
      GROUP BY rf.docente_id
    `
    const evalRes = await pool.query(evalQuery, period ? [period] : [])
    const evalByTeacher = {}
    for (const r of evalRes.rows) {
      evalByTeacher[r.docente_id] = {
        promedio: Number(r.promedio_estudiantes),
        count: Number(r.total_evaluaciones),
      }
    }

    const autoQuery = `
      SELECT
        COALESCE(rf.docente_id, rf.usuario_id) AS docente_id,
        ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS promedio_autoevaluacion,
        COUNT(DISTINCT rf.id) AS total_autoevaluaciones
      FROM detalle_respuesta d
      JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
      JOIN preguntas p ON p.id = d.pregunta_id
      JOIN formularios f ON f.id = rf.formulario_id
      WHERE p.tipo_respuesta = 'escala'
        AND f.tipo = 'autoevaluacion'
        ${period ? 'AND f.periodo = $1' : ''}
      GROUP BY COALESCE(rf.docente_id, rf.usuario_id)
    `
    const autoRes = await pool.query(autoQuery, period ? [period] : [])
    const autoByTeacher = {}
    for (const r of autoRes.rows) {
      autoByTeacher[r.docente_id] = {
        promedio: Number(r.promedio_autoevaluacion),
        count: Number(r.total_autoevaluaciones),
      }
    }

    const meditQuery = `
      SELECT
        rf.docente_id,
        COALESCE(p.dimension, 'General') AS dimension,
        ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS avg_dimension,
        COUNT(*) AS count_respuestas
      FROM detalle_respuesta d
      JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
      JOIN preguntas p ON p.id = d.pregunta_id
      JOIN formularios f ON f.id = rf.formulario_id
      WHERE p.tipo_respuesta = 'escala'
        ${period ? 'AND f.periodo = $1' : ''}
      GROUP BY rf.docente_id, COALESCE(p.dimension, 'General')
    `
    const meditRes = await pool.query(meditQuery, period ? [period] : [])
    const meditByTeacher = {}
    for (const r of meditRes.rows) {
      if (!meditByTeacher[r.docente_id]) meditByTeacher[r.docente_id] = []
      meditByTeacher[r.docente_id].push({
        dimension: r.dimension,
        avg: Number(r.avg_dimension),
        count: Number(r.count_respuestas),
        esCritica: Number(r.avg_dimension) <= 3.9,
      })
    }

    const docentes = teachersRes.rows
      .map((t) => {
        const ev = evalByTeacher[t.id]
        const au = autoByTeacher[t.id]

        const studentAvg = ev ? ev.promedio : null
        const autoAvg = au ? au.promedio : null

        const studentWeighted = studentAvg !== null ? Number((studentAvg * 0.70).toFixed(2)) : null
        const autoWeighted = autoAvg !== null ? Number((autoAvg * 0.30).toFixed(2)) : null

        let finalScore = 0
        let status = 'sin_evaluar'
        let statusLabel = 'Sin evaluar'
        let isProvisional = false
        let hasEvaluations = false

        if (studentAvg !== null && autoAvg !== null) {
          finalScore = Number(((studentAvg * 0.70) + (autoAvg * 0.30)).toFixed(2))
          status = 'completo'
          statusLabel = 'Consolidado (100%)'
          hasEvaluations = true
        } else if (studentAvg !== null && autoAvg === null) {
          finalScore = studentAvg
          status = 'pendiente_autoevaluacion'
          statusLabel = 'Pendiente Autoevaluación'
          isProvisional = true
          hasEvaluations = true
        } else if (studentAvg === null && autoAvg !== null) {
          finalScore = autoAvg
          status = 'pendiente_estudiantes'
          statusLabel = 'Pendiente Estudiantes'
          isProvisional = true
          hasEvaluations = true
        }

        const dims = meditByTeacher[t.id] || []
        const dimensionesCriticas = dims.filter((d) => d.esCritica).sort((a, b) => a.avg - b.avg)

        return {
          docenteId: t.id,
          teacherId: t.id,
          docenteName: t.name,
          teacherName: t.name,
          email: t.email,
          sede: t.sede,
          carrera: t.carrera,
          studentAvg,
          studentWeighted,
          autoAvg,
          autoWeighted,
          finalScore,
          isProvisional,
          status,
          statusLabel,
          hasEvaluations,
          requierePlanMejora: hasEvaluations && finalScore <= 3.9,
          dimensiones: dims,
          dimensionesCriticas,
        }
      })
      .filter((d) => d.hasEvaluations && d.finalScore <= 3.9)

    if (docentes.length === 0) {
      return sendJson(res, 200, {
        ok: true,
        data: [],
        message: 'No hay docentes que requieran plan de mejora pedagógica en este período (todos los promedios son iguales o superiores a 4.0).',
      })
    }

    sendJson(res, 200, { ok: true, data: docentes })
  } catch (error) {
    console.error('Error generando reporte de mejora:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al generar reporte de mejora.', detail: error.message })
  }
}
