import { useEffect, useState } from 'react'

export type Role = 'admin' | 'directivo' | 'coordinador' | 'docente' | 'estudiante'
export type AnswerType = 'escala' | 'seleccion' | 'texto'
export type FormKind = 'evaluacion' | 'autoevaluacion'

export interface User { id: string; name: string; email: string; password: string; role: Role; active: boolean; sede?: string; carrera?: string }
export interface CADI { id: string; codigo: string; nombre: string; semestre: number; esArticulador?: boolean; docenteId?: string | null }
export interface Question { id: string; text: string; type: AnswerType; options: string[]; required: boolean; dimension?: string }
export interface Feedback { id: string; teacherId: string; course: string; question: Question; start: string; end: string; createdAt: string }
export interface FeedbackResponse { id: string; feedbackId: string; studentId: string; value: string; date: string }
export interface Form { id: string; kind: FormKind; title: string; description: string; period: string; cadiId?: string; start: string; end: string; questions: Question[] }
export interface FormResponse { id: string; formId: string; userId: string; teacherId: string; answers: Record<string, string>; observation: string; date: string }

export interface DB {
  users: User[]
  cadis: CADI[]
  feedbacks: Feedback[]
  feedbackResponses: FeedbackResponse[]
  forms: Form[]
  formResponses: FormResponse[]
  connected: boolean
  loading: boolean
  error: string | null
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrador',
  directivo: 'Directivo / Decanatura',
  coordinador: 'Coordinador',
  docente: 'Docente',
  estudiante: 'Estudiante',
}

export const OBS_LIMIT = 500

export const MEDIT_DIMENSIONES = [
  'Pedagógica y Didáctica',
  'Disciplinar e Investigativa',
  'Relacional y Comunicación',
  'Ética y Transmoderna',
] as const

// Estado inicial en cero (Inicio limpio sin datos quemados / mock data)
let state: DB = {
  users: [],
  cadis: [],
  feedbacks: [],
  feedbackResponses: [],
  forms: [],
  formResponses: [],
  connected: false,
  loading: true,
  error: null,
}

const subs = new Set<() => void>()
const notify = () => subs.forEach((fn) => fn())

/** Inicializa la conexión y carga los datos desde PostgreSQL real */
export async function initDB() {
  state.loading = true
  notify()

  try {
    const res = await fetch('/api/bootstrap')
    if (!res.ok) {
      throw new Error(`Error HTTP ${res.status}: Fallo de conexión con la API de PostgreSQL`)
    }
    const data = await res.json()
    if (!data.ok) {
      throw new Error(data.message || 'No fue posible conectar con PostgreSQL.')
    }

    state = {
      users: data.users || [],
      cadis: data.cadis || [],
      forms: data.forms || [],
      formResponses: data.formResponses || [],
      feedbacks: data.feedbacks || [],
      feedbackResponses: data.feedbackResponses || [],
      connected: true,
      loading: false,
      error: null,
    }
    notify()
  } catch (err) {
    console.error('Error al inicializar PostgreSQL:', err)
    state = {
      ...state,
      connected: false,
      loading: false,
      error: (err as Error).message,
    }
    notify()
  }
}

/** Acciones que interactúan directamente con la base de datos PostgreSQL */
export const actions = {
  createUser: async (u: Omit<User, 'id' | 'active'>) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(u),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al crear usuario en PostgreSQL.')
    if (data.user) {
      state.users = [...state.users, data.user]
      notify()
    } else {
      await initDB()
    }
  },

  deactivateUser: async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || 'Error al desactivar usuario en PostgreSQL.')
    }
    state.users = state.users.map((u) => (u.id === id ? { ...u, active: false } : u))
    notify()
  },

  createForm: async (f: Omit<Form, 'id'>) => {
    const res = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al guardar formulario en PostgreSQL.')
    await initDB()
  },

  updateForm: async (id: string, f: Omit<Form, 'id'>) => {
    const res = await fetch(`/api/forms/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Error al actualizar formulario en PostgreSQL.')
    await initDB()
  },

  deleteForm: async (id: string) => {
    const res = await fetch(`/api/forms/${id}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Error al eliminar formulario en PostgreSQL.')
    await initDB()
  },

  setFormDates: async (id: string, start: string, end: string) => {
    const res = await fetch(`/api/forms/${id}/dates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, end }),
    })
    if (!res.ok) throw new Error('Error al actualizar fechas en PostgreSQL.')
    state.forms = state.forms.map((f) => (f.id === id ? { ...f, start, end } : f))
    notify()
  },

  respondForm: async (r: Omit<FormResponse, 'id' | 'date'>) => {
    const res = await fetch('/api/form-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(r),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al registrar evaluación en PostgreSQL.')
    await initDB()
  },

  createCADI: async (c: Omit<CADI, 'id'>) => {
    const res = await fetch('/api/cadis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al registrar CADI en PostgreSQL.')
    await initDB()
  },

  updateCADI: async (id: string, c: Partial<Omit<CADI, 'id'>>) => {
    const res = await fetch(`/api/cadis/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(c),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Error al actualizar CADI en PostgreSQL.')
    await initDB()
  },

  deleteCADI: async (id: string) => {
    const res = await fetch(`/api/cadis/${id}`, {
      method: 'DELETE',
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.message || 'Error al eliminar CADI en PostgreSQL.')
    await initDB()
  },

  assignCadiTeacher: async (cadiId: string, docenteId: string | null) => {
    const res = await fetch(`/api/cadis/${cadiId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docenteId }),
    })
    if (!res.ok) throw new Error('Error al asignar docente en PostgreSQL.')
    state.cadis = state.cadis.map((c) => (c.id === cadiId ? { ...c, docenteId: docenteId || undefined } : c))
    notify()
  },

  createFeedback: async (b: (Omit<Feedback, 'id' | 'createdAt'> & { questions?: Question[] }) | { teacherId: string; course: string; questions: Question[]; start: string; end: string }) => {
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(b),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al crear retroalimentación en PostgreSQL.')
    await initDB()
  },

  respondFeedback: async (feedbackId: string, studentId: string, value: string) => {
    const res = await fetch('/api/feedback-responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackId, studentId, value }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error al responder retroalimentación en PostgreSQL.')
    await initDB()
  },
}

/** Consola SQL PostgreSQL: ejecuta cualquier consulta contra PostgreSQL real */
export async function execRaw(query: string): Promise<{ columns: string[]; values: unknown[][] }> {
  const res = await fetch('/api/sql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  if (!res.ok || !data.ok) {
    throw new Error(data.message || 'Error al ejecutar consulta en PostgreSQL.')
  }
  // Si fue una mutación (INSERT, UPDATE, DELETE), sincronizamos el estado reactivo
  if (!/^\s*select/i.test(query)) {
    initDB()
  }
  return {
    columns: data.columns || [],
    values: data.values || [],
  }
}

export function useDB() {
  const [, force] = useState(0)
  useEffect(() => {
    const s = () => force((n) => n + 1)
    subs.add(s)
    return () => { subs.delete(s) }
  }, [])
  return state
}

export const isOpen = (start: string, end: string) => {
  const n = new Date().toISOString().slice(0, 16)
  return n >= start && n <= end
}

export const fmt = (s: string) =>
  new Date(s).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/** Promedio por pregunta de escala para un formulario y (opcionalmente) un docente */
export function stats(db: DB, formId: string, teacherId?: string) {
  const form = db.forms.find((f) => f.id === formId)
  if (!form) return null

  const rs = db.formResponses.filter(
    (r) => r.formId === formId && (!teacherId || r.teacherId === teacherId)
  )

  const scaleQuestions = form.questions.filter((x) => x.type === 'escala')

  const perQ = scaleQuestions.map((q) => {
    const values: number[] = []
    rs.forEach((r) => {
      const val = Number(r.answers[q.id])
      if (!isNaN(val) && val > 0) values.push(val)
    })
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
    return { question: q, avg, n: values.length }
  })

  const valid = perQ.filter((p) => p.n > 0)
  const overall = valid.length ? valid.reduce((a, b) => a + b.avg, 0) / valid.length : 0

  // Ponderación institucional PGC: 20% de la nota final del CADI Articulador (Numeral 13 Lineamientos UdeC)
  const pgcPonderado20 = Number((overall * 0.20).toFixed(2))

  // Agrupación por dimensiones MEDIT
  const porDimension: Record<string, { avg: number; count: number; items: typeof perQ }> = {}
  perQ.forEach((pq) => {
    const dim = pq.question.dimension || 'General'
    if (!porDimension[dim]) porDimension[dim] = { avg: 0, count: 0, items: [] }
    porDimension[dim].items.push(pq)
  })

  Object.keys(porDimension).forEach((dim) => {
    const validItems = porDimension[dim].items.filter((x) => x.n > 0)
    porDimension[dim].avg = validItems.length
      ? Number((validItems.reduce((acc, curr) => acc + curr.avg, 0) / validItems.length).toFixed(2))
      : 0
    porDimension[dim].count = porDimension[dim].items.length
  })

  const consolidatedGrade = teacherId ? getTeacherConsolidatedGrade(db, teacherId, form.period) : null

  return { form, responses: rs, perQ, overall, pgcPonderado20, porDimension, consolidatedGrade }
}

export interface TeacherGradeConsolidated {
  teacherId: string
  studentAvg: number | null
  studentWeighted: number | null // Ponderado 70% (factor 0.70)
  autoAvg: number | null
  autoWeighted: number | null    // Ponderado 30% (factor 0.30)
  finalScore: number             // Nota final consolidada o provisional sobre 5.0
  hasEvaluations: boolean
  isProvisional: boolean
  status: 'completo' | 'pendiente_autoevaluacion' | 'pendiente_estudiantes' | 'sin_evaluar'
  statusLabel: string
  requierePlanMejora: boolean    // true únicamente si hasEvaluations y finalScore <= 3.9
  studentResponsesCount: number
  autoResponsesCount: number
}

/**
 * Función pura que calcula la nota consolidada aplicando la ponderación académica:
 * - Evaluación Docente (Estudiantes): 70% (factor 0.70)
 * - Autoevaluación Docente: 30% (factor 0.30)
 * Fórmula: Nota Final Consolidada = (Promedio Estudiantes * 0.70) + (Promedio Autoevaluación * 0.30)
 * Manejo de casos incompletos: nota provisional sobre escala 5.0 conservando dos decimales.
 */
export function calculateConsolidatedGrade(
  studentAvg: number | null,
  autoAvg: number | null,
  teacherId: string = '',
  studentResponsesCount: number = 0,
  autoResponsesCount: number = 0
): TeacherGradeConsolidated {
  const hasStudent = studentAvg !== null && !isNaN(studentAvg) && studentAvg > 0
  const hasAuto = autoAvg !== null && !isNaN(autoAvg) && autoAvg > 0

  if (hasStudent && hasAuto) {
    const sAvg = Number(studentAvg.toFixed(2))
    const aAvg = Number(autoAvg.toFixed(2))
    const studentWeighted = Number((sAvg * 0.70).toFixed(2))
    const autoWeighted = Number((aAvg * 0.30).toFixed(2))
    const finalScore = Number(((sAvg * 0.70) + (aAvg * 0.30)).toFixed(2))
    return {
      teacherId,
      studentAvg: sAvg,
      studentWeighted,
      autoAvg: aAvg,
      autoWeighted,
      finalScore,
      hasEvaluations: true,
      isProvisional: false,
      status: 'completo',
      statusLabel: 'Consolidado (100%)',
      requierePlanMejora: finalScore <= 3.9,
      studentResponsesCount,
      autoResponsesCount,
    }
  }

  if (hasStudent && !hasAuto) {
    const sAvg = Number(studentAvg.toFixed(2))
    const studentWeighted = Number((sAvg * 0.70).toFixed(2))
    const finalScore = sAvg // Provisional sobre escala 5.0
    return {
      teacherId,
      studentAvg: sAvg,
      studentWeighted,
      autoAvg: null,
      autoWeighted: null,
      finalScore,
      hasEvaluations: true,
      isProvisional: true,
      status: 'pendiente_autoevaluacion',
      statusLabel: 'Pendiente Autoevaluación',
      requierePlanMejora: finalScore <= 3.9,
      studentResponsesCount,
      autoResponsesCount,
    }
  }

  if (!hasStudent && hasAuto) {
    const aAvg = Number(autoAvg.toFixed(2))
    const autoWeighted = Number((aAvg * 0.30).toFixed(2))
    const finalScore = aAvg // Provisional sobre escala 5.0
    return {
      teacherId,
      studentAvg: null,
      studentWeighted: null,
      autoAvg: aAvg,
      autoWeighted,
      finalScore,
      hasEvaluations: true,
      isProvisional: true,
      status: 'pendiente_estudiantes',
      statusLabel: 'Pendiente Estudiantes',
      requierePlanMejora: finalScore <= 3.9,
      studentResponsesCount,
      autoResponsesCount,
    }
  }

  return {
    teacherId,
    studentAvg: null,
    studentWeighted: null,
    autoAvg: null,
    autoWeighted: null,
    finalScore: 0,
    hasEvaluations: false,
    isProvisional: false,
    status: 'sin_evaluar',
    statusLabel: 'Sin evaluar',
    requierePlanMejora: false,
    studentResponsesCount: 0,
    autoResponsesCount: 0,
  }
}

/**
 * Obtiene la calificación consolidada (70% Estudiantes - 30% Autoevaluación) de un docente
 * a partir de la base de datos, opcionalmente filtrada por período.
 */
export function getTeacherConsolidatedGrade(
  db: DB,
  teacherId: string,
  period?: string
): TeacherGradeConsolidated {
  // 1. Evaluaciones de estudiantes (formularios tipo 'evaluacion')
  const evalForms = db.forms.filter(
    (f) => f.kind === 'evaluacion' && (!period || f.period === period)
  )
  const evalFormIds = new Set(evalForms.map((f) => f.id))
  const evalResponses = db.formResponses.filter(
    (r) => r.teacherId === teacherId && evalFormIds.has(r.formId)
  )

  const studentValues: number[] = []
  evalResponses.forEach((r) => {
    const form = evalForms.find((f) => f.id === r.formId)
    if (!form) return
    const scaleQuestionIds = new Set(
      form.questions.filter((q) => q.type === 'escala').map((q) => q.id)
    )
    Object.entries(r.answers).forEach(([qId, val]) => {
      if (scaleQuestionIds.has(qId)) {
        const num = Number(val)
        if (!isNaN(num) && num > 0) studentValues.push(num)
      }
    })
  })

  const studentAvg = studentValues.length
    ? Number((studentValues.reduce((a, b) => a + b, 0) / studentValues.length).toFixed(2))
    : null

  // 2. Autoevaluaciones del docente (formularios tipo 'autoevaluacion')
  const autoForms = db.forms.filter(
    (f) => f.kind === 'autoevaluacion' && (!period || f.period === period)
  )
  const autoFormIds = new Set(autoForms.map((f) => f.id))
  const autoResponses = db.formResponses.filter(
    (r) => (r.teacherId === teacherId || r.userId === teacherId) && autoFormIds.has(r.formId)
  )

  const autoValues: number[] = []
  autoResponses.forEach((r) => {
    const form = autoForms.find((f) => f.id === r.formId)
    if (!form) return
    const scaleQuestionIds = new Set(
      form.questions.filter((q) => q.type === 'escala').map((q) => q.id)
    )
    Object.entries(r.answers).forEach(([qId, val]) => {
      if (scaleQuestionIds.has(qId)) {
        const num = Number(val)
        if (!isNaN(num) && num > 0) autoValues.push(num)
      }
    })
  })

  const autoAvg = autoValues.length
    ? Number((autoValues.reduce((a, b) => a + b, 0) / autoValues.length).toFixed(2))
    : null

  return calculateConsolidatedGrade(
    studentAvg,
    autoAvg,
    teacherId,
    evalResponses.length,
    autoResponses.length
  )
}

export interface TeacherReputation {
  avg: number
  totalResponses: number
  label: string
  badgeClass: string
  isTop: boolean
  consolidated: TeacherGradeConsolidated
}

/** Calcula la reputación de un docente a partir de su calificación consolidada (70% - 30%) */
export function getTeacherReputation(db: DB, teacherId: string): TeacherReputation {
  const consolidated = getTeacherConsolidatedGrade(db, teacherId)
  const totalResponses = consolidated.studentResponsesCount + consolidated.autoResponsesCount
  const avg = consolidated.finalScore

  if (!consolidated.hasEvaluations || totalResponses === 0) {
    return {
      avg: 0,
      totalResponses: 0,
      label: 'Sin evaluar',
      badgeClass: 'bg-paper text-ink/50 border border-line',
      isTop: false,
      consolidated,
    }
  }

  if (avg >= 4.5) {
    return {
      avg,
      totalResponses,
      label: '⭐ Destacado',
      badgeClass: 'bg-moss/20 text-pine border border-moss/40 font-semibold shadow-xs',
      isTop: true,
      consolidated,
    }
  } else if (avg >= 4.0) {
    return {
      avg,
      totalResponses,
      label: '✓ Sobresaliente',
      badgeClass: 'bg-pine/10 text-pine border border-pine/30 font-medium',
      isTop: false,
      consolidated,
    }
  } else if (avg >= 3.0) {
    return {
      avg,
      totalResponses,
      label: 'Aceptable',
      badgeClass: 'bg-ochre/15 text-ochre border border-ochre/40 font-medium',
      isTop: false,
      consolidated,
    }
  } else {
    return {
      avg,
      totalResponses,
      label: '⚠️ En Seguimiento',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200 font-medium',
      isTop: false,
      consolidated,
    }
  }
}

/** Métrica consolidada para el Módulo Directivo (Decanatura / Consejo de Facultad) */
export function getFacultyGlobalMetrics(db: DB) {
  const teachers = db.users
    .filter((u) => u.role === 'docente' && u.active)
    .map((t) => {
      const rep = getTeacherReputation(db, t.id)
      const cadi = db.cadis.find((c) => c.docenteId === t.id)
      return {
        teacher: t,
        cadi,
        ...rep,
      }
    })
    .sort((a, b) => b.avg - a.avg)

  const teachersWithScores = teachers.filter((t) => t.consolidated.hasEvaluations && t.totalResponses > 0)
  const overallAvg = teachersWithScores.length
    ? Number((teachersWithScores.reduce((acc, t) => acc + t.avg, 0) / teachersWithScores.length).toFixed(2))
    : 0

  const evaluatedStudents = new Set(
    db.formResponses
      .filter((r) => db.users.find((u) => u.id === r.userId)?.role === 'estudiante')
      .map((r) => r.userId)
  ).size

  const totalEvaluations = db.formResponses.length
  const topTeachersCount = teachers.filter((t) => t.avg >= 4.5).length

  return {
    overallAvg,
    evaluatedStudents,
    totalEvaluations,
    teachers,
    topTeachersCount,
  }
}
