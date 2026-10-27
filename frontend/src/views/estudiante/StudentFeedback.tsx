import { useState } from 'react'
import { Send } from 'lucide-react'
import { useDB, actions, isOpen, type User } from '../../store'
import { Header, Empty, Card, Msg, AnswerInput, btn } from '../common'

export function StudentFeedback({ me }: { me: User }) {
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
          const docente = db.users.find((u) => u.id === (f.docenteId || f.teacherId))
          return (
            <Card key={f.id} className="space-y-3">
              <p className="text-xs text-ink/50">{f.course} · {docente?.name}</p>
              <p className="font-serif text-xl">{f.question.text}</p>
              {answered ? (
                <Msg kind="ok" text="Respuesta enviada." />
              ) : !open ? (
                <Msg kind="err" text="Retroalimentación cerrada o fuera de fecha." />
              ) : (
                <>
                  <AnswerInput q={f.question} value={vals[f.id]} onChange={(v) => setVals({ ...vals, [f.id]: v })} />
                  <button
                    className={btn}
                    disabled={!vals[f.id]?.trim()}
                    onClick={() => actions.respondFeedback(f.id, me.id, vals[f.id])}
                  >
                    <Send size={16} />Enviar
                  </button>
                </>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}
