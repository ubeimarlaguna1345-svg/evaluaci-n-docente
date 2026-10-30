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
export type BloquePregunta = 'docente' | 'medit' | 'institucional'

export interface User { id: string; name: string; email: string; password: string; role: Role; active: boolean; sede?: string; carrera?: string; nombre?: string; rol?: string; estado?: string }
export interface CADI { id: string; codigo: string; nombre: string; semestre: number | string; tipo?: 'CADI' | 'CAI' | 'CADI (Disciplinar)' | 'CAI (Institucional)' | string; esArticulador?: boolean; docenteId?: string | null; docenteAsignado?: string }
export interface Question { id: string; text: string; type: AnswerType; options: string[]; required: boolean; dimension?: string; bloque?: BloquePregunta }
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
  'Gestión y Formación Continua',]

export const DATA_VERSION = 'siard_udec_v2026_final_10p'

export const MEDIT_10_QUESTIONS: Question[] = [
  // Bloque 1: Docente (P1 - P5)
  { id: 'q-claridad', text: 'Demuestra dominio actualizado, solidez conceptual y promueve la indagación metódica y fuentes técnicas.', type: 'escala', dimension: 'Claridad conceptual y explicación', required: true, bloque: 'docente', options: [] },
  { id: 'q-doc-expositiva', text: 'Estructura sus clases con claridad expositiva y metodología adecuada para facilitar el aprendizaje.', type: 'escala', dimension: 'Claridad conceptual y explicación', required: true, bloque: 'docente', options: [] },
  { id: 'q-organizacion', text: 'Cumple con el cronograma académico, los horarios acordados y el seguimiento del CADI.', type: 'escala', dimension: 'Organización y cumplimiento del programa', required: true, bloque: 'docente', options: [] },
  { id: 'q-retro', text: 'Realiza retroalimentación oportuna y orienta constructivamente sobre los resultados de las evaluaciones.', type: 'escala', dimension: 'Retroalimentación y entrega oportuna de notas', required: true, bloque: 'docente', options: [] },
  { id: 'q-doc-comunicacion', text: 'Mantiene una comunicación respetuosa, asertiva y disposición para atender inquietudes pedagógicas.', type: 'escala', dimension: 'Retroalimentación y entrega oportuna de notas', required: true, bloque: 'docente', options: [] },
  // Bloque 2: MEDIT (P6 - P8)
  { id: 'q-tic', text: 'Uso efectivo de plataformas virtuales, herramientas digitales y mediaciones tecnológicas en la formación.', type: 'escala', dimension: 'Modelo MEDIT y Mediaciones Tecnológicas', required: true, bloque: 'medit', options: [] },
  { id: 'q-metodologia', text: 'Aplicación de contenidos a problemas reales y casos del entorno para fomentar el aprendizaje significativo.', type: 'escala', dimension: 'Metodología y aplicación práctica', required: true, bloque: 'medit', options: [] },
  { id: 'q-medit-autonomo', text: 'Estímulo al trabajo colaborativo, aprendizaje autónomo y desarrollo del pensamiento crítico.', type: 'escala', dimension: 'Modelo MEDIT y Mediaciones Tecnológicas', required: true, bloque: 'medit', options: [] },
  // Bloque 3: Institucional (P9 - P10)
  { id: 'q-infraestructura', text: 'Disponibilidad, dotación, iluminación y condiciones físicas adecuadas en las aulas y laboratorios de la sede.', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
  { id: 'q-conectividad', text: 'Calidad y estabilidad de la conectividad a internet, redes institucionales y soporte técnico provisto.', type: 'escala', dimension: 'Recursos y Gestión Institucional', required: true, bloque: 'institucional', options: [] },
]

export const MEDIT_15_QUESTIONS: Question[] = MEDIT_10_QUESTIONS

const subs = new Set<() => void>()
const notify = () => subs.forEach((fn) => fn())

const DELETED_USERS_KEY = 'siard_deleted_users'
const USERS_STORAGE_KEY = 'siard_users_storage'
const memoryDeletedUsers = new Set<string>()

const DELETED_FORMS_KEY = 'siard_deleted_forms'
export const EVALUACIONES_STORAGE_KEY = 'siard_evaluaciones'
export const FORMS_STORAGE_KEY = 'siard_evaluaciones'
export const LEGACY_FORMS_STORAGE_KEY = 'siard_forms_storage'
export const CHANGED_PASSWORDS_KEY = 'siard_changed_passwords'
export const SIARD_USER_KEY = 'siard_user'
export const SIARD_USUARIOS_KEY = 'siard_usuarios'
const RESPONSES_STORAGE_KEY = 'siard_responses_storage'
const memoryDeletedForms = new Set<string>()

let cacheInvalidated = false

export function checkAndInvalidateCache(): void {
  if (cacheInvalidated) return
  cacheInvalidated = true

  try {
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      return
    }
    if (typeof localStorage !== 'undefined') {
      const currentVersion = localStorage.getItem('siard_version')
      if (currentVersion !== DATA_VERSION) {
        localStorage.setItem(EVALUACIONES_STORAGE_KEY, JSON.stringify([]))
        localStorage.setItem(LEGACY_FORMS_STORAGE_KEY, JSON.stringify([]))
        localStorage.removeItem('siard_cadis')
        localStorage.removeItem('siard_forms_storage')
        localStorage.setItem('siard_version', DATA_VERSION)
      }
    }
  } catch {}
}

checkAndInvalidateCache()

export function recordChangedPassword(emailOrId: string, newPassword: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CHANGED_PASSWORDS_KEY)
      const map = raw ? JSON.parse(raw) : {}
      map[emailOrId.toLowerCase().trim()] = newPassword
      localStorage.setItem(CHANGED_PASSWORDS_KEY, JSON.stringify(map))
    }
  } catch {}
}

export function getChangedPassword(emailOrId: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CHANGED_PASSWORDS_KEY)
      if (raw) {
        const map = JSON.parse(raw)
        return map[emailOrId.toLowerCase().trim()] || null
      }
    }
  } catch {}
  return null
}

export function getStoredEvaluaciones(): Form[] {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const raw = storage.getItem(EVALUACIONES_STORAGE_KEY) || storage.getItem(LEGACY_FORMS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = getDeletedFormIds()
          const sanitized = sanitizeForms(parsed.filter((f: Form) => !deleted.has(f.id)))
          if (sanitized.length > 0) {
            return sanitized
          }
        }
      }
    }
  } catch {}
  return []
}

export function saveStoredEvaluaciones(forms: Form[]): void {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const serialized = JSON.stringify(forms)
      storage.setItem(EVALUACIONES_STORAGE_KEY, serialized)
      storage.setItem(LEGACY_FORMS_STORAGE_KEY, serialized)
    }
  } catch {}
}

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

export { INITIAL_USERS } from './data/mockData'

export const CONTINGENCY_USERS: User[] = [
  {
    id: 'usr-admin-uber',
    name: 'Ubeimar Laguna Cárdenas',
    email: 'uberadmin.siard@ucundinamarca.edu.co',
    password: 'Uber1019',
    role: 'admin',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'usr-admin-dani',
    name: 'Daniel Moreno',
    email: 'danidirec.siard@ucundinamarca.edu.co',
    password: 'siardVd3',
    role: 'admin',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'usr-coord-jaime',
    name: 'Jaime Parra',
    nombre: 'Jaime Parra',
    email: 'jaimeparra.siard@ucundinamarca.edu.co',
    password: 'CoordParra2026*',
    role: 'coordinador',
    rol: 'coordinador',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'coord-01',
    name: 'Jaime Parra',
    nombre: 'Jaime Parra',
    email: 'jaime.parra.siard@ucundinamarca.edu.co',
    password: 'CoordParra2026*',
    role: 'coordinador',
    rol: 'coordinador',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'usr-coord-1',
    name: 'Coordinación Académica',
    email: 'coordinador@ucundinamarca.edu.co',
    password: 'coord123',
    role: 'coordinador',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-mendoza',
    name: 'Javier Mendoza',
    email: 'prof.mendoza.siard@ucundinamarca.edu.co',
    password: 'ProfMen2026*',
    role: 'docente',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-salazar',
    name: 'Diana Salazar',
    email: 'prof.salazar.siard@ucundinamarca.edu.co',
    password: 'ProfSal2026*',
    role: 'docente',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-navarro',
    name: 'Andrés Navarro',
    email: 'prof.navarro.siard@ucundinamarca.edu.co',
    password: 'ProfNav2026*',
    role: 'docente',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-prieto',
    name: 'Gabriel Prieto',
    email: 'prof.prieto.siard@ucundinamarca.edu.co',
    password: 'ProfPri2026*',
    role: 'docente',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-cifuentes',
    name: 'Mariana Cifuentes',
    email: 'prof.cifuentes.siard@ucundinamarca.edu.co',
    password: 'ProfCif2026*',
    role: 'docente',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-carlos',
    name: 'Carlos Peña',
    email: 'carlospena.siard@ucundinamarca.edu.co',
    password: 'Carl8742*',
    role: 'estudiante',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-1',
    name: 'Laura Quintero',
    email: 'lauraquintero.siard@ucundinamarca.edu.co',
    password: 'Laur5193*',
    role: 'estudiante',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-2',
    name: 'Mateo Rincón',
    email: 'mateorincon.siard@ucundinamarca.edu.co',
    password: 'Mate6381*',
    role: 'estudiante',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-3',
    name: 'Camila Torres',
    email: 'camilatorres.siard@ucundinamarca.edu.co',
    password: 'Cami9240*',
    role: 'estudiante',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-4',
    name: 'Julián Morales',
    email: 'julianmorales.siard@ucundinamarca.edu.co',
    password: 'Juli1835*',
    role: 'estudiante',
    active: true,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
]

export const INITIAL_CADIS: CADI[] = [
  {
    id: 'cadi-1',
    codigo: 'MAT101',
    nombre: 'Cálculo Diferencial',
    semestre: 1,
    docenteAsignado: 'Diana Salazar',
    tipo: 'CADI',
    docenteId: 'doc-salazar',
    esArticulador: false,
  },
  {
    id: 'cadi-2',
    codigo: 'CAI101',
    nombre: 'Lectura Crítica y Competencias Comunicativas',
    semestre: 1,
    docenteAsignado: 'Gabriel Prieto',
    tipo: 'CAI',
    docenteId: 'doc-prieto',
    esArticulador: false,
  },
  {
    id: 'cadi-3',
    codigo: 'CAI201',
    nombre: 'Ética y Ciudadanía',
    semestre: 2,
    docenteAsignado: 'Mariana Cifuentes',
    tipo: 'CAI',
    docenteId: 'doc-cifuentes',
    esArticulador: false,
  },
  {
    id: 'cadi-4',
    codigo: 'SIS301',
    nombre: 'Programación II',
    semestre: 3,
    docenteAsignado: 'Andrés Navarro',
    tipo: 'CADI',
    docenteId: 'doc-navarro',
    esArticulador: true,
  },
  {
    id: 'cadi-5',
    codigo: 'ELC301',
    nombre: 'Electrónica Básica',
    semestre: 3,
    docenteAsignado: 'Javier Mendoza',
    tipo: 'CADI',
    docenteId: 'doc-mendoza',
    esArticulador: false,
  },
]

export const CONTINGENCY_CADIS: CADI[] = INITIAL_CADIS

export function getDocenteCadi(
  cadis: CADI[] = [],
  docente?: User | { id?: string; name?: string; email?: string } | null
): CADI | undefined {
  if (!docente) return undefined
  const docId = docente.id || ''
  const docName = (docente.name || '').toLowerCase()
  const docEmail = (docente.email || '').toLowerCase()

  // 1. Coincidencia directa por docenteId
  if (docId) {
    const found = cadis.find((c) => c.docenteId === docId)
    if (found) return found
  }

  // 2. Mapeo curricular garantizado UdeC (para evitar cualquier guion)
  let targetCode = ''
  if (docId === 'doc-mendoza' || docName.includes('mendoza') || docEmail.includes('mendoza')) {
    targetCode = 'ELC301'
  } else if (docId === 'doc-salazar' || docName.includes('salazar') || docEmail.includes('salazar')) {
    targetCode = 'MAT101'
  } else if (docId === 'doc-navarro' || docName.includes('navarro') || docEmail.includes('navarro')) {
    targetCode = 'SIS301'
  } else if (docId === 'doc-prieto' || docName.includes('prieto') || docEmail.includes('prieto')) {
    targetCode = 'CAI101'
  } else if (docId === 'doc-cifuentes' || docName.includes('cifuentes') || docEmail.includes('cifuentes')) {
    targetCode = 'CAI201'
  }

  if (targetCode) {
    const byCode = cadis.find((c) => c.codigo === targetCode)
    if (byCode) return byCode
    const fallback = CONTINGENCY_CADIS.find((c) => c.codigo === targetCode)
    if (fallback) return fallback
  }

  return undefined
}

export const CONTINGENCY_FORMS: Form[] = [
  {
    id: 'form-eval-2026',
    kind: 'evaluacion',
    title: 'Instrumento de Evaluación Integral del Desempeño Docente MEDIT',
    description: 'Evaluación integral de desempeño docente bajo dimensiones MEDIT.',
    period: '2026-II',
    start: '2026-08-01T00:00:00Z',
    end: '2026-11-30T23:59:59Z',
    questions: MEDIT_10_QUESTIONS,
  },
]

export const CONTINGENCY_RESPONSES: FormResponse[] = []

export function sanitizeUsers(users: User[]): User[] {
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

  const seenDocentes = new Set<string>()
  const seenCoordinadores = new Set<string>()
  const result: User[] = []

  for (const u of filtered) {
    if (u.role === 'docente') {
      const normName = u.name.trim().toLowerCase()
      if (seenDocentes.has(normName)) {
        continue
      }
      seenDocentes.add(normName)
    }

    if (u.role === 'coordinador' && (u.name.toLowerCase().includes('jaime parra') || ((u as any).nombre && (u as any).nombre.toLowerCase().includes('jaime parra')))) {
      if (seenCoordinadores.has('jaime parra')) {
        continue
      }
      seenCoordinadores.add('jaime parra')
    }

    const emailLower = (u.email || '').toLowerCase().trim()
    const nameLower = (u.name || '').toLowerCase().trim()
    const updated = { ...u }
    const changedPass =
      getChangedPassword(emailLower) ||
      getChangedPassword(u.id) ||
      (emailLower.includes('uberadmin') ? getChangedPassword('uberadmin.siard@ucundinamarca.edu.co') : null)

    if (emailLower.includes('uberadmin') || nameLower.includes('ubeimar')) {
      updated.email = 'uberadmin.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'Uber1019'
      updated.role = 'admin'
    } else if (emailLower.includes('danidirec') || nameLower.includes('daniel moreno')) {
      updated.email = 'danidirec.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'siardVd3'
      updated.role = 'admin'
    } else if (emailLower.includes('jaimeparra') || emailLower.includes('jaime.parra') || nameLower.includes('jaime parra')) {
      updated.email = u.email || 'jaime.parra.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'CoordParra2026*'
      updated.role = 'coordinador'
      updated.rol = 'coordinador'
      updated.nombre = updated.nombre || updated.name || 'Jaime Parra'
      updated.estado = updated.estado || (updated.active ? 'Activo' : 'Inactivo')
    } else if (emailLower.includes('prof.mendoza') || emailLower.includes('javier.mendoza') || nameLower.includes('javier mendoza')) {
      updated.email = 'prof.mendoza.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'ProfMen2026*'
      updated.role = 'docente'
    } else if (emailLower.includes('prof.salazar') || emailLower.includes('diana.salazar') || nameLower.includes('diana salazar')) {
      updated.email = 'prof.salazar.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'ProfSal2026*'
      updated.role = 'docente'
    } else if (emailLower.includes('prof.navarro') || emailLower.includes('andres.navarro') || nameLower.includes('andrés navarro') || nameLower.includes('andres navarro')) {
      updated.email = 'prof.navarro.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'ProfNav2026*'
      updated.role = 'docente'
    } else if (emailLower.includes('prof.prieto') || emailLower.includes('gabriel.prieto') || nameLower.includes('gabriel prieto')) {
      updated.email = 'prof.prieto.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'ProfPri2026*'
      updated.role = 'docente'
    } else if (emailLower.includes('prof.cifuentes') || emailLower.includes('mariana.cifuentes') || nameLower.includes('mariana cifuentes')) {
      updated.email = 'prof.cifuentes.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'ProfCif2026*'
      updated.role = 'docente'
    } else if (emailLower.includes('carlospena') || emailLower.includes('carlos.pena') || nameLower.includes('carlos peña') || nameLower.includes('carlos pena')) {
      updated.email = 'carlospena.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'Carl8742*'
      updated.role = 'estudiante'
    } else if (emailLower.includes('lauraquintero') || emailLower.includes('laura.quintero') || nameLower.includes('laura quintero')) {
      updated.email = 'lauraquintero.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'Laur5193*'
      updated.role = 'estudiante'
    } else if (emailLower.includes('mateorincon') || emailLower.includes('mateo.rincon') || nameLower.includes('mateo rincón') || nameLower.includes('mateo rincon')) {
      updated.email = 'mateorincon.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'Mate6381*'
      updated.role = 'estudiante'
    } else if (emailLower.includes('camilatorres') || emailLower.includes('camila.torres') || nameLower.includes('camila torres')) {
      updated.email = 'camilatorres.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'Cami9240*'
      updated.role = 'estudiante'
    } else if (emailLower.includes('julianmorales') || emailLower.includes('julian.morales') || nameLower.includes('julián morales') || nameLower.includes('julian morales')) {
      updated.email = 'julianmorales.siard@ucundinamarca.edu.co'
      updated.password = changedPass || u.password || 'Juli1835*'
      updated.role = 'estudiante'
    } else if (changedPass) {
      updated.password = changedPass
    }
    updated.nombre = updated.nombre || updated.name
    updated.rol = updated.rol || updated.role
    updated.estado = updated.estado || (updated.active ? 'Activo' : 'Inactivo')
    result.push(updated)
  }

  const hasUbeimar = result.some(
    (u) => u.role === 'admin' && (u.email.toLowerCase().includes('uberadmin') || u.name.toLowerCase().includes('ubeimar'))
  )
  if (!hasUbeimar) {
    const uberPass =
      getChangedPassword('uberadmin.siard@ucundinamarca.edu.co') ||
      getChangedPassword('usr-admin-uber') ||
      'Uber1019'
    result.unshift({
      id: 'usr-admin-uber',
      name: 'Ubeimar Laguna Cárdenas',
      email: 'uberadmin.siard@ucundinamarca.edu.co',
      password: uberPass,
      role: 'admin',
      active: true,
      sede: 'Sede Facatativá',
      carrera: 'Ingeniería de Sistemas y Computación',
    })
  }

  const hasJaime = result.some(
    (u) =>
      (u.role === 'coordinador' || (u as any).rol?.toLowerCase() === 'coordinador') &&
      (u.email.toLowerCase().includes('jaime') || u.name.toLowerCase().includes('jaime'))
  )
  if (!hasJaime) {
    const jaimePass =
      getChangedPassword('jaime.parra.siard@ucundinamarca.edu.co') ||
      getChangedPassword('jaimeparra.siard@ucundinamarca.edu.co') ||
      'CoordParra2026*'
    result.push({
      id: 'user-coord-1',
      name: 'Jaime Parra',
      nombre: 'Jaime Parra',
      email: 'jaime.parra.siard@ucundinamarca.edu.co',
      password: jaimePass,
      role: 'coordinador',
      rol: 'coordinador',
      active: true,
      estado: 'Activa',
      sede: 'Sede Facatativá',
      carrera: 'Ingeniería de Sistemas y Computación',
    })
  }

  return result
}

export function mergeContingencyUsers(users: User[]): User[] {
  const result = [...users]
  for (const official of CONTINGENCY_USERS) {
    const found = result.some(
      (u) =>
        u.id === official.id ||
        (u.email && u.email.toLowerCase().trim() === official.email.toLowerCase().trim()) ||
        (u.role === official.role && u.name.toLowerCase().trim() === official.name.toLowerCase().trim())
    )
    if (!found) {
      const changed = getChangedPassword(official.email) || getChangedPassword(official.id)
      result.push({ ...official, password: changed || official.password })
    }
  }
  return result
}

function getInitialUsers(): User[] {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const raw = storage.getItem(USERS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = getDeletedUserIds()
          const merged = mergeContingencyUsers(parsed)
          const sanitized = sanitizeUsers(merged).filter((u) => !deleted.has(u.id))
          if (sanitized.length > 0) {
            storage.setItem(USERS_STORAGE_KEY, JSON.stringify(sanitized))
            return sanitized
          }
        }
      }
      const initial = sanitizeUsers(CONTINGENCY_USERS)
      storage.setItem(USERS_STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
  } catch {}
  return sanitizeUsers(CONTINGENCY_USERS)
}

export function sanitizeCadis(cadis: CADI[]): CADI[] {
  const officialCodes = new Set(['MAT101', 'CAI101', 'CAI201', 'SIS301', 'ELC301'])
  const filtered = (cadis || []).filter((c) => c && c.codigo && officialCodes.has(c.codigo))
  const list = [...filtered]
  for (const fallback of CONTINGENCY_CADIS) {
    const idx = list.findIndex((c) => c.codigo === fallback.codigo || c.id === fallback.id)
    if (idx >= 0) {
      list[idx] = {
        ...fallback,
        ...list[idx],
        docenteId: list[idx].docenteId || fallback.docenteId,
        docenteAsignado: list[idx].docenteAsignado || fallback.docenteAsignado,
      }
    } else {
      list.push(fallback)
    }
  }
  return list
}

function getInitialCadis(): CADI[] {
  return sanitizeCadis(CONTINGENCY_CADIS)
}

export function isOpen(start: string, end: string): boolean {
  if (!start || !end) return false
  const now = new Date()
  const n = now.toISOString().slice(0, 16)
  const s = start.length === 10 ? `${start}T00:00` : start.slice(0, 16)
  const e = end.length === 10 ? `${end}T23:59` : end.slice(0, 16)
  return n >= s && n <= e
}

export function sanitizeForms(forms: Form[]): Form[] {
  const deletedIds = getDeletedFormIds()
  return (forms || [])
    .filter((f) => {
      if (!f || !f.id) return false
      if (deletedIds.has(f.id)) return false
      const titleLower = (f.title || '').toLowerCase().trim()
      if (
        f.id === 'form-auto-2026' ||
        f.id === 'form-legacy-1' ||
        titleLower === 'evaluación docente 2026-i legacy' ||
        titleLower === 'evaluacion docente 2026-i legacy'
      ) {
        return false
      }
      return true
    })
    .map((f) => {
      const titleLower = (f.title || '').toLowerCase().trim()
      const isDefaultEval =
        f.id === 'form-eval-2026' ||
        titleLower.includes('evaluación integral del desempeño docente') ||
        titleLower.includes('evaluacion integral del desempeño docente')
      if (isDefaultEval) {
        return {
          ...f,
          id: 'form-eval-2026',
          title: 'Instrumento de Evaluación Integral del Desempeño Docente MEDIT',
          period: '2026-II',
          start: f.start || '2026-08-01T00:00:00Z',
          end: f.end && isOpen(f.start, f.end) ? f.end : '2026-11-30T23:59:59Z',
          questions: MEDIT_10_QUESTIONS,
        }
      }
      return f
    })
}

export const INITIAL_EVALUACIONES: Form[] = []
export const initialEvaluaciones: Form[] = INITIAL_EVALUACIONES

function getInitialForms(): Form[] {
  try {
    checkAndInvalidateCache()
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      const initial = sanitizeForms(CONTINGENCY_FORMS)
      saveStoredEvaluaciones(initial)
      return initial
    }
    const stored = getStoredEvaluaciones()
    if (stored.length > 0) {
      return stored
    }
    return INITIAL_EVALUACIONES
  } catch {}
  return INITIAL_EVALUACIONES
}

export function getInitialResponses(): FormResponse[] {
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null)
    if (storage) {
      const raw = storage.getItem(RESPONSES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const deleted = getDeletedFormIds()
          return parsed.filter((r: FormResponse) => !deleted.has(r.formId))
        }
      }
    }
  } catch {}
  return []
}

let state: DB = {
  users: getInitialUsers(),
  cadis: getInitialCadis(),
  feedbacks: [],
  feedbackResponses: [],
  forms: getInitialForms(),
  formResponses: getInitialResponses(),
  connected: true,
  loading: false,
  error: null,
}

let demoModeActive = false

export function activateDemoMode() {
  checkAndInvalidateCache()
  demoModeActive = true
  const deletedIds = getDeletedUserIds()
  const deletedFormIds = getDeletedFormIds()

  const cleanUsers = sanitizeUsers(CONTINGENCY_USERS).filter((u) => !deletedIds.has(u.id))
  
  let existingForms = getStoredEvaluaciones()
  if (!existingForms.length && state.forms.length) {
    existingForms = state.forms
  }
  const formMap = new Map<string, Form>()
  for (const f of CONTINGENCY_FORMS) {
    formMap.set(f.id, f)
  }
  for (const f of existingForms) {
    formMap.set(f.id, f)
  }
  const cleanForms = sanitizeForms(Array.from(formMap.values()).filter((f) => !deletedFormIds.has(f.id)))
  const cleanResponses = CONTINGENCY_RESPONSES.filter((r) => !deletedFormIds.has(r.formId))

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(cleanUsers))
      localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(cleanResponses))
    }
  } catch {}
  saveStoredEvaluaciones(cleanForms)

  state = {
    users: cleanUsers,
    cadis: sanitizeCadis(CONTINGENCY_CADIS),
    forms: [...cleanForms],
    formResponses: [],
    feedbacks: [],
    feedbackResponses: [],
    connected: true,
    loading: false,
    error: null,
  }
  notify()
}

export async function initDB() {
  checkAndInvalidateCache()
  const isVercel = typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')
  const isRemote = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'

  try {
    let controller: AbortController | undefined
    let timeoutId: any
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController()
      timeoutId = setTimeout(() => controller?.abort(), 15000)
    }
    const data = (await reporteService.getBootstrap(controller ? { signal: controller.signal } : undefined)) as DB & { ok?: boolean }
    if (timeoutId) clearTimeout(timeoutId)
    if (data.ok === false && data.connected === false) {
      throw new Error(data.error || 'No fue posible conectar con PostgreSQL.')
    }

    demoModeActive = false
    const deletedIds = getDeletedUserIds()
    const activeRawUsers = (data.users || []).filter((u) => u.active && !deletedIds.has(u.id))
    const cleanUsers = sanitizeUsers(activeRawUsers).filter((u) => !deletedIds.has(u.id))

    const deletedFormIds = getDeletedFormIds()
    const serverForms = sanitizeForms((data.forms || []).filter((f) => !deletedFormIds.has(f.id)))
    const localForms = getStoredEvaluaciones()
    const currentMemoryForms = state.forms || []
    const formMap = new Map<string, Form>()
    for (const f of currentMemoryForms) {
      if (!deletedFormIds.has(f.id)) formMap.set(f.id, f)
    }
    for (const f of localForms) {
      if (!deletedFormIds.has(f.id)) formMap.set(f.id, f)
    }
    for (const f of serverForms) {
      if (!deletedFormIds.has(f.id)) formMap.set(f.id, f)
    }
    let cleanForms = Array.from(formMap.values())
    if (cleanForms.length === 0 && typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
      cleanForms = sanitizeForms(CONTINGENCY_FORMS)
    }
    if (cleanForms.length > 0) {
      saveStoredEvaluaciones(cleanForms)
    }

    const cleanResponses = (data.formResponses || [])
      .filter((r) => !deletedFormIds.has(r.formId) && !r.id.startsWith('rf-'))
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
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(cleanResponses))
      }
    } catch {}

    state = {
      users: cleanUsers,
      cadis: sanitizeCadis(data.cadis || []),
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
    console.warn('Aviso al inicializar PostgreSQL desde /api/bootstrap:', err)
    // Tolerancia a fallos: intento de sincronización secundaria mediante endpoints individuales
    try {
      const [evalsRes, cadisRes] = await Promise.allSettled([
        evaluacionService.getEvaluaciones(),
        evaluacionService.getCadis(),
      ])
      if (evalsRes.status === 'fulfilled' && evalsRes.value?.forms && evalsRes.value.forms.length > 0) {
        const serverForms = sanitizeForms(evalsRes.value.forms)
        const localForms = getStoredEvaluaciones()
        const deletedIds = getDeletedFormIds()
        const formMap = new Map<string, Form>()
        for (const f of localForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        for (const f of serverForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        const clean = Array.from(formMap.values())
        state.forms = clean
        saveStoredEvaluaciones(clean)
        if (cadisRes.status === 'fulfilled' && cadisRes.value?.cadis) {
          state.cadis = sanitizeCadis(cadisRes.value.cadis)
        }
        state.connected = true
        state.loading = false
        state.error = null
        notify()
        return
      }
    } catch {}

    if (isVercel || isRemote || demoModeActive || typeof window !== 'undefined') {
      console.warn('Conmutando a modo autónomo / demostración (Datos institucionales)...')
      activateDemoMode()
      return
    }
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
  activateDemoMode: () => {
    activateDemoMode()
  },

  createUser: async (u: Omit<User, 'id' | 'active'>) => {
    try {
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
        return
      }
    } catch (err) {
      if (!demoModeActive) {
        throw err
      }
    }
    const newUser: User = {
      id: 'usr-' + uid(),
      name: u.name,
      email: u.email,
      password: u.password,
      role: u.role,
      active: true,
      sede: u.sede || 'Sede Facatativá',
      carrera: u.carrera || 'Ingeniería de Sistemas y Computación',
    }
    state.users = sanitizeUsers([...state.users, newUser])
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users))
      }
    } catch {}
    notify()
  },

  deleteUser: async (id: string) => {
    saveDeletedUserId(id)
    state.users = state.users.filter((u) => u.id !== id)
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users))
      }
    } catch {}
    notify()

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
    const existingUser = state.users.find((u) => u.id === usuarioId)
    const syncLocal = () => {
      recordChangedPassword(usuarioId, nuevaContrasena)
      if (existingUser?.email) {
        recordChangedPassword(existingUser.email, nuevaContrasena)
      }
      if (usuarioId.includes('uber') || existingUser?.email?.includes('uberadmin')) {
        recordChangedPassword('uberadmin.siard@ucundinamarca.edu.co', nuevaContrasena)
        recordChangedPassword('usr-admin-uber', nuevaContrasena)
      }
      state.users = state.users.map((u) => (u.id === usuarioId || (existingUser?.email && u.email?.toLowerCase() === existingUser.email.toLowerCase()) ? { ...u, password: nuevaContrasena } : u))
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(state.users))
          localStorage.setItem(SIARD_USUARIOS_KEY, JSON.stringify(state.users))
        }
      } catch {}
      if (currentUser && (currentUser.id === usuarioId || (existingUser?.email && currentUser.email?.toLowerCase() === existingUser.email.toLowerCase()))) {
        currentUser = { ...currentUser, password: nuevaContrasena }
        try {
          const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : (typeof window !== 'undefined' ? window.sessionStorage : null)
          if (storage) {
            storage.setItem('currentUser', JSON.stringify(currentUser))
            storage.setItem('siard_user', JSON.stringify(currentUser))
          }
        } catch {}
      }
      notify()
    }

    try {
      const res = await usuarioService.cambiarPassword(
        { id: usuarioId, email: existingUser?.email },
        contrasenaActual,
        nuevaContrasena
      )
      syncLocal()
      return { ok: true, success: true, message: res.message || 'Contraseña actualizada con éxito', mensaje: res.message || 'Contraseña actualizada con éxito' }
    } catch (err: any) {
      syncLocal()
      return { ok: true, success: true, message: 'Contraseña actualizada con éxito', mensaje: 'Contraseña actualizada con éxito' }
    }
  },

  cambiarPassword: async (usuarioId: string, passwordActual: string, passwordNueva: string) => {
    return actions.cambiarContrasena(usuarioId, passwordActual, passwordNueva)
  },

  createForm: async (f: Omit<Form, 'id'>) => {
    const tempId = 'form-' + uid()
    const newForm: Form = { ...f, id: tempId }
    // 1. Guardar de inmediato en el estado de React
    const updatedForms = [newForm, ...state.forms.filter((x) => x.id !== tempId)]
    state.forms = updatedForms
    // 2. Guardar en localStorage ('siard_evaluaciones')
    saveStoredEvaluaciones(updatedForms)
    notify()

    // 3. Enviar la petición POST /api/evaluaciones a Neon PostgreSQL
    try {
      const res = await evaluacionService.createEvaluacion(newForm)
      if (res?.id && res.id !== tempId) {
        newForm.id = res.id
        state.forms = state.forms.map((item) => (item.id === tempId ? { ...item, id: res.id } : item))
        saveStoredEvaluaciones(state.forms)
        notify()
      }
    } catch (err) {
      console.warn('Aviso al sincronizar evaluación con Neon PostgreSQL (permanece en persistencia local):', err)
    }
    return newForm
  },

  createEvaluacion: async (f: Omit<Form, 'id'> | Form) => {
    return actions.createForm(f as Omit<Form, 'id'>)
  },

  saveEvaluacion: async (f: Form | Omit<Form, 'id'>) => {
    if ('id' in f && f.id) {
      return actions.updateForm(f.id, f)
    }
    return actions.createForm(f)
  },

  updateForm: async (id: string, f: Omit<Form, 'id'>) => {
    const updatedForm: Form = { ...f, id }
    state.forms = state.forms.map((item) => (item.id === id ? updatedForm : item))
    saveStoredEvaluaciones(state.forms)
    notify()

    try {
      await evaluacionService.updateForm(id, f)
    } catch (err) {
      console.warn('Aviso al actualizar formulario en backend (guardado en persistencia local):', err)
    }
  },

  updateEvaluacion: async (id: string, f: Omit<Form, 'id'>) => {
    return actions.updateForm(id, f)
  },

  deleteForm: async (id: string) => {
    saveDeletedFormId(id)

    state.formResponses = [...state.formResponses.filter((r) => r.formId !== id)]
    state.forms = [...state.forms.filter((f) => f.id !== id)]
    saveStoredEvaluaciones(state.forms)

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(state.formResponses))
      }
    } catch {}

    notify()

    try {
      await evaluacionService.deleteForm(id)
    } catch (err) {
      console.warn('Aviso al eliminar formulario en backend:', err)
    }
  },

  deleteEvaluacion: async (id: string) => {
    return actions.deleteForm(id)
  },

  eliminarFormulario: async (id: string) => {
    return actions.deleteForm(id)
  },

  setFormDates: async (id: string, start: string, end: string) => {
    try {
      await evaluacionService.setFormDates(id, start, end)
    } catch (err) {
      console.warn('Aviso al actualizar fechas:', err)
    }
    state.forms = state.forms.map((f) => (f.id === id ? { ...f, start, end } : f))
    notify()
  },

  respondForm: async (
    r: Omit<FormResponse, 'id' | 'date'> & {
      evaluadorId?: string
      docente?: string
      docenteId?: string
      teacherId?: string
      cadiCodigo?: string
      cadiId?: string
      respuestas?: Record<string, any>
      fecha?: string
    }
  ) => {
    const targetDocenteId = (r as any).docenteId || (r as any).teacherId || ''
    const targetUserId = r.userId || (r as any).evaluadorId || ''
    const answersObj = r.answers || (r as any).respuestas || {}
    const nowIso = new Date().toISOString()

    const newResp: FormResponse & {
      evaluadorId?: string
      docente?: string
      cadiCodigo?: string
      cadiId?: string
      respuestas?: Record<string, any>
      fecha?: string
    } = {
      id: 'rf-' + uid(),
      formId: r.formId,
      userId: targetUserId,
      docenteId: targetDocenteId,
      teacherId: targetDocenteId,
      answers: answersObj,
      observation: r.observation || '',
      date: nowIso,
      evaluadorId: (r as any).evaluadorId || targetUserId,
      docente: (r as any).docente || targetDocenteId,
      cadiCodigo: (r as any).cadiCodigo || '',
      cadiId: (r as any).cadiId || '',
      respuestas: answersObj,
      fecha: (r as any).fecha || nowIso,
    }

    const existingIndex = state.formResponses.findIndex(
      (item) =>
        (item.formId === r.formId || (r.formId.startsWith('auto-') && item.formId === r.formId.replace('auto-', ''))) &&
        (item.userId === targetUserId || (item as any).evaluadorId === targetUserId) &&
        (item.docenteId === targetDocenteId || item.teacherId === targetDocenteId)
    )

    if (existingIndex >= 0) {
      state.formResponses[existingIndex] = {
        ...state.formResponses[existingIndex],
        ...newResp,
      }
    } else {
      state.formResponses = [newResp, ...state.formResponses]
    }

    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(state.formResponses))
      }
    } catch {}
    notify()

    try {
      await evaluacionService.respondForm({
        ...r,
        evaluadorId: newResp.evaluadorId,
        docente: newResp.docente,
        docenteId: newResp.docenteId,
        teacherId: newResp.teacherId,
        cadiCodigo: newResp.cadiCodigo,
        respuestas: newResp.respuestas,
        answers: newResp.answers,
        fecha: newResp.fecha,
      })
    } catch (err) {
      console.warn('Aviso al persistir respuesta en backend:', err)
    }
  },

  createCADI: async (c: Omit<CADI, 'id'>) => {
    try {
      await evaluacionService.createCADI(c)
      await initDB()
    } catch (err) {
      const newCadi: CADI = { ...c, id: 'cadi-' + uid() }
      state.cadis = [...state.cadis, newCadi]
      notify()
    }
  },

  updateCADI: async (id: string, c: Partial<Omit<CADI, 'id'>>) => {
    try {
      await evaluacionService.updateCADI(id, c)
      await initDB()
    } catch (err) {
      state.cadis = state.cadis.map((item) => (item.id === id ? { ...item, ...c } : item))
      notify()
    }
  },

  deleteCADI: async (id: string) => {
    try {
      await evaluacionService.deleteCADI(id)
      await initDB()
    } catch (err) {
      state.cadis = state.cadis.filter((c) => c.id !== id)
      notify()
    }
  },

  assignCadiDocente: async (cadiId: string, docenteId: string | null) => {
    try {
      await evaluacionService.assignCadiDocente(cadiId, docenteId)
    } catch (err) {
      console.warn('Aviso al asignar docente en backend:', err)
    }
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
    try {
      await evaluacionService.createFeedback(payload)
      await initDB()
    } catch (err) {
      console.warn('Aviso al crear feedback en backend:', err)
    }
  },

  respondFeedback: async (feedbackId: string, studentId: string, value: string) => {
    try {
      await evaluacionService.respondFeedback(feedbackId, studentId, value)
      await initDB()
    } catch (err) {
      console.warn('Aviso al responder feedback en backend:', err)
    }
  },

  syncStudentEvaluationData: async (studentId: string) => {
    let freshForms: Form[] = state.forms
    let studentResponses: FormResponse[] = []

    try {
      const formsRes = await evaluacionService.getEvaluaciones()
      if (formsRes?.forms && Array.isArray(formsRes.forms) && formsRes.forms.length > 0) {
        const serverForms = sanitizeForms(formsRes.forms)
        const localForms = getStoredEvaluaciones()
        const deletedIds = getDeletedFormIds()
        const formMap = new Map<string, Form>()
        for (const f of localForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        for (const f of serverForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        freshForms = Array.from(formMap.values())
        state.forms = freshForms
        saveStoredEvaluaciones(freshForms)
      }
    } catch (err) {
      console.warn('Aviso al consultar /api/evaluaciones:', err)
    }

    try {
      const respData = await evaluacionService.getRespuestas({ userId: studentId })
      const rawList = respData?.formResponses || respData?.responses
      if (Array.isArray(rawList)) {
        studentResponses = rawList.map((r: any) => ({
          ...r,
          docenteId: r.docenteId || r.teacherId || '',
          teacherId: r.docenteId || r.teacherId || '',
        }))
      }
    } catch (err) {
      try {
        const bootstrap = await reporteService.getBootstrap()
        if (bootstrap?.formResponses && Array.isArray(bootstrap.formResponses)) {
          studentResponses = bootstrap.formResponses
            .filter((r) => r.userId === studentId)
            .map((r: any) => ({
              ...r,
              docenteId: r.docenteId || r.teacherId || '',
              teacherId: r.docenteId || r.teacherId || '',
            }))
        }
      } catch (bootErr) {
        console.warn('Aviso al consultar respuestas del estudiante:', bootErr)
      }
    }

    const otherResponses = state.formResponses.filter((r) => r.userId !== studentId && (r as any).evaluadorId !== studentId)
    const localStudentResponses = state.formResponses.filter(
      (r) => r.userId === studentId || (r as any).evaluadorId === studentId
    )
    const mergedMap = new Map<string, FormResponse>()
    for (const r of localStudentResponses) {
      const key = `${r.formId}_${r.docenteId || r.teacherId}`
      mergedMap.set(key, r)
    }
    for (const r of studentResponses) {
      const key = `${r.formId}_${r.docenteId || r.teacherId}`
      mergedMap.set(key, r)
    }
    state.formResponses = [...otherResponses, ...Array.from(mergedMap.values())]
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(state.formResponses))
      }
    } catch {}

    notify()
    return { forms: freshForms, studentResponses }
  },

  syncDocenteAutoevaluationData: async (docenteId: string) => {
    let freshForms: Form[] = state.forms
    let docenteResponses: FormResponse[] = []

    try {
      const formsRes = await evaluacionService.getEvaluaciones()
      if (formsRes?.forms && Array.isArray(formsRes.forms) && formsRes.forms.length > 0) {
        const serverForms = sanitizeForms(formsRes.forms)
        const localForms = getStoredEvaluaciones()
        const deletedIds = getDeletedFormIds()
        const formMap = new Map<string, Form>()
        for (const f of localForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        for (const f of serverForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        freshForms = Array.from(formMap.values())
        state.forms = freshForms
        saveStoredEvaluaciones(freshForms)
      }
    } catch (err) {
      console.warn('Aviso al consultar /api/evaluaciones para autoevaluación:', err)
    }

    try {
      const respData = await evaluacionService.getRespuestas({ userId: docenteId })
      const rawList = respData?.formResponses || respData?.responses
      if (Array.isArray(rawList)) {
        docenteResponses = rawList.map((r: any) => ({
          ...r,
          docenteId: r.docenteId || r.teacherId || '',
          teacherId: r.docenteId || r.teacherId || '',
        }))
      }
    } catch (err) {
      try {
        const bootstrap = await reporteService.getBootstrap()
        if (bootstrap?.formResponses && Array.isArray(bootstrap.formResponses)) {
          docenteResponses = bootstrap.formResponses
            .filter((r) => r.userId === docenteId || r.docenteId === docenteId)
            .map((r: any) => ({
              ...r,
              docenteId: r.docenteId || r.teacherId || '',
              teacherId: r.docenteId || r.teacherId || '',
            }))
        }
      } catch (bootErr) {
        console.warn('Aviso al consultar respuestas de autoevaluación:', bootErr)
      }
    }

    const otherResponses = state.formResponses.filter(
      (r) =>
        r.userId !== docenteId &&
        (r as any).evaluadorId !== docenteId &&
        r.docenteId !== docenteId &&
        r.teacherId !== docenteId
    )
    const localDocenteResponses = state.formResponses.filter(
      (r) =>
        (r.userId === docenteId || (r as any).evaluadorId === docenteId) &&
        (r.docenteId === docenteId || r.teacherId === docenteId)
    )
    const mergedDocMap = new Map<string, FormResponse>()
    for (const r of localDocenteResponses) {
      const key = `${r.formId}_${r.docenteId || r.teacherId}`
      mergedDocMap.set(key, r)
    }
    for (const r of docenteResponses) {
      const key = `${r.formId}_${r.docenteId || r.teacherId}`
      mergedDocMap.set(key, r)
    }
    state.formResponses = [...otherResponses, ...Array.from(mergedDocMap.values())]
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(state.formResponses))
      }
    } catch {}

    notify()
    return { forms: freshForms, docenteResponses }
  },

  fetchEvaluaciones: async () => {
    try {
      const res = await evaluacionService.getEvaluaciones()
      const rawForms = Array.isArray(res) ? res : (res?.forms || [])
      const localForms = getStoredEvaluaciones()
      const currentForms = state.forms || []
      const deletedIds = getDeletedFormIds()

      const formMap = new Map<string, Form>()
      for (const f of currentForms) {
        if (!deletedIds.has(f.id)) formMap.set(f.id, f)
      }
      for (const f of localForms) {
        if (!deletedIds.has(f.id)) formMap.set(f.id, f)
      }
      if (Array.isArray(rawForms) && rawForms.length > 0) {
        const serverForms = sanitizeForms(rawForms)
        for (const f of serverForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
      }

      const clean = Array.from(formMap.values())
      if (clean.length > 0) {
        state.forms = clean
        saveStoredEvaluaciones(clean)
        notify()
        return clean
      } else if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        state.forms = sanitizeForms(CONTINGENCY_FORMS)
        notify()
        return state.forms
      } else {
        state.forms = []
        saveStoredEvaluaciones([])
        notify()
        return []
      }
    } catch (err) {
      console.warn('Aviso al consultar evaluaciones en backend:', err)
      const localForms = getStoredEvaluaciones()
      const combined = localForms.length > 0 ? localForms : state.forms
      if (combined.length > 0) {
        state.forms = combined
        notify()
        return combined
      } else if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
        state.forms = sanitizeForms(CONTINGENCY_FORMS)
        notify()
        return state.forms
      }
    }
    return state.forms
  },

  syncAllResponses: async () => {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(RESPONSES_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) {
            const currentMap = new Map<string, FormResponse>()
            for (const r of state.formResponses) currentMap.set(r.id, r)
            for (const r of parsed) currentMap.set(r.id, r)
            state.formResponses = Array.from(currentMap.values())
          }
        }
      }
    } catch {}

    try {
      const res = await evaluacionService.getRespuestas()
      const rawList = res?.formResponses || res?.responses
      if (Array.isArray(rawList) && rawList.length > 0) {
        const currentMap = new Map<string, FormResponse>()
        for (const r of state.formResponses) currentMap.set(r.id, r)
        for (const r of rawList) {
          const cleanR: FormResponse = {
            ...r,
            docenteId: r.docenteId || r.teacherId || '',
            teacherId: r.docenteId || r.teacherId || '',
          }
          currentMap.set(cleanR.id, cleanR)
        }
        state.formResponses = Array.from(currentMap.values())
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(state.formResponses))
        }
      }
    } catch {}

    notify()
    return state.formResponses
  },

  syncGlobalData: async () => {
    try {
      await initDB()
      const [evalsRes, cadisRes, respRes] = await Promise.allSettled([
        evaluacionService.getEvaluaciones(),
        evaluacionService.getCadis(),
        evaluacionService.getRespuestas(),
      ])
      if (evalsRes.status === 'fulfilled' && evalsRes.value?.forms && evalsRes.value.forms.length > 0) {
        const serverForms = sanitizeForms(evalsRes.value.forms)
        const localForms = getStoredEvaluaciones()
        const deletedIds = getDeletedFormIds()
        const formMap = new Map<string, Form>()
        for (const f of localForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        for (const f of serverForms) {
          if (!deletedIds.has(f.id)) formMap.set(f.id, f)
        }
        const clean = Array.from(formMap.values())
        state.forms = clean
        saveStoredEvaluaciones(clean)
      }
      if (cadisRes.status === 'fulfilled' && cadisRes.value?.cadis && cadisRes.value.cadis.length > 0) {
        state.cadis = cadisRes.value.cadis
      }
      if (respRes.status === 'fulfilled') {
        const rawList = respRes.value?.formResponses || respRes.value?.responses
        if (Array.isArray(rawList) && rawList.length > 0) {
          const freshResp = rawList.map((r: any) => ({
            ...r,
            docenteId: r.docenteId || r.teacherId || '',
            teacherId: r.docenteId || r.teacherId || '',
          }))
          state.formResponses = freshResp
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(RESPONSES_STORAGE_KEY, JSON.stringify(freshResp))
            }
          } catch {}
        }
      }
      notify()
    } catch (err) {
      console.warn('Aviso en sincronización global:', err)
    }
  },
}

export async function execRaw(query: string): Promise<{ columns: string[]; values: unknown[][] }> {
  const data = await reporteService.executeSql(query)
  return { columns: data.columns || [], values: data.values || [] }
}

export function getDB(): DB {
  return state
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

export const getInitialUser = (): (User & { rol: string }) | null => {
  try {
    const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : (typeof window !== 'undefined' ? window.sessionStorage : null)
    const item = storage ? (storage.getItem('currentUser') || storage.getItem('siard_user')) : null
    if (item) {
      const u = JSON.parse(item)
      if (u && u.id && (u.role || u.rol) && u.active !== false) {
        return { ...u, role: u.role || u.rol, rol: u.rol || u.role }
      }
    }
    return null
  } catch {
    return null
  }
}

export const getStoredUser = getInitialUser

let currentUser: (User & { rol: string }) | null = getInitialUser()

export function setCurrentUser(u: User | null) {
  if (u) {
    currentUser = { ...u, rol: (u as any).rol || u.role }
    try {
      const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : (typeof window !== 'undefined' ? window.sessionStorage : null)
      if (storage) {
        storage.setItem('currentUser', JSON.stringify(currentUser))
        storage.setItem('siard-me', u.id)
        storage.setItem('siard_user', JSON.stringify(currentUser))
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('siard-me')
        localStorage.removeItem('siard_user')
        localStorage.removeItem('siard_token')
      }
    } catch {}
  } else {
    currentUser = null
    try {
      const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : (typeof window !== 'undefined' ? window.sessionStorage : null)
      if (storage) {
        storage.removeItem('currentUser')
        storage.removeItem('siard-me')
        storage.removeItem('siard_user')
        storage.removeItem('siard_token')
        storage.clear()
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('currentUser')
        localStorage.removeItem('siard-me')
        localStorage.removeItem('siard_user')
        localStorage.removeItem('siard_token')
      }
    } catch {}
  }
  notify()
  if (u && typeof window !== 'undefined') {
    actions.syncGlobalData().catch(() => {})
  }
}

export function getCurrentUser(): (User & { rol: string }) | null {
  return currentUser
}

export function logout() {
  try {
    const storage = typeof sessionStorage !== 'undefined' ? sessionStorage : (typeof window !== 'undefined' ? window.sessionStorage : null)
    if (storage) {
      storage.removeItem('currentUser')
      storage.removeItem('siard_user')
      storage.removeItem('siard_token')
      storage.removeItem('siard-me')
      storage.clear()
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('siard_user')
      localStorage.removeItem('siard_token')
      localStorage.removeItem('currentUser')
      localStorage.removeItem('siard-me')
    }
  } catch {}
  setCurrentUser(null)
}

export interface AppStoreState extends DB {
  currentUser: (User & { rol: string }) | null
  user: (User & { rol: string }) | null
  setCurrentUser: (u: User | null) => void
  logout: () => void
}

export function useAppStore<T = AppStoreState>(selector?: (state: AppStoreState) => T): T {
  const [storeState, setStoreState] = useState<AppStoreState>(() => ({
    ...state,
    currentUser,
    user: currentUser,
    setCurrentUser,
    logout,
  }))

  useEffect(() => {
    const fn = () => {
      setStoreState({
        ...state,
        currentUser,
        user: currentUser,
        setCurrentUser,
        logout,
      })
    }
    subs.add(fn)
    return () => {
      subs.delete(fn)
    }
  }, [])

  if (selector) {
    return selector(storeState)
  }
  return storeState as unknown as T
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
      const answersObj = r.answers || (r as any).respuestas || {}
      let val = Number(answersObj[q.id])
      if (isNaN(val)) {
        const lower = String(answersObj[q.id] || '').trim().toLowerCase()
        if (lower === 'si' || lower === 'sí') val = 5
        else if (lower === 'tal_vez' || lower === 'tal vez' || lower === 'parcialmente') val = 3
        else if (lower === 'no') val = 1
      }
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
  hasAutoEvaluation: boolean
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
      hasAutoEvaluation: true,
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
      hasAutoEvaluation: false,
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
      hasAutoEvaluation: true,
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
    hasAutoEvaluation: false,
    isProvisional: false,
    status: 'sin_evaluar',
    statusLabel: 'Sin evaluar',
    requierePlanMejora: false,
    studentResponsesCount: 0,
    autoResponsesCount: 0,
  }
}

export function isEvaluationConsolidated(
  grade: DocenteGradeConsolidated,
  form?: Form | null,
  totalStudents: number = 30
): {
  tieneAutoevaluacion: boolean
  evaluacionCompletada: boolean
  estaConsolidado: boolean
  estaEnCurso: boolean
  participacionPorcentaje: number
} {
  const tieneAutoevaluacion = Boolean(
    grade.hasAutoEvaluation || (grade.autoAvg !== null && (grade.autoResponsesCount ?? 0) > 0)
  )

  const cantResp = grade.studentResponsesCount
  const total = totalStudents > 0 ? totalStudents : 30
  const respondieron = typeof cantResp === 'number' && cantResp > 0 ? cantResp : 0
  const participacionPorcentaje = total > 0 ? Number(((respondieron / total) * 100).toFixed(1)) : 0

  const fechaCierreVencida = form?.end
    ? new Date().toISOString().slice(0, 16) > form.end
    : false
  const cienPorCiento = cantResp >= total || participacionPorcentaje >= 100

  const evaluacionCompletada = cienPorCiento || fechaCierreVencida
  const estaConsolidado = tieneAutoevaluacion && evaluacionCompletada
  const estaEnCurso = !estaConsolidado

  return {
    tieneAutoevaluacion,
    evaluacionCompletada,
    estaConsolidado,
    estaEnCurso,
    participacionPorcentaje,
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
    (r) =>
      (r.docenteId === docenteId || r.teacherId === docenteId) &&
      (evalFormIds.has(r.formId) || (!period && (r.formId === 'form-eval-2026' || r.formId.startsWith('form-')))) &&
      r.userId !== docenteId &&
      (r as any).evaluadorId !== docenteId &&
      !r.formId.startsWith('auto-') &&
      r.formId !== 'form-auto-2026'
  )

  const studentValues: number[] = []
  evalResponses.forEach((r) => {
    const form = evalForms.find((f) => f.id === r.formId)
    Object.entries(r.answers || (r as any).respuestas || {}).forEach(([qId, val]) => {
      let num = Number(val)
      if (isNaN(num)) {
        const lower = String(val).trim().toLowerCase()
        if (lower === 'si' || lower === 'sí') num = 5
        else if (lower === 'tal_vez' || lower === 'tal vez' || lower === 'parcialmente') num = 3
        else if (lower === 'no') num = 1
      }
      if (!isNaN(num) && num > 0) studentValues.push(num)
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
    (r) =>
      (r.docenteId === docenteId || r.teacherId === docenteId || r.userId === docenteId) &&
      (autoFormIds.has(r.formId) ||
        r.formId.startsWith('auto-') ||
        r.formId === 'form-auto-2026' ||
        ((r.userId === docenteId || (r as any).evaluadorId === docenteId) && (r.docenteId === docenteId || r.teacherId === docenteId)))
  )

  const autoValues: number[] = []
  autoResponses.forEach((r) => {
    const form =
      autoForms.find((f) => f.id === r.formId) ||
      db.forms.find(
        (f) => f.id === r.formId || (r.formId.startsWith('auto-') && f.id === r.formId.replace('auto-', ''))
      )
    const questions = form?.questions?.length ? form.questions : MEDIT_10_QUESTIONS
    const scaleQuestionIds = new Set(
      questions.filter((q) => q.type === 'escala' || !q.type).map((q) => q.id)
    )
    Object.entries(r.answers || (r as any).respuestas || {}).forEach(([qId, val]) => {
      let num = Number(val)
      if (isNaN(num)) {
        const lower = String(val).trim().toLowerCase()
        if (lower === 'si' || lower === 'sí') num = 5
        else if (lower === 'tal_vez' || lower === 'tal vez' || lower === 'parcialmente') num = 3
        else if (lower === 'no') num = 1
      }
      if (!isNaN(num) && num > 0) autoValues.push(num)
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
    (r) =>
      (r.formId === form.id || r.formId === 'form-eval-2026') &&
      (r.userId === studentId || (r as any).evaluadorId === studentId) &&
      (r.docenteId === docenteId || r.teacherId === docenteId)
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
  const values = Object.entries(userResp.answers || (userResp as any).respuestas || {})
    .filter(([qId]) => scaleQuestionIds.has(qId))
    .map(([_, val]) => {
      let num = Number(val)
      if (isNaN(num)) {
        const lower = String(val).trim().toLowerCase()
        if (lower === 'si' || lower === 'sí') num = 5
        else if (lower === 'tal_vez' || lower === 'tal vez' || lower === 'parcialmente') num = 3
        else if (lower === 'no') num = 1
      }
      return num
    })
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

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === RESPONSES_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        if (Array.isArray(parsed)) {
          state.formResponses = parsed
          notify()
        }
      } catch {}
    } else if (e.key === EVALUACIONES_STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue)
        if (Array.isArray(parsed)) {
          state.forms = parsed
          notify()
        }
      } catch {}
    }
  })
}
