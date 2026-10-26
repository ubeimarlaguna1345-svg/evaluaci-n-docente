import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { UsuarioFactory } from '../models/index.js'

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload)
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export async function createUser(req, res) {
  const { name, email, password, role, sede, carrera } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password || !role) {
    return sendJson(res, 400, { ok: false, message: 'Todos los campos son obligatorios.' })
  }

  try {
    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)
    const usuarioDominio = UsuarioFactory.crearUsuario({
      id,
      nombre: name.trim(),
      correo: email.trim().toLowerCase(),
      rol: role,
      sede: sede?.trim() || 'Sede Facatativá',
      carrera: carrera?.trim() || 'Ingeniería de Sistemas y Computación',
    })

    const query = `
      INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, activo, sede, carrera)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
      RETURNING id, nombre AS name, correo AS email, contrasena AS password, rol AS role, activo AS active, sede, carrera
    `
    const result = await pool.query(query, [
      usuarioDominio.getId(),
      usuarioDominio.getNombre(),
      usuarioDominio.getCorreo(),
      password,
      passwordHash,
      usuarioDominio.getRol(),
      sede?.trim() || 'Sede Facatativá',
      carrera?.trim() || 'Ingeniería de Sistemas y Computación',
    ])

    const usuarioInstanciado = UsuarioFactory.crearUsuario(result.rows[0])

    sendJson(res, 201, {
      ok: true,
      user: {
        ...result.rows[0],
        permisos: usuarioInstanciado.obtenerPermisos(),
      },
    })
  } catch (error) {
    if (error.code === '23505') {
      return sendJson(res, 409, { ok: false, message: 'Ya existe un usuario registrado con ese correo electrónico.' })
    }
    console.error('Error al crear usuario en PostgreSQL:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error interno al guardar en PostgreSQL.', detail: error.message })
  }
}

export async function getUsers(_req, res) {
  try {
    const result = await pool.query(
      "SELECT id, nombre AS name, correo AS email, rol AS role, activo AS active, COALESCE(sede, 'Sede Facatativá') AS sede, COALESCE(carrera, 'Ingeniería de Sistemas y Computación') AS carrera FROM usuarios WHERE activo = TRUE ORDER BY nombre"
    )
    const usuarios = result.rows.map((row) => UsuarioFactory.crearUsuario(row).toJSON())
    sendJson(res, 200, { ok: true, users: usuarios })
  } catch (error) {
    console.error('Error al consultar usuarios:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al consultar usuarios.', detail: error.message })
  }
}

export async function authenticateUser(req, res) {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return sendJson(res, 400, { ok: false, message: 'Correo y contraseña requeridos.' })
  }

  let searchEmail = (email || '').trim().toLowerCase()
  if (searchEmail === 'uberadmin.siard@ucundinamarac.edu.co') {
    searchEmail = 'uberadmin.siard@ucundinamarca.edu.co'
  }

  try {
    const result = await pool.query(
      'SELECT id, nombre AS name, correo AS email, contrasena AS password, contrasena_hash, rol AS role, activo AS active, sede, carrera FROM usuarios WHERE LOWER(correo) = $1',
      [searchEmail]
    )

    if (result.rows.length === 0) {
      return sendJson(res, 401, { ok: false, message: 'Credenciales inválidas.' })
    }

    const row = result.rows[0]
    const passwordMatch = row.contrasena_hash
      ? await bcrypt.compare(password, row.contrasena_hash)
      : row.password === password

    if (!passwordMatch) {
      return sendJson(res, 401, { ok: false, message: 'Credenciales inválidas.' })
    }

    const usuario = UsuarioFactory.crearUsuario(row)
    sendJson(res, 200, {
      ok: true,
      user: usuario.toJSON(),
    })
  } catch (error) {
    console.error('Error al autenticar usuario:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error en la autenticación.', detail: error.message })
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params
  try {
    await pool.query('UPDATE cadis SET docente_id = NULL WHERE docente_id = $1', [id])
    await pool.query('DELETE FROM respuestas_formulario WHERE usuario_id = $1 OR docente_id = $1', [id])
    await pool.query('DELETE FROM respuestas_retroalimentacion WHERE estudiante_id = $1', [id])
    await pool.query('DELETE FROM retroalimentaciones WHERE docente_id = $1', [id])
    const delRes = await pool.query('DELETE FROM usuarios WHERE id = $1', [id])
    if (delRes.rowCount === 0) {
      await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [id])
    }
    sendJson(res, 200, { ok: true, message: 'Usuario eliminado permanentemente en PostgreSQL.' })
  } catch (error) {
    console.error('Error al dar de baja usuario:', error.message)
    sendJson(res, 500, { ok: false, message: 'Error al desactivar usuario.', detail: error.message })
  }
}

export async function cambiarContrasena(req, res) {
  const { usuarioId, contrasenaActual, nuevaContrasena } = req.body || {}

  if (!usuarioId || !contrasenaActual || !nuevaContrasena) {
    return sendJson(res, 400, { ok: false, message: 'Todos los campos son obligatorios.' })
  }

  if (typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 6) {
    return sendJson(res, 400, { ok: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' })
  }

  try {
    const result = await pool.query(
      'SELECT id, contrasena, contrasena_hash FROM usuarios WHERE id = $1',
      [usuarioId]
    )

    if (result.rows.length === 0) {
      return sendJson(res, 404, { ok: false, message: 'Usuario no encontrado.' })
    }

    const row = result.rows[0]
    const passwordMatch = row.contrasena_hash
      ? await bcrypt.compare(contrasenaActual, row.contrasena_hash)
      : row.contrasena === contrasenaActual

    if (!passwordMatch) {
      return sendJson(res, 400, { ok: false, message: 'La contraseña actual es incorrecta' })
    }

    const nuevoHash = await bcrypt.hash(nuevaContrasena, 10)
    await pool.query(
      'UPDATE usuarios SET contrasena = $1, contrasena_hash = $2 WHERE id = $3',
      [nuevaContrasena, nuevoHash, usuarioId]
    )

    return sendJson(res, 200, { ok: true, message: 'Contraseña actualizada con éxito' })
  } catch (error) {
    console.error('Error al cambiar contraseña:', error.message)
    return sendJson(res, 500, { ok: false, message: 'Error interno al cambiar la contraseña.', detail: error.message })
  }
}
