import { apiFetch } from './api'
import type { DB } from '../store'

export interface ConsolidatedResponse {
  ok: boolean
  data: Array<{
    docenteId?: string
    teacherId: string
    docenteName?: string
    teacherName: string
    email: string
    sede?: string
    carrera?: string
    studentAvg: number | null
    studentWeighted: number | null
    autoAvg: number | null
    autoWeighted: number | null
    finalScore: number
    isProvisional: boolean
    status: string
    statusLabel: string
    hasEvaluations: boolean
    requierePlanMejora: boolean
    studentResponsesCount: number
    autoResponsesCount: number
  }>
}

export interface ImprovementReportResponse {
  ok: boolean
  data: Array<{
    docenteId?: string
    teacherId: string
    docenteName?: string
    teacherName: string
    email: string
    sede?: string
    carrera?: string
    studentAvg: number | null
    studentWeighted: number | null
    autoAvg: number | null
    autoWeighted: number | null
    finalScore: number
    isProvisional: boolean
    status: string
    statusLabel: string
    hasEvaluations: boolean
    requierePlanMejora: boolean
    dimensiones: Array<{
      dimension: string
      avg: number
      count: number
      esCritica: boolean
    }>
    dimensionesCriticas: Array<{
      dimension: string
      avg: number
      count: number
      esCritica: boolean
    }>
  }>
  message?: string
}

export interface SqlResult {
  ok: boolean
  columns: string[]
  values: unknown[][]
  rowCount?: number
  message?: string
}

export const reporteService = {
  getBootstrap: async (): Promise<DB> => {
    return apiFetch<DB>('/api/bootstrap')
  },

  getHealth: async (): Promise<{ ok: boolean; connected: boolean; database?: string; user?: string }> => {
    return apiFetch<{ ok: boolean; connected: boolean; database?: string; user?: string }>('/api/health')
  },

  getCalificacionesConsolidadas: async (period?: string): Promise<ConsolidatedResponse> => {
    const query = period ? `?period=${encodeURIComponent(period)}` : ''
    return apiFetch<ConsolidatedResponse>(`/api/calificaciones-consolidadas${query}`)
  },

  getReporteMejora: async (period?: string): Promise<ImprovementReportResponse> => {
    const query = period ? `?period=${encodeURIComponent(period)}` : ''
    return apiFetch<ImprovementReportResponse>(`/api/reporte-mejora${query}`)
  },

  executeSql: async (query: string): Promise<SqlResult> => {
    return apiFetch<SqlResult>('/api/sql', {
      method: 'POST',
      body: JSON.stringify({ query }),
    })
  },
}
