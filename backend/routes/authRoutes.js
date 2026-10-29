import express from 'express'
import { cambiarContrasena, authenticateUser } from '../controllers/usuarioController.js'

export const authRoutes = express.Router()

authRoutes.put('/auth/cambiar-password', cambiarContrasena)
authRoutes.post('/auth/cambiar-password', cambiarContrasena)
authRoutes.put('/cambiar-password', cambiarContrasena)
authRoutes.post('/cambiar-password', cambiarContrasena)
authRoutes.post('/login', authenticateUser)

export default authRoutes

