import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

/**
 * Crear nuevo usuario en PostgreSQL
 * POST /api/users
 */
export async function createUser(req, res) {
  const { name, email, password, role, sede, carrera } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password || !role) {
    return sendJson(res, 400, { ok: false, message: 'Todos los campos son obligatorios.' })
  }

  try {
    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)

    const query = `
      INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, activo, sede, carrera)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
      RETURNING id, nombre AS name, correo AS email, contrasena AS password, rol AS role, activo AS active, sede, carrera
    `
    const result = await pool.query(query, [
      id,
      name.trim(),
      email.trim().toLowerCase(),
      password,
      passwordHash,
      role,
      sede?.trim() || 'Sede Facatativá',
      carrera?.trim() || 'Ingeniería de Sistemas y Computación',
    ])

    sendJson(res, 201, { ok: true, user: result.rows[0] })
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya existe un usuario registrado con ese correo electrónico.' })
    }
    console.error('Error al crear usuario en PostgreSQL:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error interno al guardar en PostgreSQL.', detail: error.message })
  }
}

/**
 * Desactivar / dar de baja usuario
 * DELETE /api/users/:id
 */
export async function deleteUser(req, res) {
  const { id } = req.params
  try {
    await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [id])
    sendJson(res, 200, { ok: true, message: 'Usuario desactivado correctamente en PostgreSQL.' })
  } catch (error) {
    console.error('Error al dar de baja usuario:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al desactivar usuario.', detail: error.message })
  }
}
