import { useState, useMemo } from 'react'
import { Check, Info, ChevronRight, ChevronLeft, Send, ArrowLeft } from 'lucide-react'
import { isOpen, OBS_LIMIT, type Form, type Question, type User } from '../../store'
import { Card, Msg, AnswerInput, input, btn, btnGhost } from '../common'

export interface BloqueDef {
  id: 'A' | 'B' | 'C'
  stepNumber: number
  badge: string
  badgeClass: string
  stepLabel: string
  titulo: string
  descripcion: string
}

export const BLOQUES: BloqueDef[] = [
  {
    id: 'A',
    stepNumber: 1,
    badge: 'Bloque A · Práctica y Desempeño Docente',
    badgeClass: 'bg-pine/10 text-pine border-pine/30',
    stepLabel: 'Evaluación Docente',
    titulo: '1. Desempeño y Práctica Pedagógica del Docente',
    descripcion: 'Valora la claridad conceptual, puntualidad, retroalimentación y trato del profesor titular.',
  },
  {
    id: 'B',
    stepNumber: 2,
    badge: 'Bloque B · Mediaciones y Metodología MEDIT',
    badgeClass: 'bg-ochre/15 text-ochre border-ochre/30',
    stepLabel: 'Mediaciones MEDIT',
    titulo: '2. Modelo MEDIT y Mediaciones Tecnológicas',
    descripcion: 'Valora la integración de herramientas digitales, casos de aplicación y fomento del aprendizaje autónomo.',
  },
  {
    id: 'C',
    stepNumber: 3,
    badge: 'Bloque C · Condiciones Institucionales y Sede',
    badgeClass: 'bg-moss/15 text-moss border-moss/30',
    stepLabel: 'Recursos y Gestión',
    titulo: '3. Recursos y Gestión Institucional',
    descripcion: 'Valora la infraestructura, conectividad y soporte tecnológico provisto por la sede universitaria.',
  },
]

export function categorizarPregunta(q: Question, idx: number, total: number): 'A' | 'B' | 'C' {
  const dim = (q.dimension || '').toLowerCase()
  const txt = (q.text || '').toLowerCase()
  const combined = `${txt} ${dim}`

  if (
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
    dim.includes('recursos y gestión')
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
    combined.includes('puntualidad') ||
    combined.includes('cumplimiento') ||
    combined.includes('acuerdo') ||
    combined.includes('retroalimentación') ||
    combined.includes('trato') ||
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

export function StudentEvaluationForm({
  form,
  docente,
  onSubmit,
  onCancel,
}: {
  form: Form
  docente: User
  onSubmit: (answers: Record<string, string>, observation: string) => void
  onCancel: () => void
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [err, setErr] = useState('')

  const questionsByBlock = useMemo(() => {
    const total = form.questions.length
    const grouped: Record<'A' | 'B' | 'C', Question[]> = { A: [], B: [], C: [] }
    form.questions.forEach((q, idx) => {
      const b = categorizarPregunta(q, idx, total)
      grouped[b].push(q)
    })
    return grouped
  }, [form.questions])

  const currentBloque = BLOQUES[activeStep]
  const currentQuestions = questionsByBlock[currentBloque.id]

  const totalQuestions = form.questions.length
  const answeredCount = form.questions.filter((q) => Boolean(answers[q.id]?.trim())).length
  const percentComplete = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0

  const handleSubmit = () => {
    if (!isOpen(form.start, form.end)) {
      setErr('El período de respuesta ha finalizado.')
      return
    }

    const m = form.questions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.id)
    setMissing(m)
    if (m.length > 0) {
      setErr(`Faltan ${m.length} preguntas obligatorias por responder antes de enviar la evaluación.`)
      const firstMissingQ = form.questions.find((q) => m.includes(q.id))
      if (firstMissingQ) {
        const targetBlock = categorizarPregunta(firstMissingQ, 0, form.questions.length)
        const blockIdx = BLOQUES.findIndex((b) => b.id === targetBlock)
        if (blockIdx !== -1) setActiveStep(blockIdx)
      }
      return
    }

    if (obs.length > OBS_LIMIT) {
      setErr(`La observación supera los ${OBS_LIMIT} caracteres permitidos. Redúzcala.`)
      return
    }

    onSubmit(answers, obs)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <p className="text-sm text-ink/80">
          Evaluando a <b className="text-pine font-semibold">{docente.name}</b>
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-xs text-ink/60 hover:text-pine transition"
        >
          <ArrowLeft size={14} />
          <span>Volver a mis docentes</span>
        </button>
      </div>

      <div className="rounded-xl border border-pine/20 bg-pine/5 p-4 text-sm text-pine shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-pine mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-pine">Instrumento de Heteroevaluación Integral</p>
            <p className="text-xs text-ink/80 leading-relaxed">
              Nota: Este instrumento separa la valoración pedagógica del profesor de las condiciones físicas y tecnológicas de la universidad para garantizar un diagnóstico objetivo.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-line bg-paper/50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-ochre">
              Progreso de la evaluación
            </span>
            <h4 className="text-sm font-bold text-pine">
              Paso {activeStep + 1} de {BLOQUES.length}: {currentBloque.stepLabel}
            </h4>
          </div>
          <span className="font-mono text-xs text-ink/60">
            {answeredCount} de {totalQuestions} preguntas respondidas ({percentComplete}%)
          </span>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-pine transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 pt-1">
          {BLOQUES.map((b, idx) => {
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
                className={`group flex items-center gap-2 rounded-lg p-2.5 text-left transition border ${
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
                    {blockAnswered}/{blockQuestions.length} respondidas
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
                <AnswerInput
                  q={q}
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

        {activeStep === BLOQUES.length - 1 && (
          <Card className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-pine">Observaciones y Retroalimentación</p>
              <span className={`text-xs font-mono ${obs.length > OBS_LIMIT ? 'text-red-600' : 'text-ink/50'}`}>
                {obs.length}/{OBS_LIMIT}
              </span>
            </div>
            <p className="text-xs text-ink/60">
              Opcional y confidencial: comparta sugerencias o comentarios para enriquecer el plan de mejora del docente y de la sede.
            </p>
            <textarea
              className={input}
              rows={4}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Escriba aquí sus observaciones constructivas..."
            />
          </Card>
        )}

        {err && <Msg kind="err" text={err} />}

        <div className="flex items-center justify-between pt-2">
          {activeStep > 0 ? (
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setActiveStep((prev) => prev - 1)
                setErr('')
              }}
            >
              <ChevronLeft size={16} />
              <span>Bloque anterior</span>
            </button>
          ) : (
            <button type="button" className={btnGhost} onClick={onCancel}>
              <span>Volver a la lista</span>
            </button>
          )}

          {activeStep < BLOQUES.length - 1 ? (
            <button
              type="button"
              className={btn}
              onClick={() => {
                const currentMissing = currentQuestions
                  .filter((q) => q.required && !answers[q.id]?.trim())
                  .map((q) => q.id)
                if (currentMissing.length > 0) {
                  setMissing(currentMissing)
                  setErr(`Faltan ${currentMissing.length} pregunta(s) obligatoria(s) en este bloque por responder.`)
                  return
                }
                setErr('')
                setActiveStep((prev) => prev + 1)
              }}
            >
              <span>Siguiente bloque</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button type="button" className={btn} onClick={handleSubmit}>
              <Send size={16} />
              <span>Enviar Evaluación</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
