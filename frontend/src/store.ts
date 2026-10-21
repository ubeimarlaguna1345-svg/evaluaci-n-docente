import { useEffect, useState } from 'react'
import {
  usuarioService,
  evaluacionService,
  reporteService,
} from './services'

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

export async function initDB() {
  state.loading = true
  notify()

  try {
    const data = (await reporteService.getBootstrap()) as DB & { ok?: boolean }
    if (data.ok === false && data.connected === false) {
      throw new Error(data.error || 'No fue posible conectar con PostgreSQL.')
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

export const actions = {
  createUser: async (u: Omit<User, 'id' | 'active'>) => {
    const data = await usuarioService.createUser(u)
    if (data.user) {
      state.users = [...state.users, data.user]
      notify()
    } else {
      await initDB()
    }
  },

  deactivateUser: async (id: string) => {
    await usuarioService.deleteUser(id)
    state.users = state.users.map((u) => (u.id === id ? { ...u, active: false } : u))
    notify()
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
    await evaluacionService.deleteForm(id)
    await initDB()
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

  assignCadiTeacher: async (cadiId: string, docenteId: string | null) => {
    await evaluacionService.assignCadiTeacher(cadiId, docenteId)
    state.cadis = state.cadis.map((c) => (c.id === cadiId ? { ...c, docenteId: docenteId || undefined } : c))
    notify()
  },

  createFeedback: async (b: (Omit<Feedback, 'id' | 'createdAt'> & { questions?: Question[] }) | { teacherId: string; course: string; questions: Question[]; start: string; end: string }) => {
    await evaluacionService.createFeedback(b)
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

  const consolidatedGrade = teacherId ? getTeacherConsolidatedGrade(db, teacherId, form.period) : null

  return { form, responses: rs, perQ, overall, pgcPonderado20, porDimension, consolidatedGrade }
}


export interface TeacherGradeConsolidated {
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
    const finalScore = sAvg
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
    const finalScore = aAvg
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

export function getTeacherConsolidatedGrade(
  db: DB,
  teacherId: string,
  period?: string
): TeacherGradeConsolidated {
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

export interface StudentTeacherEvaluationStatus {
  hasEvaluated: boolean
  label: string
  badgeClass: string
  score: number | null
  title: string
}

export function getStudentTeacherEvaluationStatus(
  db: DB,
  form: Form,
  studentId: string,
  teacherId: string
): StudentTeacherEvaluationStatus {
  const userResp = db.formResponses.find(
    (r) => r.formId === form.id && r.userId === studentId && r.teacherId === teacherId
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
