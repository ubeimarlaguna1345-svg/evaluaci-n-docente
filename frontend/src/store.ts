import { useEffect, useState } from 'react'
import {
  usuarioService,
  evaluacionService,
  reporteService,
} from './services'

export type Role = 'admin' | 'coordinador' | 'docente' | 'estudiante'
export type AnswerType = 'escala' | 'seleccion' | 'texto'
export type FormKind = 'evaluacion' | 'autoevaluacion'

export type TipoCampo = 'CADI' | 'CAI'

export interface User { id: string; name: string; email: string; password: string; role: Role; active: boolean; sede?: string; carrera?: string }
export interface CADI { id: string; codigo: string; nombre: string; semestre: number; tipo?: 'CADI' | 'CAI'; esArticulador?: boolean; docenteId?: string | null }
export interface Question { id: string; text: string; type: AnswerType; options: string[]; required: boolean; dimension?: string }
export interface Feedback { id: string; docenteId?: string; teacherId?: string; course: string; question: Question; start: string; end: string; createdAt: string }
export interface FeedbackResponse { id: string; feedbackId: string; studentId: string; value: string; date: string }
export interface Form { id: string; kind: FormKind; title: string; description: string; period: string; cadiId?: string; start: string; end: string; questions: Question[] }
export interface FormResponse { id: string; formId: string; userId: string; docenteId?: string; teacherId?: string; answers: Record<string, string>; observation: string; date: string }

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
  coordinador: 'Coordinador',
  docente: 'Docente',
  estudiante: 'Estudiante',
}

export const OBS_LIMIT = 500

export const MEDIT_DIMENSIONES = [
  'Pedagógica y Didáctica',
  'Disciplina e Investigativa',
  'Evaluativa y Curricular',
  'Interacción Social y Ética',
  'Gestión y Formación Continua',
]

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

const DELETED_USERS_KEY = 'siard_deleted_users'
const USERS_STORAGE_KEY = 'siard_users_storage'
const memoryDeletedUsers = new Set<string>()

const DELETED_FORMS_KEY = 'siard_deleted_forms'
const FORMS_STORAGE_KEY = 'siard_forms_storage'
const RESPONSES_STORAGE_KEY = 'siard_responses_storage'
const memoryDeletedForms = new Set<string>()

export function getDeletedFormIds(): Set<string> {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const raw = storage.getItem(DELETED_FORMS_KEY)
      if (raw) return new Set(JSON.parse(raw))
    }
  } catch {}
  return new Set(memoryDeletedForms)
}

export function saveDeletedFormId(id: string) {
  memoryDeletedForms.add(id)
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const set = getDeletedFormIds()
      set.add(id)
      storage.setItem(DELETED_FORMS_KEY, JSON.stringify(Array.from(set)))
    }
  } catch {}
}

export function getDeletedUserIds(): Set<string> {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const raw = storage.getItem(DELETED_USERS_KEY)
      if (raw) return new Set(JSON.parse(raw))
    }
  } catch {}
  return new Set(memoryDeletedUsers)
}

export function saveDeletedUserId(id: string) {
  memoryDeletedUsers.add(id)
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const set = getDeletedUserIds()
      set.add(id)
      storage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(set)))
    }
  } catch {}
}

export function sanitizeUsers(users: User[]): User[] {
  // 1. Elimina por completo la cuenta "Administrador General" (admin@ucundinamarca.edu.co)
  // Deja ÚNICAMENTE como Administrador a Ubeimar Laguna Cárdenas
  const filtered = users.filter((u) => {
    if (u.role === 'admin') {
      const emailLower = (u.email || '').toLowerCase().trim()
      const nameLower = (u.name || '').toLowerCase().trim()
      if (emailLower === 'admin@ucundinamarca.edu.co' || nameLower.includes('administrador general')) {
        return false
      }
    }
    return true
  })

  // 2. Elimina docentes duplicados:
  // Conserva únicamente una cuenta canónica por profesor:
  // Andrés Navarro, Diana Salazar, Gabriel Prieto, Javier Mendoza, Mariana Cifuentes
  const seenDocentes = new Set<string>()
  const result: User[] = []

  for (const u of filtered) {
    if (u.role === 'docente') {
      const normName = u.name.trim().toLowerCase()
      if (seenDocentes.has(normName)) {
        continue
      }
      seenDocentes.add(normName)
    }
    result.push(u)
  }

  // Asegura la cuenta de Administrador único: Ubeimar Laguna Cárdenas
  const hasUbeimar = result.some(
    (u) => u.role === 'admin' && (u.email.toLowerCase().includes('uberadmin') || u.name.toLowerCase().includes('ubeimar'))
  )
  if (!hasUbeimar) {
    result.unshift({
      id: 'usr-admin-uber',
      name: 'Ubeimar Laguna Cárdenas',
      email: 'uberadmin.siard@ucundinamarca.edu.co',
      password: 'admin123',
      role: 'admin',
      active: true,
      sede: 'Sede Facatativá',
      carrera: 'Ingeniería de Sistemas y Computación',
    })
  }

  return result
}

export async function initDB() {
  state.loading = true
  notify()

  try {
    const data = (await reporteService.getBootstrap()) as DB & { ok?: boolean }
    if (data.ok === false && data.connected === false) {
      throw new Error(data.error || 'No fue posible conectar con PostgreSQL.')
    }

    const deletedIds = getDeletedUserIds()
    const activeRawUsers = (data.users || []).filter((u) => u.active && !deletedIds.has(u.id))
    const cleanUsers = sanitizeUsers(activeRawUsers).filter((u) => !deletedIds.has(u.id))

    const deletedFormIds = getDeletedFormIds()
    const cleanForms = (data.forms || []).filter((f) => !deletedFormIds.has(f.id))
    const cleanResponses = (data.formResponses || [])
      .filter((r) => !deletedFormIds.has(r.formId))
      .map((r) => ({
        ...r,
        docenteId: (r as any).docenteId || (r as any).teacherId || '',
        teacherId: (r as any).docenteId || (r as any).teacherId || '',
      }))

    const cleanFeedbacks = (data.feedbacks || []).map((fb) => ({
      ...fb,
      docenteId: (fb as any).docenteId || (fb as any).teacherId || '',
      teacherId: (fb as any).docenteId || (fb as any).teacherId || '',
    }))

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleanUsers))
        localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(cleanForms))
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(cleanResponses))
      }
    } catch {}

    state = {
      users: cleanUsers,
      cadis: data.cadis || [],
      forms: [...cleanForms],
      formResponses: [...cleanResponses],
      feedbacks: cleanFeedbacks,
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

export const actions = {
  createUser: async (u: Omit<User, 'id' | 'active'>) => {
    const data = await usuarioService.createUser(u)
    if (data.user) {
      const deletedIds = getDeletedUserIds()
      state.users = sanitizeUsers([...state.users, data.user]).filter((x) => !deletedIds.has(x.id))
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users))
        }
      } catch {}
      notify()
    } else {
      await initDB()
    }
  },

  deleteUser: async (id: string) => {
    // 1. Registrar persistencia para evitar que reaparezca tras recarga
    saveDeletedUserId(id)
    // 2. Filtrar el arreglo en el store inmediatamente
    state.users = state.users.filter((u) => u.id !== id)
    // 3. Actualizar almacenamiento (localStorage)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users))
      }
    } catch {}
    // 4. Actualizar estado reactivo
    notify()

    // 5. Persistir en backend / base de datos
    try {
      await usuarioService.deleteUser(id)
    } catch (err) {
      console.warn('Aviso al eliminar usuario en backend:', err)
    }
  },

  deactivateUser: async (id: string) => {
    return actions.deleteUser(id)
  },

  cambiarContrasena: async (usuarioId: string, contrasenaActual: string, nuevaContrasena: string) => {
    const res = await usuarioService.cambiarContrasena(usuarioId, contrasenaActual, nuevaContrasena)
    state.users = state.users.map((u) => (u.id === usuarioId ? { ...u, password: nuevaContrasena } : u))
    notify()
    return res
  },

  createForm: async (f: Omit<Form, 'id'>) => {
    await evaluacionService.createForm(f)
    await initDB()
  },

  updateForm: async (id: string, f: Omit<Form, 'id'>) => {
    await evaluacionService.updateForm(id, f)
    await initDB()
  },

  deleteForm: async (id: string) => {
    // 1. Persistir el ID para que no vuelva a recrearse o reaparecer tras recargar
    saveDeletedFormId(id)

    // 2. Elimina en cascada las respuestas huérfanas asociadas a ese formId con nueva referencia
    state.formResponses = [...state.formResponses.filter((r) => r.formId !== id)]

    // 3. Filtra el arreglo de formularios para remover el ID con nueva referencia
    state.forms = [...state.forms.filter((f) => f.id !== id)]

    // 4. Actualiza inmediatamente el almacenamiento local
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(state.forms))
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(state.formResponses))
      }
    } catch {}

    // 5. Garantía de reactividad: notifica con nuevas referencias para re-renderizado instantáneo
    notify()

    // 6. Eliminar en PostgreSQL en segundo plano
    try {
      await evaluacionService.deleteForm(id)
    } catch (err) {
      console.warn('Aviso al eliminar formulario en backend:', err)
    }
  },

  eliminarFormulario: async (id: string) => {
    return actions.deleteForm(id)
  },

  setFormDates: async (id: string, start: string, end: string) => {
    await evaluacionService.setFormDates(id, start, end)
    state.forms = state.forms.map((f) => (f.id === id ? { ...f, start, end } : f))
    notify()
  },

  respondForm: async (r: Omit<FormResponse, 'id' | 'date'>) => {
    await evaluacionService.respondForm(r)
    await initDB()
  },

  createCADI: async (c: Omit<CADI, 'id'>) => {
    await evaluacionService.createCADI(c)
    await initDB()
  },

  updateCADI: async (id: string, c: Partial<Omit<CADI, 'id'>>) => {
    await evaluacionService.updateCADI(id, c)
    await initDB()
  },

  deleteCADI: async (id: string) => {
    await evaluacionService.deleteCADI(id)
    await initDB()
  },

  assignCadiDocente: async (cadiId: string, docenteId: string | null) => {
    await evaluacionService.assignCadiDocente(cadiId, docenteId)
    state.cadis = state.cadis.map((c) => (c.id === cadiId ? { ...c, docenteId: docenteId || undefined } : c))
    notify()
  },

  assignCadiTeacher: async (cadiId: string, docenteId: string | null) => {
    return actions.assignCadiDocente(cadiId, docenteId)
  },

  createFeedback: async (
    b:
      | (Omit<Feedback, 'id' | 'createdAt'> & { questions?: Question[] })
      | { docenteId?: string; teacherId?: string; course: string; questions: Question[]; start: string; end: string }
  ) => {
    const payload = {
      ...b,
      docenteId: (b as any).docenteId || (b as any).teacherId || '',
      teacherId: (b as any).docenteId || (b as any).teacherId || '',
    }
    await evaluacionService.createFeedback(payload)
    await initDB()
  },


  respondFeedback: async (feedbackId: string, studentId: string, value: string) => {
    await evaluacionService.respondFeedback(feedbackId, studentId, value)
    await initDB()
  },
}

export async function execRaw(query: string): Promise<{ columns: string[]; values: unknown[][] }> {
  const data = await reporteService.executeSql(query)
  return { columns: data.columns || [], values: data.values || [] }
}

export function useDB() {
  const [val, setVal] = useState(state)
  useEffect(() => {
    const fn = () => setVal({ ...state })
    subs.add(fn)
    return () => { subs.delete(fn) }
  }, [])
  return val
}

export const isOpen = (start: string, end: string) => {
  const n = new Date().toISOString().slice(0, 16)
  return n >= start && n <= end
}

export const fmt = (s: string) =>
  new Date(s).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

export function stats(db: DB, formId: string, docenteId?: string) {
  const form = db.forms.find((f) => f.id === formId)
  if (!form) return null

  const rs = db.formResponses.filter(
    (r) => r.formId === formId && (!docenteId || r.docenteId === docenteId || r.teacherId === docenteId)
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

  const pgcPonderado20 = Number((overall * 0.20).toFixed(2))

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

  const consolidatedGrade = docenteId ? getDocenteConsolidatedGrade(db, docenteId, form.period) : null

  return { form, responses: rs, perQ, overall, pgcPonderado20, porDimension, consolidatedGrade }
}



export interface DocenteGradeConsolidated {
  docenteId: string
  teacherId: string
  studentAvg: number | null
  studentWeighted: number | null
  autoAvg: number | null
  autoWeighted: number | null
  finalScore: number
  hasEvaluations: boolean
  isProvisional: boolean
  status: 'completo' | 'pendiente_autoevaluacion' | 'pendiente_estudiantes' | 'sin_evaluar'
  statusLabel: string
  requierePlanMejora: boolean
  studentResponsesCount: number
  autoResponsesCount: number
}
export type TeacherGradeConsolidated = DocenteGradeConsolidated

export function calculateConsolidatedGrade(
  studentAvg: number | null,
  autoAvg: number | null,
  docenteId: string = '',
  studentResponsesCount: number = 0,
  autoResponsesCount: number = 0
): DocenteGradeConsolidated {
  const hasStudent = studentAvg !== null && !isNaN(studentAvg) && studentAvg > 0
  const hasAuto = autoAvg !== null && !isNaN(autoAvg) && autoAvg > 0

  if (hasStudent && hasAuto) {
    const sAvg = Number(studentAvg.toFixed(2))
    const aAvg = Number(autoAvg.toFixed(2))
    const studentWeighted = Number((sAvg * 0.70).toFixed(2))
    const autoWeighted = Number((aAvg * 0.30).toFixed(2))
    const finalScore = Number(((sAvg * 0.70) + (aAvg * 0.30)).toFixed(2))
    return {
      docenteId,
      teacherId: docenteId,
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
    const finalScore = sAvg
    return {
      docenteId,
      teacherId: docenteId,
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
    const finalScore = aAvg
    return {
      docenteId,
      teacherId: docenteId,
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
    docenteId,
    teacherId: docenteId,
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

export function getDocenteConsolidatedGrade(
  db: DB,
  docenteId: string,
  period?: string
): DocenteGradeConsolidated {
  const evalForms = db.forms.filter(
    (f) => f.kind === 'evaluacion' && (!period || f.period === period)
  )
  const evalFormIds = new Set(evalForms.map((f) => f.id))
  const evalResponses = db.formResponses.filter(
    (r) => (r.docenteId === docenteId || r.teacherId === docenteId) && evalFormIds.has(r.formId)
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

  const autoForms = db.forms.filter(
    (f) => f.kind === 'autoevaluacion' && (!period || f.period === period)
  )
  const autoFormIds = new Set(autoForms.map((f) => f.id))
  const autoResponses = db.formResponses.filter(
    (r) => (r.docenteId === docenteId || r.teacherId === docenteId || r.userId === docenteId) && autoFormIds.has(r.formId)
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
    docenteId,
    evalResponses.length,
    autoResponses.length
  )
}
export const getTeacherConsolidatedGrade = getDocenteConsolidatedGrade

export interface DocenteReputation {
  avg: number
  totalResponses: number
  label: string
  badgeClass: string
  isTop: boolean
  consolidated: DocenteGradeConsolidated
}
export type TeacherReputation = DocenteReputation

export function getDocenteReputation(db: DB, docenteId: string): DocenteReputation {
  const consolidated = getDocenteConsolidatedGrade(db, docenteId)
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
export const getTeacherReputation = getDocenteReputation

export interface StudentDocenteEvaluationStatus {
  hasEvaluated: boolean
  label: string
  badgeClass: string
  score: number | null
  title: string
}
export type StudentTeacherEvaluationStatus = StudentDocenteEvaluationStatus

export function getStudentDocenteEvaluationStatus(
  db: DB,
  form: Form,
  studentId: string,
  docenteId: string
): StudentDocenteEvaluationStatus {
  if (!db || !form?.id || !studentId || !docenteId) {
    return {
      hasEvaluated: false,
      label: 'Pendiente por evaluar',
      badgeClass: 'bg-paper text-ink/50 border border-line',
      score: null,
      title: 'Aún no ha evaluado a este docente',
    }
  }

  const userResp = db.formResponses.find(
    (r) => r.formId === form.id && r.userId === studentId && (r.docenteId === docenteId || r.teacherId === docenteId)
  )

  if (!userResp) {
    return {
      hasEvaluated: false,
      label: 'Pendiente por evaluar',
      badgeClass: 'bg-paper text-ink/50 border border-line',
      score: null,
      title: 'Aún no ha evaluado a este docente',
    }
  }


  const scaleQuestionIds = new Set(
    form.questions.filter((q) => q.type === 'escala').map((q) => q.id)
  )
  const values = Object.entries(userResp.answers || {})
    .filter(([qId]) => scaleQuestionIds.has(qId))
    .map(([_, val]) => Number(val))
    .filter((v) => !isNaN(v) && v > 0)

  const avg = values.length
    ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
    : null

  if (avg === null) {
    return {
      hasEvaluated: true,
      label: '✓ Evaluado',
      badgeClass: 'bg-pine/10 text-pine border border-pine/30 font-medium',
      score: null,
      title: 'Docente evaluado por usted',
    }
  }

  if (avg >= 4.5) {
    return {
      hasEvaluated: true,
      label: '⭐ Destacado',
      badgeClass: 'bg-moss/20 text-pine border border-moss/40 font-semibold shadow-xs',
      score: avg,
      title: `Su valoración individual: ${avg.toFixed(2)} / 5.00`,
    }
  } else if (avg >= 4.0) {
    return {
      hasEvaluated: true,
      label: '✓ Sobresaliente',
      badgeClass: 'bg-pine/10 text-pine border border-pine/30 font-medium',
      score: avg,
      title: `Su valoración individual: ${avg.toFixed(2)} / 5.00`,
    }
  } else if (avg >= 3.0) {
    return {
      hasEvaluated: true,
      label: 'Aceptable',
      badgeClass: 'bg-ochre/15 text-ochre border border-ochre/40 font-medium',
      score: avg,
      title: `Su valoración individual: ${avg.toFixed(2)} / 5.00`,
    }
  } else {
    return {
      hasEvaluated: true,
      label: '⚠️ En Seguimiento',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200 font-medium',
      score: avg,
      title: `Su valoración individual: ${avg.toFixed(2)} / 5.00`,
    }
  }
}

export const getStudentTeacherEvaluationStatus = getStudentDocenteEvaluationStatus
