import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, CalendarClock, X } from 'lucide-react'
import {
  useDB,
  initDB,
  getCurrentUser,
  actions,
  isOpen,
  fmt,
  type Form,
  type FormKind,
  type Question,
  type User,
} from '../../store'
import {
  Header,
  Card,
  Field,
  Empty,
  Msg,
  QuestionEditor,
  TYPE_LABEL,
  input,
  btn,
  btnGhost,
} from '../common'

export function FormRow({
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
            {cadi ? (
              <span className="rounded bg-paper px-1.5 py-0.5 text-[11px] font-mono text-pine font-medium border border-line">
                {cadi.codigo} — {cadi.nombre}
              </span>
            ) : (
              <span className="rounded bg-paper px-1.5 py-0.5 text-[11px] font-mono text-pine font-medium border border-line">
                Evaluación general (Todos los CADIs / CAIs)
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
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDelete(fm)
              }}
              className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer"
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

export function FormsAdmin({ me }: { me?: User }) {
  const db = useDB()
  const activeUser = me || getCurrentUser()
  const blank = { kind: '' as FormKind | '', title: '', description: '', period: '2026-I', cadiId: '', start: '', end: '', questions: [] as Question[] }
  const [f, setF] = useState(blank)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [editingDates, setEditingDates] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    actions.fetchEvaluaciones().catch(() => initDB())
  }, [])

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
      questions: fm.questions ? fm.questions.map((q) => ({ ...q })) : [],
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
      let savedForm: Form | undefined
      if (editingId) {
        await actions.updateForm(editingId, { ...f, kind: f.kind as FormKind, cadiId: f.cadiId || undefined })
        setMsg({ kind: 'ok', text: `Formulario "${f.title.trim()}" actualizado correctamente en PostgreSQL.` })
        cancelar()
      } else {
        savedForm = await actions.createForm({ ...f, kind: f.kind as FormKind, cadiId: f.cadiId || undefined })
        if (savedForm && typeof localStorage !== 'undefined') {
          try {
            const guardadas = JSON.parse(localStorage.getItem('siard_evaluaciones') || '[]');
            const actualizadas = [savedForm, ...guardadas.filter((e: any) => e.id !== savedForm!.id)];
            localStorage.setItem('siard_evaluaciones', JSON.stringify(actualizadas));
          } catch {}
        }
        setMsg({ kind: 'ok', text: 'Formulario guardado y registrado en PostgreSQL.' })
        setF(blank)
      }
      await actions.fetchEvaluaciones()
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al procesar formulario.' })
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (fm: Form) => {
    if (editingId === fm.id) {
      cancelar()
    }
    try {
      await actions.deleteForm(fm.id)
      setMsg({ kind: 'ok', text: `Evaluación "${fm.title}" eliminada correctamente.` })
      await actions.fetchEvaluaciones()
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al eliminar formulario.' })
    }
  }

  // Colaboración institucional plena: admin y coordinador gestionan todas las evaluaciones sin exclusión
  const visibleForms = db.forms

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
              <div className="flex items-center gap-2">
                <span className="rounded bg-paper px-2 py-0.5 text-xs font-mono text-ink/70 border border-line" title="ID de la evaluación en PostgreSQL">
                  ID: {editingId}
                </span>
                <span className="rounded-full bg-pine/10 px-2.5 py-0.5 text-xs font-semibold text-pine">
                  Modo Edición
                </span>
              </div>
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
          <Field label="CADI / CAI / Asignatura vinculada">
            <select className={input} value={f.cadiId} onChange={(e) => setF({ ...f, cadiId: e.target.value })}>
              <option value="">Evaluación general (Todos los CADIs / CAIs)</option>
              {db.cadis.map((c) => (
                <option key={c.id} value={c.id}>{c.codigo} — {c.nombre} ({c.tipo || 'CADI'})</option>
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
                  {q.bloque && (
                    <span className="ml-1 rounded bg-pine/10 px-1.5 py-0.5 text-xs text-pine font-medium">
                      {q.bloque === 'docente' ? 'Bloque 1 (Docente)' : q.bloque === 'medit' ? 'Bloque 2 (MEDIT)' : 'Bloque 3 (Gestión)'}
                    </span>
                  )}
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
          {visibleForms.length === 0 ? (
            <Empty text="No hay evaluaciones registradas. Crea una nueva desde el formulario superior." />
          ) : (
            visibleForms.map((fm) => (
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
