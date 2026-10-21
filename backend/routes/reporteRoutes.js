import express from 'express'
import {
  getHealth,
  getBootstrap,
  executeSql,
  getCalificacionesConsolidadas,
  getReporteMejora,
} from '../controllers/reporteController.js'

export const reporteRoutes = express.Router()

reporteRoutes.get('/health', getHealth)
reporteRoutes.get('/bootstrap', getBootstrap)
reporteRoutes.post('/sql', executeSql)
reporteRoutes.get('/calificaciones-consolidadas', getCalificacionesConsolidadas)
reporteRoutes.get('/reporte-mejora', getReporteMejora)
