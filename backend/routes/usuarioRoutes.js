import express from 'express'
import { createUser, deleteUser, getUsers, authenticateUser } from '../controllers/usuarioController.js'

export const usuarioRoutes = express.Router()

usuarioRoutes.get('/users', getUsers)
usuarioRoutes.post('/users', createUser)
usuarioRoutes.post('/users/login', authenticateUser)
usuarioRoutes.delete('/users/:id', deleteUser)

