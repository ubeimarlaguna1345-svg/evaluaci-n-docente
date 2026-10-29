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
  static async getCadis(_req, res) {
    try {
      const cadis = await evaluacionService.obtenerCadis()
      return sendJson(res, 200, { ok: true, cadis })
    } catch (error) {
      console.warn('Aviso en getCadis (PostgreSQL no disponible, devolviendo fallback institucional):', error.message)
      const fallbackCadis = [
        { id: 'cadi-calc-101', codigo: 'MAT101', nombre: 'Cálculo Diferencial', semestre: 1, tipo: 'CADI', esArticulador: false, docenteId: 'doc-salazar' },
        { id: 'cai-lect-101', codigo: 'CAI101', nombre: 'Lectura Crítica y Competencias Comunicativas', semestre: 1, tipo: 'CAI', esArticulador: false, docenteId: 'doc-prieto' },
        { id: 'cai-etica-201', codigo: 'CAI201', nombre: 'Ética y Ciudadanía', semestre: 2, tipo: 'CAI', esArticulador: false, docenteId: 'doc-cifuentes' },
        { id: 'cadi-prog-301', codigo: 'SIS301', nombre: 'Programación II', semestre: 3, tipo: 'CADI', esArticulador: true, docenteId: 'doc-navarro' },
        { id: 'cadi-elec-302', codigo: 'ELC301', nombre: 'Electrónica Básica', semestre: 3, tipo: 'CADI', esArticulador: false, docenteId: 'doc-mendoza' },
      ]
      return sendJson(res, 200, { ok: true, cadis: fallbackCadis })
    }
  }

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
      const { role, rol, ...rest } = req.query || {}
      const userRole = role || rol || (req.user && req.user.role)
      const forms = await evaluacionService.obtenerFormularios({ ...rest, role: userRole })
      return sendJson(res, 200, { ok: true, forms })
    } catch (error) {
      console.warn('Aviso en getForms (PostgreSQL no disponible, devolviendo formulario activo institucional):', error.message)
      const fallbackForms = [
        {
          id: 'form-eval-2026',
          kind: 'evaluacion',
          title: 'Instrumento de Evaluación Integral del Desempeño Docente MEDIT',
          description: 'Evaluación integral de desempeño docente bajo dimensiones MEDIT.',
          period: '2026-II',
          start: '2026-08-01T00:00:00Z',
          end: '2026-11-30T23:59:59Z',
          questions: [],
        },
      ]
      return sendJson(res, 200, { ok: true, forms: fallbackForms })
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

  static async createEvaluacion(req, res) {
    return EvaluacionController.createForm(req, res)
  }

  static async getEvaluaciones(req, res) {
    return EvaluacionController.getForms(req, res)
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
      console.warn('Aviso en getFormResponses (PostgreSQL no disponible, devolviendo lista limpia):', error.message)
      return sendJson(res, 200, { ok: true, responses: [], formResponses: [] })
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

export const getCadis = EvaluacionController.getCadis
export const createCadi = EvaluacionController.createCadi
export const updateCadi = EvaluacionController.updateCadi
export const deleteCadi = EvaluacionController.deleteCadi
export const getForms = EvaluacionController.getForms
export const getEvaluaciones = EvaluacionController.getForms
export const getFormById = EvaluacionController.getFormById
export const createForm = EvaluacionController.createForm
export const createEvaluacion = EvaluacionController.createForm
export const updateForm = EvaluacionController.updateForm
export const updateEvaluacion = EvaluacionController.updateForm
export const deleteForm = EvaluacionController.deleteForm
export const deleteEvaluacion = EvaluacionController.deleteForm
export const updateFormDates = EvaluacionController.updateFormDates
export const getFormResponses = EvaluacionController.getFormResponses
export const createFormResponse = EvaluacionController.createFormResponse
export const createFeedback = EvaluacionController.createFeedback
export const createFeedbackResponse = EvaluacionController.createFeedbackResponse
