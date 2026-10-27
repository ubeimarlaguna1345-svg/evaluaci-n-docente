import { apiFetch } from './api'
import type { Form, FormResponse, CADI, Feedback, Question } from '../store'

export const evaluacionService = {
  createCADI: async (c: Omit<CADI, 'id'>): Promise<{ ok: boolean; id: string }> => {
    return apiFetch<{ ok: boolean; id: string }>('/api/cadis', {
      method: 'POST',
      body: JSON.stringify(c),
    })
  },

  updateCADI: async (id: string, c: Partial<Omit<CADI, 'id'>>): Promise<{ ok: boolean; message: string }> => {
    return apiFetch<{ ok: boolean; message: string }>(`/api/cadis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(c),
    })
  },

  deleteCADI: async (id: string): Promise<{ ok: boolean; message: string }> => {
    return apiFetch<{ ok: boolean; message: string }>(`/api/cadis/${id}`, {
      method: 'DELETE',
    })
  },

  assignCadiDocente: async (cadiId: string, docenteId: string | null): Promise<{ ok: boolean }> => {
    return apiFetch<{ ok: boolean }>(`/api/cadis/${cadiId}`, {
      method: 'PATCH',
      body: JSON.stringify({ docenteId }),
    })
  },

  assignCadiTeacher: async (cadiId: string, docenteId: string | null): Promise<{ ok: boolean }> => {
    return evaluacionService.assignCadiDocente(cadiId, docenteId)
  },

  createForm: async (f: Omit<Form, 'id'>): Promise<{ ok: boolean; id: string }> => {
    return apiFetch<{ ok: boolean; id: string }>('/api/forms', {
      method: 'POST',
      body: JSON.stringify(f),
    })
  },

  updateForm: async (id: string, f: Omit<Form, 'id'>): Promise<{ ok: boolean; message: string }> => {
    return apiFetch<{ ok: boolean; message: string }>(`/api/forms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(f),
    })
  },

  deleteForm: async (id: string): Promise<{ ok: boolean; message: string }> => {
    return apiFetch<{ ok: boolean; message: string }>(`/api/forms/${id}`, {
      method: 'DELETE',
    })
  },

  setFormDates: async (id: string, start: string, end: string): Promise<{ ok: boolean }> => {
    return apiFetch<{ ok: boolean }>(`/api/forms/${id}/dates`, {
      method: 'PATCH',
      body: JSON.stringify({ start, end }),
    })
  },

  respondForm: async (r: Omit<FormResponse, 'id' | 'date'>): Promise<{ ok: boolean; id: string }> => {
    return apiFetch<{ ok: boolean; id: string }>('/api/form-responses', {
      method: 'POST',
      body: JSON.stringify(r),
    })
  },

  createFeedback: async (
    b:
      | (Omit<Feedback, 'id' | 'createdAt'> & { questions?: Question[] })
      | { docenteId?: string; teacherId?: string; course: string; questions: Question[]; start: string; end: string }
  ): Promise<{ ok: boolean; ids?: string[]; id?: string }> => {
    return apiFetch<{ ok: boolean; ids?: string[]; id?: string }>('/api/feedbacks', {
      method: 'POST',
      body: JSON.stringify(b),
    })
  },


  respondFeedback: async (feedbackId: string, studentId: string, value: string): Promise<{ ok: boolean; id: string }> => {
    return apiFetch<{ ok: boolean; id: string }>('/api/feedback-responses', {
      method: 'POST',
      body: JSON.stringify({ feedbackId, studentId, value }),
    })
  },
}
