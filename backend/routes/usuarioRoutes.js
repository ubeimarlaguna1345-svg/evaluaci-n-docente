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

