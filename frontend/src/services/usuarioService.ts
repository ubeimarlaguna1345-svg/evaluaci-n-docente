import { apiFetch } from './api'
import type { User } from '../store'

export interface CreateUserData {
  name: string
  email: string
  password: string
  role: string
  sede?: string
  carrera?: string
}

export const usuarioService = {
  createUser: async (data: CreateUserData): Promise<{ ok: boolean; user: User }> => {
    return apiFetch<{ ok: boolean; user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  deleteUser: async (id: string): Promise<{ ok: boolean; message: string }> => {
    return apiFetch<{ ok: boolean; message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    })
  },
}
