import { useState } from 'react'
import { Check } from 'lucide-react'
import {
  useDB,
  actions,
  isOpen,
  fmt,
  getStudentTeacherEvaluationStatus,
  type User,
} from '../../store'
import { Header, Card, Msg, Empty, btnGhost, Respond } from '../common'

export function StudentEvaluation({ me }: { me: User }) {
  const db = useDB()
  const teachers = db.users.filter((u) => u.role === 'docente' && u.active)
  const [sel, setSel] = useState<{ formId: string; teacherId: string } | null>(null)
  const [ok, setOk] = useState(false)
  const evals = db.forms.filter((f) => f.kind === 'evaluacion')
  const form = evals.find((f) => f.id === sel?.formId)

  return (
    <>
      <Header title="Evaluación docente" sub="Valore el desempeño de sus docentes. Sus respuestas son confidenciales." />
      {ok && <div className="mb-4"><Msg kind="ok" text="Evaluación enviada correctamente." /></div>}
      {form && sel ? (
        <>
          <p className="mb-4 text-sm">
            Evaluando a <b>{db.users.find((u) => u.id === sel.teacherId)?.name}</b> ·{' '}
            <button className="underline" onClick={() => setSel(null)}>volver</button>
          </p>
          <Respond
            form={form}
            withObservation
            onSubmit={(answers, observation) => {
              actions.respondForm({ formId: form.id, userId: me.id, teacherId: sel.teacherId, answers, observation })
              setSel(null)
              setOk(true)
            }}
          />
        </>
      ) : evals.length ? evals.map((f) => (
        <Card key={f.id} className="mb-4">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-2xl">{f.title}</h3>
            <span className="text-xs text-ink/50">
              {isOpen(f.start, f.end) ? `Cierra ${fmt(f.end)}` : 'Fuera del período de respuesta'}
            </span>
          </div>
          <div className="divide-y divide-line">
            {teachers.map((t) => {
              const yaRespondio = db.formResponses.some(
                (ev) => ev.formId === f.id && ev.teacherId === t.id && ev.userId === me?.id
              )
              const status = getStudentTeacherEvaluationStatus(db, f, me.id, t.id)
              return (
                <div key={t.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-medium text-pine">{t.name}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.badgeClass}`}
                      title={status.title}
                    >
                      {status.label}
                    </span>
                  </div>
                  {yaRespondio ? (
                    <span className="flex items-center gap-1 text-sm text-moss font-medium">
                      <Check size={16} />Respondida
                    </span>
                  ) : (
                    <button
                      className={btnGhost}
                      disabled={!isOpen(f.start, f.end)}
                      onClick={() => { setOk(false); setSel({ formId: f.id, teacherId: t.id }) }}
                    >
                      Evaluar
                    </button>
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
