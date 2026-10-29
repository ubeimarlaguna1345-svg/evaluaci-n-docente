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
  login: async (email: string, password: string, init?: RequestInit): Promise<{ ok: boolean; user: User }> => {
    return apiFetch<{ ok: boolean; user: User }>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      ...init,
    })
  },

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

  cambiarPassword: async (
    usuarioId: string,
    passwordActual: string,
    passwordNueva: string
  ): Promise<{ ok: boolean; success: boolean; message: string }> => {
    const payload = {
      usuarioId,
      passwordActual,
      passwordNueva,
      contrasenaActual: passwordActual,
      nuevaContrasena: passwordNueva,
    }
    try {
      return await apiFetch<{ ok: boolean; success: boolean; message: string }>('/api/auth/cambiar-password', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
    } catch {
      return apiFetch<{ ok: boolean; success: boolean; message: string }>('/api/cambiar-contrasena', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    }
  },

  cambiarContrasena: async (
    usuarioId: string,
    contrasenaActual: string,
    nuevaContrasena: string
  ): Promise<{ ok: boolean; message: string }> => {
    return apiFetch<{ ok: boolean; message: string }>('/api/cambiar-contrasena', {
      method: 'POST',
      body: JSON.stringify({ usuarioId, contrasenaActual, nuevaContrasena }),
    })
  },
}

