import crypto from 'node:crypto'
import { pool } from '../config/db.js'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}


export async function createCadi(req, res) {
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
}

export async function updateCadi(req, res) {
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

export async function deleteCadi(req, res) {
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
}


export async function createForm(req, res) {
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
}

export async function updateForm(req, res) {
  const { id } = req.params
  const { kind, title, description, period, cadiId, start, end, questions } = req.body || {}

  if (!kind || !title?.trim() || !period?.trim() || !start || !end) {
    return sendJson(res, 400, { ok: false, message: 'Datos incompletos para actualizar el formulario.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const updateRes = await client.query(
      `UPDATE formularios
       SET tipo = $1, titulo = $2, descripcion = $3, periodo = $4, cadi_id = $5, fecha_inicio = $6, fecha_cierre = $7
       WHERE id = $8`,
      [kind, title.trim(), description || '', period.trim(), cadiId || null, start, end, id]
    )

    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return sendJson(res, 404, { ok: false, message: 'Formulario no encontrado.' })
    }

    if (Array.isArray(questions)) {
      const currentQRes = await client.query('SELECT id FROM preguntas WHERE formulario_id = $1', [id])
      const currentQIds = new Set(currentQRes.rows.map((r) => r.id))
      const incomingQIds = new Set()

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const qId = q.id && currentQIds.has(q.id) ? q.id : (q.id || crypto.randomUUID())
        incomingQIds.add(qId)

        if (currentQIds.has(qId)) {
          await client.query(
            `UPDATE preguntas
             SET enunciado = $1, tipo_respuesta = $2, dimension = $3, obligatoria = $4, orden = $5
             WHERE id = $6`,
            [q.text, q.type, q.dimension || 'General', q.required !== false, i, qId]
          )
          await client.query('DELETE FROM opciones WHERE pregunta_id = $1', [qId])
        } else {
          await client.query(
            `INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [qId, id, q.text, q.type, q.dimension || 'General', q.required !== false, i]
          )
        }

        if (Array.isArray(q.options)) {
          for (let j = 0; j < q.options.length; j++) {
            await client.query(
              'INSERT INTO opciones (pregunta_id, orden, texto) VALUES ($1, $2, $3)',
              [qId, j, q.options[j]]
            )
          }
        }
      }

      for (const oldId of currentQIds) {
        if (!incomingQIds.has(oldId)) {
          await client.query('DELETE FROM opciones WHERE pregunta_id = $1', [oldId])
          await client.query('DELETE FROM detalle_respuesta WHERE pregunta_id = $1', [oldId])
          await client.query('DELETE FROM preguntas WHERE id = $1', [oldId])
        }
      }
    }

    await client.query('COMMIT')
    sendJson(res, 200, { ok: true, message: 'Formulario actualizado correctamente.' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al actualizar formulario en PostgreSQL:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al actualizar formulario.', detail: error.message })
  } finally {
    client.release()
  }
}

export async function deleteForm(req, res) {
  const { id } = req.params
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const respRes = await client.query('SELECT id FROM respuestas_formulario WHERE formulario_id = $1', [id])
    if (respRes.rows.length > 0) {
      const respIds = respRes.rows.map((r) => r.id)
      await client.query('DELETE FROM detalle_respuesta WHERE respuesta_id = ANY($1::text[])', [respIds])
      await client.query('DELETE FROM respuestas_formulario WHERE formulario_id = $1', [id])
    }

    const qRes = await client.query('SELECT id FROM preguntas WHERE formulario_id = $1', [id])
    if (qRes.rows.length > 0) {
      const qIds = qRes.rows.map((r) => r.id)
      await client.query('DELETE FROM opciones WHERE pregunta_id = ANY($1::text[])', [qIds])
      await client.query('DELETE FROM preguntas WHERE formulario_id = $1', [id])
    }

    const deleteRes = await client.query('DELETE FROM formularios WHERE id = $1', [id])
    if (deleteRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return sendJson(res, 404, { ok: false, message: 'Formulario no encontrado.' })
    }

    await client.query('COMMIT')
    sendJson(res, 200, { ok: true, message: 'Formulario eliminado correctamente.' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al eliminar formulario en PostgreSQL:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al eliminar formulario.', detail: error.message })
  } finally {
    client.release()
  }
}

export async function updateFormDates(req, res) {
  const { id } = req.params
  const { start, end } = req.body || {}
  try {
    await pool.query('UPDATE formularios SET fecha_inicio = $1, fecha_cierre = $2 WHERE id = $3', [start, end, id])
    sendJson(res, 200, { ok: true })
  } catch (error) {
    sendJson(res, 500, { ok: false, message: 'Error al actualizar fechas.', detail: error.message })
  }
}


export async function createFormResponse(req, res) {
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
}


export async function createFeedback(req, res) {
  const { teacherId, course, question, questions, start, end } = req.body || {}
  const list = Array.isArray(questions) && questions.length > 0 ? questions : (question ? [question] : [])
  if (list.length === 0) {
    return sendJson(res, 400, { ok: false, message: 'Se requiere al menos una pregunta para registrar la retroalimentación.' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ids = []

    for (const q of list) {
      const qId = crypto.randomUUID()
      await client.query(
        `INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden)
         VALUES ($1, NULL, $2, $3, $4, TRUE, 0)`,
        [qId, q.text, q.type, q.dimension || 'Retroalimentación de Aula']
      )

      if (Array.isArray(q.options) && q.options.length > 0) {
        for (let j = 0; j < q.options.length; j++) {
          await client.query(
            'INSERT INTO opciones (pregunta_id, orden, texto) VALUES ($1, $2, $3)',
            [qId, j, q.options[j]]
          )
        }
      }

      const fbId = crypto.randomUUID()
      await client.query(
        `INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [fbId, teacherId, qId, course, start, end]
      )
      ids.push(fbId)
    }

    await client.query('COMMIT')
    sendJson(res, 201, { ok: true, ids, id: ids[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al crear retroalimentación docente:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al crear retroalimentación.', detail: error.message })
  } finally {
    client.release()
  }
}

export async function createFeedbackResponse(req, res) {
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
}
