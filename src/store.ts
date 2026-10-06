import { useEffect, useState } from 'react'
import initSqlJs, { type Database, type SqlValue } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import schema from '../database/schema.sql?raw'

export type Role = 'admin' | 'coordinador' | 'docente' | 'estudiante'
export type AnswerType = 'escala' | 'seleccion' | 'texto'
export type FormKind = 'evaluacion' | 'autoevaluacion'

export interface User { id: string; name: string; email: string; password: string; role: Role; active: boolean }
export interface Question { id: string; text: string; type: AnswerType; options: string[]; required: boolean }
export interface Feedback { id: string; teacherId: string; course: string; question: Question; start: string; end: string; createdAt: string }
export interface FeedbackResponse { id: string; feedbackId: string; studentId: string; value: string; date: string }
export interface Form { id: string; kind: FormKind; title: string; description: string; period: string; start: string; end: string; questions: Question[] }
export interface FormResponse { id: string; formId: string; userId: string; teacherId: string; answers: Record<string, string>; observation: string; date: string }

export interface DB { users: User[]; feedbacks: Feedback[]; feedbackResponses: FeedbackResponse[]; forms: Form[]; formResponses: FormResponse[] }

export const uid = () => Math.random().toString(36).slice(2, 10)
export const ROLE_LABEL: Record<Role, string> = { admin: 'Administrador', coordinador: 'Coordinador', docente: 'Docente', estudiante: 'Estudiante' }
export const OBS_LIMIT = 500

const day = (d: number) => { const t = new Date(); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 16) }

const q = (text: string, type: AnswerType = 'escala', options: string[] = []): Question => ({ id: uid(), text, type, options, required: true })


const KEY = 'siard-udec-sqlite'
let sql: Database
let state: DB = { users: [], feedbacks: [], feedbackResponses: [], forms: [], formResponses: [] }
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
    id: p.id, text: p.enunciado, type: p.tipo_respuesta, required: !!p.obligatoria,
    options: query<Row>('SELECT texto FROM opciones WHERE pregunta_id = ? ORDER BY orden', [p.id]).map((o) => o.texto),
  }))
}

/** Reconstruye el estado de la UI a partir de las tablas */
function load() {
  state = {
    users: query<Row>('SELECT * FROM usuarios ORDER BY rol, nombre').map((u) => ({ id: u.id, name: u.nombre, email: u.correo, password: u.contrasena, role: u.rol, active: !!u.activo })),
    forms: query<Row>('SELECT * FROM formularios ORDER BY fecha_inicio DESC').map((f) => ({
      id: f.id, kind: f.tipo, title: f.titulo, description: f.descripcion, period: f.periodo, start: f.fecha_inicio, end: f.fecha_cierre, questions: questionsFor('formulario_id', f.id),
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
  run('INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, obligatoria, orden) VALUES (?,?,?,?,?,?)', [q.id, formId, q.text, q.type, q.required ? 1 : 0, orden])
  q.options.forEach((o, i) => run('INSERT INTO opciones (pregunta_id, orden, texto) VALUES (?,?,?)', [q.id, i, o]))
}
function insertResponse(r: FormResponse) {
  run('INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha) VALUES (?,?,?,?,?,?)', [r.id, r.formId, r.userId, r.teacherId, r.observation, r.date])
  Object.entries(r.answers).forEach(([q, v]) => run('INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor) VALUES (?,?,?)', [r.id, q, v]))
}
function insertForm(f: Form) {
  run('INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, fecha_inicio, fecha_cierre) VALUES (?,?,?,?,?,?,?)', [f.id, f.kind, f.title, f.description, f.period, f.start, f.end])
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

export async function initDB() {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const saved = localStorage.getItem(KEY)
  sql = saved ? new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0))) : new SQL.Database()
  sql.run('PRAGMA foreign_keys = ON')
  if (!saved) createSchema()
  load()
}
export function resetDB() {
  sql.close(); localStorage.removeItem(KEY)
  initDB().then(() => subs.forEach((s) => s()))
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
  // agregado en SQL: promedio ponderado de la vista v_promedios
  const rows = query<{ pregunta_id: string; promedio: number; n: number }>(
    `SELECT pregunta_id, SUM(promedio * n) / SUM(n) AS promedio, SUM(n) AS n FROM v_promedios
     WHERE formulario_id = ? AND (? IS NULL OR docente_id = ?) GROUP BY pregunta_id`, [formId, teacherId || null, teacherId || null])
  const perQ = form.questions.filter((x) => x.type === 'escala').map((x) => {
    const r = rows.find((y) => y.pregunta_id === x.id)
    return { question: x, avg: r?.promedio ?? 0, n: r?.n ?? 0 }
  })
  const valid = perQ.filter((p) => p.n)
  const overall = valid.length ? valid.reduce((a, b) => a + b.avg, 0) / valid.length : 0
  return { form, responses: rs, perQ, overall }
}
