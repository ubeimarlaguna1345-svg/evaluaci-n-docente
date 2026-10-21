import { useState } from 'react'
import { Send } from 'lucide-react'
import { isOpen, OBS_LIMIT, type Form } from '../../store'
import { Card, Msg, AnswerInput, input, btn } from './Components'

export function Respond({
  form,
  onSubmit,
  withObservation,
}: {
  form: Form
  onSubmit: (a: Record<string, string>, obs: string) => void
  withObservation?: boolean
}) {
  const [a, setA] = useState<Record<string, string>>({})
  const [obs, setObs] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [err, setErr] = useState('')

  const send = () => {
    if (!isOpen(form.start, form.end)) return setErr('El período de respuesta ha finalizado.')
    const m = form.questions.filter((q) => q.required && !a[q.id]?.trim()).map((q) => q.id)
    setMissing(m)
    if (m.length) return setErr(`Faltan ${m.length} preguntas obligatorias por responder.`)
    if (obs.length > OBS_LIMIT) return setErr(`La observación supera los ${OBS_LIMIT} caracteres. Redúzcala.`)
    onSubmit(a, obs)
  }

  return (
    <div className="space-y-4">
      {form.questions.map((q, i) => (
        <Card key={q.id} className={missing.includes(q.id) ? 'border-red-400' : ''}>
          <p className="mb-3">
            <span className="mr-2 font-mono text-sm text-ochre">{String(i + 1).padStart(2, '0')}</span>
            {q.text}
            {q.required && <span className="text-red-600"> *</span>}
          </p>
          <AnswerInput q={q} value={a[q.id]} onChange={(v) => setA({ ...a, [q.id]: v })} />
        </Card>
      ))}
      {withObservation && (
        <Card>
          <p className="mb-1 font-semibold">Observaciones</p>
          <p className="mb-3 text-xs text-ink/50">Opcional y confidencial: el docente no verá su nombre.</p>
          <textarea className={input} rows={4} value={obs} onChange={(e) => setObs(e.target.value)} />
          <p className={`mt-1 text-right font-mono text-xs ${obs.length > OBS_LIMIT ? 'text-red-600' : 'text-ink/40'}`}>
            {obs.length}/{OBS_LIMIT}
          </p>
        </Card>
      )}
      {err && <Msg kind="err" text={err} />}
      <button className={btn} onClick={send}>
        <Send size={16} />Enviar
      </button>
    </div>
  )
}
