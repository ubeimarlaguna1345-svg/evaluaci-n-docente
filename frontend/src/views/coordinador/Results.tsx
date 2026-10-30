import { useState, useEffect } from 'react'
import { Check, AlertTriangle, Eye, Clock } from 'lucide-react'
import {
  useDB,
  actions,
  stats,
  getDocenteConsolidatedGrade,
  isEvaluationConsolidated,
  getDocenteCadi,
  type Form,
  type FormKind,
} from '../../store'
import { Header, Card, Field, Empty, Bar, input } from '../common'
import { Report } from './Report'

export function Filters({
  formId,
  setFormId,
  docenteId,
  setDocenteId,
  teacherId,
  setTeacherId,
  kind,
}: {
  formId: string
  setFormId: (s: string) => void
  docenteId?: string
  setDocenteId?: (s: string) => void
  teacherId?: string
  setTeacherId?: (s: string) => void
  kind?: FormKind
}) {
  const db = useDB()
  const activeDocenteId = docenteId ?? teacherId ?? ''
  const handleDocenteChange = (val: string) => {
    if (setDocenteId) setDocenteId(val)
    if (setTeacherId) setTeacherId(val)
  }

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <Field label="Evaluación / período">
        <select className={input} value={formId} onChange={(e) => setFormId(e.target.value)}>
          {db.forms.filter((f) => !kind || f.kind === kind).map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>
      </Field>
      <Field label="Docente">
        <select className={input} value={activeDocenteId} onChange={(e) => handleDocenteChange(e.target.value)}>
          <option value="">Todos los docentes</option>
          {db.users.filter((u) => u.role === 'docente').map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </Field>
    </div>
  )
}

export function TextAnswers({
  form,
  responses,
}: {
  form: Form
  responses: { id: string; answers: Record<string, string>; observation: string }[]
}) {
  const texts = responses.flatMap((r) => [
    ...form.questions.filter((q) => q.type !== 'escala' && r.answers[q.id]).map((q) => ({ id: r.id + q.id, label: q.text, text: r.answers[q.id] })),
    ...(r.observation ? [{ id: r.id + 'obs', label: 'Observación', text: r.observation }] : []),
  ])
  if (!texts.length) return null
  return (
    <Card className="space-y-3 lg:col-span-2">
      <h3 className="font-semibold">
        Comentarios y observaciones <span className="text-xs font-normal text-ink/50">(anónimos)</span>
      </h3>
      {texts.map((t) => (
        <blockquote key={t.id} className="border-l-2 border-ochre pl-3 text-sm">
          <span className="text-xs text-ink/50">{t.label}</span>
          <p className="font-serif text-lg">“{t.text}”</p>
        </blockquote>
      ))}
    </Card>
  )
}

export function Results() {
  const db = useDB()

  useEffect(() => {
    actions.syncAllResponses().catch(() => {})
  }, [])

  const [formId, setFormId] = useState(db.forms[0]?.id ?? '')
  const [docenteId, setDocenteId] = useState('')
  const [selectedReportDocenteId, setSelectedReportDocenteId] = useState<string | null>(null)
  const s = stats(db, formId, docenteId)
  const selectedForm = db.forms.find((f) => f.id === formId)
  const docente = db.users.find((u) => u.id === docenteId)
  const consolidated = docenteId ? getDocenteConsolidatedGrade(db, docenteId, selectedForm?.period) : null
  const docenteConsolidation = consolidated ? isEvaluationConsolidated(consolidated, selectedForm) : null

  const allDocentesConsolidated = db.users
    .filter((u) => u.role === 'docente' && u.active)
    .map((t) => {
      const grade = getDocenteConsolidatedGrade(db, t.id, selectedForm?.period)
      const statusInfo = isEvaluationConsolidated(grade, selectedForm)
      return {
        docente: t,
        grade,
        cadi: getDocenteCadi(db.cadis, t),
        ...statusInfo,
      }
    })

  return (
    <>
      <Header
        title="Resultados de evaluación"
        sub="Ponderación institucional: 70% Evaluación Estudiantes + 30% Autoevaluación Docente."
      />
      <Filters {...{ formId, setFormId, docenteId, setDocenteId, teacherId: docenteId, setTeacherId: setDocenteId }} />


      {docente && consolidated && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-line bg-pine/5 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-pine">Eval. Estudiantes (70%)</p>
              <span className="text-[11px] font-mono text-ink/50">Factor 0.70</span>
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-pine">
              {consolidated.studentAvg !== null ? (
                <>
                  {consolidated.studentAvg.toFixed(2)}
                  <span className="text-sm font-normal text-ink/50"> / 5.00</span>
                </>
              ) : (
                <span className="text-lg font-medium text-ochre">Pendiente</span>
              )}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {consolidated.studentWeighted !== null
                ? `Aporte ponderado: ${consolidated.studentWeighted.toFixed(2)} / 3.50 pts · ${consolidated.studentResponsesCount} respuesta${consolidated.studentResponsesCount === 1 ? '' : 's'}`
                : 'Sin evaluaciones de estudiantes registradas'}
            </p>
          </div>

          <div className="rounded-lg border border-line bg-ochre/10 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-ochre">Autoevaluación (30%)</p>
              <span className="text-[11px] font-mono text-ink/50">Factor 0.30</span>
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-ochre">
              {consolidated.autoAvg !== null ? (
                <>
                  {consolidated.autoAvg.toFixed(2)}
                  <span className="text-sm font-normal text-ink/50"> / 5.00</span>
                </>
              ) : (
                <span className="text-lg font-medium text-ochre">Pendiente</span>
              )}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {consolidated.autoWeighted !== null
                ? `Aporte ponderado: ${consolidated.autoWeighted.toFixed(2)} / 1.50 pts`
                : 'Autoevaluación aún no completada por el docente'}
            </p>
          </div>

          <div className={`rounded-lg border p-4 ${
            docenteConsolidation && !docenteConsolidation.estaConsolidado
              ? 'border-amber-300 bg-amber-50/70'
              : consolidated.finalScore <= 3.9 && consolidated.hasEvaluations
              ? 'border-red-300 bg-red-50/60'
              : 'border-moss/40 bg-moss/10'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-pine">Definitiva Consolidada</p>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                docenteConsolidation && !docenteConsolidation.estaConsolidado
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : consolidated.isProvisional ? 'bg-ochre/20 text-ochre' : 'bg-moss/20 text-pine'
              }`}>
                {docenteConsolidation && !docenteConsolidation.estaConsolidado ? (
                  <>
                    <Clock size={10} /> En Curso
                  </>
                ) : consolidated.isProvisional ? (
                  'Provisional'
                ) : (
                  'Oficial (100%)'
                )}
              </span>
            </div>
            <p className="mt-2 font-serif text-3xl font-bold text-pine">
              {docenteConsolidation && !docenteConsolidation.estaConsolidado ? (
                <span className="text-xl font-bold text-amber-800">En Curso</span>
              ) : consolidated.hasEvaluations ? (
                <>
                  {consolidated.finalScore.toFixed(2)}
                  <span className="text-sm font-normal text-ink/50"> / 5.00</span>
                </>
              ) : (
                <span className="text-lg font-medium text-ink/40">Sin evaluar</span>
              )}
            </p>
            <p className="mt-1 text-xs">
              {docenteConsolidation && !docenteConsolidation.estaConsolidado ? (
                <span className="text-amber-800 font-medium">
                  Pendiente de autoevaluación y cierre institucional
                </span>
              ) : consolidated.requierePlanMejora ? (
                <span className="font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle size={12} /> Requiere plan de mejora (≤ 3.9)
                </span>
              ) : consolidated.hasEvaluations ? (
                <span className="font-medium text-pine flex items-center gap-1">
                  <Check size={12} /> Desempeño satisfactorio (≥ 4.0)
                </span>
              ) : (
                <span className="text-ink/50">Pendiente de instrumentos</span>
              )}
            </p>
          </div>
        </div>
      )}

      {!docenteId && (
        <Card className="mb-6 p-0">
          <div className="border-b border-line p-4">
            <h3 className="font-semibold text-pine">Consolidado General de Docentes (70% - 30%)</h3>
            <p className="text-xs text-ink/50">
              Desglose institucional: 70% evaluación estudiantil y 30% autoevaluación docente.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-paper uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="p-3">Docente</th>
                  <th className="p-3">Materia Asignada (CADI / CAI)</th>
                  <th className="p-3">Eval. Estudiantes (70%)</th>
                  <th className="p-3">Autoevaluación (30%)</th>
                  <th className="p-3">Definitiva Consolidada</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Desempeño Institucional</th>
                  <th className="p-3 text-right">Diagnóstico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {allDocentesConsolidated.map(({ docente: t, grade, cadi, estaConsolidado }) => {
                  const isCai = cadi?.tipo === 'CAI'
                  return (
                    <tr key={t.id} className="hover:bg-paper/30 transition">
                      <td className="p-3 font-semibold text-pine">{t.name}</td>
                      <td className="p-3">
                        {cadi ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink/80 font-medium">{cadi.nombre}</span>
                            {isCai ? (
                              <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                CAI
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                CADI
                              </span>
                            )}
                            <span className="text-[10px] text-ink/50">({cadi.semestre}°)</span>
                          </div>
                        ) : (
                          <span className="text-ink/40 italic">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {grade.studentAvg !== null ? (
                          <span>
                            <b className="font-mono">{grade.studentAvg.toFixed(2)}</b>
                            <span className="text-[11px] text-ink/50"> ({grade.studentWeighted?.toFixed(2)} pts · {grade.studentResponsesCount} resp.)</span>
                          </span>
                        ) : (
                          <span className="rounded bg-ochre/15 px-2 py-0.5 text-ochre font-medium">Pendiente</span>
                        )}
                      </td>
                      <td className="p-3">
                        {grade.autoAvg !== null ? (
                          <span>
                            <b className="font-mono">{grade.autoAvg.toFixed(2)}</b>
                            <span className="text-[11px] text-ink/50"> ({grade.autoWeighted?.toFixed(2)} pts)</span>
                          </span>
                        ) : (
                          <span className="rounded bg-ochre/15 px-2 py-0.5 text-ochre font-medium">Pendiente</span>
                        )}
                      </td>
                      <td className="p-3 font-serif font-bold text-pine text-sm">
                        {estaConsolidado ? `${grade.finalScore.toFixed(2)} / 5.00` : <span className="text-xs font-semibold text-amber-800">En Curso</span>}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex rounded-full bg-paper px-2 py-0.5 text-[10px] text-ink/70 border border-line">
                          {estaConsolidado ? grade.statusLabel : 'Pendiente de Consolidación'}
                        </span>
                      </td>
                      <td className="p-3">
                        {estaConsolidado ? (
                          grade.finalScore < 3.5 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 border border-red-300">
                              <AlertTriangle size={10} /> En Seguimiento (&lt; 3.5)
                            </span>
                          ) : grade.finalScore <= 3.9 ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                              <AlertTriangle size={10} /> Aceptable (3.5–3.9)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-300">
                              <Check size={10} /> Satisfactorio (≥ 4.0)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                            <Clock size={10} /> En Curso
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReportDocenteId(t.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-pine/10 hover:bg-pine hover:text-white px-2.5 py-1 text-[11px] font-semibold text-pine transition"
                          title="Ver Reporte Detallado MEDIT"
                        >
                          <Eye size={12} />
                          <span>Ver Reporte</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedReportDocenteId && (
        <Report
          initialDocenteId={selectedReportDocenteId}
          initialTeacherId={selectedReportDocenteId}
          onClose={() => setSelectedReportDocenteId(null)}
        />
      )}


      {!s || !s.responses.length ? (
        <Empty text="No hay respuestas registradas para los filtros seleccionados." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card className="flex flex-col justify-between bg-pine text-paper">
            <div>
              <p className="text-xs uppercase tracking-wider text-paper/60">Promedio del Instrumento</p>
              <p className="mt-2 font-serif text-6xl">{s.overall.toFixed(2)}</p>
              <p className="mt-1 text-sm text-paper/60">sobre 5.00 · {s.responses.length} respuestas recibidas</p>
            </div>
            {consolidated && (
              <div className="mt-4 border-t border-paper/15 pt-3 text-xs text-paper/80">
                <p>Nota Consolidada Docente:</p>
                <p className="font-serif text-2xl font-bold text-paper">{consolidated.finalScore.toFixed(2)} / 5.00</p>
              </div>
            )}
          </Card>
          <Card className="space-y-4">
            <h3 className="font-semibold text-pine">Promedio por Pregunta en este Instrumento</h3>
            {s.perQ.map((p) => <Bar key={p.question.id} label={p.question.text} value={p.avg} />)}
          </Card>
          <TextAnswers form={s.form} responses={s.responses} />
        </div>
      )}
    </>
  )
}
