import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { useDB, actions, isOpen, fmt, type User, type Form } from '../../store'
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
  if (!forms.length) return <Empty text="No tiene actividades asignadas." />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {forms.map((f) => {
        const open = isOpen(f.start, f.end)
        const d = done(f.id)
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
  const forms = db.forms.filter((f) => f.kind === 'autoevaluacion')
  const done = (id: string) => db.formResponses.some((r) => r.formId === id && r.userId === me.id)
  const form = forms.find((f) => f.id === active)

  return (
    <>
      <Header title="Autoevaluación" sub="Reflexione sobre su propio desempeño docente." />
      {form ? (
        <Respond
          form={form}
          onSubmit={(answers, observation) => {
            actions.respondForm({ formId: form.id, userId: me.id, docenteId: me.id, teacherId: me.id, answers, observation })
            setActive(null)
          }}
        />
      ) : (
        <FormList forms={forms} done={done} onOpen={setActive} />
      )}
    </>
  )
}
