import express from 'express'
import {
  getCadis,
  createCadi,
  updateCadi,
  deleteCadi,
  getForms,
  getFormById,
  createForm,
  updateForm,
  deleteForm,
  updateFormDates,
  getFormResponses,
  createFormResponse,
  createFeedback,
  createFeedbackResponse,
} from '../controllers/evaluacionController.js'

export const evaluacionRoutes = express.Router()

evaluacionRoutes.get('/cadis', getCadis)
evaluacionRoutes.post('/cadis', createCadi)
evaluacionRoutes.put('/cadis/:id', updateCadi)
evaluacionRoutes.patch('/cadis/:id', updateCadi)
evaluacionRoutes.delete('/cadis/:id', deleteCadi)

evaluacionRoutes.get('/forms', getForms)
evaluacionRoutes.get('/evaluaciones', getForms)
evaluacionRoutes.get('/evaluaciones/respuestas', getFormResponses)
evaluacionRoutes.get('/form-responses', getFormResponses)
evaluacionRoutes.get('/forms/:id', getFormById)
evaluacionRoutes.get('/evaluaciones/:id', getFormById)
evaluacionRoutes.post('/forms', createForm)
evaluacionRoutes.post('/evaluaciones', createForm)
evaluacionRoutes.put('/forms/:id', updateForm)
evaluacionRoutes.patch('/forms/:id', updateForm)
evaluacionRoutes.put('/evaluaciones/:id', updateForm)
evaluacionRoutes.patch('/evaluaciones/:id', updateForm)
evaluacionRoutes.delete('/forms/:id', deleteForm)
evaluacionRoutes.delete('/evaluaciones/:id', deleteForm)
evaluacionRoutes.patch('/forms/:id/dates', updateFormDates)

evaluacionRoutes.post('/form-responses', createFormResponse)

evaluacionRoutes.post('/feedbacks', createFeedback)
evaluacionRoutes.post('/feedback-responses', createFeedbackResponse)
