import express from 'express'
import { createUser, deleteUser } from '../controllers/usuarioController.js'

export const usuarioRoutes = express.Router()

usuarioRoutes.post('/users', createUser)
usuarioRoutes.delete('/users/:id', deleteUser)
