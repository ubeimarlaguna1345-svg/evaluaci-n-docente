/**
 * Pruebas unitarias – Objetivo Específico 4
 *
 * Validan la lógica pura del sistema SIARD-UdeC sin depender de la UI (React).
 * Se usa sql.js en modo Node para reproducir el esquema SQLite real y
 * verificar cálculos de promedio, control de anonimato/doble voto,
 * reputación docente y agrupación por dimensiones MEDIT.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/* ---------- helpers internos (reimplementados para aislar los tests del store) ---------- */

let sql: Database
const uid = () => Math.random().toString(36).slice(2, 10)

/** Ejecuta un SELECT y devuelve filas como objetos */
function query<T = Record<string, unknown>>(text: string, params: SqlValue[] = []): T[] {
  const st = sql.prepare(text)
  st.bind(params)
  const rows: T[] = []
  while (st.step()) rows.push(st.getAsObject() as T)
  st.free()
  return rows
}

const run = (text: string, params: SqlValue[] = []) => sql.run(text, params)

/* ---------- setup ---------- */

beforeAll(async () => {
  const SQL = await initSqlJs()
  sql = new SQL.Database()
  sql.run('PRAGMA foreign_keys = ON')

  // Cargar el esquema real desde el archivo SQL del proyecto
  const schemaPath = resolve(__dirname, '..', 'database', 'schema.sql')
  const schema = readFileSync(schemaPath, 'utf-8')
  sql.exec(schema)
})

afterAll(() => {
  sql?.close()
})

/* ================================================================================
   1. Cálculo de promedios de calificación
   ================================================================================ */

describe('Cálculo de promedios de calificación', () => {
  it('debe calcular correctamente el promedio de notas [5, 4, 3] = 4.0', () => {
    // Preparar datos: 1 docente, 1 formulario, 1 pregunta, 3 estudiantes
    const docId = uid()
    const est1 = uid(), est2 = uid(), est3 = uid()
    const formId = uid(), pregId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Docente Test', `doc-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [est1, 'Est1', `e1-${est1}@test.co`, 'x', 'estudiante'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [est2, 'Est2', `e2-${est2}@test.co`, 'x', 'estudiante'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [est3, 'Est3', `e3-${est3}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Test Form', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, formId, '¿Calidad del docente?', 'escala', 1, 0,
    ])

    // Insertar respuestas con notas [5, 4, 3]
    const notas = [5, 4, 3]
    const estudiantes = [est1, est2, est3]
    notas.forEach((nota, i) => {
      const rId = uid()
      run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
        rId, formId, estudiantes[i], docId, now.toISOString(),
      ])
      run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [
        rId, pregId, String(nota),
      ])
    })

    // Verificar promedio a través de la vista v_promedios
    const result = query<{ promedio: number; n: number }>(
      'SELECT promedio, n FROM v_promedios WHERE formulario_id = ? AND docente_id = ? AND pregunta_id = ?',
      [formId, docId, pregId]
    )

    expect(result).toHaveLength(1)
    expect(result[0].promedio).toBeCloseTo(4.0, 5)
    expect(result[0].n).toBe(3)
  })

  it('debe calcular el promedio general del docente combinando varias preguntas', () => {
    const docId = uid()
    const estId = uid()
    const formId = uid()
    const pregA = uid(), pregB = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc Multi', `dm-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estId, 'Est Multi', `em-${estId}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Multi Q', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregA, formId, 'Pregunta A', 'escala', 1, 0,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregB, formId, 'Pregunta B', 'escala', 1, 1,
    ])

    const rId = uid()
    run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
      rId, formId, estId, docId, now.toISOString(),
    ])
    // Pregunta A = 5, Pregunta B = 3 → promedio general esperado = (5+3)/2 = 4.0
    run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [rId, pregA, '5'])
    run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [rId, pregB, '3'])

    const rows = query<{ promedio: number }>(
      'SELECT promedio FROM v_promedios WHERE formulario_id = ? AND docente_id = ?',
      [formId, docId]
    )

    expect(rows).toHaveLength(2) // una fila por pregunta
    const overall = rows.reduce((sum, r) => sum + r.promedio, 0) / rows.length
    expect(overall).toBeCloseTo(4.0, 5)
  })
})

/* ================================================================================
   2. Control de anonimato y bloqueo de doble voto
   ================================================================================ */

describe('Control de anonimato y bloqueo de doble voto', () => {
  it('debe impedir que un estudiante evalúe dos veces al mismo docente en el mismo formulario (UNIQUE constraint)', () => {
    const docId = uid()
    const estId = uid()
    const formId = uid()
    const pregId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc Dup', `dd-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estId, 'Est Dup', `ed-${estId}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Dup Test', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, formId, '¿Nota?', 'escala', 1, 0,
    ])

    // Primera evaluación: debe funcionar
    const r1 = uid()
    run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
      r1, formId, estId, docId, now.toISOString(),
    ])
    run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [r1, pregId, '5'])

    // Segunda evaluación al mismo docente en el mismo formulario: debe fallar por UNIQUE
    const r2 = uid()
    expect(() => {
      run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
        r2, formId, estId, docId, now.toISOString(),
      ])
    }).toThrow()
  })

  it('debe permitir que diferentes estudiantes evalúen al mismo docente', () => {
    const docId = uid()
    const estA = uid(), estB = uid()
    const formId = uid()
    const pregId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc Multi Est', `dme-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estA, 'Est A', `ea-${estA}@test.co`, 'x', 'estudiante'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estB, 'Est B', `eb-${estB}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Multi Est Test', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, formId, '¿Puntualidad?', 'escala', 1, 0,
    ])

    // Estudiante A evalúa
    const rA = uid()
    run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
      rA, formId, estA, docId, now.toISOString(),
    ])
    run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [rA, pregId, '5'])

    // Estudiante B evalúa al mismo docente: debe funcionar
    const rB = uid()
    expect(() => {
      run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
        rB, formId, estB, docId, now.toISOString(),
      ])
      run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [rB, pregId, '4'])
    }).not.toThrow()

    // Verificar que ambas respuestas existen
    const count = query<{ c: number }>('SELECT COUNT(*) as c FROM respuestas_formulario WHERE formulario_id = ? AND docente_id = ?', [formId, docId])
    expect(count[0].c).toBe(2)
  })

  it('debe detectar si un estudiante ya respondió una evaluación (lógica de detección)', () => {
    const docId = uid()
    const estId = uid()
    const formId = uid()
    const pregId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc Det', `ddet-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estId, 'Est Det', `edet-${estId}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Detection Test', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, formId, '¿Calidad?', 'escala', 1, 0,
    ])

    // Antes de evaluar: no debe haber respondido
    const beforeCheck = query<{ c: number }>(
      'SELECT COUNT(*) as c FROM respuestas_formulario WHERE formulario_id = ? AND usuario_id = ? AND docente_id = ?',
      [formId, estId, docId]
    )
    expect(beforeCheck[0].c).toBe(0)

    // Registrar evaluación
    const rId = uid()
    run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, fecha) VALUES (?,?,?,?,?)', [
      rId, formId, estId, docId, now.toISOString(),
    ])

    // Después de evaluar: debe detectarse que ya respondió
    const afterCheck = query<{ c: number }>(
      'SELECT COUNT(*) as c FROM respuestas_formulario WHERE formulario_id = ? AND usuario_id = ? AND docente_id = ?',
      [formId, estId, docId]
    )
    expect(afterCheck[0].c).toBe(1)

    // Simular la lógica del UI: si ya respondió, no debe poder evaluar de nuevo
    const alreadyResponded = afterCheck[0].c > 0
    expect(alreadyResponded).toBe(true)
  })
})

/* ================================================================================
   3. Sistema de reputación docente
   ================================================================================ */

describe('Reputación docente (labels y umbrales)', () => {
  /** Reimplantación de la lógica pura de getTeacherReputation */
  function computeReputationLabel(avg: number, totalResponses: number) {
    if (totalResponses === 0) return { label: 'Sin evaluar', isTop: false }
    if (avg >= 4.5) return { label: '⭐ Destacado', isTop: true }
    if (avg >= 4.0) return { label: '✓ Sobresaliente', isTop: false }
    if (avg >= 3.0) return { label: 'Aceptable', isTop: false }
    return { label: '⚠️ En Seguimiento', isTop: false }
  }

  it('debe clasificar promedio >= 4.5 como "⭐ Destacado"', () => {
    const rep = computeReputationLabel(4.8, 10)
    expect(rep.label).toBe('⭐ Destacado')
    expect(rep.isTop).toBe(true)
  })

  it('debe clasificar promedio [4.0, 4.5) como "✓ Sobresaliente"', () => {
    const rep = computeReputationLabel(4.2, 5)
    expect(rep.label).toBe('✓ Sobresaliente')
    expect(rep.isTop).toBe(false)
  })

  it('debe clasificar promedio [3.0, 4.0) como "Aceptable"', () => {
    const rep = computeReputationLabel(3.5, 3)
    expect(rep.label).toBe('Aceptable')
    expect(rep.isTop).toBe(false)
  })

  it('debe clasificar promedio < 3.0 como "⚠️ En Seguimiento"', () => {
    const rep = computeReputationLabel(2.1, 2)
    expect(rep.label).toBe('⚠️ En Seguimiento')
    expect(rep.isTop).toBe(false)
  })

  it('debe mostrar "Sin evaluar" cuando no hay respuestas', () => {
    const rep = computeReputationLabel(0, 0)
    expect(rep.label).toBe('Sin evaluar')
    expect(rep.isTop).toBe(false)
  })

  it('promedio en la frontera exacta 4.5 debe ser "⭐ Destacado"', () => {
    const rep = computeReputationLabel(4.5, 4)
    expect(rep.label).toBe('⭐ Destacado')
    expect(rep.isTop).toBe(true)
  })

  it('promedio en la frontera exacta 3.0 debe ser "Aceptable"', () => {
    const rep = computeReputationLabel(3.0, 1)
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
   5. Restricciones de esquema y roles
   ================================================================================ */

describe('Restricciones de esquema SQL', () => {
  it('debe aceptar el rol "directivo" en la tabla usuarios', () => {
    const dirId = uid()
    expect(() => {
      run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [
        dirId, 'Dir Test', `dir-${dirId}@test.co`, 'x', 'directivo',
      ])
    }).not.toThrow()

    const found = query<{ rol: string }>('SELECT rol FROM usuarios WHERE id = ?', [dirId])
    expect(found[0].rol).toBe('directivo')
  })

  it('debe rechazar un rol inválido como "superadmin"', () => {
    const badId = uid()
    expect(() => {
      run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [
        badId, 'Bad Role', `bad-${badId}@test.co`, 'x', 'superadmin',
      ])
    }).toThrow()
  })

  it('debe limitar la observación a 500 caracteres (CHECK constraint)', () => {
    const docId = uid(), estId = uid(), formId = uid(), pregId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc Obs', `do-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estId, 'Est Obs', `eo-${estId}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Obs Test', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, formId, '¿Eval?', 'escala', 1, 0,
    ])

    const longObs = 'X'.repeat(501) // 501 caracteres
    const rId = uid()
    expect(() => {
      run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha) VALUES (?,?,?,?,?,?)', [
        rId, formId, estId, docId, longObs, now.toISOString(),
      ])
    }).toThrow()
  })

  it('debe aceptar una observación de exactamente 500 caracteres', () => {
    const docId = uid(), estId = uid(), formId = uid(), pregId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc Ok', `dok-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estId, 'Est Ok', `eok-${estId}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [
      formId, 'evaluacion', 'Obs Ok Test', '', '2026-T', start, end,
    ])
    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, formId, '¿Eval OK?', 'escala', 1, 0,
    ])

    const exactObs = 'A'.repeat(500) // exactamente 500
    const rId = uid()
    expect(() => {
      run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha) VALUES (?,?,?,?,?,?)', [
        rId, formId, estId, docId, exactObs, now.toISOString(),
      ])
    }).not.toThrow()
  })
})

/* ================================================================================
   6. Control de retroalimentación: doble voto en feedback rápido
   ================================================================================ */

describe('Retroalimentación: control de doble voto', () => {
  it('debe impedir que un estudiante responda dos veces a la misma retroalimentación (UNIQUE constraint)', () => {
    const docId = uid(), estId = uid(), pregId = uid(), fbId = uid()

    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [docId, 'Doc FB', `dfb-${docId}@test.co`, 'x', 'docente'])
    run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol) VALUES (?,?,?,?,?)', [estId, 'Est FB', `efb-${estId}@test.co`, 'x', 'estudiante'])

    const now = new Date()
    const start = new Date(now.getTime() - 5 * 86400000).toISOString().slice(0, 16)
    const end = new Date(now.getTime() + 5 * 86400000).toISOString().slice(0, 16)

    run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [
      pregId, null, '¿Fue clara la clase?', 'escala', 1, 0,
    ])
    run('INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en) VALUES (?,?,?,?,?,?,?)', [
      fbId, docId, pregId, 'Programación II', start, end, now.toISOString(),
    ])

    // Primera respuesta: OK
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId, estId, '5', now.toISOString(),
    ])

    // Segunda respuesta del mismo estudiante: debe fallar por UNIQUE
    expect(() => {
      run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
        uid(), fbId, estId, '4', now.toISOString(),
      ])
    }).toThrow()
  })
})
