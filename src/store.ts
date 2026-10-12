import { useEffect, useState } from 'react'
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import schema from '../database/schema.sql?raw'

export type Role = 'admin' | 'directivo' | 'coordinador' | 'docente' | 'estudiante'
export type AnswerType = 'escala' | 'seleccion' | 'texto'
export type FormKind = 'evaluacion' | 'autoevaluacion'

export interface User { id: string; name: string; email: string; password: string; role: Role; active: boolean }
export interface CADI { id: string; codigo: string; nombre: string; semestre: number; esArticulador: boolean; docenteId?: string }
export interface Question { id: string; text: string; type: AnswerType; options: string[]; required: boolean; dimension?: string }
export interface Feedback { id: string; teacherId: string; course: string; question: Question; start: string; end: string; createdAt: string }
export interface FeedbackResponse { id: string; feedbackId: string; studentId: string; value: string; date: string }
export interface Form { id: string; kind: FormKind; title: string; description: string; period: string; cadiId?: string; start: string; end: string; questions: Question[] }
export interface FormResponse { id: string; formId: string; userId: string; teacherId: string; answers: Record<string, string>; observation: string; date: string }

export interface DB { users: User[]; cadis: CADI[]; feedbacks: Feedback[]; feedbackResponses: FeedbackResponse[]; forms: Form[]; formResponses: FormResponse[] }

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

const day = (d: number) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 16) }

const q = (text: string, type: AnswerType = 'escala', options: string[] = [], dimension = 'General'): Question => ({
  id: uid(), text, type, options, required: true, dimension,
})

const KEY = 'siard-udec-sqlite'
let sql: Database
let state: DB = { users: [], cadis: [], feedbacks: [], feedbackResponses: [], forms: [], formResponses: [] }
const subs = new Set<() => void>()

/** Ejecuta un SELECT y devuelve filas como objetos */
export function query<T = Record<string, unknown>>(text: string, params: SqlValue[] = []): T[] {
  const st = sql.prepare(text)
  st.bind(params)
  const rows: T[] = []
  while (st.step()) rows.push(st.getAsObject() as T)
  st.free()
  return rows
}
const run = (text: string, params: SqlValue[] = []) => sql.run(text, params)

function persist() {
  const bytes = sql.export()
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  localStorage.setItem(KEY, btoa(bin))
}

type Row = Record<string, any>
function questionsFor(where: string, id: string): Question[] {
  return query<Row>(`SELECT * FROM preguntas WHERE ${where} = ? ORDER BY orden`, [id]).map((p) => ({
    id: p.id,
    text: p.enunciado,
    type: p.tipo_respuesta,
    required: !!p.obligatoria,
    dimension: p.dimension || 'General',
    options: query<Row>('SELECT texto FROM opciones WHERE pregunta_id = ? ORDER BY orden', [p.id]).map((o) => o.texto),
  }))
}

/** Reconstruye el estado de la UI a partir de las tablas */
function load() {
  state = {
    users: query<Row>('SELECT * FROM usuarios ORDER BY rol, nombre').map((u) => ({ id: u.id, name: u.nombre, email: u.correo, password: u.contrasena, role: u.rol, active: !!u.activo })),
    cadis: query<Row>('SELECT * FROM cadis ORDER BY semestre, es_articulador DESC, nombre').map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      semestre: Number(c.semestre),
      esArticulador: !!c.es_articulador,
      docenteId: c.docente_id || undefined,
    })),
    forms: query<Row>('SELECT * FROM formularios ORDER BY fecha_inicio DESC').map((f) => ({
      id: f.id,
      kind: f.tipo,
      title: f.titulo,
      description: f.descripcion,
      period: f.periodo,
      cadiId: f.cadi_id || undefined,
      start: f.fecha_inicio,
      end: f.fecha_cierre,
      questions: questionsFor('formulario_id', f.id),
    })),
    formResponses: query<Row>('SELECT * FROM respuestas_formulario').map((r) => ({
      id: r.id, formId: r.formulario_id, userId: r.usuario_id, teacherId: r.docente_id, observation: r.observacion, date: r.fecha,
      answers: Object.fromEntries(query<Row>('SELECT pregunta_id, valor FROM detalle_respuesta WHERE respuesta_id = ?', [r.id]).map((d) => [d.pregunta_id, d.valor])),
    })),
    feedbacks: query<Row>('SELECT * FROM retroalimentaciones ORDER BY creada_en DESC').map((b) => ({
      id: b.id, teacherId: b.docente_id, course: b.curso, start: b.fecha_inicio, end: b.fecha_cierre, createdAt: b.creada_en,
      question: questionsFor('id', b.pregunta_id)[0],
    })),
    feedbackResponses: query<Row>('SELECT * FROM respuestas_retroalimentacion').map((r) => ({ id: r.id, feedbackId: r.retroalimentacion_id, studentId: r.estudiante_id, value: r.valor, date: r.fecha })),
  }
}

/** Ejecuta mutaciones dentro de una transacción, guarda y notifica */
function tx(fn: () => void) {
  run('BEGIN')
  try { fn(); run('COMMIT') } catch (e) { run('ROLLBACK'); throw e }
  persist(); load(); subs.forEach((s) => s())
}

function insertQuestion(q: Question, formId: string | null, orden: number) {
  run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden) VALUES (?,?,?,?,?,?,?)', [
    q.id, formId, q.text, q.type, q.dimension || 'General', q.required ? 1 : 0, orden,
  ])
  q.options.forEach((o, i) => run('INSERT INTO opciones (pregunta_id, orden, texto) VALUES (?,?,?)', [q.id, i, o]))
}
function insertResponse(r: FormResponse) {
  run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha) VALUES (?,?,?,?,?,?)', [r.id, r.formId, r.userId, r.teacherId, r.observation, r.date])
  Object.entries(r.answers).forEach(([q, v]) => run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [r.id, q, v]))
}
function insertForm(f: Form) {
  run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?,?)', [
    f.id, f.kind, f.title, f.description, f.period, f.cadiId || null, f.start, f.end,
  ])
  f.questions.forEach((q, i) => insertQuestion(q, f.id, i))
}
function insertFeedback(b: Feedback) {
  insertQuestion(b.question, null, 0)
  run('INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en) VALUES (?,?,?,?,?,?,?)', [b.id, b.teacherId, b.question.id, b.course, b.start, b.end, b.createdAt])
}

/* ---------- acciones ---------- */
export const actions = {
  createUser: (u: Omit<User, 'id' | 'active'>) => tx(() => run('INSERT INTO usuarios (id, nombre, correo, contrasena, rol, activo) VALUES (?,?,?,?,?,1)', [uid(), u.name, u.email, u.password, u.role])),
  deactivateUser: (id: string) => tx(() => run('UPDATE usuarios SET activo = 0 WHERE id = ?', [id])),
  createForm: (f: Omit<Form, 'id'>) => tx(() => insertForm({ ...f, id: uid() })),
  setFormDates: (id: string, start: string, end: string) => tx(() => run('UPDATE formularios SET fecha_inicio = ?, fecha_cierre = ? WHERE id = ?', [start, end, id])),
  respondForm: (r: Omit<FormResponse, 'id' | 'date'>) => tx(() => insertResponse({ ...r, id: uid(), date: new Date().toISOString() })),
  createFeedback: (b: Omit<Feedback, 'id' | 'createdAt'>) => tx(() => insertFeedback({ ...b, id: uid(), createdAt: new Date().toISOString() })),
  respondFeedback: (feedbackId: string, studentId: string, value: string) =>
    tx(() => run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [uid(), feedbackId, studentId, value, new Date().toISOString()])),
  createCADI: (c: Omit<CADI, 'id'>) => tx(() => run('INSERT INTO cadis (id, codigo, nombre, semestre, es_articulador, docente_id) VALUES (?,?,?,?,?,?)', [uid(), c.codigo, c.nombre, c.semestre, c.esArticulador ? 1 : 0, c.docenteId || null])),
  assignCadiTeacher: (cadiId: string, docenteId: string | null) => tx(() => run('UPDATE cadis SET docente_id = ? WHERE id = ?', [docenteId, cadiId])),
}

/** Consola SQL: ejecuta cualquier sentencia y devuelve el último resultado */
export function execRaw(text: string) {
  const res = sql.exec(text)
  if (!/^\s*select|^\s*pragma|^\s*with/i.test(text)) { persist(); load(); subs.forEach((s) => s()) }
  return res.at(-1) ?? null
}

function createSchema() {
  sql.exec(schema)
}

/** Migraciones suaves si la base ya existía en localStorage */
function runMigrations() {
  try {
    sql.run(`
      CREATE TABLE IF NOT EXISTS cadis (
        id             TEXT PRIMARY KEY,
        codigo         TEXT NOT NULL UNIQUE,
        nombre         TEXT NOT NULL,
        semestre       INTEGER NOT NULL,
        es_articulador INTEGER NOT NULL DEFAULT 0,
        docente_id     TEXT REFERENCES usuarios(id)
      );
    `)
  } catch {}
  try { sql.run('ALTER TABLE formularios ADD COLUMN cadi_id TEXT') } catch {}
  try { sql.run('ALTER TABLE preguntas ADD COLUMN dimension TEXT DEFAULT "General"') } catch {}

  // Migración para permitir el rol 'directivo' en la tabla usuarios si tiene el CHECK constraint antiguo
  try {
    const tableInfo = query<{ sql: string }>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'usuarios'")
    const createSql = tableInfo[0]?.sql || ''
    if (createSql && !createSql.includes('directivo')) {
      sql.run('PRAGMA foreign_keys = OFF;')
      sql.run(`
        CREATE TABLE usuarios_temp (
          id          TEXT PRIMARY KEY,
          nombre      TEXT NOT NULL,
          correo      TEXT NOT NULL UNIQUE,
          contrasena  TEXT NOT NULL,
          rol         TEXT NOT NULL CHECK (rol IN ('admin','coordinador','docente','estudiante','directivo')),
          activo      INTEGER NOT NULL DEFAULT 1
        );
      `)
      sql.run(`
        INSERT OR IGNORE INTO usuarios_temp (id, nombre, correo, contrasena, rol, activo)
        SELECT id, nombre, correo, contrasena, rol, activo FROM usuarios;
      `)
      sql.run('DROP TABLE usuarios;')
      sql.run('ALTER TABLE usuarios_temp RENAME TO usuarios;')
      sql.run('PRAGMA foreign_keys = ON;')
    }
  } catch (err) {
    console.warn('Error migrando tabla usuarios:', err)
  }
}

/** Datos demo alineados con los lineamientos PGC UdeC y la Facultad de Ingeniería (Sede Facatativá) */
export function seedDemoData() {
  tx(() => {
    // Limpieza de datos demo para evitar duplicados en reinicializaciones
    run('DELETE FROM detalle_respuesta')
    run('DELETE FROM respuestas_formulario')
    run('DELETE FROM respuestas_retroalimentacion')
    run('DELETE FROM retroalimentaciones')
    run('DELETE FROM opciones')
    run('DELETE FROM preguntas')
    run('DELETE FROM formularios')
    run('DELETE FROM cadis')
    run('DELETE FROM usuarios')

    // 1. Usuarios de la Sede Facatativá - Ingeniería de Sistemas
    // 1 Administrador
    const uAdmin = { id: 'usr-admin', name: 'Administrador SIARD', email: 'admin@ucundinamarca.edu.co', password: 'admin', role: 'admin' as Role }
    // 1 Directivo
    const uDir = { id: 'usr-dir', name: 'Dr. Javier Gracia (Decano Fac. Ingeniería)', email: 'jgracia@ucundinamarca.edu.co', password: 'dir', role: 'directivo' as Role }
    // 1 Coordinador
    const uCoord = { id: 'usr-coord', name: 'Ing. Jaime Parra (Coordinador Sistemas Facatativá)', email: 'jparra@ucundinamarca.edu.co', password: 'coord', role: 'coordinador' as Role }
    // 3 Docentes de áreas de Sistemas
    const uDoc1 = { id: 'usr-doc1', name: 'Ing. Oscar Morera (Profesor Programación II)', email: 'omorera@ucundinamarca.edu.co', password: 'doc', role: 'docente' as Role }
    const uDoc2 = { id: 'usr-doc2', name: 'Ing. Francisco Lanza (Profesor Bases de Datos)', email: 'flanza@ucundinamarca.edu.co', password: 'doc', role: 'docente' as Role }
    const uDoc3 = { id: 'usr-doc3', name: 'Ing. Angélica Bravo (Profesora Ingeniería de Software)', email: 'abravo@ucundinamarca.edu.co', password: 'doc', role: 'docente' as Role }
    // 5 Estudiantes de 3er semestre de Ingeniería de Sistemas
    const uEst1 = { id: 'usr-est1', name: 'Ubeimar Laguna Cárdenas', email: 'ulaguna@ucundinamarca.edu.co', password: 'est', role: 'estudiante' as Role }
    const uEst2 = { id: 'usr-est2', name: 'Daniel Alejandro Moreno', email: 'danielamoreno@ucundinamarca.edu.co', password: 'est', role: 'estudiante' as Role }
    const uEst3 = { id: 'usr-est3', name: 'Kevin Stiven Maldonado', email: 'ksmaldonado@ucundinamarca.edu.co', password: 'est', role: 'estudiante' as Role }
    const uEst4 = { id: 'usr-est4', name: 'Juan Sebastián González', email: 'jsgonzalezbernal@ucundinamarca.edu.co', password: 'est', role: 'estudiante' as Role }
    const uEst5 = { id: 'usr-est5', name: 'Laura Camila Romero', email: 'lromero@ucundinamarca.edu.co', password: 'est', role: 'estudiante' as Role }

    const allUsers = [uAdmin, uDir, uCoord, uDoc1, uDoc2, uDoc3, uEst1, uEst2, uEst3, uEst4, uEst5]
    for (const u of allUsers) {
      run('INSERT OR REPLACE INTO usuarios (id, nombre, correo, contrasena, rol, activo) VALUES (?,?,?,?,?,1)', [
        u.id, u.name, u.email, u.password, u.role,
      ])
    }

    // 2. CADIs oficiales según PGC UdeC (Semestre III Sistemas Sede Facatativá)
    const cadiProg2 = { id: 'cadi-p2', codigo: 'SIS301', nombre: 'Programación II (CADI Articulador)', semestre: 3, es_articulador: 1, docente_id: uDoc1.id }
    const cadiBD = { id: 'cadi-bd', codigo: 'SIS302', nombre: 'Bases de Datos', semestre: 3, es_articulador: 0, docente_id: uDoc2.id }
    const cadiSoft = { id: 'cadi-soft', codigo: 'SIS303', nombre: 'Ingeniería de Software I', semestre: 3, es_articulador: 0, docente_id: uDoc3.id }
    const cadiMat = { id: 'cadi-mat', codigo: 'CB301', nombre: 'Cálculo Multivariado', semestre: 3, es_articulador: 0, docente_id: null }

    for (const c of [cadiProg2, cadiBD, cadiSoft, cadiMat]) {
      run('INSERT OR REPLACE INTO cadis (id, codigo, nombre, semestre, es_articulador, docente_id) VALUES (?,?,?,?,?,?)', [
        c.id, c.codigo, c.nombre, c.semestre, c.es_articulador, c.docente_id,
      ])
    }

    // 3. Formulario Institucional de Evaluación Docente con dimensiones MEDIT
    const formEvalId = 'form-eval-2026-1'
    const now = new Date()
    const startStr = new Date(now.getTime() - 10 * 24 * 3600 * 1000).toISOString().slice(0, 16)
    const endStr = new Date(now.getTime() + 20 * 24 * 3600 * 1000).toISOString().slice(0, 16)

    run('INSERT OR REPLACE INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?,?)', [
      formEvalId,
      'evaluacion',
      'Evaluación Docente Institucional 2026-I',
      'Evaluación de gestores del conocimiento orientada desde el MEDIT y articulada con el CADI Articulador (20% de ponderación).',
      '2026-I',
      cadiProg2.id,
      startStr,
      endStr,
    ])

    const evalQuestions: Question[] = [
      { id: 'q-medit-1', text: 'El docente implementa metodologías activas (como CDIO) y proyectos aplicados acordes con el MEDIT.', type: 'escala', options: [], required: true, dimension: 'Pedagógica y Didáctica' },
      { id: 'q-medit-2', text: 'El docente domina los temas del CADI y articula la investigación formativa con la solución de problemas ingenieriles.', type: 'escala', options: [], required: true, dimension: 'Disciplinar e Investigativa' },
      { id: 'q-medit-3', text: 'Promueve la comunicación asertiva, el respeto, la escucha activa y la resolución dialogada de dudas.', type: 'escala', options: [], required: true, dimension: 'Relacional y Comunicación' },
      { id: 'q-medit-4', text: 'Fomenta el compromiso ético, la confidencialidad, la honestidad académica y el impacto social del conocimiento.', type: 'escala', options: [], required: true, dimension: 'Ética y Transmoderna' },
      { id: 'q-medit-5', text: 'Puntualidad y cumplimiento de los acuerdos de aprendizaje concertados.', type: 'escala', options: [], required: true, dimension: 'Pedagógica y Didáctica' },
    ]

    evalQuestions.forEach((q, i) => insertQuestion(q, formEvalId, i))

    // 4. Formulario de Autoevaluación Docente
    const formAutoId = 'form-auto-2026-1'
    run('INSERT OR REPLACE INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?,?)', [
      formAutoId,
      'autoevaluacion',
      'Autoevaluación Docente 2026-I',
      'Reflexión y autorregulación del gestor del conocimiento en consonancia con el MEDIT.',
      '2026-I',
      cadiProg2.id,
      startStr,
      endStr,
    ])

    const autoQuestions: Question[] = [
      { id: 'qa-1', text: 'He promovido la construcción formativa y dialógica en los espacios académicos.', type: 'escala', options: [], required: true, dimension: 'Pedagógica y Didáctica' },
      { id: 'qa-2', text: 'He realizado acompañamiento y retroalimentación oportuna en el avance de los proyectos PGC.', type: 'escala', options: [], required: true, dimension: 'Relacional y Comunicación' },
      { id: 'qa-3', text: 'He actualizado los contenidos y problemas planteados con el contexto translocal de la región.', type: 'escala', options: [], required: true, dimension: 'Disciplinar e Investigativa' },
    ]
    autoQuestions.forEach((q, i) => insertQuestion(q, formAutoId, i))

    // 5. Carga de al menos 12 evaluaciones anónimas simuladas (estudiantes evaluando a los 3 docentes)
    const simulatedEvals = [
      // 5 Evaluaciones para Ing. Oscar Morera (Programación II)
      {
        id: uid(), formId: formEvalId, userId: uEst1.id, teacherId: uDoc1.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '5', 'q-medit-3': '5', 'q-medit-4': '5', 'q-medit-5': '5' },
        observation: 'Excelente articulación con la metodología CDIO en el proyecto articulador PGC. Las asesorías han sido fundamentales.',
        date: new Date(now.getTime() - 6 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst2.id, teacherId: uDoc1.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '5', 'q-medit-3': '4', 'q-medit-4': '5', 'q-medit-5': '5' },
        observation: 'Gran dominio de la arquitectura de software y persistencia en SQLite. Acompañamiento técnico oportuno.',
        date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst3.id, teacherId: uDoc1.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '4', 'q-medit-3': '5', 'q-medit-4': '5', 'q-medit-5': '4' },
        observation: 'Promueve el trabajo colaborativo y la solución dialogada de dudas durante el desarrollo del proyecto de semestre.',
        date: new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst4.id, teacherId: uDoc1.id,
        answers: { 'q-medit-1': '4', 'q-medit-2': '5', 'q-medit-3': '5', 'q-medit-4': '5', 'q-medit-5': '5' },
        observation: 'Muy puntual en las clases presenciales en la sede Facatativá y muy riguroso con la calidad de código.',
        date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst5.id, teacherId: uDoc1.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '5', 'q-medit-3': '5', 'q-medit-4': '5', 'q-medit-5': '4' },
        observation: 'Fomenta la honestidad académica, la ética en el desarrollo y cero tolerancia con el plagio de software.',
        date: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      },

      // 4 Evaluaciones para Ing. Francisco Lanza (Bases de Datos)
      {
        id: uid(), formId: formEvalId, userId: uEst1.id, teacherId: uDoc2.id,
        answers: { 'q-medit-1': '4', 'q-medit-2': '5', 'q-medit-3': '4', 'q-medit-4': '5', 'q-medit-5': '4' },
        observation: 'Excelente explicación del modelado relacional y normalización de esquemas SQL. Ejemplos muy claros y prácticos.',
        date: new Date(now.getTime() - 6 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst2.id, teacherId: uDoc2.id,
        answers: { 'q-medit-1': '4', 'q-medit-2': '4', 'q-medit-3': '5', 'q-medit-4': '4', 'q-medit-5': '5' },
        observation: 'Buenas dinámicas en los laboratorios de cómputo de la sede Facatativá para la optimización de consultas SQL.',
        date: new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst3.id, teacherId: uDoc2.id,
        answers: { 'q-medit-1': '4', 'q-medit-2': '5', 'q-medit-3': '4', 'q-medit-4': '4', 'q-medit-5': '4' },
        observation: 'Articula muy bien la persistencia de datos con las entregas parciales del proyecto PGC en curso.',
        date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst4.id, teacherId: uDoc2.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '4', 'q-medit-3': '4', 'q-medit-4': '5', 'q-medit-5': '4' },
        observation: 'Atención oportuna a las consultas sobre integridad referencial, transacciones ACID y restricciones.',
        date: new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
      },

      // 3 Evaluaciones para Ing. Angélica Bravo (Ingeniería de Software)
      {
        id: uid(), formId: formEvalId, userId: uEst2.id, teacherId: uDoc3.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '4', 'q-medit-3': '5', 'q-medit-4': '5', 'q-medit-5': '5' },
        observation: 'Acompañamiento constante en el levantamiento de requisitos bajo el estándar IEEE 830 y metodología ágil.',
        date: new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst3.id, teacherId: uDoc3.id,
        answers: { 'q-medit-1': '4', 'q-medit-2': '4', 'q-medit-3': '4', 'q-medit-4': '5', 'q-medit-5': '4' },
        observation: 'Ambiente de clase muy respetuoso, dialógico y participativo acorde con los principios del MEDIT.',
        date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formEvalId, userId: uEst5.id, teacherId: uDoc3.id,
        answers: { 'q-medit-1': '5', 'q-medit-2': '5', 'q-medit-3': '4', 'q-medit-4': '4', 'q-medit-5': '5' },
        observation: 'Promueve la investigación formativa y buenas prácticas de ingeniería en el desarrollo de soluciones regionales.',
        date: new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
      },
    ]

    for (const r of simulatedEvals) {
      insertResponse(r)
    }

    // Autoevaluaciones docentes
    const autoDocentes = [
      {
        id: uid(), formId: formAutoId, userId: uDoc1.id, teacherId: uDoc1.id,
        answers: { 'qa-1': '5', 'qa-2': '5', 'qa-3': '5' },
        observation: 'He fortalecido el acompañamiento metodológico CDIO y las asesorías de arquitectura para el proyecto PGC.',
        date: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formAutoId, userId: uDoc2.id, teacherId: uDoc2.id,
        answers: { 'qa-1': '4', 'qa-2': '4', 'qa-3': '5' },
        observation: 'He contextualizado los talleres de bases de datos con casos de estudio reales de la Sabana de Occidente.',
        date: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: uid(), formId: formAutoId, userId: uDoc3.id, teacherId: uDoc3.id,
        answers: { 'qa-1': '5', 'qa-2': '4', 'qa-3': '4' },
        observation: 'He promovido la autogestión de equipos y buenas prácticas de ingeniería de requisitos bajo el MEDIT.',
        date: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      },
    ]

    for (const a of autoDocentes) {
      insertResponse(a)
    }

    // 6. Retroalimentaciones de clase (Feedback rápido docente-estudiante)
    // Sesión 1: Docente Oscar Morera en Programación II
    const fbQ1: Question = {
      id: uid(), text: '¿El taller práctico sobre arquitectura en capas y pruebas funcionales del PGC fue claro y aplicable?', type: 'escala', options: [], required: true,
    }
    const fbId1 = 'fb-demo-prog2'
    insertQuestion(fbQ1, null, 0)
    run('INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en) VALUES (?,?,?,?,?,?,?)', [
      fbId1, uDoc1.id, fbQ1.id, 'Programación II - Grupo 301 (Facatativá)', startStr, endStr, new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId1, uEst1.id, '5', new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId1, uEst2.id, '5', new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId1, uEst3.id, '4', new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
    ])

    // Sesión 2: Docente Francisco Lanza en Bases de Datos
    const fbQ2: Question = {
      id: uid(), text: '¿Los ejercicios de normalización y álgebra relacional facilitaron el diseño de su esquema relacional?', type: 'escala', options: [], required: true,
    }
    const fbId2 = 'fb-demo-bd'
    insertQuestion(fbQ2, null, 0)
    run('INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en) VALUES (?,?,?,?,?,?,?)', [
      fbId2, uDoc2.id, fbQ2.id, 'Bases de Datos - Grupo 302 (Facatativá)', startStr, endStr, new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId2, uEst1.id, '4', new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId2, uEst4.id, '5', new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
    ])

    // Sesión 3: Docente Angélica Bravo en Ingeniería de Software I
    const fbQ3: Question = {
      id: uid(), text: '¿La dinámica de especificación de requerimientos bajo estándar IEEE 830 y MEDIT clarificó el alcance del PGC?', type: 'escala', options: [], required: true,
    }
    const fbId3 = 'fb-demo-soft'
    insertQuestion(fbQ3, null, 0)
    run('INSERT INTO retroalimentaciones (id, docente_id, pregunta_id, curso, fecha_inicio, fecha_cierre, creada_en) VALUES (?,?,?,?,?,?,?)', [
      fbId3, uDoc3.id, fbQ3.id, 'Ingeniería de Software I - Grupo 301 (Facatativá)', startStr, endStr, new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId3, uEst2.id, '5', new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
    ])
    run('INSERT INTO respuestas_retroalimentacion (id, retroalimentacion_id, estudiante_id, valor, fecha) VALUES (?,?,?,?,?)', [
      uid(), fbId3, uEst5.id, '5', new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
    ])
  })
}

export async function initDB() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const saved = localStorage.getItem(KEY)

  const setupFresh = () => {
    localStorage.removeItem(KEY)
    sql = new SQL.Database()
    sql.run('PRAGMA foreign_keys = ON')
    createSchema()
    seedDemoData()
  }

  if (!saved) {
    setupFresh()
  } else {
    try {
      sql = new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0)))
      sql.run('PRAGMA foreign_keys = ON')
      runMigrations()
      load()
      const adminExists = state.users.some((u) => u.email.toLowerCase() === 'admin@ucundinamarca.edu.co' && u.password === 'admin')
      const directivoExists = state.users.some((u) => u.role === 'directivo')
      const hasFullDemoData = state.users.length >= 11 && state.formResponses.length >= 10 && state.feedbacks.length >= 3
      if (!adminExists || !directivoExists || !hasFullDemoData || state.cadis.length === 0) {
        setupFresh()
      }
    } catch (err) {
      console.warn('Error inicializando base existente, recuperando con esquema actualizado:', err)
      setupFresh()
    }
  }
  load()
}

export function resetDB() {
  try { sql?.close() } catch {}
  localStorage.removeItem(KEY)
  window.location.reload()
}

export function downloadDB() {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([sql.export() as BlobPart], { type: 'application/x-sqlite3' }))
  a.download = 'siard-udec.sqlite'; a.click()
}

export function useDB() {
  const [, force] = useState(0)
  useEffect(() => { const s = () => force((n) => n + 1); subs.add(s); return () => { subs.delete(s) } }, [])
  return state
}

export const isOpen = (start: string, end: string) => { const n = new Date().toISOString().slice(0, 16); return n >= start && n <= end }
export const fmt = (s: string) => new Date(s).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/** Promedio por pregunta de escala para un formulario y (opcionalmente) un docente */
export function stats(db: DB, formId: string, teacherId?: string) {
  const form = db.forms.find((f) => f.id === formId)
  if (!form) return null
  const rs = db.formResponses.filter((r) => r.formId === formId && (!teacherId || r.teacherId === teacherId))
  const rows = query<{ pregunta_id: string; promedio: number; n: number }>(
    `SELECT pregunta_id, SUM(promedio * n) / SUM(n) AS promedio, SUM(n) AS n FROM v_promedios
     WHERE formulario_id = ? AND (? IS NULL OR docente_id = ?) GROUP BY pregunta_id`, [formId, teacherId || null, teacherId || null])
  const perQ = form.questions.filter((x) => x.type === 'escala').map((x) => {
    const r = rows.find((y) => y.pregunta_id === x.id)
    return { question: x, avg: r?.promedio ?? 0, n: r?.n ?? 0 }
  })
  const valid = perQ.filter((p) => p.n)
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
    porDimension[dim].avg = validItems.length ? validItems.reduce((acc, curr) => acc + curr.avg, 0) / validItems.length : 0
    porDimension[dim].count = porDimension[dim].items.length
  })

  return { form, responses: rs, perQ, overall, pgcPonderado20, porDimension }
}

export interface TeacherReputation {
  avg: number
  totalResponses: number
  label: string
  badgeClass: string
  isTop: boolean
}

/** Calcula la reputación de un docente a partir de su histórico de evaluaciones */
export function getTeacherReputation(db: DB, teacherId: string): TeacherReputation {
  const rows = query<{ promedio: number; n: number }>(
    `SELECT AVG(promedio) as promedio, SUM(n) as n FROM v_promedios WHERE docente_id = ?`,
    [teacherId]
  )
  const avg = rows[0]?.promedio ? Number(Number(rows[0].promedio).toFixed(2)) : 0
  const totalResponses = rows[0]?.n ? Number(rows[0].n) : 0

  if (totalResponses === 0) {
    return {
      avg: 0,
      totalResponses: 0,
      label: 'Sin evaluar',
      badgeClass: 'bg-paper text-ink/50 border border-line',
      isTop: false,
    }
  }

  if (avg >= 4.5) {
    return {
      avg,
      totalResponses,
      label: '⭐ Destacado',
      badgeClass: 'bg-moss/20 text-pine border border-moss/40 font-semibold shadow-xs',
      isTop: true,
    }
  } else if (avg >= 4.0) {
    return {
      avg,
      totalResponses,
      label: '✓ Sobresaliente',
      badgeClass: 'bg-pine/10 text-pine border border-pine/30 font-medium',
      isTop: false,
    }
  } else if (avg >= 3.0) {
    return {
      avg,
      totalResponses,
      label: 'Aceptable',
      badgeClass: 'bg-ochre/15 text-ochre border border-ochre/40 font-medium',
      isTop: false,
    }
  } else {
    return {
      avg,
      totalResponses,
      label: '⚠️ En Seguimiento',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200 font-medium',
      isTop: false,
    }
  }
}

/** Métrica consolidada para el Módulo Directivo (Decanatura / Consejo de Facultad) */
export function getFacultyGlobalMetrics(db: DB) {
  const avgRows = query<{ avg: number }>(`SELECT AVG(promedio) as avg FROM v_promedios`)
  const overallAvg = avgRows[0]?.avg ? Number(Number(avgRows[0].avg).toFixed(2)) : 0

  const estRows = query<{ total: number }>(
    `SELECT COUNT(DISTINCT rf.usuario_id) as total FROM respuestas_formulario rf
     JOIN usuarios u ON u.id = rf.usuario_id WHERE u.rol = 'estudiante'`
  )
  const evaluatedStudents = estRows[0]?.total ? Number(estRows[0].total) : 0
  const totalEvaluations = db.formResponses.length

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

  const topTeachersCount = teachers.filter((t) => t.avg >= 4.5).length

  return {
    overallAvg,
    evaluatedStudents,
    totalEvaluations,
    teachers,
    topTeachersCount,
  }
}
