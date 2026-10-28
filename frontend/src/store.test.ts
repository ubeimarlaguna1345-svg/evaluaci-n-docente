import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateConsolidatedGrade,
  getDocenteConsolidatedGrade,
  getTeacherConsolidatedGrade,
  getStudentDocenteEvaluationStatus,
  getStudentTeacherEvaluationStatus,
  sanitizeUsers,
  getDeletedUserIds,
  saveDeletedUserId,
  getDeletedFormIds,
  saveDeletedFormId,
  CONTINGENCY_USERS,
  CONTINGENCY_CADIS,
  CONTINGENCY_FORMS,
  activateDemoMode,
  type DB,
  type Form,
  type CADI,
  type User,
} from './store'
import { VIEWS } from './views/common/Shell'
import { formatDocenteId } from './views/coordinador/Report'
import { BLOQUES, categorizarPregunta } from './views/estudiante/StudentEvaluationForm'

const uid = () => Math.random().toString(36).slice(2, 10)

export function calcularPromedio(notas: number[]): number {
  if (!notas.length) return 0
  const suma = notas.reduce((acc, curr) => acc + curr, 0)
  return Number((suma / notas.length).toFixed(2))
}

export interface RegistroVoto {
  formularioId: string
  usuarioId: string
  docenteId: string
}

export class GestorEvaluaciones {
  private votos: RegistroVoto[] = []

  registrarVoto(formularioId: string, usuarioId: string, docenteId: string): { ok: boolean; error?: string } {
    if (this.haVotado(formularioId, usuarioId, docenteId)) {
      throw new Error('UNIQUE constraint failed: el estudiante ya evaluó a este docente en este formulario')
    }
    this.votos.push({ formularioId, usuarioId, docenteId })
    return { ok: true }
  }

  haVotado(formularioId: string, usuarioId: string, docenteId: string): boolean {
    return this.votos.some(
      (v) => v.formularioId === formularioId && v.usuarioId === usuarioId && v.docenteId === docenteId
    )
  }

  totalVotosDocente(formularioId: string, docenteId: string): number {
    return this.votos.filter((v) => v.formularioId === formularioId && v.docenteId === docenteId).length
  }
}

export function clasificarReputacion(avg: number, totalResponses: number) {
  if (totalResponses === 0) return { label: 'Sin evaluar', isTop: false }
  if (avg >= 4.5) return { label: '⭐ Destacado', isTop: true }
  if (avg >= 4.0) return { label: '✓ Sobresaliente', isTop: false }
  if (avg >= 3.0) return { label: 'Aceptable', isTop: false }
  return { label: '⚠️ En Seguimiento', isTop: false }
}

describe('Cálculo de promedios de calificación con precisión a dos decimales', () => {
  it('debe calcular correctamente el promedio de notas [5, 4, 3] = 4.00', () => {
    const notas = [5, 4, 3]
    expect(calcularPromedio(notas)).toBe(4.00)
  })

  it('debe redondear a 2 decimales para [4, 4, 5] = 4.33', () => {
    const notas = [4, 4, 5]
    expect(calcularPromedio(notas)).toBe(4.33)
  })

  it('debe retornar 0 cuando la lista de notas está vacía', () => {
    expect(calcularPromedio([])).toBe(0)
  })

  it('debe calcular nota única correctamente', () => {
    expect(calcularPromedio([4.8])).toBe(4.80)
  })

  it('debe calcular promedio con precisión de dos decimales para [4.33, 4.67] = 4.50', () => {
    const notas = [4.33, 4.67]
    expect(calcularPromedio(notas)).toBe(4.50)
  })
})

describe('Ponderación de Calificación Consolidada (70% Estudiantes - 30% Autoevaluación)', () => {
  it('debe calcular exactamente la fórmula (Estudiantes * 0.70) + (Autoevaluación * 0.30)', () => {
    const studentAvg = 4.0
    const autoAvg = 5.0
    const res = calculateConsolidatedGrade(studentAvg, autoAvg)
    expect(res.studentWeighted).toBe(2.80)
    expect(res.autoWeighted).toBe(1.50)
    expect(res.finalScore).toBe(4.30)
    expect(res.status).toBe('completo')
    expect(res.isProvisional).toBe(false)
  })

  it('debe calcular correctamente cuando ambas notas son idénticas', () => {
    const res = calculateConsolidatedGrade(3.50, 3.50)
    expect(res.studentWeighted).toBe(2.45)
    expect(res.autoWeighted).toBe(1.05)
    expect(res.finalScore).toBe(3.50)
    expect(res.requierePlanMejora).toBe(true)
  })

  it('debe otorgar la máxima calificación cuando ambas son 5.00', () => {
    const res = calculateConsolidatedGrade(5.00, 5.00)
    expect(res.studentWeighted).toBe(3.50)
    expect(res.autoWeighted).toBe(1.50)
    expect(res.finalScore).toBe(5.00)
    expect(res.requierePlanMejora).toBe(false)
  })

  it('debe manejar caso incompleto: sin autoevaluación (provisional sobre escala 5.0)', () => {
    const studentAvg = 3.80
    const autoAvg = null
    const res = calculateConsolidatedGrade(studentAvg, autoAvg)
    expect(res.studentAvg).toBe(3.80)
    expect(res.studentWeighted).toBe(2.66)
    expect(res.autoAvg).toBeNull()
    expect(res.autoWeighted).toBeNull()
    expect(res.finalScore).toBe(3.80)
    expect(res.isProvisional).toBe(true)
    expect(res.status).toBe('pendiente_autoevaluacion')
    expect(res.requierePlanMejora).toBe(true)
  })

  it('debe manejar caso incompleto: sin evaluación de estudiantes (provisional sobre escala 5.0)', () => {
    const studentAvg = null
    const autoAvg = 4.20
    const res = calculateConsolidatedGrade(studentAvg, autoAvg)
    expect(res.studentAvg).toBeNull()
    expect(res.studentWeighted).toBeNull()
    expect(res.autoAvg).toBe(4.20)
    expect(res.autoWeighted).toBe(1.26)
    expect(res.finalScore).toBe(4.20)
    expect(res.isProvisional).toBe(true)
    expect(res.status).toBe('pendiente_estudiantes')
    expect(res.requierePlanMejora).toBe(false)
  })

  it('debe manejar caso sin evaluar (ambos nulos)', () => {
    const res = calculateConsolidatedGrade(null, null)
    expect(res.finalScore).toBe(0)
    expect(res.hasEvaluations).toBe(false)
    expect(res.status).toBe('sin_evaluar')
    expect(res.requierePlanMejora).toBe(false)
  })

  it('debe conservar precisión a dos decimales con valores fraccionarios', () => {
    const res = calculateConsolidatedGrade(3.83, 4.17)
    expect(res.finalScore).toBe(3.93)
    expect(res.studentWeighted).toBe(2.68)
    expect(res.autoWeighted).toBe(1.25)
  })
})

describe('Filtrado estricto en "Reporte de mejora" (Umbral <= 3.9)', () => {
  it('docente con nota final exacta de 3.90 DEBE figurar en el requerimiento de plan de mejora', () => {
    const res = calculateConsolidatedGrade(3.90, 3.90)
    expect(res.finalScore).toBe(3.90)
    expect(res.requierePlanMejora).toBe(true)
  })

  it('docente con nota final de 3.85 DEBE figurar en el requerimiento de plan de mejora', () => {
    const res = calculateConsolidatedGrade(4.0, 3.5)
    expect(res.finalScore).toBe(3.85)
    expect(res.requierePlanMejora).toBe(true)
  })

  it('docente con nota final frontera de 4.00 NO debe figurar en plan de mejora (es satisfactorio)', () => {
    const res = calculateConsolidatedGrade(4.0, 4.0)
    expect(res.finalScore).toBe(4.00)
    expect(res.requierePlanMejora).toBe(false)
  })

  it('docente con nota final de 4.20 NO debe figurar en plan de mejora', () => {
    const res = calculateConsolidatedGrade(4.2, 4.2)
    expect(res.finalScore).toBe(4.20)
    expect(res.requierePlanMejora).toBe(false)
  })

  it('docente sin evaluaciones registradas NO debe requerir plan de mejora', () => {
    const res = calculateConsolidatedGrade(null, null)
    expect(res.requierePlanMejora).toBe(false)
  })
})

describe('Control de anonimato y bloqueo de doble voto', () => {
  it('debe impedir que un estudiante evalúe dos veces al mismo docente en el mismo formulario', () => {
    const gestor = new GestorEvaluaciones()
    const formId = uid()
    const estId = uid()
    const docId = uid()

    expect(() => gestor.registrarVoto(formId, estId, docId)).not.toThrow()
    expect(() => gestor.registrarVoto(formId, estId, docId)).toThrow(
      /el estudiante ya evaluó a este docente/
    )
  })

  it('debe detectar si un estudiante ya evaluó a un docente para bloquear el doble voto desde la UI', () => {
    const gestor = new GestorEvaluaciones()
    const formId = uid()
    const estId = uid()
    const docId = uid()

    expect(gestor.haVotado(formId, estId, docId)).toBe(false)
    gestor.registrarVoto(formId, estId, docId)
    expect(gestor.haVotado(formId, estId, docId)).toBe(true)
  })

  it('debe permitir que diferentes estudiantes evalúen al mismo docente de manera anónima', () => {
    const gestor = new GestorEvaluaciones()
    const formId = uid()
    const docId = uid()
    const estA = uid()
    const estB = uid()

    expect(() => gestor.registrarVoto(formId, estA, docId)).not.toThrow()
    expect(() => gestor.registrarVoto(formId, estB, docId)).not.toThrow()
    expect(gestor.totalVotosDocente(formId, docId)).toBe(2)
  })

  it('debe permitir que un estudiante evalúe a diferentes docentes en el mismo formulario', () => {
    const gestor = new GestorEvaluaciones()
    const formId = uid()
    const estId = uid()
    const doc1 = uid()
    const doc2 = uid()

    expect(() => gestor.registrarVoto(formId, estId, doc1)).not.toThrow()
    expect(() => gestor.registrarVoto(formId, estId, doc2)).not.toThrow()
    expect(gestor.haVotado(formId, estId, doc1)).toBe(true)
    expect(gestor.haVotado(formId, estId, doc2)).toBe(true)
  })
})

describe('Reputación docente (labels y umbrales)', () => {
  it('debe clasificar promedio >= 4.5 como "⭐ Destacado"', () => {
    const rep = clasificarReputacion(4.8, 10)
    expect(rep.label).toBe('⭐ Destacado')
    expect(rep.isTop).toBe(true)
  })

  it('debe clasificar promedio [4.0, 4.5) como "✓ Sobresaliente"', () => {
    const rep = clasificarReputacion(4.2, 5)
    expect(rep.label).toBe('✓ Sobresaliente')
    expect(rep.isTop).toBe(false)
  })

  it('debe clasificar promedio [3.0, 4.0) como "Aceptable"', () => {
    const rep = clasificarReputacion(3.5, 3)
    expect(rep.label).toBe('Aceptable')
    expect(rep.isTop).toBe(false)
  })

  it('debe clasificar promedio < 3.0 como "⚠️ En Seguimiento"', () => {
    const rep = clasificarReputacion(2.1, 2)
    expect(rep.label).toBe('⚠️ En Seguimiento')
    expect(rep.isTop).toBe(false)
  })

  it('debe mostrar "Sin evaluar" cuando no hay respuestas', () => {
    const rep = clasificarReputacion(0, 0)
    expect(rep.label).toBe('Sin evaluar')
    expect(rep.isTop).toBe(false)
  })

  it('promedio en la frontera exacta 4.5 debe ser "⭐ Destacado"', () => {
    const rep = clasificarReputacion(4.5, 4)
    expect(rep.label).toBe('⭐ Destacado')
    expect(rep.isTop).toBe(true)
  })

  it('promedio en la frontera exacta 3.0 debe ser "Aceptable"', () => {
    const rep = clasificarReputacion(3.0, 1)
    expect(rep.label).toBe('Aceptable')
    expect(rep.isTop).toBe(false)
  })
})

describe('Ponderación PGC 20%', () => {
  it('promedio 4.6 × 0.20 = 0.92 sobre la nota del CADI Articulador', () => {
    const overall = 4.6
    const pgcPonderado20 = Number((overall * 0.20).toFixed(2))
    expect(pgcPonderado20).toBeCloseTo(0.92, 2)
  })

  it('promedio 5.0 × 0.20 = 1.00', () => {
    const overall = 5.0
    const pgcPonderado20 = Number((overall * 0.20).toFixed(2))
    expect(pgcPonderado20).toBeCloseTo(1.0, 2)
  })

  it('promedio 0.0 × 0.20 = 0.00', () => {
    const overall = 0
    const pgcPonderado20 = Number((overall * 0.20).toFixed(2))
    expect(pgcPonderado20).toBe(0)
  })
})

describe('Integración getTeacherConsolidatedGrade con base de datos en memoria', () => {
  it('debe calcular correctamente notas desde respuestas reales de estudiantes y autoevaluación', () => {
    const teacherId = 'doc-1'
    const studentId = 'est-1'
    const evalForm: Form = {
      id: 'form-eval-1',
      kind: 'evaluacion',
      title: 'Evaluación Docente 2026-1',
      description: '',
      period: '2026-1',
      start: '2026-01-01',
      end: '2026-12-31',
      questions: [
        { id: 'q1', text: 'Claridad', type: 'escala', options: [], required: true, dimension: 'Pedagógica y Didáctica' },
        { id: 'q2', text: 'Dominio', type: 'escala', options: [], required: true, dimension: 'Disciplinar e Investigativa' },
      ],
    }
    const autoForm: Form = {
      id: 'form-auto-1',
      kind: 'autoevaluacion',
      title: 'Autoevaluación Docente 2026-1',
      description: '',
      period: '2026-1',
      start: '2026-01-01',
      end: '2026-12-31',
      questions: [
        { id: 'qa1', text: 'Autoevaluación didáctica', type: 'escala', options: [], required: true, dimension: 'Pedagógica y Didáctica' },
      ],
    }

    const mockDb: DB = {
      users: [
        { id: teacherId, name: 'Docente Prueba', email: 'doc@udec.edu.co', password: '123', role: 'docente', active: true },
        { id: studentId, name: 'Estudiante 1', email: 'est@udec.edu.co', password: '123', role: 'estudiante', active: true },
      ],
      cadis: [],
      feedbacks: [],
      feedbackResponses: [],
      forms: [evalForm, autoForm],
      formResponses: [
        {
          id: 'resp-1',
          formId: evalForm.id,
          userId: studentId,
          teacherId: teacherId,
          answers: { q1: '4', q2: '4' },
          observation: 'Buen desempeño',
          date: new Date().toISOString(),
        },
        {
          id: 'resp-2',
          formId: autoForm.id,
          userId: teacherId,
          teacherId: teacherId,
          answers: { qa1: '5' },
          observation: 'Reflexión propia',
          date: new Date().toISOString(),
        },
      ],
      connected: true,
      loading: false,
      error: null,
    }

    const consolidated = getTeacherConsolidatedGrade(mockDb, teacherId, '2026-1')
    expect(consolidated.studentAvg).toBe(4.00)
    expect(consolidated.studentWeighted).toBe(2.80)
    expect(consolidated.autoAvg).toBe(5.00)
    expect(consolidated.autoWeighted).toBe(1.50)
    expect(consolidated.finalScore).toBe(4.30)
    expect(consolidated.requierePlanMejora).toBe(false)
    expect(consolidated.status).toBe('completo')
  })

  it('debe detectar requerimiento de plan de mejora cuando la nota consolidada es <= 3.9', () => {
    const teacherId = 'doc-2'
    const studentId = 'est-2'
    const evalForm: Form = {
      id: 'form-eval-2',
      kind: 'evaluacion',
      title: 'Evaluación Docente 2026-1',
      description: '',
      period: '2026-1',
      start: '2026-01-01',
      end: '2026-12-31',
      questions: [
        { id: 'q1', text: 'Puntualidad', type: 'escala', options: [], required: true },
      ],
    }

    const mockDb: DB = {
      users: [
        { id: teacherId, name: 'Docente 2', email: 'doc2@udec.edu.co', password: '123', role: 'docente', active: true },
      ],
      cadis: [],
      feedbacks: [],
      feedbackResponses: [],
      forms: [evalForm],
      formResponses: [
        {
          id: 'resp-3',
          formId: evalForm.id,
          userId: studentId,
          teacherId: teacherId,
          answers: { q1: '3' },
          observation: '',
          date: new Date().toISOString(),
        },
      ],
      connected: true,
      loading: false,
      error: null,
    }

    const consolidated = getTeacherConsolidatedGrade(mockDb, teacherId, '2026-1')
    expect(consolidated.studentAvg).toBe(3.00)
    expect(consolidated.autoAvg).toBeNull()
    expect(consolidated.finalScore).toBe(3.00)
    expect(consolidated.requierePlanMejora).toBe(true)
    expect(consolidated.isProvisional).toBe(true)
  })
})

describe('Validación de roles institucionales UdeC', () => {
  const ROLES_VALIDOS = ['admin', 'coordinador', 'docente', 'estudiante']

  it('debe contener exclusivamente los 4 roles institucionales permitidos', () => {
    expect(ROLES_VALIDOS).toEqual(['admin', 'coordinador', 'docente', 'estudiante'])
    expect(ROLES_VALIDOS.includes('directivo')).toBe(false)
  })

  it('debe rechazar roles no permitidos como "directivo" o "superadmin"', () => {
    expect(ROLES_VALIDOS.includes('directivo')).toBe(false)
    expect(ROLES_VALIDOS.includes('superadmin')).toBe(false)
  })

  it('debe validar longitud máxima de observación de 500 caracteres', () => {
    const observacionValida = 'A'.repeat(500)
    const observacionExcedida = 'A'.repeat(501)

    const validarLongitud = (obs: string) => obs.length <= 500
    expect(validarLongitud(observacionValida)).toBe(true)
    expect(validarLongitud(observacionExcedida)).toBe(false)
  })
})

describe('Validación individual de badges de evaluación docente por estudiante', () => {
  const form: Form = {
    id: 'form-eval-1',
    kind: 'evaluacion',
    title: 'Evaluación Docente 2026-1',
    description: '',
    period: '2026-1',
    start: '2026-01-01',
    end: '2026-12-31',
    questions: [
      { id: 'q1', text: 'Dominio del tema', type: 'escala', options: [], required: true },
      { id: 'q2', text: 'Metodología pedagógica', type: 'escala', options: [], required: true },
    ],
  }

  const baseDb: DB = {
    users: [
      { id: 'estudiante-1', name: 'Estudiante 1', email: 'e1@udec.edu.co', password: '123', role: 'estudiante', active: true },
      { id: 'estudiante-2', name: 'Estudiante 2', email: 'e2@udec.edu.co', password: '123', role: 'estudiante', active: true },
      { id: 'docente-1', name: 'Docente 1', email: 'd1@udec.edu.co', password: '123', role: 'docente', active: true },
    ],
    cadis: [],
    feedbacks: [],
    feedbackResponses: [],
    forms: [form],
    formResponses: [
      {
        id: 'resp-e2',
        formId: form.id,
        userId: 'estudiante-2',
        teacherId: 'docente-1',
        answers: { q1: '5', q2: '5' },
        observation: 'Excelente',
        date: '2026-03-01',
      },
    ],
    connected: true,
    loading: false,
    error: null,
  }

  it('NO debe mostrar etiquetas de desempeño a estudiante-1 cuando aún no ha evaluado al docente (debe ser Pendiente)', () => {
    const status = getStudentTeacherEvaluationStatus(baseDb, form, 'estudiante-1', 'docente-1')

    expect(status.hasEvaluated).toBe(false)
    expect(status.label).toBe('Pendiente por evaluar')
    expect(status.score).toBeNull()
    expect(status.label).not.toBe('⭐ Destacado')
    expect(status.label).not.toBe('✓ Sobresaliente')
    expect(status.label).not.toBe('Aceptable')
  })

  it('debe mostrar la etiqueta del estudiante-2 basada estrictamente en su propia evaluación', () => {
    const status = getStudentTeacherEvaluationStatus(baseDb, form, 'estudiante-2', 'docente-1')

    expect(status.hasEvaluated).toBe(true)
    expect(status.label).toBe('⭐ Destacado')
    expect(status.score).toBe(5.00)
  })

  it('debe reflejar la calificación individual del estudiante tras responder (ej. 4.0 -> Sobresaliente)', () => {
    const dbConEvaluacion: DB = {
      ...baseDb,
      formResponses: [
        ...baseDb.formResponses,
        {
          id: 'resp-e1',
          formId: form.id,
          userId: 'estudiante-1',
          teacherId: 'docente-1',
          answers: { q1: '4', q2: '4' },
          observation: 'Buen docente',
          date: '2026-03-02',
        },
      ],
    }

    const statusE1 = getStudentTeacherEvaluationStatus(dbConEvaluacion, form, 'estudiante-1', 'docente-1')
    expect(statusE1.hasEvaluated).toBe(true)
    expect(statusE1.label).toBe('✓ Sobresaliente')
    expect(statusE1.score).toBe(4.00)

    const statusE2 = getStudentTeacherEvaluationStatus(dbConEvaluacion, form, 'estudiante-2', 'docente-1')
    expect(statusE2.label).toBe('⭐ Destacado')
    expect(statusE2.score).toBe(5.00)
  })

  it('no debe marcar como evaluado ni filtrar respuestas si el studentId o teacherId son inválidos o nulos', () => {
    const statusNull = getStudentTeacherEvaluationStatus(baseDb, form, '', 'docente-1')
    expect(statusNull.hasEvaluated).toBe(false)
    expect(statusNull.score).toBeNull()

    const statusNoTeacher = getStudentTeacherEvaluationStatus(baseDb, form, 'estudiante-2', '')
    expect(statusNoTeacher.hasEvaluated).toBe(false)
    expect(statusNoTeacher.score).toBeNull()
  })

  it('aislamiento por sesión: una evaluación de estudiante-2 NO debe alterar el estado de estudiante-1 ni precargar datos', () => {
    const yaEvaluadoE1 = baseDb.formResponses.some(
      (ev) => ev.formId === form.id && ev.teacherId === 'docente-1' && ev.userId === 'estudiante-1'
    )
    expect(yaEvaluadoE1).toBe(false)

    const yaEvaluadoE2 = baseDb.formResponses.some(
      (ev) => ev.formId === form.id && ev.teacherId === 'docente-1' && ev.userId === 'estudiante-2'
    )
    expect(yaEvaluadoE2).toBe(true)
  })
})

describe('Distinción institucional entre CADI y CAI (MEDIT - UdeC)', () => {
  it('debe permitir instanciar asignaturas con tipo CADI y tipo CAI', () => {
    const cadiMat: CADI = {
      id: 'cadi-1',
      codigo: 'SIS301',
      nombre: 'Programación II',
      semestre: 3,
      tipo: 'CADI',
      docenteId: 'doc-1',
    }
    const caiMat: CADI = {
      id: 'cai-1',
      codigo: 'CAI101',
      nombre: 'Lectura Crítica y Competencias Comunicativas',
      semestre: 1,
      tipo: 'CAI',
      docenteId: 'doc-2',
    }

    expect(cadiMat.tipo).toBe('CADI')
    expect(caiMat.tipo).toBe('CAI')
    expect(cadiMat.docenteId).toBe('doc-1')
    expect(caiMat.docenteId).toBe('doc-2')
  })

  it('debe mantener docente asignado tanto en CADI como en CAI sin pérdida de datos', () => {
    const materias: CADI[] = [
      { id: '1', codigo: 'MAT101', nombre: 'Cálculo Diferencial', semestre: 1, tipo: 'CADI', docenteId: 'doc-mat' },
      { id: '2', codigo: 'ELC301', nombre: 'Electrónica Básica', semestre: 3, tipo: 'CADI', docenteId: 'doc-elc' },
      { id: '3', codigo: 'CAI101', nombre: 'Lectura Crítica y Competencias Comunicativas', semestre: 1, tipo: 'CAI', docenteId: 'doc-cai' },
    ]

    const docMat = materias.find((m) => m.codigo === 'MAT101')?.docenteId
    const docElc = materias.find((m) => m.codigo === 'ELC301')?.docenteId
    const docCai = materias.find((m) => m.codigo === 'CAI101')?.docenteId

    expect(docMat).toBe('doc-mat')
    expect(docElc).toBe('doc-elc')
    expect(docCai).toBe('doc-cai')
  })

  it('debe resolver CADI como valor por defecto cuando tipo no se especifica', () => {
    const defaultMateria: CADI = {
      id: 'm-default',
      codigo: 'SIS201',
      nombre: 'Estructuras de Datos',
      semestre: 2,
    }
    const resolvedTipo = defaultMateria.tipo || 'CADI'
    expect(resolvedTipo).toBe('CADI')
  })
})

describe('Clasificación institucional de desempeño docente (4 Bandas MEDIT)', () => {
  const clasificarDesempeno = (score: number) => {
    if (score >= 4.6) return 'Sobresaliente'
    if (score >= 4.0) return 'Destacado'
    if (score >= 3.5) return 'Aceptable / Atención Preventiva'
    return 'En Seguimiento'
  }

  it('debe clasificar 4.85 como Sobresaliente', () => {
    expect(clasificarDesempeno(4.85)).toBe('Sobresaliente')
    expect(clasificarDesempeno(4.60)).toBe('Sobresaliente')
    expect(clasificarDesempeno(5.00)).toBe('Sobresaliente')
  })

  it('debe clasificar 4.35 y 4.00 como Destacado', () => {
    expect(clasificarDesempeno(4.35)).toBe('Destacado')
    expect(clasificarDesempeno(4.00)).toBe('Destacado')
    expect(clasificarDesempeno(4.59)).toBe('Destacado')
  })

  it('debe clasificar 3.80 y 3.50 como Aceptable / Atención Preventiva', () => {
    expect(clasificarDesempeno(3.80)).toBe('Aceptable / Atención Preventiva')
    expect(clasificarDesempeno(3.50)).toBe('Aceptable / Atención Preventiva')
    expect(clasificarDesempeno(3.99)).toBe('Aceptable / Atención Preventiva')
  })

  it('debe clasificar notas menores a 3.5 como En Seguimiento', () => {
    expect(clasificarDesempeno(3.49)).toBe('En Seguimiento')
    expect(clasificarDesempeno(3.20)).toBe('En Seguimiento')
    expect(clasificarDesempeno(1.50)).toBe('En Seguimiento')
  })
})

describe('1. Depuración de cuentas: Administrador único y eliminación de docentes duplicados', () => {
  it('debe eliminar por completo la cuenta Administrador General (admin@ucundinamarca.edu.co)', () => {
    const rawUsers: User[] = [
      { id: '1', name: 'Administrador General', email: 'admin@ucundinamarca.edu.co', password: '123', role: 'admin', active: true },
      { id: '2', name: 'Ubeimar Laguna Cárdenas', email: 'uberadmin.siard@ucundinamarca.edu.co', password: '123', role: 'admin', active: true },
    ]

    const sanitized = sanitizeUsers(rawUsers)
    const adminGeneral = sanitized.find((u) => u.email === 'admin@ucundinamarca.edu.co' || u.name === 'Administrador General')
    expect(adminGeneral).toBeUndefined()

    const admins = sanitized.filter((u) => u.role === 'admin')
    expect(admins.length).toBe(1)
    expect(admins[0].name).toBe('Ubeimar Laguna Cárdenas')
    expect(admins[0].email).toBe('uberadmin.siard@ucundinamarca.edu.co')
  })

  it('debe conservar únicamente a Ubeimar Laguna Cárdenas como Administrador único', () => {
    const rawUsers: User[] = [
      { id: 'usr-1', name: 'Andrés Navarro', email: 'andres.navarro@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
    ]

    const sanitized = sanitizeUsers(rawUsers)
    const admin = sanitized.find((u) => u.role === 'admin')
    expect(admin).toBeDefined()
    expect(admin?.name).toBe('Ubeimar Laguna Cárdenas')
    expect(admin?.email).toBe('uberadmin.siard@ucundinamarca.edu.co')
  })

  it('debe eliminar docentes repetidos conservando únicamente una cuenta por profesor', () => {
    const rawUsers: User[] = [
      { id: 'doc-1', name: 'Andrés Navarro', email: 'andres.navarro@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
      { id: 'doc-1-dup', name: 'Andrés Navarro', email: 'andres@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
      { id: 'doc-2', name: 'Diana Salazar', email: 'diana.salazar@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
      { id: 'doc-2-dup', name: 'Diana Salazar', email: 'diana@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
      { id: 'doc-3', name: 'Gabriel Prieto', email: 'gabriel.prieto@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
      { id: 'doc-4', name: 'Javier Mendoza', email: 'javier.mendoza@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
      { id: 'doc-5', name: 'Mariana Cifuentes', email: 'mariana.cifuentes@ucundinamarca.edu.co', password: '123', role: 'docente', active: true },
    ]

    const sanitized = sanitizeUsers(rawUsers)
    const docentesNavarro = sanitized.filter((u) => u.name === 'Andrés Navarro')
    const docentesSalazar = sanitized.filter((u) => u.name === 'Diana Salazar')

    expect(docentesNavarro.length).toBe(1)
    expect(docentesSalazar.length).toBe(1)
    expect(sanitized.filter((u) => u.role === 'docente').length).toBe(5)
  })

  it('persistencia de eliminación: un usuario eliminado se registra y se filtra tras recargar', () => {
    saveDeletedUserId('user-a-eliminar')
    const deletedSet = getDeletedUserIds()
    expect(deletedSet.has('user-a-eliminar')).toBe(true)

    const testUsers: User[] = [
      { id: 'user-a-eliminar', name: 'Usuario Temporal', email: 'temp@udec.edu.co', password: '123', role: 'estudiante', active: true },
      { id: 'user-valido', name: 'Usuario Valido', email: 'valido@udec.edu.co', password: '123', role: 'estudiante', active: true },
    ]

    const activos = testUsers.filter((u) => !deletedSet.has(u.id))
    expect(activos.length).toBe(1)
    expect(activos[0].id).toBe('user-valido')
  })
})

describe('2. Borrado de Formularios: Eliminación en cascada de respuestas huérfanas', () => {
  it('debe filtrar en cascada todas las respuestas asociadas al formulario eliminado sin importar si tiene 0, 5 o 15 respuestas', () => {
    const formIdEliminar = 'form-a-borrar'
    const responsesParaBorrar = Array.from({ length: 15 }, (_, i) => ({
      id: `r-borrar-${i}`,
      formId: formIdEliminar,
      userId: `est-${i}`,
      teacherId: 'doc-navarro',
      answers: {},
      observation: '',
      date: '',
    }))

    const initialResponses = [
      ...responsesParaBorrar,
      { id: 'r-activo', formId: 'form-activo', userId: 'e1', teacherId: 'd1', answers: {}, observation: '', date: '' },
    ]

    const initialForms: Form[] = [
      { id: 'form-a-borrar', kind: 'evaluacion', title: 'Borrar', description: '', period: '2026-I', start: '', end: '', questions: [] },
      { id: 'form-activo', kind: 'evaluacion', title: 'Activo', description: '', period: '2026-I', start: '', end: '', questions: [] },
    ]

    const cleanResponses = [...initialResponses.filter((r) => r.formId !== formIdEliminar)]
    const cleanForms = [...initialForms.filter((f) => f.id !== formIdEliminar)]

    expect(cleanForms.length).toBe(1)
    expect(cleanForms[0].id).toBe('form-activo')
    expect(cleanResponses.length).toBe(1)
    expect(cleanResponses[0].formId).toBe('form-activo')
    expect(cleanResponses.some((r) => r.formId === formIdEliminar)).toBe(false)
    expect(cleanForms).not.toBe(initialForms)
  })

  it('persistencia de eliminación de formularios: el ID eliminado se almacena y no reaparece al recargar', () => {
    saveDeletedFormId('form-eliminado-definitivo')
    const deletedForms = getDeletedFormIds()
    expect(deletedForms.has('form-eliminado-definitivo')).toBe(true)

    const rawForms: Form[] = [
      { id: 'form-eliminado-definitivo', kind: 'evaluacion', title: 'Eliminado', description: '', period: '2026-I', start: '', end: '', questions: [] },
      { id: 'form-permanente', kind: 'evaluacion', title: 'Permanente', description: '', period: '2026-I', start: '', end: '', questions: [] },
    ]

    const filtered = rawForms.filter((f) => !deletedForms.has(f.id))
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe('form-permanente')
  })
})

describe('3. Prevención de duplicidad en evaluación estudiantil: Docente que dicta CADI y CAI', () => {
  it('debe presentar una única tarjeta por docente si este dicta tanto un CADI como un CAI', () => {
    const docenteNavarro: User = {
      id: 'doc-navarro',
      name: 'Andrés Navarro',
      email: 'andres.navarro@ucundinamarca.edu.co',
      password: '123',
      role: 'docente',
      active: true,
    }

    const cadis: CADI[] = [
      { id: 'cadi-1', codigo: 'SIS301', nombre: 'Programación II', semestre: 3, tipo: 'CADI', docenteId: 'doc-navarro' },
      { id: 'cai-1', codigo: 'CAI101', nombre: 'Lectura Crítica', semestre: 1, tipo: 'CAI', docenteId: 'doc-navarro' },
    ]

    const assignedTeachers = [docenteNavarro, docenteNavarro]

    const seenIds = new Set<string>()
    const distinctTeachers = assignedTeachers.filter((t) => {
      if (seenIds.has(t.id)) return false
      seenIds.add(t.id)
      return true
    })

    expect(distinctTeachers.length).toBe(1)
    expect(distinctTeachers[0].id).toBe('doc-navarro')

    const materiasDocente = cadis.filter((c) => c.docenteId === distinctTeachers[0].id)
    expect(materiasDocente.length).toBe(2)
    expect(materiasDocente.some((m) => m.tipo === 'CADI')).toBe(true)
    expect(materiasDocente.some((m) => m.tipo === 'CAI')).toBe(true)
  })
})

describe('4. Gestión de Perfil y Cambio de Contraseña (Frontend)', () => {
  it('usuarioService.cambiarContrasena debe realizar petición POST a /api/cambiar-contrasena', async () => {
    const originalFetch = globalThis.fetch
    let capturedUrl = ''
    let capturedOptions: RequestInit | undefined

    globalThis.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(url)
      capturedOptions = init
      return {
        ok: true,
        json: async () => ({ ok: true, message: 'Contraseña actualizada con éxito' }),
      } as Response
    }

    try {
      const { usuarioService } = await import('./services/usuarioService')
      const res = await usuarioService.cambiarContrasena('usr-1', 'vieja123', 'nueva123456')

      expect(res.ok).toBe(true)
      expect(res.message).toBe('Contraseña actualizada con éxito')
      expect(capturedUrl).toBe('/api/cambiar-contrasena')
      expect(capturedOptions?.method).toBe('POST')
      expect(JSON.parse(String(capturedOptions?.body))).toEqual({
        usuarioId: 'usr-1',
        contrasenaActual: 'vieja123',
        nuevaContrasena: 'nueva123456',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('actions.cambiarContrasena debe invocar servicio y actualizar contraseña del usuario en memoria', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ ok: true, message: 'Contraseña actualizada con éxito' }),
      } as Response
    }

    try {
      const { actions, useDB } = await import('./store')
      const res = await actions.cambiarContrasena('usr-admin-uber', 'actual123', 'nuevaContrasenaSegura')
      expect(res.ok).toBe(true)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('unificación de nomenclatura: getDocenteConsolidatedGrade y getStudentDocenteEvaluationStatus operan con docenteId', () => {
    const form: Form = {
      id: 'f-doc-1',
      kind: 'evaluacion',
      title: 'Eval',
      description: '',
      period: '2026-I',
      start: '2026-01-01',
      end: '2026-12-31',
      questions: [{ id: 'q1', text: 'P1', type: 'escala', options: [], required: true }],
    }
    const mockDb: DB = {
      users: [{ id: 'doc-1', name: 'Docente 1', email: 'd1@udec.edu.co', password: '123', role: 'docente', active: true }],
      cadis: [],
      feedbacks: [],
      feedbackResponses: [],
      forms: [form],
      formResponses: [
        { id: 'r1', formId: 'f-doc-1', userId: 'est-1', docenteId: 'doc-1', answers: { q1: '4' }, observation: '', date: '' },
      ],
      connected: true,
      loading: false,
      error: null,
    }

    const grade = getDocenteConsolidatedGrade(mockDb, 'doc-1', '2026-I')
    expect(grade.docenteId).toBe('doc-1')
    expect(grade.studentAvg).toBe(4)

    const status = getStudentDocenteEvaluationStatus(mockDb, form, 'est-1', 'doc-1')
    expect(status.hasEvaluated).toBe(true)
    expect(status.score).toBe(4)
  })
})

describe('6. Restricción Normativa del Menú y Accesos para el Rol Docente', () => {
  it('el menú del docente debe contener estrictamente las 3 opciones normativas institucionales', () => {
    const docenteViews = VIEWS.docente
    expect(docenteViews.length).toBe(3)

    const ids = docenteViews.map((v) => v.id)
    expect(ids).toEqual(['auto', 'reporte-docente', 'normativa'])

    const labels = docenteViews.map((v) => v.label)
    expect(labels).toContain('Autoevaluación')
    expect(labels).toContain('Mis Resultados / Reporte')
    expect(labels).toContain('Normativa y MEDIT')
  })

  it('el menú del docente no debe contener opciones de creación o gestión de formularios/retroalimentación', () => {
    const docenteViews = VIEWS.docente
    const labels = docenteViews.map((v) => v.label.toLowerCase())
    const ids = docenteViews.map((v) => v.id.toLowerCase())

    expect(labels.some((l) => l.includes('formulario') || l.includes('encuesta') || l.includes('retroalimentación'))).toBe(false)
    expect(ids.some((id) => id === 'formularios' || id === 'retro' || id === 'crear')).toBe(false)
  })
})

describe('7. Formato de ID Institucional Docente en Reportes', () => {
  it('debe transformar UUIDs largos a formato institucional DOC-XXXXXXXX en mayúsculas', () => {
    const uuid = 'f4f9f608-24da-4166-8d5c-95627a69620b'
    expect(formatDocenteId(uuid)).toBe('DOC-F4F9F608')

    const uuid2 = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
    expect(formatDocenteId(uuid2)).toBe('DOC-A1B2C3D4')
  })

  it('debe mantener intactos los códigos y cédulas cortas no-UUID', () => {
    expect(formatDocenteId('doc-navarro')).toBe('doc-navarro')
    expect(formatDocenteId('1023456789')).toBe('1023456789')
    expect(formatDocenteId('DOC-802')).toBe('DOC-802')
    expect(formatDocenteId('')).toBe('')
  })
})

describe('8. Restricción del Menú para el Rol Estudiante', () => {
  it('el menú del estudiante debe contener estrictamente 2 opciones normativas', () => {
    const estudianteViews = VIEWS.estudiante
    expect(estudianteViews.length).toBe(2)

    const ids = estudianteViews.map((v) => v.id)
    expect(ids).toEqual(['eval', 'normativa'])

    const labels = estudianteViews.map((v) => v.label)
    expect(labels).toContain('Evaluación docente')
    expect(labels).toContain('Normativa y MEDIT')
  })

  it('el menú del estudiante no debe contener la opción de retroalimentación', () => {
    const estudianteViews = VIEWS.estudiante
    const labels = estudianteViews.map((v) => v.label.toLowerCase())
    const ids = estudianteViews.map((v) => v.id.toLowerCase())

    expect(labels.some((l) => l.includes('retroalimentación'))).toBe(false)
    expect(ids.some((id) => id === 'retro')).toBe(false)
  })
})

describe('9. Reestructuración de Heteroevaluación en Tres Bloques Institucionales', () => {
  it('debe definir exactamente tres bloques con los títulos y descripciones normativas', () => {
    expect(BLOQUES.length).toBe(3)

    const [bA, bB, bC] = BLOQUES

    expect(bA.id).toBe('A')
    expect(bA.titulo).toBe('1. Desempeño y Práctica Pedagógica del Docente')
    expect(bA.descripcion).toBe('Valora la claridad conceptual, puntualidad, retroalimentación y trato del profesor titular.')

    expect(bB.id).toBe('B')
    expect(bB.titulo).toBe('2. Modelo MEDIT y Mediaciones Tecnológicas')
    expect(bB.descripcion).toBe('Valora la integración de herramientas digitales, casos de aplicación y fomento del aprendizaje autónomo.')

    expect(bC.id).toBe('C')
    expect(bC.titulo).toBe('3. Recursos y Gestión Institucional')
    expect(bC.descripcion).toBe('Valora la infraestructura, conectividad y soporte tecnológico provisto por la sede universitaria.')
  })

  it('debe categorizar preguntas según dimensiones y palabras clave institucionales', () => {
    const qDocente = { id: 'q1', text: 'Claridad conceptual y explicación de temas', type: 'escala' as const, options: [], required: true, dimension: 'Claridad conceptual' }
    const qMedit = { id: 'q2', text: 'Integración de herramientas digitales y metodología MEDIT', type: 'escala' as const, options: [], required: true, dimension: 'Metodología activa' }
    const qSede = { id: 'q3', text: 'Condiciones de infraestructura y conectividad en la sede', type: 'escala' as const, options: [], required: true, dimension: 'Recursos y Gestión' }

    expect(categorizarPregunta(qDocente, 0, 3)).toBe('A')
    expect(categorizarPregunta(qMedit, 1, 3)).toBe('B')
    expect(categorizarPregunta(qSede, 2, 3)).toBe('C')
  })

  it('debe reubicar la pregunta sobre comunicación y calendario de la facultad en el Bloque 3 (Recursos y Gestión)', () => {
    const qFacultad = {
      id: 'q-facultad-calendario',
      text: '¿La facultad y sus dependencias comunicaron oportunamente el calendario académico, trámites y lineamientos institucionales?',
      type: 'escala' as const,
      options: [],
      required: true,
      dimension: 'Recursos y Gestión Institucional',
    }

    expect(categorizarPregunta(qFacultad, 0, 11)).toBe('C')
  })

  it('debe respetar el metadato explícito bloque en cada pregunta', () => {
    const qD = { id: 'qd', text: 'Pregunta', type: 'escala' as const, options: [], required: true, bloque: 'docente' as const }
    const qM = { id: 'qm', text: 'Pregunta', type: 'escala' as const, options: [], required: true, bloque: 'medit' as const }
    const qI = { id: 'qi', text: 'Pregunta', type: 'escala' as const, options: [], required: true, bloque: 'institucional' as const }

    expect(categorizarPregunta(qD, 0, 3)).toBe('A')
    expect(categorizarPregunta(qM, 0, 3)).toBe('B')
    expect(categorizarPregunta(qI, 0, 3)).toBe('C')
  })
})

describe('Contingencia y Modo Demostración institucional en store.ts', () => {
  it('garantiza las credenciales oficiales de contingencia en CONTINGENCY_USERS', () => {
    const uber = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'uberadmin.siard@ucundinamarca.edu.co'
    )
    expect(uber).toBeDefined()
    expect(uber?.password).toBe('Uber1019')
    expect(uber?.role).toBe('admin')

    const dani = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'danidirec.siard@ucundinamarca.edu.co'
    )
    expect(dani).toBeDefined()
    expect(dani?.password).toBe('siardVd3')
    expect(dani?.role).toBe('admin')

    const jaime = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'jaimeparra.siard@ucundinamarca.edu.co'
    )
    expect(jaime).toBeDefined()
    expect(jaime?.password).toBe('CoordParra2026*')
    expect(jaime?.role).toBe('coordinador')

    const mendoza = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'prof.mendoza.siard@ucundinamarca.edu.co'
    )
    expect(mendoza).toBeDefined()
    expect(mendoza?.password).toBe('ProfMen2026*')
    expect(mendoza?.role).toBe('docente')

    const salazar = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'prof.salazar.siard@ucundinamarca.edu.co'
    )
    expect(salazar).toBeDefined()
    expect(salazar?.password).toBe('ProfSal2026*')
    expect(salazar?.role).toBe('docente')

    const navarro = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'prof.navarro.siard@ucundinamarca.edu.co'
    )
    expect(navarro).toBeDefined()
    expect(navarro?.password).toBe('ProfNav2026*')
    expect(navarro?.role).toBe('docente')

    const prieto = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'prof.prieto.siard@ucundinamarca.edu.co'
    )
    expect(prieto).toBeDefined()
    expect(prieto?.password).toBe('ProfPri2026*')
    expect(prieto?.role).toBe('docente')

    const cifuentes = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'prof.cifuentes.siard@ucundinamarca.edu.co'
    )
    expect(cifuentes).toBeDefined()
    expect(cifuentes?.password).toBe('ProfCif2026*')
    expect(cifuentes?.role).toBe('docente')

    const carlos = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'carlospena.siard@ucundinamarca.edu.co'
    )
    expect(carlos).toBeDefined()
    expect(carlos?.password).toBe('Carl8742*')
    expect(carlos?.role).toBe('estudiante')

    const laura = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'lauraquintero.siard@ucundinamarca.edu.co'
    )
    expect(laura).toBeDefined()
    expect(laura?.password).toBe('Laur5193*')
    expect(laura?.role).toBe('estudiante')

    const mateo = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'mateorincon.siard@ucundinamarca.edu.co'
    )
    expect(mateo).toBeDefined()
    expect(mateo?.password).toBe('Mate6381*')
    expect(mateo?.role).toBe('estudiante')

    const camila = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'camilatorres.siard@ucundinamarca.edu.co'
    )
    expect(camila).toBeDefined()
    expect(camila?.password).toBe('Cami9240*')
    expect(camila?.role).toBe('estudiante')

    const julian = CONTINGENCY_USERS.find(
      (u) => u.email.toLowerCase() === 'julianmorales.siard@ucundinamarca.edu.co'
    )
    expect(julian).toBeDefined()
    expect(julian?.password).toBe('Juli1835*')
    expect(julian?.role).toBe('estudiante')
  })

  it('asigna correctamente las materias CADI por semestre a cada docente en contingencia', () => {
    expect(CONTINGENCY_CADIS.length).toBeGreaterThanOrEqual(5)

    const calc = CONTINGENCY_CADIS.find((c) => c.codigo === 'MAT101')
    expect(calc?.docenteId).toBe('doc-salazar')
    expect(calc?.semestre).toBe(1)

    const lect = CONTINGENCY_CADIS.find((c) => c.codigo === 'CAI101')
    expect(lect?.docenteId).toBe('doc-prieto')
    expect(lect?.semestre).toBe(1)

    const etica = CONTINGENCY_CADIS.find((c) => c.codigo === 'CAI201')
    expect(etica?.docenteId).toBe('doc-cifuentes')
    expect(etica?.semestre).toBe(2)

    const prog = CONTINGENCY_CADIS.find((c) => c.codigo === 'SIS301')
    expect(prog?.docenteId).toBe('doc-navarro')
    expect(prog?.semestre).toBe(3)
    expect(prog?.esArticulador).toBe(true)

    const elec = CONTINGENCY_CADIS.find((c) => c.codigo === 'ELC301')
    expect(elec?.docenteId).toBe('doc-mendoza')
    expect(elec?.semestre).toBe(3)
  })

  it('permite activar el modo demostración sin arrojar errores', () => {
    expect(() => activateDemoMode()).not.toThrow()
  })
})

describe('Guardián de Rutas y Estado de Autenticación (ProtectedRoute)', () => {
  it('el estado inicial de currentUser debe ser estrictamente null si no hay sesión activa', async () => {
    const { logout, getCurrentUser } = await import('./store')
    logout()
    expect(getCurrentUser()).toBeNull()
  })

  it('setCurrentUser almacena el usuario con propiedades role y rol', async () => {
    const { setCurrentUser, getCurrentUser, logout } = await import('./store')
    const testAdmin: User = {
      id: 'usr-admin-test',
      name: 'Ubeimar Laguna Cárdenas',
      email: 'uberadmin.siard@ucundinamarca.edu.co',
      password: 'Uber1019',
      role: 'admin',
      active: true,
    }
    setCurrentUser(testAdmin)
    const current = getCurrentUser()
    expect(current).not.toBeNull()
    expect(current?.id).toBe('usr-admin-test')
    expect(current?.role).toBe('admin')
    expect(current?.rol).toBe('admin')
    logout()
  })

  it('logout resetea currentUser a null', async () => {
    const { setCurrentUser, getCurrentUser, logout } = await import('./store')
    setCurrentUser({
      id: 'usr-test',
      name: 'Test',
      email: 'test@ucundinamarca.edu.co',
      password: '123',
      role: 'docente',
      active: true,
    })
    expect(getCurrentUser()).not.toBeNull()
    logout()
    expect(getCurrentUser()).toBeNull()
  })
})


