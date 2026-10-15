/// <reference types="react" />
import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3, CalendarClock, ClipboardList, FileText, GraduationCap, LogOut, MessageSquare, Plus, Trash2, UserPlus, Users, X, Check, AlertCircle, Send, BookOpen, Award, Layers, Scale as ScaleIcon, CheckCircle2, Building2, Star, Pencil,
} from 'lucide-react'
import {
  useDB, actions, initDB, uid, isOpen, fmt, stats, ROLE_LABEL, OBS_LIMIT, MEDIT_DIMENSIONES, getTeacherReputation, getFacultyGlobalMetrics,
  type User, type Role, type Question, type AnswerType, type Form, type FormKind, type CADI,
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
function Header({ req: _req, title, sub }: { req?: string; title: string; sub?: string }) {
  return (
    <header className="mb-6 border-b border-line pb-4">
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

/* ---------- editor de pregunta (REQ-04 / REQ-12 / MEDIT) ---------- */
function QuestionEditor({
  onAdd,
  hideDimension = false,
  defaultDimension = 'Pedagógica y Didáctica',
}: {
  onAdd: (q: Question) => void
  hideDimension?: boolean
  defaultDimension?: string
}) {
  const [text, setText] = useState('')
  const [type, setType] = useState<AnswerType>('escala')
  const [dimension, setDimension] = useState<string>(hideDimension ? 'Retroalimentación de Aula' : defaultDimension)
  const [opts, setOpts] = useState('')
  const [err, setErr] = useState('')
  const add = () => {
    const options = opts.split(',').map((s) => s.trim()).filter(Boolean)
    if (!text.trim()) return setErr('Ingrese el enunciado de la pregunta.')
    if (type === 'seleccion' && options.length < 2) return setErr('Configure al menos dos opciones separadas por comas.')
    onAdd({
      id: uid(),
      text: text.trim(),
      type,
      options,
      required: true,
      dimension: hideDimension ? 'Retroalimentación de Aula' : (dimension || 'General'),
    })
    setText(''); setOpts(''); setErr('')
  }
  return (
    <div className="space-y-3 rounded-md bg-paper p-4">
      <Field label="Enunciado"><input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escriba la pregunta…" /></Field>
      <div className={`grid gap-3 ${hideDimension ? (type === 'seleccion' ? 'sm:grid-cols-2' : 'sm:grid-cols-1') : 'sm:grid-cols-3'}`}>
        <Field label="Tipo de respuesta">
          <select className={input} value={type} onChange={(e) => setType(e.target.value as AnswerType)}>
            <option value="escala">Escala 1 – 5</option><option value="seleccion">Selección</option><option value="texto">Texto libre</option>
          </select>
        </Field>
        {!hideDimension && (
          <Field label="Dimensión MEDIT">
            <select className={input} value={dimension} onChange={(e) => setDimension(e.target.value)}>
              {MEDIT_DIMENSIONES.map((d) => <option key={d} value={d}>{d}</option>)}
              <option value="General">General</option>
            </select>
          </Field>
        )}
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
  const [selectedRole, setSelectedRole] = useState<Role>('estudiante')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const firstUser = db.users.length === 0

  const submit = async (e: React.FormEvent) => {
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
        await actions.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: pass,
          role: 'admin',
          sede: 'Sede Facatativá',
          carrera: 'Ingeniería de Sistemas y Computación',
        })
        setInfo('Administrador creado en PostgreSQL. Ya puedes iniciar sesión.')
        setName('')
        setPass('')
        setConfirm('')
      } catch (e) {
        setErr((e as Error).message || 'No se pudo crear la cuenta en PostgreSQL.')
      }
      return
    }

    const u = db.users.find(
      (x) => x.email.toLowerCase() === email.trim().toLowerCase()
    )

    if (!u) {
      setErr('No existe una cuenta registrada con este correo electrónico.')
      return
    }

    // Validación del rol seleccionado
    if (u.role !== selectedRole) {
      setErr(`El correo ingresado no corresponde al rol de ${ROLE_LABEL[selectedRole]}. Esta cuenta está registrada como ${ROLE_LABEL[u.role]}.`)
      return
    }

    if (u.password !== pass) {
      setErr('Contraseña incorrecta.')
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
            Evaluación institucional, autoevaluación y retroalimentación de clase en un solo lugar, conectado a PostgreSQL.
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
            <h2 className="font-serif text-4xl text-pine">
              {firstUser ? 'Crear administrador' : 'Iniciar sesión'}
            </h2>
            {!firstUser && (
              <p className="mt-1 text-xs text-ink/60">
                Seleccione su rol institucional e ingrese con sus credenciales.
              </p>
            )}
          </div>

          {!firstUser && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                Rol institucional
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-paper/60 p-1.5 sm:grid-cols-4">
                {([
                  { id: 'estudiante', label: 'Estudiante' },
                  { id: 'docente', label: 'Docente' },
                  { id: 'coordinador', label: 'Coordinador' },
                  { id: 'admin', label: 'Administrador' },
                ] as const).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedRole(r.id); setErr('') }}
                    className={`rounded-md py-2 px-1 text-center text-xs font-medium transition-all ${
                      selectedRole === r.id
                        ? 'bg-pine text-white shadow-sm ring-1 ring-pine'
                        : 'text-ink/70 hover:bg-white hover:text-pine'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

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

/* ---------- Cuentas ---------- */
function Accounts({ me }: { me: User }) {
  const db = useDB()
  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    role: 'estudiante' as Role,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<User | null>(null)
  const roles: Role[] = me.role === 'admin' ? ['admin', 'directivo', 'coordinador', 'docente', 'estudiante'] : ['docente', 'estudiante']
  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim() || !f.email.trim() || !f.password) return setMsg({ kind: 'err', text: 'Todos los campos son obligatorios.' })
    if (db.users.some((u) => u.email.toLowerCase() === f.email.trim().toLowerCase())) return setMsg({ kind: 'err', text: 'Ya existe un usuario con ese correo.' })
    try {
      await actions.createUser({ ...f, email: f.email.trim() })
      setMsg({ kind: 'ok', text: `Cuenta de ${f.name} creada exitosamente en PostgreSQL.` })
      setF({ name: '', email: '', password: '', role: f.role, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al crear cuenta.' })
    }
  }
  const list = db.users.filter((u) => (u.name + u.email + (u.sede || '') + (u.carrera || '')).toLowerCase().includes(search.toLowerCase()))
  return (
    <>
      <Header title="Cuentas de usuario" sub="Crear nuevas cuentas y dar de baja las existentes." />
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
            <Field label="Sede institucional">
              <select className={input} value={f.sede} onChange={(e) => setF({ ...f, sede: e.target.value })}>
                <option value="Sede Facatativá">Sede Facatativá</option>
                <option value="Sede Fusagasugá">Sede Fusagasugá</option>
                <option value="Sede Chía">Sede Chía</option>
                <option value="Sede Girardot">Sede Girardot</option>
                <option value="Sede Soacha">Sede Soacha</option>
                <option value="Sede Ubaté">Sede Ubaté</option>
                <option value="Sede Zipaquirá">Sede Zipaquirá</option>
              </select>
            </Field>
            <Field label="Carrera / Programa">
              <select className={input} value={f.carrera} onChange={(e) => setF({ ...f, carrera: e.target.value })}>
                <option value="Ingeniería de Sistemas y Computación">Ingeniería de Sistemas y Computación</option>
                <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                <option value="Ingeniería Ambiental">Ingeniería Ambiental</option>
                <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
                <option value="Administración de Empresas">Administración de Empresas</option>
                <option value="Contaduría Pública">Contaduría Pública</option>
                <option value="Psicología">Psicología</option>
              </select>
            </Field>
            {msg && <Msg {...msg} />}
            <button className={btn}>Crear cuenta</button>
          </form>
        </Card>
        <Card className="p-0">
          <div className="border-b border-line p-4"><input className={input} placeholder="Buscar cuenta…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="p-4">Usuario</th>
                <th>Rol</th>
                <th>Sede / Carrera</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-ink/50">
                    <Users size={32} className="mx-auto mb-2 text-ink/30" />
                    No hay cuentas registradas. Crea una nueva desde el formulario.
                  </td>
                </tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="p-4">
                      <div className="font-medium">{u.name}</div>
                      <div className="font-mono text-xs text-ink/50">{u.email}</div>
                    </td>
                    <td>{ROLE_LABEL[u.role]}</td>
                    <td>
                      <div className="text-xs font-medium text-ink/80">{u.sede || 'Sede Facatativá'}</div>
                      <div className="text-xs text-ink/50">{u.carrera || 'Ingeniería de Sistemas y Computación'}</div>
                    </td>
                    <td><span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-moss/10 text-pine' : 'bg-red-50 text-red-700'}`}>{u.active ? 'Activa' : 'Bloqueada'}</span></td>
                    <td className="pr-4 text-right">
                      {u.active && u.id !== me.id && (me.role === 'admin' || roles.includes(u.role)) && (
                        <button onClick={() => setConfirm(u)} className="rounded p-2 text-red-700 hover:bg-red-50" title="Eliminar cuenta"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <Card className="max-w-sm space-y-4">
            <h3 className="font-serif text-2xl">¿Eliminar la cuenta de {confirm.name}?</h3>
            <p className="text-sm text-ink/60">La cuenta quedará desactivada en PostgreSQL y no podrá iniciar sesión.</p>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setConfirm(null)}>Cancelar</button>
              <button className={`${btn} bg-red-700 hover:bg-red-800`} onClick={async () => {
                try {
                  await actions.deactivateUser(confirm.id)
                  setConfirm(null)
                } catch (e) {
                  alert((e as Error).message || 'Error al eliminar usuario.')
                }
              }}>Eliminar</button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

/* ---------- Evaluaciones ---------- */
function FormsAdmin() {
  const db = useDB()
  const blank = { kind: '' as FormKind | '', title: '', description: '', period: '2026-I', cadiId: '', start: '', end: '', questions: [] as Question[] }
  const [f, setF] = useState(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [editingDates, setEditingDates] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const startEdit = (fm: Form) => {
    setEditingId(fm.id)
    setF({
      kind: fm.kind,
      title: fm.title,
      description: fm.description || '',
      period: fm.period,
      cadiId: fm.cadiId || '',
      start: fm.start,
      end: fm.end,
      questions: fm.questions ? [...fm.questions] : [],
    })
    setMsg(null)
  }

  const cancelar = () => {
    setEditingId(null)
    setF(blank)
    setMsg(null)
  }

  const save = async () => {
    if (!f.kind) return setMsg({ kind: 'err', text: 'Seleccione el tipo de evaluación antes de continuar.' })
    if (!f.title.trim() || !f.period.trim()) return setMsg({ kind: 'err', text: 'El título y el período son obligatorios.' })
    if (!f.start || !f.end) return setMsg({ kind: 'err', text: 'Defina la fecha y hora de inicio y cierre.' })
    if (f.end <= f.start) return setMsg({ kind: 'err', text: 'La fecha de cierre debe ser posterior a la de inicio.' })
    if (!f.questions.length) return setMsg({ kind: 'err', text: 'Agregue al menos una pregunta.' })

    setLoading(true)
    try {
      if (editingId) {
        await actions.updateForm(editingId, { ...f, kind: f.kind as FormKind, cadiId: f.cadiId || undefined })
        setMsg({ kind: 'ok', text: `Formulario "${f.title.trim()}" actualizado correctamente en PostgreSQL.` })
        cancelar()
      } else {
        await actions.createForm({ ...f, kind: f.kind as FormKind, cadiId: f.cadiId || undefined })
        setMsg({ kind: 'ok', text: 'Formulario guardado y registrado en PostgreSQL.' })
        setF(blank)
      }
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al procesar formulario.' })
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (fm: Form) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar la evaluación "${fm.title}" (${fm.period})? Esta acción removerá el formulario y todas sus preguntas asociadas de PostgreSQL.`
    )
    if (!confirmar) return

    setLoading(true)
    try {
      await actions.deleteForm(fm.id)
      if (editingId === fm.id) {
        cancelar()
      }
      setMsg({ kind: 'ok', text: `Evaluación "${fm.title}" eliminada correctamente de PostgreSQL.` })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al eliminar formulario.' })
    } finally {
      setLoading(false)
    }
  }

  return ( 
    <>
      <Header title="Evaluaciones y autoevaluaciones" sub="Crear formularios institucionales, asociar a CADIs, definir preguntas con dimensiones MEDIT y fechas de disponibilidad." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className={`space-y-4 ${editingId ? 'ring-2 ring-pine/30 transition-all' : ''}`}>
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              {editingId ? (
                <>
                  <Pencil size={18} className="text-pine" />
                  <span>Modificar formulario</span>
                </>
              ) : (
                <>
                  <Plus size={18} />
                  <span>Nuevo formulario</span>
                </>
              )}
            </h3>
            {editingId && (
              <span className="rounded-full bg-pine/10 px-2.5 py-0.5 text-xs font-semibold text-pine">
                Modo Edición
              </span>
            )}
          </div>
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
          <Field label="Título"><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ej. Evaluación docente 2026-I" /></Field>
          <Field label="CADI / Asignatura vinculada">
            <select className={input} value={f.cadiId} onChange={(e) => setF({ ...f, cadiId: e.target.value })}>
              <option value="">Evaluación general (Todos los CADIs)</option>
              {db.cadis.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Descripción"><input className={input} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Breve descripción o instrucciones" /></Field>
            <Field label="Período"><input className={input} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })} placeholder="2026-I" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Inicio"><input type="datetime-local" className={input} value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field>
            <Field label="Cierre"><input type="datetime-local" className={input} value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">Preguntas ({f.questions.length})</span>
            {f.questions.map((q, i) => (
              <div key={q.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 font-mono text-ink/40">{i + 1}.</span>{q.text} 
                  <span className="ml-1 text-xs text-ochre">[{TYPE_LABEL[q.type]}]</span>
                  {q.dimension && <span className="ml-1 rounded bg-paper px-1.5 py-0.5 text-xs text-pine font-medium">{q.dimension}</span>}
                </span>
                <button type="button" onClick={() => setF({ ...f, questions: f.questions.filter((x) => x.id !== q.id) })} className="text-ink/40 hover:text-red-600 transition-colors" title="Quitar pregunta"><X size={14} /></button>
              </div>
            ))}
            <QuestionEditor onAdd={(q) => setF({ ...f, questions: [...f.questions, q] })} />
          </div>
          {msg && <Msg {...msg} />}
          <div className="flex items-center gap-2 pt-2">
            <button className={btn} onClick={save} disabled={loading}>
              {editingId ? 'Actualizar formulario' : 'Guardar formulario'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelar} className={btnGhost} disabled={loading}>
                Cancelar edición
              </button>
            )}
          </div>
        </Card>
        <div className="space-y-3">
          {db.forms.length === 0 ? (
            <Empty text="No hay evaluaciones registradas. Crea una nueva desde el formulario superior." />
          ) : (
            db.forms.map((fm) => (
              <FormRow
                key={fm.id}
                fm={fm}
                isCurrent={editingId === fm.id}
                onEdit={startEdit}
                onDelete={eliminar}
                editingDates={editingDates === fm.id}
                setEditingDates={(b) => setEditingDates(b ? fm.id : null)}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}

function FormRow({
  fm,
  isCurrent,
  onEdit,
  onDelete,
  editingDates,
  setEditingDates,
}: {
  fm: Form
  isCurrent: boolean
  onEdit: (f: Form) => void
  onDelete: (f: Form) => void
  editingDates: boolean
  setEditingDates: (b: boolean) => void
}) {
  const db = useDB()
  const [s, setS] = useState(fm.start)
  const [e, setE] = useState(fm.end)
  const [err, setErr] = useState('')
  const n = db.formResponses.filter((r) => r.formId === fm.id).length
  const open = isOpen(fm.start, fm.end)
  const cadi = db.cadis.find((c) => c.id === fm.cadiId)

  return (
    <Card className={`space-y-3 transition-all ${isCurrent ? 'ring-2 ring-pine/40 bg-pine/5' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ochre">
              {fm.kind === 'evaluacion' ? 'Evaluación docente' : 'Autoevaluación'} · {fm.period}
            </span>
            {cadi && (
              <span className="rounded bg-paper px-1.5 py-0.5 text-[11px] font-mono text-pine font-medium border border-line">
                {cadi.codigo} — {cadi.nombre}
              </span>
            )}
          </div>
          <h4 className="font-serif text-2xl text-pine">{fm.title}</h4>
          {fm.description && <p className="text-xs text-ink/70">{fm.description}</p>}
          <p className="text-xs text-ink/50">{fm.questions.length} preguntas · {n} respuestas registradas</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${open ? 'bg-moss/20 text-pine font-semibold' : 'bg-paper text-ink/60'}`}>
            {open ? 'Abierta' : 'Cerrada'}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(fm)}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                isCurrent ? 'bg-pine text-white' : 'text-pine hover:bg-pine/10'
              }`}
              title="Editar formulario y preguntas"
            >
              <Pencil size={13} />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => onDelete(fm)}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              title="Eliminar formulario"
            >
              <Trash2 size={13} />
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-line/60 pt-2">
        {!editingDates ? (
          <button className="flex items-center gap-2 text-xs text-ink/70 hover:text-pine transition-colors" onClick={() => setEditingDates(true)} title="Ajustar fechas de disponibilidad">
            <CalendarClock size={14} /><span>{fmt(fm.start)} → {fmt(fm.end)}</span>
          </button>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <input type="datetime-local" className={input} value={s} onChange={(x) => setS(x.target.value)} />
              <input type="datetime-local" className={input} value={e} onChange={(x) => setE(x.target.value)} />
            </div>
            {err && <Msg kind="err" text={err} />}
            <div className="flex gap-2">
              <button className={`${btn} py-1 text-xs`} onClick={() => {
                if (e <= s) return setErr('La fecha de cierre es anterior a la de inicio.')
                actions.setFormDates(fm.id, s, e); setEditingDates(false)
              }}>Guardar fechas</button>
              <button className={`${btnGhost} py-1 text-xs`} onClick={() => setEditingDates(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
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
      <Header title="Resultados de evaluación" sub="Resultados consolidados por evaluación, docente o período." />
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
    { label: 'CADIs registrados', v: db.cadis.length },
    { label: 'Evaluaciones', v: evals.length },
    { label: 'Respuestas totales', v: db.formResponses.length },
  ]
  const rows = teachers.map((t) => ({ t, s: stats(db, formId, t.id) })).filter((r) => r.s?.responses.length)
  const autoDone = autos.map((a) => ({ a, n: new Set(db.formResponses.filter((r) => r.formId === a.id).map((r) => r.userId)).size }))
  const formActual = db.forms.find((f) => f.id === formId)
  const globalStats = formActual ? stats(db, formId) : null

  return (
    <>
      <Header title="Estadísticas y reportes" sub="Promedios, comparativos, dimensiones del MEDIT y participación." />
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        {kpis.map((k) => <div key={k.label} className="bg-white p-5"><p className="font-serif text-5xl text-pine">{k.v}</p><p className="text-xs uppercase tracking-wider text-ink/50">{k.label}</p></div>)}
      </div>

      {globalStats && Object.keys(globalStats.porDimension).length > 0 && (
        <Card className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-pine flex items-center gap-2"><Layers size={18} />Desempeño Global por Dimensiones MEDIT</h3>
            <span className="font-mono text-xs text-ochre">{formActual?.title}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(globalStats.porDimension).map(([dim, data]) => (
              <Bar key={dim} label={`${dim} (${data.count} preguntas)`} value={data.avg} />
            ))}
          </div>
        </Card>
      )}

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
  const cadiArticulador = db.cadis.find((c) => c.esArticulador)

  return (
    <>
      <Header title="Reporte de mejora docente" sub="Fortalezas, oportunidades de mejora, ponderación del 20% y dimensiones del MEDIT." />
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-60 flex-1"><Filters kind="evaluacion" formId={formId} setFormId={(v) => { setFormId(v); setGenerated(false) }} teacherId={teacherId} setTeacherId={(v) => { setTeacherId(v); setGenerated(false) }} /></div>
      </div>
      <button className={`${btn} mb-6`} onClick={() => setGenerated(true)} disabled={!teacherId}><FileText size={16} />Generar reporte</button>
      {generated && (!s || !s.responses.length ? <Empty text="No hay datos suficientes para generar el reporte." /> : (
        <Card className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ochre">{s.form.title}</p>
              <h2 className="font-serif text-4xl">{teacher?.name}</h2>
              <p className="mt-1 text-xs text-ink/50">Docente / Gestor del conocimiento · Facultad de Ingeniería (Facatativá)</p>
            </div>
            <div className="text-right">
              <p className="font-serif text-5xl text-pine">{s.overall.toFixed(2)}</p>
              <p className="text-xs text-ink/50">{s.responses.length} evaluaciones recibidas</p>
            </div>
          </div>

          {/* Tarjetas de Ponderación Oficial PGC (Numeral 13 Lineamientos UdeC) */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-line bg-pine/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-pine">Calificación Cuantitativa</p>
              <p className="font-serif text-3xl font-bold text-pine">{s.overall.toFixed(2)} <span className="text-sm font-normal text-ink/50">/ 5.00</span></p>
              <p className="mt-1 text-xs text-ink/60">Escala de evaluación institucional</p>
            </div>
            <div className="rounded-lg border border-ochre/30 bg-ochre/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ochre">Ponderación PGC (20%)</p>
              <p className="font-serif text-3xl font-bold text-ochre">{s.pgcPonderado20.toFixed(2)} <span className="text-sm font-normal text-ink/50">/ 1.00 pts</span></p>
              <p className="mt-1 text-xs text-ink/60">Numeral 13 Lineamientos PGC UdeC</p>
            </div>
            <div className="rounded-lg border border-line bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">CADI Articulador</p>
              <p className="font-serif text-lg font-bold text-pine">{cadiArticulador?.nombre || 'Programación II'}</p>
              <p className="mt-1 text-xs text-ink/60">Semestre III · Ciclo I Fundamentación</p>
            </div>
          </div>

          {/* Desglose por dimensiones MEDIT */}
          {Object.keys(s.porDimension).length > 0 && (
            <div className="space-y-3 rounded-lg border border-line bg-paper/50 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-pine"><Layers size={17} />Desglose por Dimensiones del MEDIT</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(s.porDimension).map(([dim, data]) => (
                  <Bar key={dim} label={`${dim} (${data.count} preg.)`} value={data.avg} />
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="font-semibold text-moss">Fortalezas detectadas (≥ 4.0)</h3>
              {s.perQ.filter((p) => p.avg >= 4).map((p) => <Bar key={p.question.id} label={p.question.text} value={p.avg} />)}
              {!s.perQ.some((p) => p.avg >= 4) && <p className="text-sm text-ink/50">Sin ítems con promedio ≥ 4.</p>}
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-red-700">Oportunidades de mejora (&lt; 3.5)</h3>
              {s.perQ.filter((p) => p.avg < 3.5 && p.n).map((p) => <Bar key={p.question.id} label={p.question.text} value={p.avg} />)}
              {!s.perQ.some((p) => p.avg < 3.5 && p.n) && <p className="text-sm text-ink/50">Sin ítems por debajo de 3.5.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Observaciones cualitativas de estudiantes</h3>
            {s.responses.filter((r) => r.observation).map((r) => <p key={r.id} className="border-l-2 border-ochre pl-3 font-serif text-lg">“{r.observation}”</p>)}
          </div>
          <p className="rounded-md bg-paper p-3 text-sm">Autoevaluación del docente: {auto.length ? `respondida (${auto.length})` : 'pendiente por parte del docente.'}</p>
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
  const [questions, setQuestions] = useState<Question[]>([])
  const [start, setStart] = useState(
    () =>
      new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
  )
  const [end, setEnd] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState<string | null>(null)

  // CADIs / asignaturas asignadas a este docente
  const myCadis = db.cadis.filter((c) => c.docenteId === me.id)
  const mine = db.feedbacks.filter((f) => f.teacherId === me.id)

  const save = async () => {
    if (!course.trim()) {
      return setMsg({ kind: 'err', text: 'Indique o seleccione el curso o materia asignada.' })
    }
    if (questions.length === 0) {
      return setMsg({ kind: 'err', text: 'Debe agregar al menos una pregunta antes de guardar la retroalimentación.' })
    }
    if (!end || end <= start) {
      return setMsg({ kind: 'err', text: 'La fecha de cierre debe ser posterior a la de inicio.' })
    }

    setLoading(true)
    try {
      await actions.createFeedback({
        teacherId: me.id,
        course,
        questions,
        start,
        end,
      })
      setQuestions([])
      setCourse('')
      setEnd('')
      setMsg({
        kind: 'ok',
        text: `Retroalimentación registrada con éxito (${questions.length} ${questions.length === 1 ? 'pregunta asociada guardada' : 'preguntas asociadas guardadas'}).`,
      })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al guardar la retroalimentación.' })
    } finally {
      setLoading(false)
    }
  }

  const current = mine.find((f) => f.id === sel)
  const resp = db.feedbackResponses.filter((r) => r.feedbackId === sel)

  return (
    <>
      <Header
        title="Retroalimentación de clase"
        sub="Pregunte a sus estudiantes cómo les fue en la clase y consulte sus respuestas."
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Plus size={18} />Crear retroalimentación de aula
          </h3>

          <Field label="Curso / Clase (CADIs asignados)">
            <select
              className={input}
              value={course}
              onChange={(e) => {
                setCourse(e.target.value)
                setMsg(null)
              }}
            >
              <option value="">Seleccione una asignatura asignada...</option>
              {myCadis.map((c) => (
                <option key={c.id} value={`${c.nombre} (${c.semestre}° Semestre)`}>
                  {c.nombre} ({c.semestre}° Semestre)
                </option>
              ))}
            </select>
          </Field>
          {myCadis.length === 0 && (
            <p className="text-xs text-ochre">
              Aviso: Actualmente no tiene CADIs asignados a su cuenta docente.
            </p>
          )}

          <div className="space-y-2 rounded-lg border border-line bg-paper/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/70">
              Formular nueva pregunta
            </p>
            <QuestionEditor
              hideDimension
              defaultDimension="Retroalimentación de Aula"
              onAdd={(newQ) => {
                setQuestions((prev) => [...prev, newQ])
                setMsg(null)
              }}
            />
          </div>

          {questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-pine font-medium">
                  Preguntas añadidas a este curso ({questions.length})
                </span>
                <span className="text-xs text-ink/50">Puede retirar preguntas pulsando la X</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {questions.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border border-line bg-white p-3 text-sm shadow-xs transition-colors hover:border-pine/40"
                  >
                    <div className="space-y-0.5 pr-2">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs font-bold text-pine">#{idx + 1}</span>
                        <span className="font-medium text-ink leading-tight">{item.text}</span>
                      </div>
                      <div className="text-xs text-ochre font-mono pl-5">
                        Tipo: {TYPE_LABEL[item.type]}
                        {item.options && item.options.length > 0 ? ` (${item.options.join(', ')})` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== item.id))}
                      className="rounded p-1 text-ink/40 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                      title="Eliminar pregunta"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Disponible desde">
              <input
                type="datetime-local"
                className={input}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Field>
            <Field label="Hasta">
              <input
                type="datetime-local"
                className={input}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Field>
          </div>

          {msg && <Msg {...msg} />}
          <button className={btn} onClick={save} disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar retroalimentación'}
          </button>
        </Card>

        <div className="space-y-3">
          <h3 className="font-semibold text-pine">Historial de retroalimentaciones</h3>
          {!mine.length && <Empty text="Aún no ha creado retroalimentaciones." />}
          {mine.map((f) => {
            const n = db.feedbackResponses.filter((r) => r.feedbackId === f.id).length
            return (
              <button
                key={f.id}
                onClick={() => setSel(f.id === sel ? null : f.id)}
                className={`block w-full rounded-lg border bg-white p-4 text-left transition-all ${
                  sel === f.id ? 'border-pine ring-1 ring-pine' : 'border-line hover:border-pine'
                }`}
              >
                <div className="flex justify-between text-xs text-ink/50">
                  <span className="font-medium text-ink/70">{f.course}</span>
                  <span>{isOpen(f.start, f.end) ? 'Abierta' : 'Cerrada'} · {n} resp.</span>
                </div>
                <p className="mt-1 font-serif text-xl">{f.question?.text || 'Pregunta sin texto'}</p>
                {f.question && (
                  <p className="mt-1 text-xs text-ochre font-mono">
                    {TYPE_LABEL[f.question.type]}
                  </p>
                )}
              </button>
            )
          })}
          {current && current.question && (
            <Card className="space-y-3">
              <h3 className="font-semibold">Respuestas · {current.course}</h3>
              <p className="text-sm font-medium text-ink/80">{current.question.text}</p>
              {!resp.length ? (
                <Empty text="Todavía no hay respuestas registradas." />
              ) : current.question.type === 'texto' ? (
                resp.map((r) => (
                  <p key={r.id} className="border-l-2 border-ochre pl-3 text-sm italic">
                    “{r.value}”
                  </p>
                ))
              ) : (
                (current.question.type === 'escala' ? ['1', '2', '3', '4', '5'] : current.question.options).map(
                  (o) => (
                    <Bar
                      key={o}
                      label={o}
                      value={resp.filter((r) => r.value === o).length}
                      max={resp.length}
                    />
                  )
                )
              )}
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
          <p className="mb-1 font-semibold">Observaciones</p>
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
      <Header title="Autoevaluación" sub="Reflexione sobre su propio desempeño docente." />
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
      <Header title="Evaluación docente" sub="Valore el desempeño de sus docentes. Sus respuestas son confidenciales." />
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
            {teachers.map((t) => {
              const rep = getTeacherReputation(db, t.id)
              return (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-pine">{t.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${rep.badgeClass}`}
                      title={`Promedio histórico: ${rep.avg || '—'} (${rep.totalResponses} evaluaciones)`}
                    >
                      {rep.label}
                    </span>
                  </div>
                  {done(f.id, t.id) ? (
                    <span className="flex items-center gap-1 text-sm text-moss font-medium"><Check size={16} />Respondida</span>
                  ) : (
                    <button className={btnGhost} disabled={!isOpen(f.start, f.end)} onClick={() => { setOk(false); setSel({ formId: f.id, teacherId: t.id }) }}>Evaluar</button>
                  )}
                </div>
              )
            })}
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
      <Header title="Retroalimentación de clase" sub="Cuéntele a su docente cómo le pareció la clase." />
      {!db.feedbacks.length && <Empty text="No hay retroalimentaciones disponibles." />}
      <div className="grid gap-4 md:grid-cols-2">
        {db.feedbacks.map((f) => {
          if (!f.question) return null
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


/* ---------- OBJETIVO 1 · Normativa, Lineamientos PGC y MEDIT ---------- */
function NormativaView() {
  const [tab, setTab] = useState<'lineamientos' | 'medit' | 'calificacion' | 'limitaciones'>('lineamientos')

  return (
    <div className="space-y-6">
      <Header
        title="Normativa, Lineamientos PGC y MEDIT"
        sub="Marco institucional de la Universidad de Cundinamarca, dimensiones formativas del MEDIT, ponderación del 20% y superación de limitaciones del método tradicional."
      />

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {[
          { id: 'lineamientos', label: 'Marco Normativo UdeC', icon: BookOpen },
          { id: 'medit', label: 'Dimensiones MEDIT', icon: Layers },
          { id: 'calificacion', label: 'CADI Articulador y 20%', icon: Award },
          { id: 'limitaciones', label: 'Limitaciones vs. SIARD', icon: ScaleIcon },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-pine text-white shadow-sm' : 'border border-line bg-white text-ink/70 hover:border-pine'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lineamientos' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-pine">
            <h3 className="font-serif text-2xl text-pine">Lineamientos de Gestión del Conocimiento (PGC)</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Aprobados formalmente mediante el <b>Acta No. 07 del 2023-07-07 del Consejo de Facultad de Ingeniería</b> de la 
              Universidad de Cundinamarca. Establece los procesos de formación en investigación como estrategia activa orientada desde los 
              Campos de Aprendizaje Disciplinares (CADIs) y articulada con los semilleros y grupos de investigación institucionales.
            </p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-3">
              <span className="rounded-full bg-ochre/15 px-3 py-1 font-mono text-xs font-semibold text-ochre">Acuerdo 09 de 2021 (Consejo Académico)</span>
              <h4 className="font-serif text-xl">Líneas de Investigación Translocales</h4>
              <p className="text-sm text-ink/70">Todos los PGC de la Facultad de Ingeniería deben responder a una de las tres líneas oficiales:</p>
              <ul className="space-y-2 text-sm text-ink/80">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-moss shrink-0" />
                  <span><b>1.</b> Aprendizaje, conocimiento, tecnologías, comunicación y digitalización.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-moss shrink-0" />
                  <span><b>2.</b> Gestión, emprendimiento, organizaciones sociales del conocimiento y aprendizaje.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-moss shrink-0" />
                  <span><b>3.</b> Transmodernidad, naturaleza, ambiente, biodiversidad, ancestralidad y familia.</span>
                </li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <span className="rounded-full bg-moss/15 px-3 py-1 font-mono text-xs font-semibold text-pine">Estructura por Ciclos</span>
              <h4 className="font-serif text-xl">Ruta de Formación Investigativa</h4>
              <div className="space-y-3 text-sm">
                <div className="rounded border border-line bg-paper/50 p-2.5">
                  <p className="font-semibold text-pine">Ciclo I · Fundamentación (I a III Semestre)</p>
                  <p className="text-xs text-ink/60">Análisis de necesidades en la región, bases de datos y radicación ante el CADI Articulador en III Semestre.</p>
                </div>
                <div className="rounded border border-line bg-paper/50 p-2.5">
                  <p className="font-semibold text-pine">Ciclo II · Profundización (IV a VI Semestre)</p>
                  <p className="text-xs text-ink/60">Vinculación a semilleros de investigación, observaciones del comité y consolidación metodológica (CDIO).</p>
                </div>
                <div className="rounded border border-line bg-paper/50 p-2.5">
                  <p className="font-semibold text-pine">Ciclo III · Investigación-Producción (VII a IX Semestre)</p>
                  <p className="text-xs text-ink/60">Asignación de director por el comité para conversión en trabajo de grado y vinculación a grupos de investigación.</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="space-y-3 bg-paper">
            <h4 className="font-serif text-xl text-pine">Comité Evaluador de Ciclo (Sede Facatativá · Período 2025-2 / 2026-I)</h4>
            <p className="text-sm text-ink/70">
              Encargado de recibir, aceptar, hacer seguimiento, asesorar y evaluar los PGC (Numeral 3 de los lineamientos):
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs">
              <div className="rounded bg-white p-2.5 border border-line"><b>Oscar Morera</b> (Programación II · Articulador)</div>
              <div className="rounded bg-white p-2.5 border border-line"><b>Francisco Lanza</b> (Comité PGC)</div>
              <div className="rounded bg-white p-2.5 border border-line"><b>Angélica Bravo</b> (Evaluadora Fundamentación)</div>
              <div className="rounded bg-white p-2.5 border border-line"><b>Jaime Parra</b> (Dir. Ingeniería de Sistemas)</div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'medit' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-moss">
            <h3 className="font-serif text-2xl text-pine">Modelo Educativo Digital Transmoderno (MEDIT)</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              El MEDIT orienta el quehacer pedagógico hacia el diálogo constructivo y formativo entre <b>gestores del conocimiento</b> (docentes) 
              y <b>agentes transformadores</b> (estudiantes). La evaluación en SIARD-UdeC está estructurada en torno a sus 4 dimensiones cardinales:
            </p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: '1. Dimensión Pedagógica y Didáctica',
                color: 'border-pine',
                desc: 'Adopción de metodologías activas como CDIO (Concebir, Diseñar, Implementar, Operar) en proyectos de ingeniería, acompañamiento dialógico y cumplimiento de los acuerdos de aprendizaje.',
                criterios: ['Uso del enfoque CDIO en proyectos tecnológicos.', 'Construcción dialógica y formativa del saber.', 'Cumplimiento de compromisos acordados.'],
              },
              {
                title: '2. Dimensión Disciplinar e Investigativa',
                color: 'border-moss',
                desc: 'Dominio conceptual y tecnológico del CADI, articulación de saberes de ciencias básicas e ingeniería con la investigación formativa, grupos y semilleros institucionales.',
                criterios: ['Solidez conceptual en ingeniería de software.', 'Articulación con semilleros de investigación.', 'Solución rigurosa a problemáticas del entorno.'],
              },
              {
                title: '3. Dimensión Relacional y Comunicación Asertiva',
                color: 'border-ochre',
                desc: 'Creación de un clima de aula basado en el respeto, la escucha activa, la retroalimentación constructiva continua y la confianza mutua entre estudiante y docente.',
                criterios: ['Retroalimentación oportuna en cada corte.', 'Comunicación abierta, respetuosa y transparente.', 'Resolución dialogada de inquietudes.'],
              },
              {
                title: '4. Dimensión Ética y Transmoderna',
                color: 'border-red-600',
                desc: 'Compromiso social con el entorno local y translocal, rigurosidad académica, confidencialidad en la evaluación, honestidad y control de plagio (Numeral 15 de los lineamientos).',
                criterios: ['Garantía estricta de confidencialidad y anonimato.', 'Responsabilidad social y ambiental.', 'Cero tolerancia al plagio académico.'],
              },
            ].map((d) => (
              <Card key={d.title} className={`border-t-4 ${d.color} space-y-3`}>
                <h4 className="font-serif text-lg font-semibold">{d.title}</h4>
                <p className="text-sm text-ink/70">{d.desc}</p>
                <div className="border-t border-line pt-2">
                  <p className="text-xs font-semibold uppercase text-ink/50">Criterios aplicados en SIARD:</p>
                  <ul className="mt-1 space-y-1 text-xs text-ink/70">
                    {d.criterios.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'calificacion' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-ochre">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-ochre">Numeral 13 de los Lineamientos Oficiales</span>
                <h3 className="font-serif text-2xl text-pine">Ponderación del 20% en el CADI Articulador</h3>
                <p className="mt-1 text-sm text-ink/80">
                  "La calificación del PGC corresponderá al <b>20% de la nota final</b> del CADI o Núcleo temático Articulador que esté cursando el constructor del conocimiento."
                </p>
              </div>
              <div className="rounded-lg bg-pine p-4 text-center text-paper">
                <p className="font-serif text-4xl font-bold">20%</p>
                <p className="text-xs text-paper/70">Aporte a nota final</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-4">
              <h4 className="font-serif text-xl">CADIs Articuladores Oficiales (Pág. 7 del Documento)</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-ink/50">
                    <th className="pb-2">Semestre</th>
                    <th className="pb-2">Ing. Sistemas y Computación</th>
                    <th className="pb-2">Ing. Software / Industrial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr className="bg-moss/10 font-medium">
                    <td className="py-2.5">Semestre III (Ciclo I)</td>
                    <td className="py-2.5 text-pine font-semibold">Programación II ★</td>
                    <td className="py-2.5">Programación II</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Semestre VI (Ciclo II)</td>
                    <td className="py-2.5">Ingeniería del Software II</td>
                    <td className="py-2.5">Profundización</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Semestre IX (Ciclo III)</td>
                    <td className="py-2.5">Línea de Profundización</td>
                    <td className="py-2.5">Profundización</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-ink/60">
                ★ <b>Numeral 5:</b> En la propuesta se deben relacionar mínimo <b>2 CADIs de diferentes líneas de saberes</b> (ej. Programación II + Bases de Datos).
              </p>
            </Card>

            <Card className="space-y-3">
              <h4 className="font-serif text-xl">Cronograma Oficial de Evaluación PGC</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-ochre">Semana 5</span>
                  <div><b>Radicación de Propuesta (Ciclo I)</b><br />Entrega formal ante el CADI Articulador y Comité Evaluador.</div>
                </div>
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-ochre">Semana 10</span>
                  <div><b>Segundo Informe de Avance</b><br />Evidencia de un proceso estricto de ingeniería (CDIO) o investigación.</div>
                </div>
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-ochre">Semana 12</span>
                  <div><b>Sustentaciones del PGC</b><br />Exposición del prototipo ante el Comité Evaluador de Ciclo.</div>
                </div>
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-pine">Semana 14</span>
                  <div><b>Publicación de Calificación Final</b><br />Promedio consolidado del comité, equivalente al 20% de la nota final.</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'limitaciones' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-2xl text-pine">Superación de Limitaciones del Método Tradicional</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              En concordancia con el <b>Objetivo Específico 1</b> de la propuesta, la plataforma SIARD-UdeC analiza y supera 
              directamente los cuellos de botella identificados en la evaluación docente convencional:
            </p>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="p-4">Criterio / Factor</th>
                  <th className="p-4 text-red-700">Limitación Método Actual UdeC</th>
                  <th className="p-4 text-pine">Solución Implementada SIARD-UdeC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                <tr>
                  <td className="p-4 font-semibold">Momento de Aplicación</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Se realiza únicamente en la semana 16, cuando el periodo ya finalizó. No permite mejoras durante el semestre.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Evaluación flexible + Retroalimentación de aula:</b> El docente lanza preguntas cortas en cualquier momento para medir el avance real de sus clases.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Estructura del Cuestionario</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Preguntas estáticas, rígidas e invariables que no se adaptan al tipo de proyecto ni al CADI.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Cuestionarios dinámicos:</b> Parametrizables por período, con preguntas de escala, selección múltiple y texto asociadas a dimensiones MEDIT.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Finalidad de la Calificación</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Enfoque puramente cuantitativo y punitivo, sin retroalimentación cualitativa útil para el profesor.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Reporte Formativo de Mejora Docente:</b> Identifica automáticamente fortalezas (≥4.0), oportunidades de mejora (&lt;3.5) y observaciones formativas.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Comunicación y Confianza</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Falta de canal formal y asertivo; temor de los estudiantes a represalias si expresan inconformidades.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Canal asertivo y confidencial:</b> Observaciones cualitativas (límite 500 caracteres) protegidas para salvaguardar el anonimato ético.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Autoevaluación Docente</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Trámite administrativo desconectado de la percepción de los estudiantes en los proyectos.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Cruce dialógico:</b> Contraste entre la autoevaluación del gestor y la evaluación de los agentes transformadores en un solo informe.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- GESTIÓN DE CADIS Y NÚCLEOS TEMÁTICOS ---------- */
function CadisView() {
  const db = useDB()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cod, setCod] = useState('')
  const [nom, setNom] = useState('')
  const [sem, setSem] = useState('3')
  const [docId, setDocId] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const docentes = db.users.filter((u) => u.role === 'docente' && u.active)

  const cancelar = () => {
    setEditingId(null)
    setCod('')
    setNom('')
    setSem('3')
    setDocId('')
    setMsg(null)
  }

  const startEdit = (c: CADI) => {
    setEditingId(c.id)
    setCod(c.codigo)
    setNom(c.nombre)
    setSem(String(c.semestre))
    setDocId(c.docenteId || '')
    setMsg(null)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cod.trim() || !nom.trim()) return setMsg({ kind: 'err', text: 'Código y nombre son obligatorios.' })

    const codigoTrim = cod.trim().toUpperCase()
    const existe = db.cadis.some(
      (c) => c.codigo.toLowerCase() === codigoTrim.toLowerCase() && c.id !== editingId
    )
    if (existe) {
      return setMsg({ kind: 'err', text: 'Ya existe otro CADI con ese código.' })
    }

    setLoading(true)
    try {
      if (editingId) {
        await actions.updateCADI(editingId, {
          codigo: codigoTrim,
          nombre: nom.trim(),
          semestre: Number(sem),
          docenteId: docId || null,
        })
        setMsg({ kind: 'ok', text: `CADI "${nom.trim()}" actualizado correctamente en PostgreSQL.` })
        cancelar()
      } else {
        await actions.createCADI({
          codigo: codigoTrim,
          nombre: nom.trim(),
          semestre: Number(sem),
          docenteId: docId || undefined,
        })
        setMsg({ kind: 'ok', text: `CADI "${nom.trim()}" registrado correctamente en PostgreSQL.` })
        setCod(''); setNom(''); setDocId('')
      }
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al procesar CADI.' })
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (c: CADI) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar el CADI "${c.nombre}" (${c.codigo})? Esta acción removerá la materia de PostgreSQL.`)
    if (!confirmar) return

    setLoading(true)
    try {
      await actions.deleteCADI(c.id)
      if (editingId === c.id) {
        cancelar()
      }
      setMsg({ kind: 'ok', text: `CADI "${c.nombre}" eliminado correctamente de PostgreSQL.` })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al eliminar CADI.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header
        title="CADIs y Núcleos Temáticos"
        sub="Campos de Aprendizaje Disciplinares articulados a los PGC de la Facultad de Ingeniería (Sede Facatativá)."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className={editingId ? 'ring-2 ring-pine/30 transition-all' : ''}>
          <form onSubmit={guardar} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                {editingId ? (
                  <>
                    <Pencil size={18} className="text-pine" />
                    <span>Modificar CADI</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Registrar CADI / Materia</span>
                  </>
                )}
              </h3>
              {editingId && (
                <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">
                  Modo Edición
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Field label="Código"><input className={input} value={cod} onChange={(e) => setCod(e.target.value)} placeholder="SIS301" /></Field>
              <Field label="Semestre">
                <select className={input} value={sem} onChange={(e) => setSem(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => <option key={s} value={s}>{s}°</option>)}
                </select>
              </Field>
            </div>
            <Field label="Nombre del CADI"><input className={input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Programación II" /></Field>
            <Field label="Docente responsable">
              <select className={input} value={docId} onChange={(e) => setDocId(e.target.value)}>
                <option value="">Sin docente asignado</option>
                {docentes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            {msg && <Msg {...msg} />}
            <div className="flex items-center gap-2 pt-1">
              <button className={btn} disabled={loading}>
                {editingId ? 'Actualizar CADI' : 'Guardar CADI'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelar} className={btnGhost} disabled={loading}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-0">
          <div className="border-b border-line p-4">
            <p className="font-semibold">CADIs registrados en la Facultad</p>
            <p className="text-xs text-ink/60">Semestre III de Ingeniería de Sistemas y Computación (Facatativá)</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="p-4">Código / CADI</th>
                <th>Semestre</th>
                <th>Docente Asignado</th>
                <th className="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {db.cadis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm text-ink/50">
                    <Award size={32} className="mx-auto mb-2 text-ink/30" />
                    No hay materias o CADIs registrados. Registra uno nuevo desde el formulario.
                  </td>
                </tr>
              ) : (
                db.cadis.map((c) => {
                  const isCurrent = editingId === c.id
                  return (
                    <tr key={c.id} className={isCurrent ? 'bg-pine/5 font-medium' : undefined}>
                      <td className="p-4">
                        <div className="font-semibold text-pine">{c.nombre}</div>
                        <div className="font-mono text-xs text-ink/50">{c.codigo}</div>
                      </td>
                      <td>{c.semestre}° Semestre</td>
                      <td>
                        <select
                          className={`${input} py-1 text-xs`}
                          value={c.docenteId || ''}
                          onChange={(e) => actions.assignCadiTeacher(c.id, e.target.value || null)}
                        >
                          <option value="">Sin asignar</option>
                          {docentes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isCurrent
                                ? 'bg-pine text-white'
                                : 'text-pine hover:bg-pine/10'
                            }`}
                            title="Editar CADI"
                          >
                            <Pencil size={13} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(c)}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="Eliminar CADI"
                          >
                            <Trash2 size={13} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}

/* ---------- MÓDULO DIRECTIVO · CONSEJO DE FACULTAD / DECANATURA ---------- */
function DirectivoDashboard() {
  const db = useDB()
  const metrics = getFacultyGlobalMetrics(db)
  const [filterCadi, setFilterCadi] = useState<string>('')

  const filteredTeachers = metrics.teachers.filter(
    (item) => !filterCadi || item.cadi?.id === filterCadi
  )

  return (
    <div className="space-y-6">
      <Header
        title="Panel Directivo y Calidad Académica"
        sub="Monitoreo consolidado de la Facultad de Ingeniería (Sede Facatativá), participación estudiantil y ranking de reputación docente."
      />

      {/* Tarjetas KPI directivas */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-pine text-paper p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-paper/70">
            <span className="text-xs uppercase tracking-wider font-semibold">Promedio Facultad</span>
            <Building2 size={18} />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold">{metrics.overallAvg.toFixed(2)}</p>
            <p className="text-xs text-paper/60">sobre 5.00 institucional</p>
          </div>
          <div className="text-[11px] text-paper/70 border-t border-paper/15 pt-2">
            Consolidado histórico v_promedios
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-moss/30 bg-moss/5">
          <div className="flex items-center justify-between text-pine">
            <span className="text-xs uppercase tracking-wider font-semibold">Estudiantes Evaluadores</span>
            <Users size={18} />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold text-pine">{metrics.evaluatedStudents}</p>
            <p className="text-xs text-ink/60">estudiantes han participado</p>
          </div>
          <div className="text-[11px] text-ink/50 border-t border-line pt-2">
            Participación activa en el sistema
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-ochre/30 bg-ochre/5">
          <div className="flex items-center justify-between text-ochre">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Evaluaciones</span>
            <ClipboardList size={18} />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold text-ochre">{metrics.totalEvaluations}</p>
            <p className="text-xs text-ink/60">respuestas diligenciadas</p>
          </div>
          <div className="text-[11px] text-ink/50 border-t border-line pt-2">
            Evaluaciones y autoevaluaciones
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-line bg-paper">
          <div className="flex items-center justify-between text-pine">
            <span className="text-xs uppercase tracking-wider font-semibold">Docentes Destacados</span>
            <Star size={18} className="text-ochre" />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold text-pine">
              {metrics.topTeachersCount} <span className="text-2xl font-normal text-ink/40">/ {metrics.teachers.length}</span>
            </p>
            <p className="text-xs text-ink/60">con promedio ≥ 4.5</p>
          </div>
          <div className="text-[11px] text-ink/50 border-t border-line pt-2">
            {metrics.teachers.length > 0
              ? `${Math.round((metrics.topTeachersCount / metrics.teachers.length) * 100)}% de la planta docente`
              : 'Sin docentes'}
          </div>
        </Card>
      </div>

      {/* Lista de docentes ordenados por reputación */}
      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <h3 className="font-serif text-2xl text-pine">Ranking de Reputación Docente</h3>
            <p className="text-xs text-ink/60">Docentes ordenados por promedio general de calificación (de mayor a menor)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink/60 uppercase">Filtrar por CADI:</span>
            <select
              className={`${input} w-auto py-1.5 text-xs`}
              value={filterCadi}
              onChange={(e) => setFilterCadi(e.target.value)}
            >
              <option value="">Todos los CADIs</option>
              {db.cadis.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="p-4">Posición / Docente</th>
                <th>CADI / Asignatura</th>
                <th>Evaluaciones</th>
                <th>Promedio Histórico</th>
                <th>Reputación</th>
                <th className="p-4">Desempeño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {filteredTeachers.map((item, index) => (
                <tr key={item.teacher.id} className="hover:bg-paper/40 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-ochre text-white' : index === 1 ? 'bg-pine text-white' : 'bg-line text-ink/70'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-sm text-pine">{item.teacher.name}</p>
                        <p className="font-mono text-xs text-ink/50">{item.teacher.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {item.cadi ? (
                      <div>
                        <p className="font-medium">{item.cadi.nombre}</p>
                        <span className="text-[11px] text-ochre font-mono">
                          {item.cadi.esArticulador ? '★ CADI Articulador' : item.cadi.codigo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-ink/40">Sin CADI asignado</span>
                    )}
                  </td>
                  <td>
                    <span className="font-semibold">{item.totalResponses}</span>
                    <span className="text-ink/50"> recibidas</span>
                  </td>
                  <td>
                    <span className="font-serif text-lg font-bold text-pine">
                      {item.avg ? item.avg.toFixed(2) : '—'}
                    </span>
                    <span className="text-[11px] text-ink/50"> / 5.00</span>
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${item.badgeClass}`}>
                      {item.label}
                    </span>
                  </td>
                  <td className="p-4 w-44">
                    <div className="w-full">
                      <div className="h-2 w-full rounded-full bg-paper">
                        <div
                          className={`h-2 rounded-full ${
                            item.avg >= 4.5 ? 'bg-moss' : item.avg >= 4.0 ? 'bg-pine' : item.avg >= 3.0 ? 'bg-ochre' : 'bg-red-500'
                          }`}
                          style={{ width: `${(item.avg / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

/* ---------- Shell ---------- */
type View = { id: string; label: string; icon: typeof Users; render: (me: User) => ReactNode }
const VIEWS: Record<Role, View[]> = (() => {
  const normativaView: View = { id: 'normativa', label: 'Normativa y MEDIT', icon: BookOpen, render: () => <NormativaView /> }
  const cadisView: View = { id: 'cadis', label: 'CADIs y PGC', icon: Award, render: () => <CadisView /> }
  const directivoDashboardView: View = { id: 'directivo', label: 'Panel Directivo', icon: Building2, render: () => <DirectivoDashboard /> }
  const mgmt: View[] = [
    { id: 'cuentas', label: 'Cuentas', icon: Users, render: (me) => <Accounts me={me} /> },
    { id: 'formularios', label: 'Evaluaciones', icon: ClipboardList, render: () => <FormsAdmin /> },
    cadisView,
    directivoDashboardView,
    { id: 'resultados', label: 'Resultados', icon: BarChart3, render: () => <Results /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, render: () => <Statistics /> },
    { id: 'reporte', label: 'Reporte de mejora', icon: FileText, render: () => <Report /> },
    normativaView,
  ]
  return {
    admin: mgmt,
    directivo: [
      directivoDashboardView,
      { id: 'resultados', label: 'Resultados Facultad', icon: BarChart3, render: () => <Results /> },
      { id: 'estadisticas', label: 'Estadísticas Globales', icon: BarChart3, render: () => <Statistics /> },
      { id: 'reporte', label: 'Reportes de Mejora', icon: FileText, render: () => <Report /> },
      normativaView,
    ],
    coordinador: mgmt,
    docente: [
      { id: 'retro', label: 'Retroalimentación', icon: MessageSquare, render: (me) => <TeacherFeedback me={me} /> },
      { id: 'auto', label: 'Autoevaluación', icon: ClipboardList, render: (me) => <SelfEvaluation me={me} /> },
      normativaView,
    ],
    estudiante: [
      { id: 'eval', label: 'Evaluación docente', icon: ClipboardList, render: (me) => <StudentEvaluation me={me} /> },
      { id: 'retro', label: 'Retroalimentación', icon: MessageSquare, render: (me) => <StudentFeedback me={me} /> },
      normativaView,
    ],
  }
})()

export default function App() {
  const db = useDB()
  useEffect(() => {
    initDB()
  }, [])

  if (db.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-serif text-2xl text-pine">
        Conectando a PostgreSQL…
      </div>
    )
  }

  if (db.error && !db.connected) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-paper">
        <div className="max-w-md w-full space-y-4 rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="font-serif text-2xl text-pine">Conexión con PostgreSQL</h2>
          <Msg kind="err" text={db.error} />
          <p className="text-sm text-ink/70">
            Asegúrate de que el servicio de PostgreSQL esté en ejecución y que la variable <code className="bg-paper px-1 rounded font-mono text-xs">DATABASE_URL</code> en <code className="bg-paper px-1 rounded font-mono text-xs">.env.local</code> esté configurada con las credenciales de tu base de datos en pgAdmin.
          </p>
          <button
            type="button"
            onClick={() => initDB()}
            className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    )
  }

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
          </div>
        </div>
        <button className="m-3 flex items-center gap-2 text-xs md:hidden" onClick={() => { sessionStorage.removeItem('siard-me'); setMeId(null) }}><LogOut size={14} />Salir ({me.name})</button>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">{current.render(me)}</main>
    </div>
  )
}
