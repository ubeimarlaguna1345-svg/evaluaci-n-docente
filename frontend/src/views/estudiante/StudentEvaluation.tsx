import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import {
  useDB,
  actions,
  isOpen,
  fmt,
  getStudentDocenteEvaluationStatus,
  getDeletedFormIds,
  type User,
} from '../../store'
import { Header, Card, Msg, Empty, btnGhost } from '../common'
import { StudentEvaluationForm } from './StudentEvaluationForm'

export function StudentEvaluation({ me }: { me: User }) {
  const db = useDB()

  useEffect(() => {
    if (me?.id) {
      actions.syncStudentEvaluationData(me.id)
    }
  }, [me?.id])
  
  const uniqueDocentesMap = new Map<string, User>()
  db.users
    .filter((u) => u.role === 'docente' && u.active)
    .forEach((t) => {
      if (!uniqueDocentesMap.has(t.id)) {
        uniqueDocentesMap.set(t.id, t)
      }
    })
  const docentes = Array.from(uniqueDocentesMap.values())

  const [sel, setSel] = useState<{ formId: string; docenteId: string; teacherId?: string } | null>(null)
  const [ok, setOk] = useState(false)
  const deletedIds = getDeletedFormIds()
  const rawEvals = db.forms.filter((f) => f.kind === 'evaluacion' && !deletedIds.has(f.id))
  const cleanEvals = rawEvals.filter((f) => {
    const titleLower = (f.title || '').toLowerCase().trim()
    const isStaleMock = (titleLower === 'evaluación docente 2026-i' || titleLower === 'evaluacion docente 2026-i') && !isOpen(f.start, f.end)
    return !isStaleMock
  })
  const activeEvals = cleanEvals.filter((f) => isOpen(f.start, f.end))
  const evals = activeEvals.length > 0 ? activeEvals : cleanEvals
  const form = evals.find((f) => f.id === sel?.formId) || db.forms.find((f) => f.id === sel?.formId)

  return (
    <>
      <Header title="Evaluación docente" sub="Valore el desempeño de sus docentes. Sus respuestas son confidenciales." />
      {ok && <div className="mb-4"><Msg kind="ok" text="Evaluación enviada correctamente." /></div>}
      {form && sel ? (() => {
        const docenteObj = db.users.find((u) => u.id === (sel.docenteId || sel.teacherId))
        if (!docenteObj) return null
        return (
          <StudentEvaluationForm
            key={`${form.id}-${sel.docenteId || sel.teacherId}`}
            form={form}
            docente={docenteObj}
            onCancel={() => setSel(null)}
            onSubmit={async (answers, observation) => {
              const targetDocenteId = sel.docenteId || sel.teacherId || ''
              await actions.respondForm({ formId: form.id, userId: me.id, docenteId: targetDocenteId, teacherId: targetDocenteId, answers, observation })
              if (me?.id) {
                await actions.syncStudentEvaluationData(me.id)
              }
              setSel(null)
              setOk(true)
            }}
          />
        )
      })() : evals.length ? evals.map((f) => {
        let relevantDocentes = docentes
        if (f.cadiId) {
          const cadi = db.cadis.find((c) => c.id === f.cadiId)
          if (cadi && cadi.docenteId) {
            relevantDocentes = docentes.filter((t) => t.id === cadi.docenteId)
          }
        }

        const seenDocenteIds = new Set<string>()
        const distinctDocentes = relevantDocentes.filter((t) => {
          if (seenDocenteIds.has(t.id)) return false
          seenDocenteIds.add(t.id)
          return true
        })

        return (
          <Card key={f.id} className="mb-4">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-serif text-2xl">{f.title}</h3>
              <span className="text-xs text-ink/50">
                {isOpen(f.start, f.end) ? `Cierra ${fmt(f.end)}` : 'Fuera del período de respuesta'}
              </span>
            </div>
            <div className="divide-y divide-line">
              {distinctDocentes.map((t) => {
                const yaRespondio = Boolean(me?.id) && db.formResponses.some(
                  (ev) => ev.formId === f.id && (ev.docenteId === t.id || ev.teacherId === t.id) && ev.userId === me.id
                )
                const status = getStudentDocenteEvaluationStatus(db, f, me?.id || '', t.id)
                const docenteCadis = db.cadis.filter((c) => c.docenteId === t.id)

                return (
                  <div key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2.5">
                      <span className="font-medium text-pine">{t.name}</span>
                      {docenteCadis.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {docenteCadis.map((asig) => (
                            <span
                              key={asig.id}
                              className={`rounded px-1.5 py-0.5 text-[11px] font-medium border ${
                                asig.tipo === 'CAI'
                                  ? 'bg-ochre/15 text-ochre border-ochre/30'
                                  : 'bg-pine/10 text-pine border-pine/20'
                              }`}
                              title={`${asig.nombre} (${asig.tipo || 'CADI'})`}
                            >
                              {asig.codigo} ({asig.tipo || 'CADI'})
                            </span>
                          ))}
                        </div>
                      )}
                      {yaRespondio && status.hasEvaluated && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status.badgeClass}`}
                          title={status.title}
                        >
                          {status.label}
                        </span>
                      )}
                    </div>
                    {yaRespondio ? (
                      <span className="flex items-center gap-1 text-sm text-moss font-medium">
                        <Check size={16} />Respondida
                      </span>
                    ) : (
                      <button
                        className={btnGhost}
                        disabled={!isOpen(f.start, f.end)}
                        onClick={() => { setOk(false); setSel({ formId: f.id, docenteId: t.id, teacherId: t.id }) }}
                      >
                        Evaluar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

          </Card>
        )
      }) : <Empty text="No hay evaluaciones asignadas." />}
    </>
  )
}
