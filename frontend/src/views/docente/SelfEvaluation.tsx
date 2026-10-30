import { useState, useEffect, useMemo } from 'react'
import { CalendarClock, Check, Info, ChevronRight, ChevronLeft, Send, ArrowLeft } from 'lucide-react'
import {
  useDB,
  actions,
  isOpen,
  fmt,
  OBS_LIMIT,
  MEDIT_10_QUESTIONS,
  CONTINGENCY_FORMS,
  type User,
  type Form,
  type Question,
} from '../../store'
import { Header, Empty, Card, Msg, Scale, input, btn, btnGhost } from '../common'

export interface DocenteBloqueDef {
  id: 'A' | 'B' | 'C'
  stepNumber: number
  badge: string
  badgeClass: string
  stepLabel: string
  titulo: string
  descripcion: string
}

export const BLOQUES_AUTOEVALUACION: DocenteBloqueDef[] = [
  {
    id: 'A',
    stepNumber: 1,
    badge: 'Bloque 1 · Mediación Pedagógica y Didáctica',
    badgeClass: 'bg-pine/10 text-pine border-pine/30',
    stepLabel: 'Práctica Pedagógica',
    titulo: '1. Desempeño y Práctica Pedagógica del Docente',
    descripcion: 'Autoevalúe su dominio conceptual, claridad expositiva, cumplimiento del calendario académico y retroalimentación constructiva.',
  },
  {
    id: 'B',
    stepNumber: 2,
    badge: 'Bloque 2 · Modelo MEDIT y Mediaciones Digitales',
    badgeClass: 'bg-ochre/15 text-ochre border-ochre/30',
    stepLabel: 'Mediaciones MEDIT',
    titulo: '2. Modelo MEDIT y Mediaciones Tecnológicas',
    descripcion: 'Autoevalúe la integración de herramientas virtuales, resolución de problemas reales y fomento del aprendizaje autónomo y colaborativo.',
  },
  {
    id: 'C',
    stepNumber: 3,
    badge: 'Bloque 3 · Gestión y Recursos Institucionales',
    badgeClass: 'bg-moss/15 text-moss border-moss/30',
    stepLabel: 'Gestión y Entorno',
    titulo: '3. Condiciones de Gestión y Entorno Institucional',
    descripcion: 'Apreciación sobre las condiciones físicas de aulas y laboratorios, conectividad, recursos y soporte tecnológico provisto por la institución.',
  },
]

export function categorizarPreguntaDocente(q: Question, idx: number, total: number): 'A' | 'B' | 'C' {
  if (q.bloque === 'docente') return 'A'
  if (q.bloque === 'medit') return 'B'
  if (q.bloque === 'institucional') return 'C'

  const dim = (q.dimension || '').toLowerCase()
  const txt = (q.text || '').toLowerCase()
  const combined = `${txt} ${dim}`

  if (
    combined.includes('facultad') ||
    combined.includes('calendario') ||
    combined.includes('dependencia') ||
    combined.includes('trámite') ||
    combined.includes('infraestructura') ||
    combined.includes('conectividad') ||
    combined.includes('recurso') ||
    combined.includes('sede') ||
    combined.includes('aula') ||
    combined.includes('laboratorio') ||
    combined.includes('soporte') ||
    combined.includes('wifi') ||
    combined.includes('físic') ||
    combined.includes('equipos') ||
    dim.includes('recursos y gestión') ||
    dim.includes('institucional')
  ) {
    return 'C'
  }

  if (
    combined.includes('medit') ||
    combined.includes('digital') ||
    combined.includes('tic') ||
    combined.includes('plataforma') ||
    combined.includes('autónomo') ||
    combined.includes('proyecto') ||
    combined.includes('innovación') ||
    combined.includes('aplicación práctica') ||
    combined.includes('colaborativo') ||
    combined.includes('pensamiento crítico') ||
    combined.includes('problemas reales') ||
    combined.includes('casos del entorno') ||
    combined.includes('aprendizaje significativo') ||
    combined.includes('metodología') ||
    dim.includes('modelo medit') ||
    dim.includes('metodología')
  ) {
    return 'B'
  }

  if (
    combined.includes('claridad') ||
    combined.includes('explicación') ||
    combined.includes('dominio') ||
    combined.includes('solidez') ||
    combined.includes('indagación') ||
    combined.includes('fuentes') ||
    combined.includes('expositiva') ||
    combined.includes('horario') ||
    combined.includes('cadi') ||
    combined.includes('puntualidad') ||
    combined.includes('cumplimiento') ||
    combined.includes('acuerdo') ||
    combined.includes('retroalimentación') ||
    combined.includes('trato') ||
    combined.includes('asertiva') ||
    combined.includes('organización') ||
    combined.includes('calificación') ||
    dim.includes('claridad') ||
    dim.includes('organización') ||
    dim.includes('retroalimentación')
  ) {
    return 'A'
  }

  const tercio = Math.ceil(total / 3)
  if (idx < tercio) return 'A'
  if (idx < tercio * 2) return 'B'
  return 'C'
}

export function TeacherAutoevaluationForm({
  form,
  me,
  onSubmit,
  onCancel,
}: {
  form: Form
  me: User
  onSubmit: (answers: Record<string, string>, observation: string) => Promise<void> | void
  onCancel: () => void
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const questionsByBlock = useMemo(() => {
    const total = form.questions.length
    const grouped: Record<'A' | 'B' | 'C', Question[]> = { A: [], B: [], C: [] }
    form.questions.forEach((rawQ, idx) => {
      const q: Question = { ...rawQ, type: 'escala', options: [] }
      const b = categorizarPreguntaDocente(q, idx, total)
      grouped[b].push(q)
    })
    return grouped
  }, [form.questions])

  const currentBloque = BLOQUES_AUTOEVALUACION[activeStep]
  const currentQuestions = questionsByBlock[currentBloque.id]

  const totalQuestions = form.questions.length
  const answeredCount = form.questions.filter((q) => Boolean(answers[q.id]?.trim())).length
  const percentComplete = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const handleNext = () => {
    setErr('')
    if (activeStep < BLOQUES_AUTOEVALUACION.length - 1) {
      setActiveStep((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    setErr('')
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    if (!isOpen(form.start, form.end)) {
      setErr('El período de respuesta ha finalizado.')
      return
    }

    const m = form.questions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.id)
    setMissing(m)
    if (m.length > 0) {
      setErr(`Faltan ${m.length} preguntas obligatorias por calificar antes de enviar la autoevaluación.`)
      const firstMissingQ = form.questions.find((q) => m.includes(q.id))
      if (firstMissingQ) {
        const targetBlock = categorizarPreguntaDocente(firstMissingQ, 0, form.questions.length)
        const blockIdx = BLOQUES_AUTOEVALUACION.findIndex((b) => b.id === targetBlock)
        if (blockIdx !== -1) setActiveStep(blockIdx)
      }
      return
    }

    if (obs.length > OBS_LIMIT) {
      setErr(`La observación supera los ${OBS_LIMIT} caracteres permitidos. Redúzcala.`)
      return
    }

    setLoading(true)
    try {
      await onSubmit(answers, obs)
    } catch (e) {
      setErr((e as Error).message || 'Error al enviar la autoevaluación.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <p className="text-sm text-ink/80">
            Autoevaluación de desempeño: <b className="text-pine font-semibold">{me.name}</b>
          </p>
          <p className="text-xs text-ink/50">
            Docente Titular · {me.email} · {form.period}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-pine transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Volver a actividades</span>
        </button>
      </div>

      <div className="rounded-xl border border-pine/20 bg-pine/5 p-4 text-sm text-pine shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-pine mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-pine">Instrumento de Autoevaluación Integral del Desempeño Docente MEDIT</p>
            <p className="text-xs text-ink/80 leading-relaxed">
              Este instrumento recoge su valoración reflexiva sobre las dimensiones pedagógicas, tecnológicas e institucionales. Su autoevaluación pondera el <strong>30%</strong> de su calificación docente final consolidada.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-paper/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ochre">
              Progreso de Autoevaluación
            </span>
            <h4 className="text-sm font-bold text-pine">
              Paso {activeStep + 1} de {BLOQUES_AUTOEVALUACION.length}: {currentBloque.stepLabel} ({currentQuestions.length} preguntas)
            </h4>
          </div>
          <span className="font-mono text-xs text-ink/60">
            {answeredCount} de {totalQuestions} preguntas valoradas ({percentComplete}%)
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-pine transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
          {BLOQUES_AUTOEVALUACION.map((b, idx) => {
            const isCurrent = activeStep === idx
            const blockQuestions = questionsByBlock[b.id]
            const blockAnswered = blockQuestions.filter((q) => Boolean(answers[q.id]?.trim())).length
            const blockComplete = blockQuestions.length > 0 && blockAnswered === blockQuestions.length

            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setActiveStep(idx)
                  setErr('')
                }}
                className={`group flex items-center gap-2 rounded-lg p-2.5 text-left transition border cursor-pointer ${
                  isCurrent
                    ? 'border-pine bg-white shadow-sm ring-1 ring-pine'
                    : 'border-line/60 bg-paper/80 hover:bg-white hover:border-line'
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    blockComplete
                      ? 'bg-moss text-white'
                      : isCurrent
                      ? 'bg-pine text-white'
                      : 'bg-line text-ink/60'
                  }`}
                >
                  {blockComplete ? <Check size={13} /> : b.stepNumber}
                </div>
                <div className="min-w-0 flex-1 truncate">
                  <p className="truncate text-xs font-semibold text-pine">
                    {b.stepLabel}
                  </p>
                  <p className="text-[10px] text-ink/50">
                    {blockAnswered}/{blockQuestions.length} valoradas
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-line bg-paper/40 p-5 space-y-2">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider border ${currentBloque.badgeClass}`}>
              {currentBloque.badge}
            </span>
          </div>
          <h3 className="font-serif text-2xl text-pine">{currentBloque.titulo}</h3>
          <p className="text-xs text-ink/70">{currentBloque.descripcion}</p>
        </div>

        {currentQuestions.length === 0 ? (
          <Card>
            <p className="text-xs text-ink/50 italic">
              No hay preguntas configuradas para este bloque en el formulario actual.
            </p>
          </Card>
        ) : (
          currentQuestions.map((q, qIndex) => {
            const isMissing = missing.includes(q.id)
            return (
              <Card
                key={q.id}
                className={`transition-all ${
                  isMissing ? 'border-red-400 bg-red-50/20 ring-1 ring-red-400' : ''
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-ink">
                    <span className="mr-2 font-mono text-sm font-bold text-ochre">
                      {String(qIndex + 1).padStart(2, '0')}
                    </span>
                    {q.text}
                    {q.required && <span className="text-red-600 font-bold"> *</span>}
                  </p>
                </div>
                <Scale
                  value={answers[q.id]}
                  onChange={(val) => {
                    setAnswers((prev) => ({ ...prev, [q.id]: val }))
                    setMissing((prev) => prev.filter((id) => id !== q.id))
                    setErr('')
                  }}
                />
              </Card>
            )
          })
        )}

        {activeStep === BLOQUES_AUTOEVALUACION.length - 1 && (
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-pine">Observaciones y Reflexión Pedagógica</p>
              <span className={`text-xs font-mono ${obs.length > OBS_LIMIT ? 'text-red-600' : 'text-ink/50'}`}>
                {obs.length}/{OBS_LIMIT}
              </span>
            </div>
            <p className="text-xs text-ink/60">
              Opcional: Describa logros, dificultades pedagógicas o propuestas de fortalecimiento para su plan de mejora y el programa académico.
            </p>
            <textarea
              className={input}
              rows={4}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Escriba aquí sus observaciones o reflexiones docentes..."
            />
          </Card>
        )}

        {err && <Msg kind="err" text={err} />}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>
            {activeStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className={btnGhost}
                disabled={loading}
              >
                <ChevronLeft size={16} />
                <span>Bloque anterior</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeStep < BLOQUES_AUTOEVALUACION.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className={btn}
              >
                <span>Siguiente bloque</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className={btn}
                disabled={loading}
              >
                <Send size={16} />
                <span>{loading ? 'Enviando...' : 'Enviar autoevaluación'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FormList({
  forms,
  done,
  onOpen,
}: {
  forms: Form[]
  done: (id: string) => boolean
  onOpen: (id: string) => void
}) {
  if (!forms.length) return <Empty text="No tiene actividades de autoevaluación asignadas en este momento." />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {forms.map((f) => {
        const d = done(f.id)
        const open = isOpen(f.start, f.end) || !d
        return (
          <Card key={f.id} className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider text-ochre font-semibold">{f.period}</p>
            <h3 className="font-serif text-2xl text-pine">{f.title}</h3>
            <p className="text-sm text-ink/70">{f.description}</p>
            <p className="text-xs text-ink/50 font-medium">
              {f.questions.length} preguntas organizadas por dimensiones MEDIT
            </p>
            <p className="flex items-center gap-2 text-xs text-ink/50">
              <CalendarClock size={14} />Cierra {fmt(f.end)}
            </p>
            <div className="mt-auto pt-2">
              {d ? (
                <Msg kind="ok" text="✓ Autoevaluación respondida y registrada en el sistema." />
              ) : open ? (
                <button className={btn} onClick={() => onOpen(f.id)}>Realizar Autoevaluación</button>
              ) : (
                <Msg kind="err" text="Fuera del período de respuesta." />
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function SelfEvaluation({ me }: { me: User }) {
  const db = useDB()
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (me?.id) {
      actions.syncDocenteAutoevaluationData(me.id).catch(() => {})
    }
    actions.fetchEvaluaciones().catch(() => {})
  }, [me?.id])

  const forms = useMemo(() => {
    // 1. Buscar formulario institucional de evaluación general
    const generalForm =
      db.forms.find((f) => f.kind === 'evaluacion' && !f.cadiId) ||
      db.forms.find((f) => f.kind === 'evaluacion') ||
      CONTINGENCY_FORMS[0]

    // 2. Banco canónico de 10 preguntas MEDIT organizadas por bloques
    const canonicalQuestions: Question[] =
      generalForm?.questions && generalForm.questions.length >= 10
        ? generalForm.questions
        : MEDIT_10_QUESTIONS

    // Normalizar a escala 1 a 5 homogénea
    const sanitizedQuestions: Question[] = canonicalQuestions.map((q) => ({
      ...q,
      type: 'escala',
      options: [],
    }))

    // 3. Buscar formularios explícitos de autoevaluación en la base de datos
    const rawAutoForms = db.forms.filter((f) => f.kind === 'autoevaluacion')
    if (rawAutoForms.length > 0) {
      return rawAutoForms.map((f) => {
        const isDone = db.formResponses.some(
          (r) =>
            (r.formId === f.id || r.formId === `auto-${f.id}` || r.formId === 'form-auto-2026') &&
            (r.userId === me.id || r.docenteId === me.id)
        )
        const qList = f.questions && f.questions.length >= 10
          ? f.questions.map((q) => ({ ...q, type: 'escala' as const, options: [] }))
          : sanitizedQuestions

        return {
          ...f,
          start: f.start || '2026-08-01T00:00:00Z',
          end: isDone && !isOpen(f.start, f.end) ? f.end : '2026-11-30T23:59:59Z',
          questions: qList,
        }
      })
    }

    if (generalForm) {
      const isDone = db.formResponses.some(
        (r) =>
          (r.formId === generalForm.id ||
            r.formId === `auto-${generalForm.id}` ||
            r.formId === 'form-auto-2026') &&
          (r.userId === me.id || r.docenteId === me.id)
      )
      const fallbackAuto: Form = {
        id: `auto-${generalForm.id}`,
        kind: 'autoevaluacion',
        title: `Autoevaluación Docente · ${generalForm.period || '2026-II'}`,
        description: 'Instrumento de autoevaluación integral del desempeño docente bajo el modelo educativo digital transmoderno (MEDIT).',
        period: generalForm.period || '2026-II',
        start: generalForm.start || '2026-08-01T00:00:00Z',
        end: isDone && !isOpen(generalForm.start, generalForm.end) ? generalForm.end : '2026-11-30T23:59:59Z',
        questions: sanitizedQuestions,
      }
      return [fallbackAuto]
    }

    return []
  }, [db.forms, db.formResponses, me.id])

  const done = (id: string) =>
    db.formResponses.some(
      (r) =>
        (r.formId === id ||
          (id.startsWith('auto-') && r.formId === id.replace('auto-', '')) ||
          `auto-${r.formId}` === id ||
          r.formId === 'form-auto-2026') &&
        (r.userId === me.id || r.docenteId === me.id)
    )

  const activeForm = forms.find((f) => f.id === active)

  return (
    <>
      <Header
        title="Autoevaluación Docente"
        sub="Instrumento de reflexión pedagógica y valoración integral de su desempeño bajo dimensiones MEDIT (30% de la nota final)."
      />
      {activeForm ? (
        <TeacherAutoevaluationForm
          form={activeForm}
          me={me}
          onCancel={() => setActive(null)}
          onSubmit={async (answers, observation) => {
            const formIdToSend = activeForm.id
            await actions.respondForm({
              formId: formIdToSend,
              userId: me.id,
              docenteId: me.id,
              teacherId: me.id,
              answers,
              observation,
            })

            // Compatibilidad si la tabla relacional usa el ID base de la evaluación
            if (formIdToSend.startsWith('auto-')) {
              const rawId = formIdToSend.replace('auto-', '')
              try {
                await actions.respondForm({
                  formId: rawId,
                  userId: me.id,
                  docenteId: me.id,
                  teacherId: me.id,
                  answers,
                  observation,
                })
              } catch {}
            }

            if (me?.id) {
              await actions.syncDocenteAutoevaluationData(me.id).catch(() => {})
            }
            setActive(null)
          }}
        />
      ) : (
        <FormList forms={forms} done={done} onOpen={setActive} />
      )}
    </>
  )
}

export const TeacherAutoevaluation = SelfEvaluation
export const TeacherView = SelfEvaluation
