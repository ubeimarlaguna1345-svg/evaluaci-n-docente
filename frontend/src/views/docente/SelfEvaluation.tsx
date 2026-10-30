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
  getCurrentUser,
  type User,
  type Form,
  type Question,
} from '../../store'
import { Header, Empty, Card, Msg, AnswerInput, Scale, input, btn, btnGhost } from '../common'

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

  const safeQuestions: Question[] = useMemo(() => {
    const raw = form?.questions || (form as any)?.preguntas
    return Array.isArray(raw) && raw.length > 0
      ? raw
      : MEDIT_10_QUESTIONS
  }, [form?.questions, (form as any)?.preguntas])

  const questionsByBlock = useMemo(() => {
    const total = safeQuestions.length
    const grouped: Record<'A' | 'B' | 'C', Question[]> = { A: [], B: [], C: [] }
    safeQuestions.forEach((rawQ, idx) => {
      const b = categorizarPreguntaDocente(rawQ, idx, total)
      grouped[b].push(rawQ)
    })
    return grouped
  }, [safeQuestions])

  const currentBloque = BLOQUES_AUTOEVALUACION[activeStep] || BLOQUES_AUTOEVALUACION[0]
  const currentQuestions = questionsByBlock[currentBloque.id] || []

  const totalQuestions = safeQuestions.length
  const answeredCount = safeQuestions.filter((q) => Boolean(answers[q.id]?.trim())).length
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
    const fStart = form.start || (form as any).fecha_inicio || ''
    const fEnd = form.end || (form as any).fecha_cierre || (form as any).fecha_fin || ''
    if (fStart && fEnd && !isOpen(fStart, fEnd)) {
      setErr('El período de respuesta ha finalizado.')
      return
    }

    const m = safeQuestions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.id)
    setMissing(m)
    if (m.length > 0) {
      setErr(`Faltan ${m.length} preguntas obligatorias por calificar antes de enviar la autoevaluación.`)
      const firstMissingQ = safeQuestions.find((q) => m.includes(q.id))
      if (firstMissingQ) {
        const targetBlock = categorizarPreguntaDocente(firstMissingQ, 0, safeQuestions.length)
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
            Autoevaluación de desempeño: <b className="text-pine font-semibold">{me?.name || 'Docente'}</b>
          </p>
          <p className="text-xs text-ink/50">
            Docente Titular · {me?.email || ''} · {form?.period || '2026-II'}
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
  const safeForms = Array.isArray(forms)
    ? forms.filter((f) => Boolean(f && (f.id || (f as any).id_evaluacion || (f as any).evaluacionId)))
    : []

  if (!safeForms.length) {
    return <Empty text="No tiene actividades de autoevaluación asignadas en este momento." />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {safeForms.map((rawF) => {
        const fId = rawF.id || (rawF as any).id_evaluacion || (rawF as any).evaluacionId || 'form-auto'
        const rawQuestions = rawF.questions || (rawF as any).preguntas
        const questionsList: Question[] = Array.isArray(rawQuestions) && rawQuestions.length > 0
          ? rawQuestions
          : MEDIT_10_QUESTIONS
        const questionsCount = questionsList.length

        const safeTitle = rawF.title || (rawF as any).titulo || 'Autoevaluación Docente'
        const safePeriod = rawF.period || (rawF as any).periodo || '2026-II'
        const safeDescription = rawF.description || (rawF as any).descripcion || 'Instrumento de autoevaluación integral del desempeño docente bajo el modelo MEDIT.'

        const rawStart = rawF.start || (rawF as any).fecha_inicio || ''
        const rawEnd = rawF.end || (rawF as any).fecha_cierre || (rawF as any).fecha_fin || ''

        const d = typeof done === 'function' ? done(fId) : false
        const open = isOpen(rawStart, rawEnd) || !d
        const safeEnd = fmt(rawEnd)

        return (
          <Card key={fId} className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider text-ochre font-semibold">{safePeriod}</p>
            <h3 className="font-serif text-2xl text-pine">{safeTitle}</h3>
            <p className="text-sm text-ink/70">{safeDescription}</p>
            <p className="text-xs text-ink/50 font-medium">
              {questionsCount} preguntas organizadas por dimensiones MEDIT
            </p>
            <p className="flex items-center gap-2 text-xs text-ink/50">
              <CalendarClock size={14} />Cierra {safeEnd}
            </p>
            <div className="mt-auto pt-2">
              {d ? (
                <Msg kind="ok" text="✓ Autoevaluación respondida y registrada en el sistema." />
              ) : open ? (
                <button className={btn} onClick={() => onOpen(fId)}>Realizar Autoevaluación</button>
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

export function SelfEvaluation({ me: propMe }: { me?: User | null }) {
  const db = useDB()
  const [active, setActive] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState('')

  const me: User | null = propMe || getCurrentUser()
  const meId = me?.id || ''

  useEffect(() => {
    if (meId) {
      actions.syncDocenteAutoevaluationData(meId).catch(() => {})
    }
    actions.fetchEvaluaciones().catch(() => {})
  }, [meId])

  const forms = useMemo(() => {
    const rawForms = Array.isArray(db?.forms) ? db.forms : []
    const rawResponses = Array.isArray(db?.formResponses) ? db.formResponses : []

    // 1. Buscar formulario institucional de evaluación general
    const generalForm =
      rawForms.find((f) => f && (f.kind === 'evaluacion' || (f as any).tipo === 'evaluacion') && !f.cadiId) ||
      rawForms.find((f) => f && (f.kind === 'evaluacion' || (f as any).tipo === 'evaluacion')) ||
      CONTINGENCY_FORMS[0]

    const genQuestions = generalForm?.questions || (generalForm as any)?.preguntas
    // 2. Banco de preguntas institucional / canónico MEDIT respetando sus tipos y opciones
    const canonicalQuestions: Question[] =
      Array.isArray(genQuestions) && genQuestions.length > 0
        ? genQuestions
        : MEDIT_10_QUESTIONS

    // 3. Buscar formularios explícitos de autoevaluación en la base de datos
    const rawAutoForms = rawForms.filter((f) => f && (f.kind === 'autoevaluacion' || (f as any).tipo === 'autoevaluacion'))
    if (rawAutoForms.length > 0) {
      return rawAutoForms.map((f) => {
        const formId = f.id || (f as any).id_evaluacion || (f as any).evaluacionId || 'form-auto'
        const isDone = Boolean(meId) && rawResponses.some(
          (r) =>
            (r.formId === formId || r.formId === `auto-${formId}` || r.formId === 'form-auto-2026') &&
            (r.userId === meId || r.docenteId === meId)
        )
        const qRaw = f.questions || (f as any).preguntas
        const qList = Array.isArray(qRaw) && qRaw.length > 0
          ? qRaw
          : canonicalQuestions

        const fStart = f.start || (f as any).fecha_inicio || '2026-08-01T00:00:00Z'
        const fEnd = f.end || (f as any).fecha_cierre || (f as any).fecha_fin || '2026-11-30T23:59:59Z'

        return {
          ...f,
          id: formId,
          title: f.title || (f as any).titulo || 'Autoevaluación Docente',
          period: f.period || (f as any).periodo || '2026-II',
          description: f.description || (f as any).descripcion || 'Instrumento de autoevaluación integral del desempeño docente bajo el modelo MEDIT.',
          start: fStart,
          end: isDone && !isOpen(fStart, fEnd) ? fEnd : '2026-11-30T23:59:59Z',
          questions: qList,
        }
      })
    }

    if (generalForm) {
      const genId = generalForm.id || (generalForm as any).id_evaluacion || (generalForm as any).evaluacionId || 'form-eval-2026'
      const isDone = Boolean(meId) && rawResponses.some(
        (r) =>
          (r.formId === genId ||
            r.formId === `auto-${genId}` ||
            r.formId === 'form-auto-2026') &&
          (r.userId === meId || r.docenteId === meId)
      )
      const genStart = generalForm.start || (generalForm as any).fecha_inicio || '2026-08-01T00:00:00Z'
      const genEnd = generalForm.end || (generalForm as any).fecha_cierre || (generalForm as any).fecha_fin || '2026-11-30T23:59:59Z'
      const genPeriod = generalForm.period || (generalForm as any).periodo || '2026-II'

      const fallbackAuto: Form = {
        id: `auto-${genId}`,
        kind: 'autoevaluacion',
        title: generalForm.title || (generalForm as any).titulo
          ? `Autoevaluación Docente · ${genPeriod}`
          : `Autoevaluación Docente · 2026-II`,
        description: 'Instrumento de autoevaluación integral del desempeño docente bajo el modelo educativo digital transmoderno (MEDIT).',
        period: genPeriod,
        start: genStart,
        end: isDone && !isOpen(genStart, genEnd) ? genEnd : '2026-11-30T23:59:59Z',
        questions: canonicalQuestions,
      }
      return [fallbackAuto]
    }

    return []
  }, [db?.forms, db?.formResponses, meId])

  const done = (id: string) => {
    if (!meId) return false
    const rawResponses = Array.isArray(db?.formResponses) ? db.formResponses : []
    return rawResponses.some(
      (r) =>
        (r.formId === id ||
          (id.startsWith('auto-') && r.formId === id.replace('auto-', '')) ||
          `auto-${r.formId}` === id ||
          r.formId === 'form-auto-2026') &&
        (r.userId === meId || r.docenteId === meId)
    )
  }

  if (!me) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-pine border-t-transparent" />
        <p className="text-sm text-ink/60">Cargando perfil docente...</p>
      </div>
    )
  }

  const rawActiveForm = forms.find((f) => f.id === active)
  const activeQuestions = rawActiveForm?.questions || (rawActiveForm as any)?.preguntas
  const activeForm = rawActiveForm
    ? {
        ...rawActiveForm,
        start: rawActiveForm.start || (rawActiveForm as any).fecha_inicio || '2026-08-01T00:00:00Z',
        end: rawActiveForm.end || (rawActiveForm as any).fecha_cierre || (rawActiveForm as any).fecha_fin || '2026-11-30T23:59:59Z',
        questions: Array.isArray(activeQuestions) && activeQuestions.length > 0
          ? activeQuestions
          : MEDIT_10_QUESTIONS,
      }
    : null

  return (
    <>
      <Header
        title="Autoevaluación Docente"
        sub="Instrumento de reflexión pedagógica y valoración integral de su desempeño bajo dimensiones MEDIT (30% de la nota final)."
      />
      {okMsg && <div className="mb-4"><Msg kind="ok" text={okMsg} /></div>}
      {activeForm ? (
        <TeacherAutoevaluationForm
          form={activeForm}
          me={me}
          onCancel={() => setActive(null)}
          onSubmit={async (answers, observation) => {
            const formIdToSend = activeForm.id
            const nowIso = new Date().toISOString()
            const payload = {
              formId: formIdToSend,
              userId: me.id || me.email,
              evaluadorId: me.id || me.email,
              tipo: 'autoevaluacion' as const,
              docenteId: me.id,
              teacherId: me.id,
              docente: me.name,
              answers,
              respuestas: answers,
              observation,
              fecha: nowIso,
              date: nowIso,
            }
            await actions.respondForm(payload)

            // Compatibilidad si la tabla relacional usa el ID base de la evaluación
            if (formIdToSend.startsWith('auto-')) {
              const rawId = formIdToSend.replace('auto-', '')
              try {
                await actions.respondForm({
                  ...payload,
                  formId: rawId,
                })
              } catch {}
            }

            if (me?.id) {
              await actions.syncDocenteAutoevaluationData(me.id).catch(() => {})
            }
            setActive(null)
            setOkMsg('Autoevaluación guardada correctamente.')
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
