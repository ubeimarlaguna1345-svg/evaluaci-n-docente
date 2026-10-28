import { authService } from '../services/index.js'

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload)
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export class AuthController {
  static async createUser(req, res) {
    try {
      const user = await authService.crearUsuario(req.body || {})
      return sendJson(res, 201, { ok: true, user })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya existe un usuario registrado con ese correo electrónico.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error interno al guardar en PostgreSQL.', detail: error.message })
    }
  }

  static async getUsers(_req, res) {
    try {
      const users = await authService.obtenerTodos()
      return sendJson(res, 200, { ok: true, users })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al consultar usuarios.', detail: error.message })
    }
  }

  static async authenticateUser(req, res) {
    const { email, password } = req.body || {}
    try {
      const user = await authService.autenticar(email, password)
      return sendJson(res, 200, { ok: true, user })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error en la autenticación.', detail: error.message })
    }
  }

  static async deleteUser(req, res) {
    const { id } = req.params
    try {
      await authService.eliminarUsuario(id)
      return sendJson(res, 200, { ok: true, message: 'Usuario eliminado permanentemente en PostgreSQL.' })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al desactivar usuario.', detail: error.message })
    }
  }

  static async cambiarContrasena(req, res) {
    const { usuarioId, contrasenaActual, nuevaContrasena } = req.body || {}
    try {
      const result = await authService.cambiarContrasena(usuarioId, contrasenaActual, nuevaContrasena)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error interno al cambiar la contraseña.', detail: error.message })
    }
  }
}

export const createUser = AuthController.createUser
export const getUsers = AuthController.getUsers
export const authenticateUser = AuthController.authenticateUser
export const deleteUser = AuthController.deleteUser
export const cambiarContrasena = AuthController.cambiarContrasena
