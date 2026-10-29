import crypto from 'node:crypto'
import { pool } from '../config/db.js'
import { Evaluacion, Cadi } from '../models/index.js'
import { preguntaService } from './PreguntaService.js'

export class EvaluacionService {
  async obtenerFormularios({ cadiId, tipo, periodo, role } = {}) {
    let query = `
      SELECT f.id, f.tipo AS kind, f.titulo AS title, f.descripcion AS description, 
             f.periodo AS period, f.cadi_id AS "cadiId", f.fecha_inicio AS start, f.fecha_cierre AS end,
             c.nombre AS "cadiNombre", c.codigo AS "cadiCodigo"
      FROM formularios f
      LEFT JOIN cadis c ON f.cadi_id = c.id
      WHERE f.id NOT IN (SELECT id FROM formularios_eliminados)
    `
    const params = []
    if (role === 'admin' || role === 'coordinador') {
      // Roles de gestión institucional: acceso irrestricto y colaborativo a todas las evaluaciones
    } else if (cadiId) {
      params.push(cadiId)
      query += ` AND (f.cadi_id = $${params.length} OR f.cadi_id IS NULL)`
    }

    if (tipo) {
      params.push(tipo)
      query += ` AND f.tipo = $${params.length}`
    }

    if (periodo) {
      params.push(periodo)
      query += ` AND f.periodo = $${params.length}`
    }

    query += ' ORDER BY f.fecha_inicio DESC'

    const formsRes = await pool.query(query, params)
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

    return formsRes.rows.map((f) => {
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
  }

  async obtenerFormularioPorId(id) {
    const formsRes = await pool.query(
      `SELECT f.id, f.tipo AS kind, f.titulo AS title, f.descripcion AS description, 
              f.periodo AS period, f.cadi_id AS "cadiId", f.fecha_inicio AS start, f.fecha_cierre AS end,
              c.nombre AS "cadiNombre", c.codigo AS "cadiCodigo"
       FROM formularios f
       LEFT JOIN cadis c ON f.cadi_id = c.id
       WHERE f.id = $1 AND f.id NOT IN (SELECT id FROM formularios_eliminados)`,
      [id]
    )
    if (formsRes.rows.length === 0) {
      const error = new Error('Formulario no encontrado.')
      error.statusCode = 404
      throw error
    }
    const f = formsRes.rows[0]
    const questions = await preguntaService.obtenerPorFormulario(id)

    return {
      ...f,
      start: f.start ? new Date(f.start).toISOString().slice(0, 16) : '',
      end: f.end ? new Date(f.end).toISOString().slice(0, 16) : '',
      questions: questions.map((q) => q.toJSON()),
    }
  }

  async crearFormulario(data = {}) {
    const kind = data.kind || data.tipo || 'evaluacion'
    const title = (data.title || data.titulo || '').trim()
    const description = data.description || data.descripcion || ''
    const period = (data.period || data.periodo || '2026-I').trim()
    const cadiId = data.cadiId || data.cadi_id || null
    const start = data.start || data.fecha_inicio || data.fechaInicio
    const end = data.end || data.fecha_cierre || data.fechaCierre
    const questions = data.questions || data.preguntas || []
    const formId = data.id || crypto.randomUUID()

    if (!kind || !title || !period || !start || !end) {
      const error = new Error('Datos incompletos para crear el formulario.')
      error.statusCode = 400
      throw error
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE
         SET tipo = EXCLUDED.tipo, titulo = EXCLUDED.titulo, descripcion = EXCLUDED.descripcion,
             periodo = EXCLUDED.periodo, cadi_id = EXCLUDED.cadi_id,
             fecha_inicio = EXCLUDED.fecha_inicio, fecha_cierre = EXCLUDED.fecha_cierre`,
        [formId, kind, title, description, period, cadiId, start, end]
      )

      if (Array.isArray(questions)) {
        await preguntaService.sincronizarPreguntas(client, formId, questions)
      }

      await client.query('COMMIT')
      return formId
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async actualizarFormulario(id, data = {}) {
    const kind = data.kind || data.tipo || 'evaluacion'
    const title = (data.title || data.titulo || '').trim()
    const description = data.description || data.descripcion || ''
    const period = (data.period || data.periodo || '2026-I').trim()
    const cadiId = data.cadiId || data.cadi_id || null
    const start = data.start || data.fecha_inicio || data.fechaInicio
    const end = data.end || data.fecha_cierre || data.fechaCierre
    const questions = data.questions || data.preguntas || []

    if (!kind || !title || !period || !start || !end) {
      const error = new Error('Datos incompletos para actualizar el formulario.')
      error.statusCode = 400
      throw error
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const updateRes = await client.query(
        `UPDATE formularios
         SET tipo = $1, titulo = $2, descripcion = $3, periodo = $4, cadi_id = $5, fecha_inicio = $6, fecha_cierre = $7
         WHERE id = $8`,
        [kind, title, description, period, cadiId, start, end, id]
      )

      if (updateRes.rowCount === 0) {
        await client.query(
          `INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [id, kind, title, description, period, cadiId, start, end]
        )
      }

      if (Array.isArray(questions)) {
        await preguntaService.sincronizarPreguntas(client, id, questions)
      }

      await client.query('COMMIT')
      return { ok: true, message: 'Formulario actualizado correctamente.' }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async eliminarFormulario(id) {
    const client = await pool.connect()
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS formularios_eliminados (
          id TEXT PRIMARY KEY,
          fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      await client.query('INSERT INTO formularios_eliminados (id) VALUES ($1) ON CONFLICT DO NOTHING', [id])

      const respRes = await client.query('SELECT id FROM respuestas_formulario WHERE formulario_id = $1', [id])
      if (respRes.rows.length > 0) {
        const respIds = respRes.rows.map((r) => r.id)
        await client.query('DELETE FROM detalle_respuesta WHERE respuesta_id = ANY($1::text[])', [respIds])
      }
      await client.query('DELETE FROM respuestas_formulario WHERE formulario_id = $1', [id])

      const qRes = await client.query('SELECT id FROM preguntas WHERE formulario_id = $1', [id])
      if (qRes.rows.length > 0) {
        const qIds = qRes.rows.map((r) => r.id)
        await client.query('DELETE FROM opciones WHERE pregunta_id = ANY($1::text[])', [qIds])
      }
      await client.query('DELETE FROM preguntas WHERE formulario_id = $1', [id])
      await client.query('DELETE FROM formularios WHERE id = $1', [id])

      await client.query('COMMIT')
      return { ok: true, message: 'Formulario eliminado correctamente.' }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async actualizarFechas(id, start, end) {
    await pool.query('UPDATE formularios SET fecha_inicio = $1, fecha_cierre = $2 WHERE id = $3', [start, end, id])
    return { ok: true }
  }

  async obtenerRespuestas({ userId, estudianteId, formId, docenteId, teacherId } = {}) {
    const targetUserId = userId || estudianteId
    const targetDocenteId = docenteId || teacherId
    let query = `
      SELECT id, formulario_id AS "formId", usuario_id AS "userId", 
             docente_id AS "docenteId", docente_id AS "teacherId", 
             observacion AS observation, fecha AS date 
      FROM respuestas_formulario 
      WHERE formulario_id NOT IN (SELECT id FROM formularios_eliminados)
    `
    const params = []
    if (targetUserId) {
      params.push(targetUserId)
      query += ` AND usuario_id = $${params.length}`
    }
    if (targetDocenteId) {
      params.push(targetDocenteId)
      query += ` AND docente_id = $${params.length}`
    }
    if (formId) {
      params.push(formId)
      query += ` AND formulario_id = $${params.length}`
    }
    query += ' ORDER BY fecha DESC'

    const responsesRes = await pool.query(query, params)
    if (responsesRes.rows.length === 0) {
      return []
    }

    const respIds = responsesRes.rows.map((r) => r.id)
    const detailsRes = await pool.query(
      'SELECT respuesta_id, pregunta_id, valor FROM detalle_respuesta WHERE respuesta_id = ANY($1::text[])',
      [respIds]
    )

    const answersByResp = {}
    for (const d of detailsRes.rows) {
      if (!answersByResp[d.respuesta_id]) answersByResp[d.respuesta_id] = {}
      answersByResp[d.respuesta_id][d.pregunta_id] = d.valor
    }

    return responsesRes.rows.map((r) => ({
      ...r,
      date: r.date ? new Date(r.date).toISOString() : '',
      answers: answersByResp[r.id] || {},
    }))
  }

  async registrarRespuesta({ formId, userId, docenteId, teacherId, answers, observation }) {
    const targetDocenteId = docenteId || teacherId
    if (!formId || !userId || !targetDocenteId || !answers) {
      const error = new Error('Faltan parámetros obligatorios de evaluación.')
      error.statusCode = 400
      throw error
    }

    const evaluacion = new Evaluacion({
      formularioId: formId,
      estudianteId: userId,
      docenteId: targetDocenteId,
      respuestas: answers,
      observacion: observation,
    })

    const promedio = evaluacion.calcularPromedio()
    const desempeno = evaluacion.obtenerDesempeno()
    const requierePlanMejora = evaluacion.requierePlanMejora()

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const respId = crypto.randomUUID()
      await client.query(
        `INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [respId, formId, userId, targetDocenteId, evaluacion.getObservacion()]
      )

      for (const [pregId, val] of Object.entries(evaluacion.getRespuestas())) {
        await client.query(
          'INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES ($1, $2, $3)',
          [respId, pregId, String(val)]
        )
      }

      await client.query('COMMIT')
      return {
        id: respId,
        promedio,
        desempeno,
        requierePlanMejora,
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async obtenerCadis() {
    const cadisRes = await pool.query(
      'SELECT id, codigo, nombre, semestre, COALESCE(tipo, \'CADI\') AS tipo, COALESCE(es_articulador, false) AS "esArticulador", docente_id AS "docenteId" FROM cadis ORDER BY semestre, nombre'
    )
    return cadisRes.rows
  }

  async crearCadi({ codigo, nombre, semestre, tipo, esArticulador, docenteId }) {
    const cadiModelo = new Cadi({ codigo, nombre, semestre, tipo, esArticulador, docenteId })
    if (!cadiModelo.esValido()) {
      const error = new Error('Código, nombre y semestre son requeridos.')
      error.statusCode = 400
      throw error
    }

    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO cadis (id, codigo, nombre, semestre, tipo, es_articulador, docente_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, cadiModelo.getCodigo(), cadiModelo.getNombre(), cadiModelo.getSemestre(), cadiModelo.getTipo(), cadiModelo.isArticulador(), cadiModelo.getDocenteId()]
    )
    return id
  }

  async actualizarCadi(id, { codigo, nombre, semestre, tipo, docenteId }) {
    if (codigo !== undefined || nombre !== undefined || semestre !== undefined || tipo !== undefined) {
      const cadiModelo = new Cadi({ codigo, nombre, semestre, tipo, docenteId })
      if (!cadiModelo.esValido()) {
        const error = new Error('Código, nombre y semestre son requeridos.')
        error.statusCode = 400
        throw error
      }
      const result = await pool.query(
        `UPDATE cadis
         SET codigo = $1, nombre = $2, semestre = $3, tipo = $4, docente_id = $5
         WHERE id = $6`,
        [cadiModelo.getCodigo(), cadiModelo.getNombre(), cadiModelo.getSemestre(), cadiModelo.getTipo(), cadiModelo.getDocenteId(), id]
      )
      if (result.rowCount === 0) {
        const error = new Error('CADI no encontrado.')
        error.statusCode = 404
        throw error
      }
      return { ok: true, message: 'CADI actualizado correctamente.' }
    }

    const result = await pool.query('UPDATE cadis SET docente_id = $1 WHERE id = $2', [docenteId || null, id])
    if (result.rowCount === 0) {
      const error = new Error('CADI no encontrado.')
      error.statusCode = 404
      throw error
    }
    return { ok: true }
  }

  async eliminarCadi(id) {
    const result = await pool.query('DELETE FROM cadis WHERE id = $1', [id])
    if (result.rowCount === 0) {
      const error = new Error('CADI no encontrado.')
      error.statusCode = 404
      throw error
    }
    return { ok: true, message: 'CADI eliminado correctamente.' }
  }

  async crearRetroalimentacion({ docenteId, teacherId, course, question, questions, start, end }) {
    const targetDocenteId = docenteId || teacherId
    const list = Array.isArray(questions) && questions.length > 0 ? questions : (question ? [question] : [])
    if (!targetDocenteId || list.length === 0) {
      const error = new Error('Se requiere docente y al menos una pregunta para registrar la retroalimentación.')
      error.statusCode = 400
      throw error
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
          [fbId, targetDocenteId, qId, course, start, end]
        )
        ids.push(fbId)
      }

      await client.query('COMMIT')
      return { ids, id: ids[0] }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  async responderRetroalimentacion({ feedbackId, studentId, value }) {
    const id = crypto.randomUUID()
    await pool.query(
      `INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, feedbackId, studentId, String(value)]
    )
    return id
  }
}

export const evaluacionService = new EvaluacionService()
