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
    userOrId: string | { id?: string; email?: string },
    passwordActual: string,
    passwordNueva: string
  ): Promise<{ ok: boolean; success: boolean; message: string }> => {
    const id = typeof userOrId === 'object' ? userOrId.id : userOrId
    const email = typeof userOrId === 'object' ? userOrId.email : undefined

    let token = ''
    try {
      if (typeof sessionStorage !== 'undefined') {
        token = sessionStorage.getItem('token') || sessionStorage.getItem('siard_token') || ''
      }
      if (!token && typeof localStorage !== 'undefined') {
        token = localStorage.getItem('token') || localStorage.getItem('siard_token') || ''
      }
    } catch {}

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const payload = {
      id,
      email,
      usuarioId: id,
      passwordActual,
      passwordNueva,
      contrasenaActual: passwordActual,
      nuevaContrasena: passwordNueva,
    }

    try {
      return await apiFetch<{ ok: boolean; success: boolean; message: string }>('/api/auth/cambiar-password', {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload),
      })
    } catch (err: any) {
      if (err?.message && (err.message.includes('incorrecta') || err.message.includes('no encontrado') || err.message.includes('caracteres'))) {
        throw err
      }
      return apiFetch<{ ok: boolean; success: boolean; message: string }>('/api/cambiar-contrasena', {
        method: 'POST',
        headers,
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

