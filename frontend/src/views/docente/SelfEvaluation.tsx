import { useState, useEffect, useMemo } from 'react'
import { CalendarClock } from 'lucide-react'
import {
  useDB,
  actions,
  isOpen,
  fmt,
  type User,
  type Form,
} from '../../store'
import { Header, Empty, Card, Msg, btn, Respond } from '../common'

export function FormList({
  forms,
  done,
  onOpen,
}: {
  forms: Form[]
  done: (id: string) => boolean
  onOpen: (id: string) => void
}) {
  if (!forms.length) return <Empty text="No tiene actividades de autoevaluación asignadas." />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {forms.map((f) => {
        const d = done(f.id)
        const open = isOpen(f.start, f.end) || !d
        return (
          <Card key={f.id} className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-wider text-ochre">{f.period}</p>
            <h3 className="font-serif text-2xl">{f.title}</h3>
            <p className="text-sm text-ink/60">{f.description}</p>
            <p className="flex items-center gap-2 text-xs text-ink/50">
              <CalendarClock size={14} />Cierra {fmt(f.end)}
            </p>
            <div className="mt-auto pt-2">
              {d ? (
                <Msg kind="ok" text="Respondida. ¡Gracias!" />
              ) : open ? (
                <button className={btn} onClick={() => onOpen(f.id)}>Responder</button>
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
      actions.syncDocenteAutoevaluationData(me.id)
    }
  }, [me?.id])

  const forms = useMemo(() => {
    const rawAutoForms = db.forms.filter((f) => f.kind === 'autoevaluacion')
    if (rawAutoForms.length > 0) {
      return rawAutoForms.map((f) => {
        const isDone = db.formResponses.some(
          (r) => r.formId === f.id && (r.userId === me.id || r.docenteId === me.id)
        )
        return {
          ...f,
          start: f.start || '2026-01-15T00:00:00Z',
          end: isDone && !isOpen(f.start, f.end) ? f.end : '2026-12-31T23:59:59Z',
        }
      })
    }

    const generalForm =
      db.forms.find((f) => f.kind === 'evaluacion' && !f.cadiId) ||
      db.forms.find((f) => f.kind === 'evaluacion')

    if (generalForm) {
      const docenteQuestions = generalForm.questions.filter(
        (q) => q.bloque === 'docente' || (q.dimension && q.dimension.toLowerCase().includes('didáctica'))
      )
      const isDone = db.formResponses.some(
        (r) => (r.formId === generalForm.id || r.formId === `auto-${generalForm.id}`) && (r.userId === me.id || r.docenteId === me.id)
      )
      const fallbackAuto: Form = {
        id: `auto-${generalForm.id}`,
        kind: 'autoevaluacion',
        title: `Autoevaluación Docente · ${generalForm.period || '2026-I'}`,
        description: 'Instrumento de reflexión pedagógica y autoevaluación.',
        period: generalForm.period || '2026-I',
        start: generalForm.start || '2026-01-15T00:00:00Z',
        end: isDone && !isOpen(generalForm.start, generalForm.end) ? generalForm.end : '2026-12-31T23:59:59Z',
        questions: docenteQuestions.length > 0 ? docenteQuestions : generalForm.questions,
      }
      return [fallbackAuto]
    }

    return []
  }, [db.forms, db.formResponses, me.id])

  const done = (id: string) =>
    db.formResponses.some(
      (r) => (r.formId === id || (id.startsWith('auto-') && r.formId === id.replace('auto-', ''))) && (r.userId === me.id || r.docenteId === me.id)
    )

  const form = forms.find((f) => f.id === active)

  return (
    <>
      <Header title="Autoevaluación" sub="Reflexione sobre su propio desempeño docente." />
      {form ? (
        <Respond
          form={form}
          onSubmit={async (answers, observation) => {
            const actualFormId = form.id.startsWith('auto-') ? form.id.replace('auto-', '') : form.id
            await actions.respondForm({
              formId: actualFormId,
              userId: me.id,
              docenteId: me.id,
              teacherId: me.id,
              answers,
              observation,
            })
            if (me?.id) {
              await actions.syncDocenteAutoevaluationData(me.id)
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
