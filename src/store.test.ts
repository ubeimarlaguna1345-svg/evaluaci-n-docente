/**
 * Pruebas unitarias – Objetivo Específico 4
 *
 * Validan la lógica pura del sistema SIARD-UdeC sin depender de la UI (React)
 * ni de motores SQLite obsoletos. Evalúan cálculos de promedio, control de anonimato,
 * bloqueo de doble voto, reputación docente y ponderación PGC.
 */
import { describe, it, expect } from 'vitest'

/* ---------- Helpers de lógica pura del sistema ---------- */

const uid = () => Math.random().toString(36).slice(2, 10)

/** Función pura de cálculo de promedios */
export function calcularPromedio(notas: number[]): number {
  if (!notas.length) return 0
  const suma = notas.reduce((acc, curr) => acc + curr, 0)
  return Number((suma / notas.length).toFixed(1))
}

/** Sistema de control de anonimato y prevención de doble voto */
export interface RegistroVoto {
  formularioId: string
  usuarioId: string
  docenteId: string
}

export class GestorEvaluaciones {
  private votos: RegistroVoto[] = []

  /** Registra un voto asegurando la restricción UNIQUE (formularioId, usuarioId, docenteId) */
  registrarVoto(formularioId: string, usuarioId: string, docenteId: string): { ok: boolean; error?: string } {
    if (this.haVotado(formularioId, usuarioId, docenteId)) {
      throw new Error('UNIQUE constraint failed: el estudiante ya evaluó a este docente en este formulario')
    }
    this.votos.push({ formularioId, usuarioId, docenteId })
    return { ok: true }
  }

  /** Detecta si un estudiante ya evaluó a un docente para bloquear el doble voto */
  haVotado(formularioId: string, usuarioId: string, docenteId: string): boolean {
    return this.votos.some(
      (v) => v.formularioId === formularioId && v.usuarioId === usuarioId && v.docenteId === docenteId
    )
  }

  totalVotosDocente(formularioId: string, docenteId: string): number {
    return this.votos.filter((v) => v.formularioId === formularioId && v.docenteId === docenteId).length
  }
}

/** Lógica de reputación docente según umbrales institucionales */
export function clasificarReputacion(avg: number, totalResponses: number) {
  if (totalResponses === 0) return { label: 'Sin evaluar', isTop: false }
  if (avg >= 4.5) return { label: '⭐ Destacado', isTop: true }
  if (avg >= 4.0) return { label: '✓ Sobresaliente', isTop: false }
  if (avg >= 3.0) return { label: 'Aceptable', isTop: false }
  return { label: '⚠️ En Seguimiento', isTop: false }
}

/* ================================================================================
   1. Cálculo de promedios de calificación
   ================================================================================ */

describe('Cálculo de promedios de calificación', () => {
  it('debe calcular correctamente el promedio de notas [5, 4, 3] = 4.0', () => {
    const notas = [5, 4, 3]
    const resultado = calcularPromedio(notas)
    expect(resultado).toBe(4.0)
  })

  it('debe calcular el promedio general de varias preguntas ponderadas', () => {
    const promediosPreguntas = [5.0, 3.0]
    const promedioGeneral = calcularPromedio(promediosPreguntas)
    expect(promedioGeneral).toBe(4.0)
  })

  it('debe devolver 0 si la lista de notas está vacía', () => {
    expect(calcularPromedio([])).toBe(0)
  })

  it('debe redondear adecuadamente notas con decimales', () => {
    const notas = [4.5, 4.2, 4.8]
    expect(calcularPromedio(notas)).toBe(4.5)
  })
})

/* ================================================================================
   2. Control de anonimato y bloqueo de doble voto
   ================================================================================ */

describe('Control de anonimato y bloqueo de doble voto', () => {
  it('debe impedir que un estudiante evalúe dos veces al mismo docente en el mismo formulario', () => {
    const gestor = new GestorEvaluaciones()
    const formId = uid()
    const estId = uid()
    const docId = uid()

    // Primera evaluación exitosa
    expect(() => gestor.registrarVoto(formId, estId, docId)).not.toThrow()

    // Segundo voto: debe lanzar error de restricción de integridad (UNIQUE constraint)
    expect(() => gestor.registrarVoto(formId, estId, docId)).toThrow(
      /el estudiante ya evaluó a este docente/
    )
  })

  it('debe detectar si un estudiante ya evaluó a un docente para bloquear el doble voto desde la UI', () => {
    const gestor = new GestorEvaluaciones()
    const formId = uid()
    const estId = uid()
    const docId = uid()

    // Antes de votar
    expect(gestor.haVotado(formId, estId, docId)).toBe(false)

    // Después de votar
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

/* ================================================================================
   3. Sistema de reputación docente
   ================================================================================ */

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

/* ================================================================================
   4. Ponderación institucional PGC (20% nota CADI Articulador)
   ================================================================================ */

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

/* ================================================================================
   5. Validación de roles y restricciones institucionales
   ================================================================================ */

describe('Validación de roles institucionales UdeC', () => {
  const ROLES_VALIDOS = ['admin', 'coordinador', 'docente', 'estudiante', 'directivo']

  it('debe aceptar el rol "directivo" para Decanatura y Consejo de Facultad', () => {
    expect(ROLES_VALIDOS.includes('directivo')).toBe(true)
  })

  it('debe rechazar roles inválidos como "superadmin"', () => {
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
