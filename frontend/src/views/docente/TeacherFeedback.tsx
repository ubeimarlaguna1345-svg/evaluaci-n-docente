import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  useDB,
  actions,
  isOpen,
  type User,
  type Question,
} from '../../store'
import {
  Header,
  Card,
  Field,
  Empty,
  Msg,
  Bar,
  QuestionEditor,
  TYPE_LABEL,
  input,
  btn,
} from '../common'

export function TeacherFeedback({ me }: { me: User }) {
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
