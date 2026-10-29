import express from 'express'
import { usuarioRoutes } from './usuarioRoutes.js'
import { authRoutes } from './authRoutes.js'
import { evaluacionRoutes } from './evaluacionRoutes.js'
import { reporteRoutes } from './reporteRoutes.js'

export const apiRouter = express.Router()

apiRouter.use(express.json())

apiRouter.use(usuarioRoutes)
apiRouter.use(authRoutes)
apiRouter.use(evaluacionRoutes)
apiRouter.use(reporteRoutes)

export default apiRouter
