import { evaluacionService } from '../services/index.js'

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload)
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export class EvaluacionController {
  static async createCadi(req, res) {
    try {
      const id = await evaluacionService.crearCadi(req.body || {})
      return sendJson(res, 201, { ok: true, id })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya existe un CADI con ese código.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al registrar CADI.', detail: error.message })
    }
  }

  static async updateCadi(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.actualizarCadi(id, req.body || {})
      return sendJson(res, 200, result)
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya existe otro CADI con ese código.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al actualizar CADI.', detail: error.message })
    }
  }

  static async deleteCadi(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.eliminarCadi(id)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al eliminar CADI.', detail: error.message })
    }
  }

  static async getForms(req, res) {
    try {
      const forms = await evaluacionService.obtenerFormularios(req.query || {})
      return sendJson(res, 200, { ok: true, forms })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al obtener formularios.', detail: error.message })
    }
  }

  static async getFormById(req, res) {
    const { id } = req.params
    try {
      const form = await evaluacionService.obtenerFormularioPorId(id)
      return sendJson(res, 200, { ok: true, form })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al obtener formulario.', detail: error.message })
    }
  }

  static async createForm(req, res) {
    try {
      const id = await evaluacionService.crearFormulario(req.body || {})
      return sendJson(res, 201, { ok: true, id })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al crear formulario.', detail: error.message })
    }
  }

  static async updateForm(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.actualizarFormulario(id, req.body || {})
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al actualizar formulario.', detail: error.message })
    }
  }

  static async deleteForm(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.eliminarFormulario(id)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al eliminar formulario.', detail: error.message })
    }
  }

  static async updateFormDates(req, res) {
    const { id } = req.params
    const { start, end } = req.body || {}
    try {
      const result = await evaluacionService.actualizarFechas(id, start, end)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al actualizar fechas.', detail: error.message })
    }
  }

  static async getFormResponses(req, res) {
    try {
      const responses = await evaluacionService.obtenerRespuestas(req.query || {})
      return sendJson(res, 200, { ok: true, responses, formResponses: responses })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al obtener respuestas.', detail: error.message })
    }
  }

  static async createFormResponse(req, res) {
    try {
      const result = await evaluacionService.registrarRespuesta(req.body || {})
      return sendJson(res, 201, { ok: true, ...result })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya has evaluado a este docente en este período.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al registrar evaluación.', detail: error.message })
    }
  }

  static async createFeedback(req, res) {
    try {
      const result = await evaluacionService.crearRetroalimentacion(req.body || {})
      return sendJson(res, 201, { ok: true, ...result })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al crear retroalimentación.', detail: error.message })
    }
  }

  static async createFeedbackResponse(req, res) {
    try {
      const id = await evaluacionService.responderRetroalimentacion(req.body || {})
      return sendJson(res, 201, { ok: true, id })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya respondiste a esta retroalimentación.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al registrar respuesta.', detail: error.message })
    }
  }
}

export const createCadi = EvaluacionController.createCadi
export const updateCadi = EvaluacionController.updateCadi
export const deleteCadi = EvaluacionController.deleteCadi
export const getForms = EvaluacionController.getForms
export const getFormById = EvaluacionController.getFormById
export const createForm = EvaluacionController.createForm
export const updateForm = EvaluacionController.updateForm
export const deleteForm = EvaluacionController.deleteForm
export const updateFormDates = EvaluacionController.updateFormDates
export const getFormResponses = EvaluacionController.getFormResponses
export const createFormResponse = EvaluacionController.createFormResponse
export const createFeedback = EvaluacionController.createFeedback
export const createFeedbackResponse = EvaluacionController.createFeedbackResponse
