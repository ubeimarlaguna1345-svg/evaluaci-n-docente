import { reporteService } from '../services/index.js'

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload)
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export class ReporteController {
  static async getHealth(_req, res) {
    try {
      const info = await reporteService.obtenerHealth()
      return sendJson(res, 200, {
        ok: true,
        connected: true,
        database: info.database,
        user: info.user,
      })
    } catch (error) {
      return sendJson(res, 500, {
        ok: false,
        connected: false,
        message: 'No fue posible conectar con PostgreSQL.',
        detail: error.message,
      })
    }
  }

  static async getBootstrap(_req, res) {
    try {
      const data = await reporteService.obtenerBootstrap()
      return sendJson(res, 200, { ok: true, connected: true, ...data })
    } catch (error) {
      return sendJson(res, 500, {
        ok: false,
        connected: false,
        message: 'Error al sincronizar datos desde PostgreSQL.',
        detail: error.message,
      })
    }
  }

  static async executeSql(req, res) {
    const { query } = req.body || {}
    try {
      const result = await reporteService.ejecutarSql(query)
      return sendJson(res, 200, { ok: true, ...result })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message, detail: error.message })
    }
  }

  static async getCalificacionesConsolidadas(req, res) {
    const { periodo } = req.query || {}
    try {
      const calificaciones = await reporteService.obtenerCalificacionesConsolidadas(periodo)
      return sendJson(res, 200, { ok: true, calificaciones })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al obtener calificaciones consolidadas.', detail: error.message })
    }
  }

  static async getReporteMejora(req, res) {
    const { periodo } = req.query || {}
    try {
      const reporte = await reporteService.obtenerReporteMejora(periodo)
      return sendJson(res, 200, { ok: true, reporte })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al generar reporte de mejora.', detail: error.message })
    }
  }
}

export const getHealth = ReporteController.getHealth
export const getBootstrap = ReporteController.getBootstrap
export const executeSql = ReporteController.executeSql
export const getCalificacionesConsolidadas = ReporteController.getCalificacionesConsolidadas
export const getReporteMejora = ReporteController.getReporteMejora
