import { useState, type ReactNode } from 'react'
import { Check, AlertCircle, Plus } from 'lucide-react'
import { uid, MEDIT_DIMENSIONES, type Question, type AnswerType, type BloquePregunta } from '../../store'

export const input = 'w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20'
export const btn = 'inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-semibold text-white hover:bg-moss disabled:opacity-40'
export const btnGhost = 'inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium hover:border-pine'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wider text-ink/60">{label}</span>
      {children}
    </label>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-white p-6 ${className}`}>{children}</div>
}

export function Msg({ kind, text }: { kind: 'ok' | 'err'; text: string }) {
  return (
    <p className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${kind === 'ok' ? 'bg-moss/10 text-pine' : 'bg-red-50 text-red-700'}`}>
      {kind === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
      {text}
    </p>
  )
}

export function Header({ req: _req, title, sub }: { req?: string; title: string; sub?: string }) {
  return (
    <header className="mb-6 border-b border-line pb-4">
      <h1 className="font-serif text-4xl text-pine">{title}</h1>
      {sub && <p className="mt-1 text-sm text-ink/60">{sub}</p>}
    </header>
  )
}

export function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-line p-8 text-center text-sm text-ink/50">{text}</p>
}

export function Scale({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {['1', '2', '3', '4', '5'].map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`h-10 w-10 rounded-full border text-sm font-semibold transition ${value === v ? 'border-pine bg-pine text-white' : 'border-line bg-white hover:border-pine'}`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function AnswerInput({ q, value, onChange }: { q: Question; value?: string; onChange: (v: string) => void }) {
  if (q.type === 'escala') return <Scale value={value} onChange={onChange} />
  if (q.type === 'seleccion') {
    return (
      <div className="flex flex-wrap gap-2">
        {q.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`rounded-full border px-4 py-1.5 text-sm ${value === o ? 'border-pine bg-pine text-white' : 'border-line bg-white hover:border-pine'}`}
          >
            {o}
          </button>
        ))}
      </div>
    )
  }
  return <textarea className={input} rows={3} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
}

export function Bar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const color = value >= 4 ? 'bg-moss' : value >= 3 ? 'bg-ochre' : 'bg-red-600'
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
      <span className="text-sm">{label}</span>
      <span className="font-mono text-sm font-semibold">{value ? value.toFixed(2) : '—'}</span>
      <div className="col-span-2 h-2 rounded-full bg-paper">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  )
}

export function QuestionEditor({
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
  const [bloque, setBloque] = useState<BloquePregunta>('docente')
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
      bloque,
    })
    setText('')
    setOpts('')
    setErr('')
  }

  return (
    <div className="space-y-3 rounded-md bg-paper p-4">
      <Field label="Enunciado">
        <input className={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escriba la pregunta…" />
      </Field>
      <div className={`grid gap-3 ${hideDimension ? (type === 'seleccion' ? 'sm:grid-cols-2' : 'sm:grid-cols-1') : 'sm:grid-cols-4'}`}>
        <Field label="Tipo de respuesta">
          <select className={input} value={type} onChange={(e) => setType(e.target.value as AnswerType)}>
            <option value="escala">Escala 1 – 5</option>
            <option value="seleccion">Selección</option>
            <option value="texto">Texto libre</option>
          </select>
        </Field>
        {!hideDimension && (
          <Field label="Bloque institucional">
            <select className={input} value={bloque} onChange={(e) => setBloque(e.target.value as BloquePregunta)}>
              <option value="docente">Bloque 1 · Desempeño Docente</option>
              <option value="medit">Bloque 2 · Modelo MEDIT</option>
              <option value="institucional">Bloque 3 · Recursos y Gestión</option>
            </select>
          </Field>
        )}
        {!hideDimension && (
          <Field label="Dimensión MEDIT">
            <select className={input} value={dimension} onChange={(e) => setDimension(e.target.value)}>
              {MEDIT_DIMENSIONES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
              <option value="General">General</option>
            </select>
          </Field>
        )}
        {type === 'seleccion' && (
          <Field label="Opciones (separadas por coma)">
            <input className={input} value={opts} onChange={(e) => setOpts(e.target.value)} placeholder="Sí, No, Parcialmente" />
          </Field>
        )}
      </div>
      {err && <Msg kind="err" text={err} />}
      <button type="button" className={btnGhost} onClick={add}>
        <Plus size={16} />Agregar pregunta
      </button>
    </div>
  )
}

export const TYPE_LABEL: Record<AnswerType, string> = { escala: 'Escala', seleccion: 'Selección', texto: 'Texto' }
