import crypto from 'node:crypto'
import { pool } from '../config/db.js'
import { Pregunta } from '../models/Pregunta.js'

export class PreguntaService {
  async obtenerPorFormulario(formularioId) {
    const questionsRes = await pool.query(
      "SELECT id, formulario_id, enunciado AS text, tipo_respuesta AS type, dimension, COALESCE(bloque, 'docente') AS bloque, obligatoria AS required, orden FROM preguntas WHERE formulario_id = $1 ORDER BY orden",
      [formularioId]
    )
    const optionsRes = await pool.query(
      'SELECT o.pregunta_id, o.texto, o.orden FROM opciones o JOIN preguntas p ON p.id = o.pregunta_id WHERE p.formulario_id = $1 ORDER BY o.orden',
      [formularioId]
    )

    const optionsByQ = {}
    for (const opt of optionsRes.rows) {
      if (!optionsByQ[opt.pregunta_id]) optionsByQ[opt.pregunta_id] = []
      optionsByQ[opt.pregunta_id].push(opt.texto)
    }

    return questionsRes.rows.map(
      (q) =>
        new Pregunta({
          id: q.id,
          formularioId: q.formulario_id,
          text: q.text,
          type: q.type,
          dimension: q.dimension,
          bloque: q.bloque,
          required: q.required,
          orden: q.orden,
          options: optionsByQ[q.id] || [],
        })
    )
  }

  async sincronizarPreguntas(client, formularioId, preguntas) {
    if (!Array.isArray(preguntas)) return

    const currentQRes = await client.query('SELECT id FROM preguntas WHERE formulario_id = $1', [formularioId])
    const currentQIds = new Set(currentQRes.rows.map((r) => r.id))
    const incomingQIds = new Set()

    for (let i = 0; i < preguntas.length; i++) {
      const q = preguntas[i]
      const preguntaModelo = new Pregunta({
        ...q,
        formularioId,
        orden: i,
      })

      const qId = preguntaModelo.getId() && currentQIds.has(preguntaModelo.getId())
        ? preguntaModelo.getId()
        : (preguntaModelo.getId() || crypto.randomUUID())
      incomingQIds.add(qId)

      if (currentQIds.has(qId)) {
        await client.query(
          `UPDATE preguntas
           SET enunciado = $1, tipo_respuesta = $2, dimension = $3, obligatoria = $4, orden = $5, bloque = $6
           WHERE id = $7`,
          [preguntaModelo.getEnunciado(), preguntaModelo.getTipo(), preguntaModelo.getDimension(), preguntaModelo.isObligatoria(), i, preguntaModelo.getBloque(), qId]
        )
        await client.query('DELETE FROM opciones WHERE pregunta_id = $1', [qId])
      } else {
        await client.query(
          `INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden, bloque)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [qId, formularioId, preguntaModelo.getEnunciado(), preguntaModelo.getTipo(), preguntaModelo.getDimension(), preguntaModelo.isObligatoria(), i, preguntaModelo.getBloque()]
        )
      }

      const opciones = preguntaModelo.getOpciones()
      if (Array.isArray(opciones)) {
        for (let j = 0; j < opciones.length; j++) {
          await client.query(
            'INSERT INTO opciones (pregunta_id, orden, texto) VALUES ($1, $2, $3)',
            [qId, j, opciones[j]]
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
}

export const preguntaService = new PreguntaService()
