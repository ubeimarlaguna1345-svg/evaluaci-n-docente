import express from 'express'
import {
  createCadi,
  updateCadi,
  deleteCadi,
  createForm,
  updateForm,
  deleteForm,
  updateFormDates,
  createFormResponse,
  createFeedback,
  createFeedbackResponse,
} from '../controllers/evaluacionController.js'

export const evaluacionRoutes = express.Router()

evaluacionRoutes.post('/cadis', createCadi)
evaluacionRoutes.put('/cadis/:id', updateCadi)
evaluacionRoutes.patch('/cadis/:id', updateCadi)
evaluacionRoutes.delete('/cadis/:id', deleteCadi)

evaluacionRoutes.post('/forms', createForm)
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
