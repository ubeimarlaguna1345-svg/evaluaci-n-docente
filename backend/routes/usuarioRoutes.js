import express from 'express'
import {
  createUser,
  deleteUser,
  getUsers,
  authenticateUser,
  cambiarContrasena,
} from '../controllers/usuarioController.js'

export const usuarioRoutes = express.Router()
const router = usuarioRoutes

router.get('/users', getUsers)
router.post('/users', createUser)
router.post('/users/login', authenticateUser)
router.delete('/users/:id', deleteUser)
router.post('/cambiar-contrasena', cambiarContrasena)
router.put('/cambiar-contrasena', cambiarContrasena)
router.put('/auth/cambiar-password', cambiarContrasena)
router.post('/auth/cambiar-password', cambiarContrasena)
router.put('/usuarios/cambiar-password', cambiarContrasena)
router.post('/usuarios/cambiar-password', cambiarContrasena)
router.put('/cambiar-password', cambiarContrasena)
router.post('/cambiar-password', cambiarContrasena)

