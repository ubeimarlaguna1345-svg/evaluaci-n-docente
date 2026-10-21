import { useState } from 'react'
import { Check, AlertTriangle, Layers } from 'lucide-react'
import {
  useDB,
  stats,
  getTeacherConsolidatedGrade,
} from '../../store'
import { Header, Card, Empty, Bar, input } from '../common'

export function Statistics() {
  const db = useDB()
  const teachers = db.users.filter((u) => u.role === 'docente')
  const evals = db.forms.filter((f) => f.kind === 'evaluacion')
  const autos = db.forms.filter((f) => f.kind === 'autoevaluacion')
  const [formId, setFormId] = useState(evals[0]?.id ?? '')
  const kpis = [
    { label: 'Usuarios activos', v: db.users.filter((u) => u.active).length },
    { label: 'CADIs registrados', v: db.cadis.length },
    { label: 'Evaluaciones', v: evals.length },
    { label: 'Respuestas totales', v: db.formResponses.length },
  ]
  const autoDone = autos.map((a) => ({ a, n: new Set(db.formResponses.filter((r) => r.formId === a.id).map((r) => r.userId)).size }))
  const formActual = db.forms.find((f) => f.id === formId)
  const globalStats = formActual ? stats(db, formId) : null

  const teachersConsolidated = teachers.map((t) => ({
    teacher: t,
    grade: getTeacherConsolidatedGrade(db, t.id, formActual?.period),
    cadi: db.cadis.find((c) => c.docenteId === t.id),
  }))

  return (
    <>
      <Header
        title="Estadísticas y reportes"
        sub="Ponderación institucional (70% Estudiantes - 30% Autoevaluación) y dimensiones MEDIT."
      />
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white p-5">
            <p className="font-serif text-5xl text-pine">{k.v}</p>
            <p className="text-xs uppercase tracking-wider text-ink/50">{k.label}</p>
          </div>
        ))}
      </div>

      {globalStats && Object.keys(globalStats.porDimension).length > 0 && (
        <Card className="mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-pine flex items-center gap-2">
              <Layers size={18} />Desempeño Global por Dimensiones MEDIT
            </h3>
            <span className="font-mono text-xs text-ochre">{formActual?.title}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Object.entries(globalStats.porDimension).map(([dim, data]) => (
              <Bar key={dim} label={`${dim} (${data.count} preguntas)`} value={data.avg} />
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-6 p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4">
          <div>
            <h3 className="font-semibold text-pine">Consolidado por Docente (70% - 30%)</h3>
            <p className="text-xs text-ink/50">Desglose de calificaciones y clasificación frente al umbral de mejora (≤ 3.9)</p>
          </div>
          <select className={`${input} w-auto`} value={formId} onChange={(e) => setFormId(e.target.value)}>
            {evals.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper uppercase tracking-wider text-ink/60">
              <tr>
                <th className="p-3">Docente</th>
                <th className="p-3">CADI</th>
                <th className="p-3">Eval. Estudiantes (70%)</th>
                <th className="p-3">Autoevaluación (30%)</th>
                <th className="p-3">Definitiva Consolidada</th>
                <th className="p-3">Desempeño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {teachersConsolidated.map(({ teacher: t, grade, cadi }) => (
                <tr key={t.id} className="hover:bg-paper/30 transition">
                  <td className="p-3 font-semibold text-pine">{t.name}</td>
                  <td className="p-3 text-ink/70">{cadi?.nombre || '—'}</td>
                  <td className="p-3">
                    {grade.studentAvg !== null ? (
                      <span>
                        <b className="font-mono">{grade.studentAvg.toFixed(2)}</b>
                        <span className="text-[11px] text-ink/50"> ({grade.studentWeighted?.toFixed(2)} pts)</span>
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
                    {grade.hasEvaluations ? `${grade.finalScore.toFixed(2)} / 5.00` : '—'}
                  </td>
                  <td className="p-3">
                    {grade.requierePlanMejora ? (
                      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                        <AlertTriangle size={11} /> Requiere Plan de Mejora (≤ 3.9)
                      </span>
                    ) : grade.hasEvaluations ? (
                      <span className="inline-flex items-center gap-1 rounded bg-moss/20 px-2.5 py-1 text-[11px] font-medium text-pine">
                        <Check size={11} /> Satisfactorio (≥ 4.0)
                      </span>
                    ) : (
                      <span className="text-ink/40">Sin evaluar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <h3 className="font-semibold text-pine">Participación en autoevaluación docente</h3>
          {autoDone.length ? (
            autoDone.map(({ a, n }) => (
              <Bar key={a.id} label={`${a.title} · ${n}/${teachers.length} docentes`} value={n} max={Math.max(teachers.length, 1)} />
            ))
          ) : (
            <Empty text="No hay autoevaluaciones." />
          )}
        </Card>
        <Card className="space-y-4">
          <h3 className="font-semibold text-pine">Distribución de Cumplimiento</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-moss/10 p-3 text-pine">
              <span className="font-semibold">Docentes con Desempeño Satisfactorio (≥ 4.0)</span>
              <span className="font-serif text-lg font-bold">
                {teachersConsolidated.filter((tc) => tc.grade.hasEvaluations && tc.grade.finalScore >= 4.0).length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-red-700">
              <span className="font-semibold">Docentes con Requerimiento de Mejora (≤ 3.9)</span>
              <span className="font-serif text-lg font-bold">
                {teachersConsolidated.filter((tc) => tc.grade.hasEvaluations && tc.grade.finalScore <= 3.9).length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-paper p-3 text-ink/70">
              <span>Docentes sin evaluaciones registradas</span>
              <span className="font-serif text-lg font-bold">
                {teachersConsolidated.filter((tc) => !tc.grade.hasEvaluations).length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
