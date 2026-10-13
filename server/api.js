import express from 'express'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool, initSchema } from './db.js'

export const apiRouter = express.Router()

apiRouter.use(express.json())

/**
 * Helper para responder usando la API nativa de Node.js (http.ServerResponse),
 * garantizando compatibilidad tanto en Vite Connect Middleware como en Express.
 */
function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

// 1. Salud y estado de conexión a PostgreSQL
apiRouter.get('/health', async (_req, res) => {
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
})

// 2. Cargar estado inicial completo (Inicio en cero / datos reales de PostgreSQL)
apiRouter.get('/bootstrap', async (_req, res) => {
  try {
    await initSchema()

    // 2.1 Usuarios
    const usersRes = await pool.query(
      'SELECT id, nombre AS name, correo AS email, contrasena AS password, rol AS role, activo AS active FROM usuarios ORDER BY rol, nombre'
    )

    // 2.2 CADIs
    const cadisRes = await pool.query(
      'SELECT id, codigo, nombre, semestre, COALESCE(es_articulador, false) AS "esArticulador", docente_id AS "docenteId" FROM cadis ORDER BY semestre, nombre'
    )

    // 2.3 Formularios con sus preguntas y opciones
    const formsRes = await pool.query(
      'SELECT id, tipo AS kind, titulo AS title, descripcion AS description, periodo AS period, cadi_id AS "cadiId", fecha_inicio AS start, fecha_cierre AS end FROM formularios ORDER BY fecha_inicio DESC'
    )

    const questionsRes = await pool.query(
      'SELECT id, formulario_id, enunciado AS text, tipo_respuesta AS type, dimension, obligatoria AS required, orden FROM preguntas ORDER BY orden'
    )

    const optionsRes = await pool.query(
      'SELECT pregunta_id, texto, orden FROM opciones ORDER BY orden'
    )

    // Indexar opciones por pregunta
    const optionsByQ = {}
    for (const opt of optionsRes.rows) {
      if (!optionsByQ[opt.pregunta_id]) optionsByQ[opt.pregunta_id] = []
      optionsByQ[opt.pregunta_id].push(opt.texto)
    }

    // Indexar preguntas por formulario
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

    // 2.4 Respuestas a formularios con detalle
    const responsesRes = await pool.query(
      'SELECT id, formulario_id AS "formId", usuario_id AS "userId", docente_id AS "teacherId", observacion AS observation, fecha AS date FROM respuestas_formulario'
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
      answers: answersByResp[r.id] || {},
    }))

    // 2.5 Retroalimentaciones
    const feedbacksRes = await pool.query(
      'SELECT id, docente_id AS "teacherId", pregunta_id AS "questionId", curso AS course, fecha_inicio AS start, fecha_cierre AS end, creada_en AS "createdAt" FROM retroalimentaciones ORDER BY creada_en DESC'
    )

    const feedbacks = feedbacksRes.rows.map((fb) => {
      const q = questionsRes.rows.find((x) => x.id === fb.questionId)
      return {
        id: fb.id,
        teacherId: fb.teacherId,
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

    // 2.6 Respuestas de retroalimentación
    const feedbackResponsesRes = await pool.query(
      'SELECT id, retroalimentacion_id AS "feedbackId", estudiante_id AS "studentId", valor AS value, fecha AS date FROM respuestas_retroalimentacion'
    )

    sendJson(res, 200, {
      ok: true,
      connected: true,
      users: usersRes.rows,
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
})

// 3. Crear usuario (INSERT en PostgreSQL)
apiRouter.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password || !role) {
    return sendJson(res, 400, { ok: false, message: 'Todos los campos son obligatorios.' })
  }

  try {
    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)

    const query = `
      INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, activo)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE)
      RETURNING id, nombre AS name, correo AS email, contrasena AS password, rol AS role, activo AS active
    `
    const result = await pool.query(query, [
      id,
      name.trim(),
      email.trim().toLowerCase(),
      password,
      passwordHash,
      role,
    ])

    sendJson(res, 201, { ok: true, user: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya existe un usuario registrado con ese correo electrónico.' })
    }
    console.error('Error al crear usuario en PostgreSQL:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error interno al guardar en PostgreSQL.', detail: error.message })
  }
})

// 4. Eliminar / Dar de baja usuario
apiRouter.delete('/users/:id', async (req, res) => {
  const { id } = req.params
  try {
    await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [id])
    sendJson(res, 200, { ok: true, message: 'Usuario desactivado correctamente en PostgreSQL.' })
  } catch (error) {
    console.error('Error al dar de baja usuario:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al desactivar usuario.', detail: error.message })
  }
})

// 5. Crear CADI / Asignatura
apiRouter.post('/cadis', async (req, res) => {
  const { codigo, nombre, semestre, esArticulador, docenteId } = req.body || {}
  if (!codigo?.trim() || !nombre?.trim() || !semestre) {
    return sendJson(res, 400, { ok: false, message: 'Código, nombre y semestre son requeridos.' })
  }

  try {
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO cadis (id, codigo, nombre, semestre, es_articulador, docente_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, codigo.trim().toUpperCase(), nombre.trim(), Number(semestre), Boolean(esArticulador ?? false), docenteId || null]
    )
    sendJson(res, 201, { ok: true, id })
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya existe un CADI con ese código.' })
    }
    sendJson(res, 500, { ok: false, message: 'Error al registrar CADI.', detail: error.message })
  }
})

// 6. Actualizar CADI (Edición completa o asignación rápida de docente)
const handleUpdateCadi = async (req, res) => {
  const { id } = req.params
  const { codigo, nombre, semestre, docenteId } = req.body || {}

  try {
    if (codigo !== undefined || nombre !== undefined || semestre !== undefined) {
      if (!codigo?.trim() || !nombre?.trim() || !semestre) {
        return sendJson(res, 400, { ok: false, message: 'Código, nombre y semestre son requeridos.' })
      }
      const result = await pool.query(
        `UPDATE cadis
         SET codigo = $1, nombre = $2, semestre = $3, docente_id = $4
         WHERE id = $5`,
        [codigo.trim().toUpperCase(), nombre.trim(), Number(semestre), docenteId || null, id]
      )
      if (result.rowCount === 0) {
        return sendJson(res, 404, { ok: false, message: 'CADI no encontrado.' })
      }
      return sendJson(res, 200, { ok: true, message: 'CADI actualizado correctamente.' })
    }

    // Solo asignación rápida de docente (compatibilidad con assignCadiTeacher)
    const result = await pool.query('UPDATE cadis SET docente_id = $1 WHERE id = $2', [docenteId || null, id])
    if (result.rowCount === 0) {
      return sendJson(res, 404, { ok: false, message: 'CADI no encontrado.' })
    }
    sendJson(res, 200, { ok: true })
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya existe otro CADI con ese código.' })
    }
    console.error('Error al actualizar CADI:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al actualizar CADI.', detail: error.message })
  }
}

apiRouter.put('/cadis/:id', handleUpdateCadi)
apiRouter.patch('/cadis/:id', handleUpdateCadi)

// 6.1 Eliminar CADI
apiRouter.delete('/cadis/:id', async (req, res) => {
  const { id } = req.params
  try {
    const result = await pool.query('DELETE FROM cadis WHERE id = $1', [id])
    if (result.rowCount === 0) {
      return sendJson(res, 404, { ok: false, message: 'CADI no encontrado.' })
    }
    sendJson(res, 200, { ok: true, message: 'CADI eliminado correctamente.' })
  } catch (error) {
    console.error('Error al eliminar CADI:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al eliminar CADI.', detail: error.message })
  }
})

// 7. Crear formulario de evaluación (INSERT con transacción en PostgreSQL)
apiRouter.post('/forms', async (req, res) => {
  const { kind, title, description, period, cadiId, start, end, questions } = req.body || {}
  if (!kind || !title?.trim() || !period?.trim() || !start || !end) {
    return sendJson(res, 400, { ok: false, message: 'Datos incompletos para crear el formulario.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const formId = crypto.randomUUID()
    await client.query(
      `INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [formId, kind, title.trim(), description || '', period.trim(), cadiId || null, start, end]
    )

    if (Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qId = q.id || crypto.randomUUID()
        await client.query(
          `INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [qId, formId, q.text, q.type, q.dimension || 'General', q.required !== false, i]
        )

        if (Array.isArray(q.options)) {
          for (let j = 0; j < q.options.length; j++) {
            await client.query(
              'INSERT INTO opciones (pregunta_id, orden, texto) VALUES ($1, $2, $3)',
              [qId, j, q.options[j]]
            )
          }
        }
      }
    }

    await client.query('COMMIT')
    sendJson(res, 201, { ok: true, id: formId })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al crear formulario en PostgreSQL:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al crear formulario.', detail: error.message })
  } finally {
    client.release()
  }
})

// 8. Actualizar fechas de formulario
apiRouter.patch('/forms/:id/dates', async (req, res) => {
  const { id } = req.params
  const { start, end } = req.body || {}
  try {
    await pool.query('UPDATE formularios SET fecha_inicio = $1, fecha_cierre = $2 WHERE id = $3', [start, end, id])
    sendJson(res, 200, { ok: true })
  } catch (error) {
    sendJson(res, 500, { ok: false, message: 'Error al actualizar fechas.', detail: error.message })
  }
})

// 9. Responder formulario (Control de doble voto en PostgreSQL)
apiRouter.post('/form-responses', async (req, res) => {
  const { formId, userId, teacherId, answers, observation } = req.body || {}
  if (!formId || !userId || !teacherId || !answers) {
    return sendJson(res, 400, { ok: false, message: 'Faltan parámetros obligatorios de evaluación.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const respId = crypto.randomUUID()
    await client.query(
      `INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [respId, formId, userId, teacherId, observation ? String(observation).slice(0, 500) : '']
    )

    for (const [pregId, val] of Object.entries(answers)) {
      await client.query(
        'INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES ($1, $2, $3)',
        [respId, pregId, String(val)]
      )
    }

    await client.query('COMMIT')
    sendJson(res, 201, { ok: true, id: respId })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya has evaluado a este docente en este período.' })
    }
    sendJson(res, 500, { ok: false, message: 'Error al registrar evaluación.', detail: error.message })
  } finally {
    client.release()
  }
})

// 10. Crear retroalimentación docente
apiRouter.post('/feedbacks', async (req, res) => {
  const { teacherId, course, question, start, end } = req.body || {}
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const qId = crypto.randomUUID()
    await client.query(
      `INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden)
       VALUES ($1, NULL, $2, $3, 'General', TRUE, 0)`,
      [qId, question.text, question.type]
    )

    const fbId = crypto.randomUUID()
    await client.query(
      `INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [fbId, teacherId, qId, course, start, end]
    )

    await client.query('COMMIT')
    sendJson(res, 201, { ok: true, id: fbId })
  } catch (error) {
    await client.query('ROLLBACK')
    sendJson(res, 500, { ok: false, message: 'Error al crear retroalimentación.', detail: error.message })
  } finally {
    client.release()
  }
})

// 11. Responder retroalimentación
apiRouter.post('/feedback-responses', async (req, res) => {
  const { feedbackId, studentId, value } = req.body || {}
  try {
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, feedbackId, studentId, String(value)]
    )
    sendJson(res, 201, { ok: true, id })
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya respondiste a esta retroalimentación.' })
    }
    sendJson(res, 500, { ok: false, message: 'Error al registrar respuesta.', detail: error.message })
  }
})

// 12. Consola SQL sobre PostgreSQL real
apiRouter.post('/sql', async (req, res) => {
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
})
