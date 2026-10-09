/// <reference types="react" />
import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3, CalendarClock, ClipboardList, FileText, GraduationCap, LogOut, MessageSquare, Plus, RotateCcw, Trash2, UserPlus, Users, X, Check, AlertCircle, Send, Database, Download, Play,
} from 'lucide-react'
import {
  useDB, actions, resetDB, downloadDB, execRaw, initDB, uid, isOpen, fmt, stats, ROLE_LABEL, OBS_LIMIT,
  type User, type Role, type Question, type AnswerType, type Form, type FormKind,
} from './store'

/* ---------- primitivas ---------- */
const input = 'w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20'
const btn = 'inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-moss disabled:opacity-40'
const btnGhost = 'inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-pine'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-semibold uppercase tracking-wider text-ink/60">{label}</span>{children}</label>
}
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-white p-6 ${className}`}>{children}</div>
}
function Msg({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  return (
    <p className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${kind === 'ok' ? 'bg-moss/10 text-pine' : 'bg-red-50 text-red-700'}`}>
      {kind === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}{text}
    </p>
  )
}
function Header({ req, title, sub }: { req: string; title: string; sub?: string }) {
  return (
    <header className="mb-6 border-b border-line pb-4">
      <p className="font-mono text-xs text-ochre">{req}</p>
      <h1 className="font-serif text-4xl text-pine">{title}</h1>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </header>
  )
}
function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-line p-8 text-center text-sm text-ink/50">{text}</p>
}
function Scale({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {['1', '2', '3', '4', '5'].map((v) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${value === v ? 'border-pine bg-pine text-white' : 'border-line bg-white hover:border-pine'}`}>{v}</button>
      ))}
    </div>
  )
}
function AnswerInput({ q, value, onChange }: { q: Question; value?: string; onChange: (v: string) => void }) {
  if (q.type === 'escala') return <Scale value={value} onChange={onChange} />
  if (q.type === 'seleccion')
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)}
            className={`rounded-full border px-4 py-1.5 text-sm ${value === o ? 'border-pine bg-pine text-white' : 'border-line bg-white hover:border-pine'}`}>{o}</button>
        ))}
      </div>
    )
  return <textarea className={input} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}
function Bar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const color = value >= 4 ? 'bg-moss' : value >= 3 ? 'bg-ochre' : 'bg-red-600'
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
      <span className="text-sm">{label}</span>
      <span className="font-mono text-sm font-semibold">{value ? value.toFixed(2) : '—'}</span>
      <div className="col-span-2 h-2 rounded-full bg-paper"><div className={`h-2 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} /></div>
    </div>
  )
}

/* ---------- editor de pregunta (REQ-04 / REQ-12) ---------- */
function QuestionEditor({ onAdd }: { onAdd: (q: Question) => void }) {
  const [text, setText] = useState('')
  const [type, setType] = useState<AnswerType>('escala')
  const [opts, setOpts] = useState('')
  const [err, setErr] = useState('')
  const add = () => {
    const options = opts.split(',').map((s) => s.trim()).filter(Boolean)
    if (!text.trim()) return setErr('Ingrese el enunciado de la pregunta.')
    if (type === 'seleccion' && options.length < 2) return setErr('Configure al menos dos opciones separadas por comas.')
    onAdd({ id: uid(), text: text.trim(), type, options, required: true })
    setText(''); setOpts(''); setErr('')
  }
  return (
    <div className="space-y-3 rounded-md bg-paper p-4">
      <Field label="Enunciado"><input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escriba la pregunta…" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tipo de respuesta">
          <select className={input} value={type} onChange={(e) => setType(e.target.value as AnswerType)}>
            <option value="escala">Escala 1 – 5</option><option value="seleccion">Selección</option><option value="texto">Texto libre</option>
          </select>
        </Field>
        {type === 'seleccion' && <Field label="Opciones (separadas por coma)"><input className={input} value={opts} onChange={(e) => setOpts(e.target.value)} placeholder="Sí, No, Parcialmente" /></Field>}
      </div>
      {err && <Msg kind="err" text={err} />}
      <button type="button" className={btnGhost} onClick={add}><Plus size={16} />Agregar pregunta</button>
    </div>
  )
}
const TYPE_LABEL: Record<AnswerType, string> = { escala: 'Escala', seleccion: 'Selección', texto: 'Texto' }

/* ---------- REQ-02 Iniciar sesión ---------- */

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const db = useDB()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const firstUser = db.users.length === 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setErr('')
    setInfo('')

    if (firstUser) {
      if (!name.trim() || !email.trim() || !pass || !confirm) {
        setErr('Completa todos los campos.')
        return
      }
      if (pass.length < 8) {
        setErr('La contraseña debe tener al menos 8 caracteres.')
        return
      }
      if (pass !== confirm) {
        setErr('Las contraseñas no coinciden.')
        return
      }

      try {
        actions.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: pass,
          role: 'admin',
        })
        setInfo('Administrador creado. Ya puedes iniciar sesión.')
        setName('')
        setPass('')
        setConfirm('')
      } catch {
        setErr('No se pudo crear la cuenta. Revisa los datos e inténtalo de nuevo.')
      }
      return
    }

    const u = db.users.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase()
    )

    if (!u || u.password !== pass) {
      setErr('Credenciales incorrectas o el usuario no existe.')
      return
    }

    if (!u.active) {
      setErr('Esta cuenta fue dada de baja. Contacte al administrador.')
      return
    }

    onLogin(u)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-pine p-12 text-paper lg:flex">
        <div className="flex items-center gap-3">
          <GraduationCap />
          <span className="text-sm font-semibold tracking-wider">
            UNIVERSIDAD DE CUNDINAMARCA · FACULTAD DE INGENIERÍA
          </span>
        </div>

        <div>
          <p className="font-mono text-xs text-ochre">SIARD-UdeC</p>
          <h1 className="mt-3 max-w-lg font-serif text-6xl leading-[1.02]">
            Sistema Integral de Autoevaluación y Retroalimentación Docente
          </h1>
          <p className="mt-6 max-w-md text-paper/70">
            Evaluación institucional, autoevaluación y retroalimentación de clase en un solo lugar, para cuatro roles.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-px border-t border-paper/20 pt-6 text-xs text-paper/60">
          {(['admin', 'coordinador', 'docente', 'estudiante'] as Role[]).map((r) => (
            <span key={r}>{ROLE_LABEL[r]}</span>
          ))}
        </div>

        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border-[48px] border-moss/40" />
      </section>

      <section className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <p className="font-mono text-xs text-ochre">
              {firstUser ? 'CONFIGURACIÓN INICIAL' : 'REQ-02'}
            </p>
            <h2 className="font-serif text-4xl text-pine">
              {firstUser ? 'Crear administrador' : 'Iniciar sesión'}
            </h2>
          </div>

          {firstUser && (
            <Field label="Nombre completo">
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
          )}

          <Field label="Correo institucional">
            <input
              type="email"
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Contraseña">
            <input
              type="password"
              className={input}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </Field>

          {firstUser && (
            <Field label="Confirmar contraseña">
              <input
                type="password"
                className={input}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>
          )}

          {info && <Msg kind="ok" text={info} />}
          {err && <Msg kind="err" text={err} />}

          <button
            type="submit"
            className={`${btn} w-full justify-center`}
          >
            {firstUser ? 'Crear administrador' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}

/* ---------- REQ-01 / REQ-05 Cuentas ---------- */
function Accounts({ me }: { me: User }) {
  const db = useDB()
  const [f, setF] = useState({ name: '', email: '', password: '', role: 'estudiante' as Role })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<User | null>(null)
  const roles: Role[] = me.role === 'admin' ? ['admin', 'coordinador', 'docente', 'estudiante'] : ['docente', 'estudiante']
  const create = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim() || !f.email.trim() || !f.password) return setMsg({ kind: 'err', text: 'Todos los campos son obligatorios.' })
    if (db.users.some((u) => u.email.toLowerCase() === f.email.trim().toLowerCase())) return setMsg({ kind: 'err', text: 'Ya existe un usuario con ese correo.' })
    actions.createUser({ ...f, email: f.email.trim() })
    setMsg({ kind: 'ok', text: `Cuenta de ${f.name} creada.` })
    setF({ name: '', email: '', password: '', role: f.role })
  }
  const list = db.users.filter((u) => (u.name + u.email).toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <Header req="REQ-01 · REQ-05" title="Cuentas de usuario" sub="Crear nuevas cuentas y dar de baja las existentes." />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <form onSubmit={create} className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold"><UserPlus size={18} />Crear cuenta</h3>
            <Field label="Nombre"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Correo"><input type="email" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Contraseña"><input type="password" className={input} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            <Field label="Rol">
              <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
            {msg && <Msg {...msg} />}
            <button className={btn}>Crear cuenta</button>
          </form>
        </Card>
        <Card className="p-0">
          <div className="border-b border-line p-4"><input className={input} placeholder="Buscar cuenta…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink/50"><tr><th className="p-4">Nombre</th><th>Rol</th><th>Estado</th><th /></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-t border-line">
                  <td className="p-4"><div className="font-medium">{u.name}</div><div className="font-mono text-xs text-ink/50">{u.email}</div></td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-moss/10 text-pine' : 'bg-red-50 text-red-700'}`}>{u.active ? 'Activa' : 'Bloqueada'}</span></td>
                  <td className="pr-4 text-right">
                    {u.active && u.id !== me.id && (me.role === 'admin' || roles.includes(u.role)) && (
                      <button onClick={() => setConfirm(u)} className="rounded p-2 text-red-700 hover:bg-red-50" title="Eliminar cuenta"><Trash2 size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <Card className="max-w-sm space-y-4">
            <h3 className="font-serif text-2xl">¿Eliminar la cuenta de {confirm.name}?</h3>
            <p className="text-sm text-ink/60">La cuenta quedará desactivada y no podrá iniciar sesión.</p>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setConfirm(null)}>Cancelar</button>
              <button className={`${btn} bg-red-700 hover:bg-red-800`} onClick={() => {
                actions.deactivateUser(confirm.id); setConfirm(null)
              }}>Eliminar</button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

/* ---------- REQ-10 / 11 / 12 / 13 / 06 Formularios ---------- */
function FormsAdmin() {
  const db = useDB()
  const blank = { kind: '' as FormKind | '', title: '', description: '', period: '2026-II', start: '', end: '', questions: [] as Question[] }
  const [f, setF] = useState(blank)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [editingDates, setEditingDates] = useState<string | null>(null)
  const save = () => {
    if (!f.kind) return setMsg({ kind: 'err', text: 'Seleccione el tipo de evaluación antes de continuar.' })
    if (!f.title.trim() || !f.period.trim()) return setMsg({ kind: 'err', text: 'El título y el período son obligatorios.' })
    if (!f.start || !f.end) return setMsg({ kind: 'err', text: 'Defina la fecha y hora de inicio y cierre.' })
    if (f.end <= f.start) return setMsg({ kind: 'err', text: 'La fecha de cierre debe ser posterior a la de inicio.' })
    if (!f.questions.length) return setMsg({ kind: 'err', text: 'Agregue al menos una pregunta.' })
    actions.createForm({ ...f, kind: f.kind as FormKind })
    setMsg({ kind: 'ok', text: 'Formulario guardado y programado.' }); setF(blank)
  }
  return (
    <>
      <Header req="REQ-06 · REQ-10 · REQ-11 · REQ-12 · REQ-13" title="Evaluaciones y autoevaluaciones" sub="Crear formularios institucionales, definir preguntas, tipo y fechas de disponibilidad." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold"><Plus size={18} />Nuevo formulario</h3>
          <Field label="Tipo de evaluación">
            <div className="grid grid-cols-2 gap-2">
              {(['evaluacion', 'autoevaluacion'] as FormKind[]).map((k) => (
                <button key={k} type="button" onClick={() => setF({ ...f, kind: k })}
                  className={`rounded-md border p-3 text-left text-sm ${f.kind === k ? 'border-pine bg-pine/5 ring-1 ring-pine' : 'border-line'}`}>
                  <div className="font-semibold">{k === 'evaluacion' ? 'Evaluación docente' : 'Autoevaluación'}</div>
                  <div className="text-xs text-ink/50">{k === 'evaluacion' ? 'La responden los estudiantes' : 'La responden los docentes'}</div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Título"><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Descripción"><input className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <Field label="Período"><input className={input} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio"><input type="datetime-local" className={input} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            <Field label="Cierre"><input type="datetime-local" className={input} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">Preguntas ({f.questions.length})</span>
            {f.questions.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                <span><span className="mr-2 font-mono text-ink/40">{i + 1}.</span>{q.text} <span className="ml-1 text-xs text-ochre">{TYPE_LABEL[q.type]}</span></span>
                <button onClick={() => setF({ ...f, questions: f.questions.filter((x) => x.id !== q.id) })}><X size={14} /></button>
              </div>
            ))}
            <QuestionEditor onAdd={(q) => setF({ ...f, questions: [...f.questions, q] })} />
          </div>
          {msg && <Msg {...msg} />}
          <button className={btn} onClick={save}>Guardar formulario</button>
        </Card>
        <div className="space-y-3">
          {db.forms.map((fm) => <FormRow key={fm.id} fm={fm} editing={editingDates === fm.id} setEditing={(b) => setEditingDates(b ? fm.id : null)} />)}
        </div>
      </div>
    </>
  )
}
function FormRow({ fm, editing, setEditing }: { fm: Form; editing: boolean; setEditing: (b: boolean) => void }) {
  const db = useDB()
  const [s, setS] = useState(fm.start)
  const [e, setE] = useState(fm.end)
  const [err, setErr] = useState('')
  const n = db.formResponses.filter((r) => r.formId === fm.id).length
  const open = isOpen(fm.start, fm.end)
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ochre">{fm.kind === 'evaluacion' ? 'Evaluación docente' : 'Autoevaluación'} · {fm.period}</p>
          <h4 className="font-serif text-2xl">{fm.title}</h4>
          <p className="text-sm text-ink/60">{fm.questions.length} preguntas · {n} respuestas</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${open ? 'bg-moss/10 text-pine' : 'bg-paper text-ink/60'}`}>{open ? 'Abierta' : 'Cerrada'}</span>
      </div>
      {!editing ? (
        <button className="flex items-center gap-2 text-sm text-ink/70 hover:text-pine" onClick={() => setEditing(true)}>
          <CalendarClock size={15} />{fmt(fm.start)} → {fmt(fm.end)}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input type="datetime-local" className={input} value={s} onChange={(x) => setS(x.target.value)} />
            <input type="datetime-local" className={input} value={e} onChange={(x) => setE(x.target.value)} />
          </div>
          {err && <Msg kind="err" text={err} />}
          <div className="flex gap-2">
            <button className={btn} onClick={() => {
              if (e <= s) return setErr('La fecha de cierre es anterior a la de inicio.')
              actions.setFormDates(fm.id, s, e); setEditing(false)
            }}>Guardar fechas</button>
            <button className={btnGhost} onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ---------- REQ-08 Resultados ---------- */
function Filters({ formId, setFormId, teacherId, setTeacherId, kind }: { formId: string; setFormId: (s: string) => void; teacherId: string; setTeacherId: (s: string) => void; kind?: FormKind }) {
  const db = useDB()
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <Field label="Evaluación / período">
        <select className={input} value={formId} onChange={(e) => setFormId(e.target.value)}>
          {db.forms.filter((f) => !kind || f.kind === kind).map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
      </Field>
      <Field label="Docente">
        <select className={input} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
          <option value="">Todos los docentes</option>
          {db.users.filter((u) => u.role === 'docente').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </Field>
    </div>
  )
}
function Results() {
  const db = useDB()
  const [formId, setFormId] = useState(db.forms[0]?.id ?? '')
  const [teacherId, setTeacherId] = useState('')
  const s = stats(db, formId, teacherId)
  return (
    <>
      <Header req="REQ-08" title="Resultados de evaluación" sub="Resultados consolidados por evaluación, docente o período." />
      <Filters {...{ formId, setFormId, teacherId, setTeacherId }} />
      {!s || !s.responses.length ? <Empty text="No hay resultados disponibles para los filtros seleccionados." /> : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card className="flex flex-col justify-between bg-pine text-paper">
            <p className="text-xs uppercase tracking-wider text-paper/60">Promedio general</p>
            <p className="font-serif text-7xl">{s.overall.toFixed(2)}</p>
            <p className="text-sm text-paper/60">sobre 5 · {s.responses.length} respuestas</p>
          </Card>
          <Card className="space-y-4">{s.perQ.map((p) => <Bar key={p.question.id} label={p.question.text} value={p.avg} />)}</Card>
          <TextAnswers form={s.form} responses={s.responses} />
        </div>
      )}
    </>
  )
}
function TextAnswers({ form, responses }: { form: Form; responses: { id: string; answers: Record<string, string>; observation: string }[] }) {
  const texts = responses.flatMap((r) => [
    ...form.questions.filter((q) => q.type !== 'escala' && r.answers[q.id]).map((q) => ({ id: r.id + q.id, label: q.text, text: r.answers[q.id] })),
    ...(r.observation ? [{ id: r.id + 'obs', label: 'Observación', text: r.observation }] : []),
  ])
  if (!texts.length) return null
  return (
    <Card className="space-y-3 lg:col-span-2">
      <h3 className="font-semibold">Comentarios y observaciones <span className="text-xs font-normal text-ink/50">(anónimos)</span></h3>
      {texts.map((t) => <blockquote key={t.id} className="border-l-2 border-ochre pl-3 text-sm"><span className="text-xs text-ink/50">{t.label}</span><p className="font-serif text-lg">“{t.text}”</p></blockquote>)}
    </Card>
  )
}

/* ---------- REQ-09 Estadísticas ---------- */
function Statistics() {
  const db = useDB()
  const teachers = db.users.filter((u) => u.role === 'docente')
  const evals = db.forms.filter((f) => f.kind === 'evaluacion')
  const autos = db.forms.filter((f) => f.kind === 'autoevaluacion')
  const [formId, setFormId] = useState(evals[0]?.id ?? '')
  const kpis = [
    { label: 'Usuarios activos', v: db.users.filter((u) => u.active).length },
    { label: 'Evaluaciones', v: evals.length },
    { label: 'Autoevaluaciones', v: autos.length },
    { label: 'Respuestas totales', v: db.formResponses.length },
  ]
  const rows = teachers.map((t) => ({ t, s: stats(db, formId, t.id) })).filter((r) => r.s?.responses.length)
  const autoDone = autos.map((a) => ({ a, n: new Set(db.formResponses.filter((r) => r.formId === a.id).map((r) => r.userId)).size }))
  return (
    <>
      <Header req="REQ-09" title="Estadísticas y reportes" sub="Promedios, comparativos y participación." />
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        {kpis.map((k) => <div key={k.label} className="bg-white p-5"><p className="font-serif text-5xl text-pine">{k.v}</p><p className="text-xs uppercase tracking-wider text-ink/50">{k.label}</p></div>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-semibold">Promedio por docente</h3>
            <select className={`${input} w-auto`} value={formId} onChange={(e) => setFormId(e.target.value)}>
              {evals.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          </div>
          {rows.length ? rows.map(({ t, s }) => <Bar key={t.id} label={`${t.name} (${s!.responses.length})`} value={s!.overall} />) : <Empty text="No existe información para generar estadísticas." />}
        </Card>
        <Card className="space-y-4">
          <h3 className="font-semibold">Participación en autoevaluación</h3>
          {autoDone.length ? autoDone.map(({ a, n }) => <Bar key={a.id} label={`${a.title} · ${n}/${teachers.length} docentes`} value={n} max={Math.max(teachers.length, 1)} />) : <Empty text="No hay autoevaluaciones." />}
        </Card>
      </div>
    </>
  )
}

/* ---------- REQ-18 Reporte de mejora ---------- */
function Report() {
  const db = useDB()
  const teachers = db.users.filter((u) => u.role === 'docente')
  const [teacherId, setTeacherId] = useState(teachers[0]?.id ?? '')
  const [formId, setFormId] = useState(db.forms.find((f) => f.kind === 'evaluacion')?.id ?? '')
  const [generated, setGenerated] = useState(false)
  const s = stats(db, formId, teacherId)
  const auto = db.formResponses.filter((r) => r.userId === teacherId && db.forms.find((f) => f.id === r.formId)?.kind === 'autoevaluacion')
  const teacher = db.users.find((u) => u.id === teacherId)
  return (
    <>
      <Header req="REQ-18" title="Reporte de mejora docente" sub="Fortalezas y oportunidades de mejora a partir de evaluaciones y autoevaluaciones." />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1"><Filters kind="evaluacion" formId={formId} setFormId={(v) => { setFormId(v); setGenerated(false) }} teacherId={teacherId} setTeacherId={(v) => { setTeacherId(v); setGenerated(false) }} /></div>
      </div>
      <button className={`${btn} mb-6`} onClick={() => setGenerated(true)} disabled={!teacherId}><FileText size={16} />Generar reporte</button>
      {generated && (!s || !s.responses.length ? <Empty text="No hay datos suficientes para generar el reporte." /> : (
        <Card className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div><p className="text-xs uppercase tracking-wider text-ochre">{s.form.title}</p><h2 className="font-serif text-4xl">{teacher?.name}</h2></div>
            <div className="text-right"><p className="font-serif text-5xl text-pine">{s.overall.toFixed(2)}</p><p className="text-xs text-ink/50">{s.responses.length} evaluaciones</p></div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-moss">Fortalezas</h3>
              {s.perQ.filter((p) => p.avg >= 4).map((p) => <Bar key={p.question.id} label={p.question.text} value={p.avg} />)}
              {!s.perQ.some((p) => p.avg >= 4) && <p className="text-sm text-ink/50">Sin ítems con promedio ≥ 4.</p>}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-red-700">Oportunidades de mejora</h3>
              {s.perQ.filter((p) => p.avg < 3.5 && p.n).map((p) => <Bar key={p.question.id} label={p.question.text} value={p.avg} />)}
              {!s.perQ.some((p) => p.avg < 3.5 && p.n) && <p className="text-sm text-ink/50">Sin ítems por debajo de 3.5.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Observaciones de estudiantes</h3>
            {s.responses.filter((r) => r.observation).map((r) => <p key={r.id} className="border-l-2 border-ochre pl-3 font-serif text-lg">“{r.observation}”</p>)}
          </div>
          <p className="rounded-md bg-paper p-3 text-sm">Autoevaluación: {auto.length ? `respondida (${auto.length})` : 'pendiente por parte del docente.'}</p>
          <button className={btnGhost} onClick={() => window.print()}>Imprimir / guardar PDF</button>
        </Card>
      ))}
    </>
  )
}

/* ---------- REQ-03 / 04 / 07 Retroalimentación (Docente) ---------- */
function TeacherFeedback({ me }: { me: User }) {
  const db = useDB()
  const [course, setCourse] = useState('')
  const [q, setQ] = useState<Question | null>(null)
  const [start, setStart] = useState(new Date().toISOString().slice(0, 16))
  const [end, setEnd] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const mine = db.feedbacks.filter((f) => f.teacherId === me.id)
  const save = () => {
    if (!q) return setMsg({ kind: 'err', text: 'Ingrese el enunciado antes de guardar.' })
    if (!course.trim()) return setMsg({ kind: 'err', text: 'Indique el curso o clase.' })
    if (!end || end <= start) return setMsg({ kind: 'err', text: 'La fecha de cierre debe ser posterior a la de inicio.' })
    actions.createFeedback({ teacherId: me.id, course, question: q, start, end })
    setQ(null); setCourse(''); setEnd(''); setMsg({ kind: 'ok', text: 'Retroalimentación registrada.' })
  }
  const current = mine.find((f) => f.id === sel)
  const resp = db.feedbackResponses.filter((r) => r.feedbackId === sel)
  return (
    <>
      <Header req="REQ-03 · REQ-04 · REQ-07" title="Retroalimentación de clase" sub="Pregunte a sus estudiantes cómo les fue en la clase y consulte sus respuestas." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold"><Plus size={18} />Crear enunciado</h3>
          <Field label="Curso / clase"><input className={input} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Ej. Bases de Datos — sesión 8" /></Field>
          {q ? (
            <div className="flex items-center justify-between rounded-md border border-pine bg-pine/5 px-3 py-2 text-sm">
              <span>{q.text} <span className="text-xs text-ochre">{TYPE_LABEL[q.type]}{q.options.length ? `: ${q.options.join(' / ')}` : ''}</span></span>
              <button onClick={() => setQ(null)}><X size={14} /></button>
            </div>
          ) : <QuestionEditor onAdd={setQ} />}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Disponible desde"><input type="datetime-local" className={input} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
            <Field label="Hasta"><input type="datetime-local" className={input} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
          </div>
          {msg && <Msg {...msg} />}
          <button className={btn} onClick={save}>Guardar retroalimentación</button>
        </Card>
        <div className="space-y-3">
          {!mine.length && <Empty text="Aún no ha creado retroalimentaciones." />}
          {mine.map((f) => {
            const n = db.feedbackResponses.filter((r) => r.feedbackId === f.id).length
            return (
              <button key={f.id} onClick={() => setSel(f.id === sel ? null : f.id)}
                className={`block w-full rounded-lg border bg-white p-4 text-left ${sel === f.id ? 'border-pine ring-1 ring-pine' : 'border-line hover:border-pine'}`}>
                <div className="flex justify-between text-xs text-ink/50"><span>{f.course}</span><span>{isOpen(f.start, f.end) ? 'Abierta' : 'Cerrada'} · {n} resp.</span></div>
                <p className="mt-1 font-serif text-xl">{f.question.text}</p>
              </button>
            )
          })}
          {current && (
            <Card className="space-y-3">
              <h3 className="font-semibold">Respuestas</h3>
              {!resp.length ? <Empty text="Todavía no hay respuestas registradas." /> : current.question.type === 'texto'
                ? resp.map((r) => <p key={r.id} className="border-l-2 border-ochre pl-3 text-sm">{r.value}</p>)
                : (current.question.type === 'escala' ? ['1', '2', '3', '4', '5'] : current.question.options).map((o) => (
                  <Bar key={o} label={o} value={resp.filter((r) => r.value === o).length} max={resp.length} />
                ))}
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

/* ---------- Formulario respondible (REQ-15 / REQ-16) ---------- */
function Respond({ form, onSubmit, withObservation }: { form: Form; onSubmit: (a: Record<string, string>, obs: string) => void; withObservation?: boolean }) {
  const [a, setA] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [err, setErr] = useState('')
  const send = () => {
    if (!isOpen(form.start, form.end)) return setErr('El período de respuesta ha finalizado.')
    const m = form.questions.filter((q) => q.required && !a[q.id]?.trim()).map((q) => q.id)
    setMissing(m)
    if (m.length) return setErr(`Faltan ${m.length} preguntas obligatorias por responder.`)
    if (obs.length > OBS_LIMIT) return setErr(`La observación supera los ${OBS_LIMIT} caracteres. Redúzcala.`)
    onSubmit(a, obs)
  }
  return (
    <div className="space-y-4">
      {form.questions.map((q, i) => (
        <Card key={q.id} className={missing.includes(q.id) ? 'border-red-400' : ''}>
          <p className="mb-3"><span className="mr-2 font-mono text-sm text-ochre">{String(i + 1).padStart(2, '0')}</span>{q.text}{q.required && <span className="text-red-600"> *</span>}</p>
          <AnswerInput q={q} value={a[q.id]} onChange={(v) => setA({ ...a, [q.id]: v })} />
        </Card>
      ))}
      {withObservation && (
        <Card>
          <p className="mb-1 font-semibold">Observaciones <span className="font-mono text-xs text-ochre">REQ-14</span></p>
          <p className="mb-3 text-xs text-ink/50">Opcional y confidencial: el docente no verá su nombre.</p>
          <textarea className={input} rows={4} value={obs} onChange={(e) => setObs(e.target.value)} />
          <p className={`mt-1 text-right font-mono text-xs ${obs.length > OBS_LIMIT ? 'text-red-600' : 'text-ink/40'}`}>{obs.length}/{OBS_LIMIT}</p>
        </Card>
      )}
      {err && <Msg kind="err" text={err} />}
      <button className={btn} onClick={send}><Send size={16} />Enviar</button>
    </div>
  )
}

function SelfEvaluation({ me }: { me: User }) {
  const db = useDB()
  const [active, setActive] = useState<string | null>(null)
  const forms = db.forms.filter((f) => f.kind === 'autoevaluacion')
  const done = (id: string) => db.formResponses.some((r) => r.formId === id && r.userId === me.id)
  const form = forms.find((f) => f.id === active)
  return (
    <>
      <Header req="REQ-16" title="Autoevaluación" sub="Reflexione sobre su propio desempeño docente." />
      {form ? (
        <Respond form={form} onSubmit={(answers, observation) => {
          actions.respondForm({ formId: form.id, userId: me.id, teacherId: me.id, answers, observation })
          setActive(null)
        }} />
      ) : <FormList forms={forms} done={done} onOpen={setActive} />}
    </>
  )
}

function FormList({ forms, done, onOpen }: { forms: Form[]; done: (id: string) => boolean; onOpen: (id: string) => void }) {
  if (!forms.length) return <Empty text="No tiene actividades asignadas." />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {forms.map((f) => {
        const open = isOpen(f.start, f.end), d = done(f.id)
        return (
          <Card key={f.id} className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider text-ochre">{f.period}</p>
            <h3 className="font-serif text-2xl">{f.title}</h3>
            <p className="text-sm text-ink/60">{f.description}</p>
            <p className="flex items-center gap-2 text-xs text-ink/50"><CalendarClock size={14} />Cierra {fmt(f.end)}</p>
            <div className="mt-auto pt-2">
              {d ? <Msg kind="ok" text="Respondida. ¡Gracias!" /> : open ? <button className={btn} onClick={() => onOpen(f.id)}>Responder</button> : <Msg kind="err" text="Fuera del período de respuesta." />}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ---------- REQ-15 / REQ-14 Estudiante ---------- */
function StudentEvaluation({ me }: { me: User }) {
  const db = useDB()
  const teachers = db.users.filter((u) => u.role === 'docente' && u.active)
  const [sel, setSel] = useState<{ formId: string; teacherId: string } | null>(null)
  const [ok, setOk] = useState(false)
  const evals = db.forms.filter((f) => f.kind === 'evaluacion')
  const done = (formId: string, teacherId: string) => db.formResponses.some((r) => r.formId === formId && r.userId === me.id && r.teacherId === teacherId)
  const form = evals.find((f) => f.id === sel?.formId)
  return (
    <>
      <Header req="REQ-14 · REQ-15" title="Evaluación docente" sub="Valore el desempeño de sus docentes. Sus respuestas son confidenciales." />
      {ok && <div className="mb-4"><Msg kind="ok" text="Evaluación enviada correctamente." /></div>}
      {form && sel ? (
        <>
          <p className="mb-4 text-sm">Evaluando a <b>{db.users.find((u) => u.id === sel.teacherId)?.name}</b> · <button className="underline" onClick={() => setSel(null)}>volver</button></p>
          <Respond form={form} withObservation onSubmit={(answers, observation) => {
            actions.respondForm({ formId: form.id, userId: me.id, teacherId: sel.teacherId, answers, observation })
            setSel(null); setOk(true)
          }} />
        </>
      ) : evals.length ? evals.map((f) => (
        <Card key={f.id} className="mb-4">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-2xl">{f.title}</h3>
            <span className="text-xs text-ink/50">{isOpen(f.start, f.end) ? `Cierra ${fmt(f.end)}` : 'Fuera del período de respuesta'}</span>
          </div>
          <div className="divide-y divide-line">
            {teachers.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <span>{t.name}</span>
                {done(f.id, t.id) ? <span className="flex items-center gap-1 text-sm text-moss"><Check size={16} />Respondida</span>
                  : <button className={btnGhost} disabled={!isOpen(f.start, f.end)} onClick={() => { setOk(false); setSel({ formId: f.id, teacherId: t.id }) }}>Evaluar</button>}
              </div>
            ))}
          </div>
        </Card>
      )) : <Empty text="No hay evaluaciones asignadas." />}
    </>
  )
}

/* ---------- REQ-17 Estudiante responde retroalimentación ---------- */
function StudentFeedback({ me }: { me: User }) {
  const db = useDB()
  const [vals, setVals] = useState<Record<string, string>>({})
  return (
    <>
      <Header req="REQ-17" title="Retroalimentación de clase" sub="Cuéntele a su docente cómo le pareció la clase." />
      {!db.feedbacks.length && <Empty text="No hay retroalimentaciones disponibles." />}
      <div className="grid gap-4 md:grid-cols-2">
        {db.feedbacks.map((f) => {
          const answered = db.feedbackResponses.some((r) => r.feedbackId === f.id && r.studentId === me.id)
          const open = isOpen(f.start, f.end)
          const teacher = db.users.find((u) => u.id === f.teacherId)
          return (
            <Card key={f.id} className="space-y-3">
              <p className="text-xs text-ink/50">{f.course} · {teacher?.name}</p>
              <p className="font-serif text-xl">{f.question.text}</p>
              {answered ? <Msg kind="ok" text="Respuesta enviada." /> : !open ? <Msg kind="err" text="Retroalimentación cerrada o fuera de fecha." /> : (
                <>
                  <AnswerInput q={f.question} value={vals[f.id]} onChange={(v) => setVals({ ...vals, [f.id]: v })} />
                  <button className={btn} disabled={!vals[f.id]?.trim()} onClick={() =>
                    actions.respondFeedback(f.id, me.id, vals[f.id])
                  }><Send size={16} />Enviar</button>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

/* ---------- Consola SQL (solo Administrador) ---------- */
const EXAMPLES = [
  'SELECT nombre, correo, rol, activo FROM usuarios;',
  'SELECT u.nombre AS docente, f.titulo, ROUND(AVG(v.promedio), 2) AS promedio\nFROM v_promedios v JOIN usuarios u ON u.id = v.docente_id JOIN formularios f ON f.id = v.formulario_id\nGROUP BY v.docente_id, v.formulario_id;',
  "SELECT name, type FROM sqlite_master WHERE type IN ('table','view');",
]
function SqlConsole() {
  const [text, setText] = useState(EXAMPLES[1])
  const [res, setRes] = useState<{ columns: string[]; values: unknown[][] } | null>(null)
  const [err, setErr] = useState('')
  const exec = () => { try { setRes(execRaw(text)); setErr('') } catch (e) { setErr((e as Error).message); setRes(null) } }
  return (
    <>
      <Header req="Base de datos" title="Consola SQL" sub="Motor SQLite con llaves foráneas, restricciones CHECK y vistas. Esquema en database/schema.sql." />
      <div className="mb-3 flex flex-wrap gap-2">
        {EXAMPLES.map((x, i) => <button key={i} className={btnGhost} onClick={() => setText(x)}>Ejemplo {i + 1}</button>)}
        <button className={`${btnGhost} ml-auto`} onClick={downloadDB}><Download size={16} />Descargar .sqlite</button>
      </div>
      <textarea className={`${input} font-mono`} rows={6} value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) exec() }} />
      <div className="my-4 flex items-center gap-3"><button className={btn} onClick={exec}><Play size={16} />Ejecutar</button><span className="text-xs text-ink/50">Ctrl + Enter</span></div>
      {err && <Msg kind="err" text={err} />}
      {res && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full font-mono text-xs">
            <thead className="bg-paper text-left"><tr>{res.columns.map((c) => <th key={c} className="p-3">{c}</th>)}</tr></thead>
            <tbody>{res.values.map((r, i) => <tr key={i} className="border-t border-line">{r.map((v, j) => <td key={j} className="p-3">{String(v)}</td>)}</tr>)}</tbody>
          </table>
        </Card>
      )}
      {!res && !err && <p className="text-sm text-ink/50">Sentencia ejecutada sin resultados para mostrar.</p>}
    </>
  )
}

/* ---------- Shell ---------- */
type View = { id: string; label: string; icon: typeof Users; render: (me: User) => ReactNode }
const VIEWS: Record<Role, View[]> = (() => {
  const mgmt: View[] = [
    { id: 'cuentas', label: 'Cuentas', icon: Users, render: (me) => <Accounts me={me} /> },
    { id: 'formularios', label: 'Evaluaciones', icon: ClipboardList, render: () => <FormsAdmin /> },
    { id: 'resultados', label: 'Resultados', icon: BarChart3, render: () => <Results /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, render: () => <Statistics /> },
    { id: 'reporte', label: 'Reporte de mejora', icon: FileText, render: () => <Report /> },
  ]
  return {
    admin: [...mgmt, { id: 'sql', label: 'Consola SQL', icon: Database, render: () => <SqlConsole /> }],
    coordinador: mgmt,
    docente: [
      { id: 'retro', label: 'Retroalimentación', icon: MessageSquare, render: (me) => <TeacherFeedback me={me} /> },
      { id: 'auto', label: 'Autoevaluación', icon: ClipboardList, render: (me) => <SelfEvaluation me={me} /> },
    ],
    estudiante: [
      { id: 'eval', label: 'Evaluación docente', icon: ClipboardList, render: (me) => <StudentEvaluation me={me} /> },
      { id: 'retro', label: 'Retroalimentación', icon: MessageSquare, render: (me) => <StudentFeedback me={me} /> },
    ],
  }
})()

export default function App() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { initDB().then(() => setReady(true), (e) => setError(String(e))) }, [])
  if (error) return <div className="p-10"><Msg kind="err" text={`No se pudo abrir la base de datos: ${error}`} /></div>
  if (!ready) return <div className="flex min-h-screen items-center justify-center font-serif text-2xl text-pine">Abriendo base de datos…</div>
  return <Shell />
}

function Shell() {
  const db = useDB()
  const [meId, setMeId] = useState<string | null>(() => sessionStorage.getItem('siard-me'))
  const me = db.users.find((u) => u.id === meId && u.active)
  const [view, setView] = useState('')
  if (!me) return <Login onLogin={(u) => { sessionStorage.setItem('siard-me', u.id); setMeId(u.id); setView('') }} />
  const views = VIEWS[me.role]
  const current = views.find((v) => v.id === view) ?? views[0]
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-pine text-paper md:sticky md:top-0 md:h-screen md:w-64">
        <div className="border-b border-paper/15 p-6">
          <p className="font-mono text-xs text-ochre">SIARD-UdeC</p>
          <p className="font-serif text-2xl leading-tight">Evaluación docente</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
          {views.map((v) => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm ${current.id === v.id ? 'bg-paper text-pine' : 'text-paper/75 hover:bg-paper/10'}`}>
              <v.icon size={17} />{v.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-3 border-t border-paper/15 p-4 md:block">
          <div><p className="text-sm font-semibold">{me.name}</p><p className="text-xs text-paper/60">{ROLE_LABEL[me.role]}</p></div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 text-xs text-paper/70 hover:text-paper" onClick={() => { sessionStorage.removeItem('siard-me'); setMeId(null) }}><LogOut size={14} />Salir</button>
            {me.role === 'admin' && <button className="ml-auto flex items-center gap-1 text-xs text-paper/50 hover:text-paper" onClick={resetDB} title="Restaurar datos de ejemplo"><RotateCcw size={13} />Datos demo</button>}
          </div>
        </div>
        <button className="m-3 flex items-center gap-2 text-xs md:hidden" onClick={() => { sessionStorage.removeItem('siard-me'); setMeId(null) }}><LogOut size={14} />Salir ({me.name})</button>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">{current.render(me)}</main>
    </div>
  )
}
