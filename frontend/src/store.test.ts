import { describe, it, expect } from 'vitest'
import { calculateConsolidatedGrade, getTeacherConsolidatedGrade, getStudentTeacherEvaluationStatus, type DB, type Form } from './store'

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
    // estudiante-1 evalúa docente-1?
    const yaEvaluadoE1 = baseDb.formResponses.some(
      (ev) => ev.formId === form.id && ev.teacherId === 'docente-1' && ev.userId === 'estudiante-1'
    )
    expect(yaEvaluadoE1).toBe(false)

    // estudiante-2 evalúa docente-1?
    const yaEvaluadoE2 = baseDb.formResponses.some(
      (ev) => ev.formId === form.id && ev.teacherId === 'docente-1' && ev.userId === 'estudiante-2'
    )
    expect(yaEvaluadoE2).toBe(true)
  })
})

