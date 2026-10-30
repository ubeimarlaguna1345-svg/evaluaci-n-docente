import { useState, useEffect, useMemo } from 'react'
import { Check, AlertTriangle, Layers, Clock } from 'lucide-react'
import {
  useDB,
  actions,
  getDocenteConsolidatedGrade,
  isEvaluationConsolidated,
  getDocenteCadi,
  MEDIT_10_QUESTIONS,
} from '../../store'
import { Header, Card, Empty, Bar, input } from '../common'

export function Statistics() {
  const db = useDB()

  useEffect(() => {
    actions.syncAllResponses().catch(() => {})
    actions.fetchEvaluaciones().catch(() => {})
  }, [])

  const docentes = db.users.filter((u) => u.role === 'docente')
  const evals = db.forms.filter((f) => f.kind === 'evaluacion')
  const autos = db.forms.filter((f) => f.kind === 'autoevaluacion')
  const [formId, setFormId] = useState('todos')

  const evaluaciones = db.forms
  const respuestas = db.formResponses

  const kpis = [
    { label: 'Usuarios activos', v: db.users.filter((u) => u.active).length },
    { label: 'CADIs registrados', v: db.cadis.length },
    { label: 'Evaluaciones', v: evaluaciones.length },
    { label: 'Respuestas totales', v: respuestas.length },
  ]

  const autoDone = autos.map((a) => ({
    a,
    n: new Set(db.formResponses.filter((r) => r.formId === a.id).map((r) => r.userId)).size,
  }))

  const formActual = formId === 'todos' ? null : db.forms.find((f) => f.id === formId)

  const dimensionesMEDIT = useMemo(() => {
    const CANONICAS = [
      { id: 'claridad', label: 'Claridad conceptual', fullName: 'Claridad conceptual y explicación' },
      { id: 'retroalimentacion', label: 'Retroalimentación', fullName: 'Retroalimentación y entrega oportuna de notas' },
      { id: 'metodologia', label: 'Metodología', fullName: 'Metodología y aplicación práctica' },
      { id: 'organizacion', label: 'Organización', fullName: 'Organización y cumplimiento del programa' },
      { id: 'medit', label: 'Modelo MEDIT', fullName: 'Modelo MEDIT y Mediaciones Tecnológicas' },
      { id: 'recursos', label: 'Recursos', fullName: 'Recursos y Gestión Institucional' },
    ]

    const relevantResponses = formId === 'todos' || !formId
      ? db.formResponses
      : db.formResponses.filter(
          (r) =>
            r.formId === formId ||
            (r.formId.startsWith('auto-') && r.formId.replace('auto-', '') === formId)
        )

    const questionDimMap = new Map<string, string>()
    MEDIT_10_QUESTIONS.forEach((q) => {
      questionDimMap.set(q.id, q.dimension || '')
    })
    db.forms.forEach((f) => {
      f.questions?.forEach((q) => {
        if (q.dimension) questionDimMap.set(q.id, q.dimension)
      })
    })

    const scoresByDim: Record<string, number[]> = {
      claridad: [],
      retroalimentacion: [],
      metodologia: [],
      organizacion: [],
      medit: [],
      recursos: [],
    }

    relevantResponses.forEach((r) => {
      const answersObj = r.answers || (r as any).respuestas || {}
      Object.entries(answersObj).forEach(([qId, rawVal]) => {
        let num = Number(rawVal)
        if (isNaN(num)) {
          const lower = String(rawVal).trim().toLowerCase()
          if (lower === 'si' || lower === 'sí') num = 5
          else if (lower === 'tal_vez' || lower === 'tal vez' || lower === 'parcialmente') num = 3
          else if (lower === 'no') num = 1
        }
        if (isNaN(num) || num <= 0) return

        const dim = (questionDimMap.get(qId) || '').toLowerCase()
        const qIdLower = qId.toLowerCase()

        if (
          qIdLower.includes('claridad') ||
          qIdLower.includes('expositiva') ||
          dim.includes('claridad') ||
          dim.includes('explicación') ||
          dim.includes('dominio')
        ) {
          scoresByDim.claridad.push(num)
        } else if (
          qIdLower.includes('retro') ||
          qIdLower.includes('comunicacion') ||
          dim.includes('retroalimentación') ||
          dim.includes('comunicación') ||
          dim.includes('notas')
        ) {
          scoresByDim.retroalimentacion.push(num)
        } else if (
          qIdLower.includes('metodologia') ||
          dim.includes('metodología') ||
          dim.includes('práctica') ||
          dim.includes('problemas reales')
        ) {
          scoresByDim.metodologia.push(num)
        } else if (
          qIdLower.includes('organizacion') ||
          dim.includes('organización') ||
          dim.includes('cronograma') ||
          dim.includes('cumplimiento')
        ) {
          scoresByDim.organizacion.push(num)
        } else if (
          qIdLower.includes('tic') ||
          qIdLower.includes('medit') ||
          dim.includes('medit') ||
          dim.includes('tecnológicas') ||
          dim.includes('digital')
        ) {
          scoresByDim.medit.push(num)
        } else if (
          qIdLower.includes('infraestructura') ||
          qIdLower.includes('conectividad') ||
          dim.includes('recurso') ||
          dim.includes('gestión') ||
          dim.includes('institucional')
        ) {
          scoresByDim.recursos.push(num)
        } else {
          scoresByDim.claridad.push(num)
        }
      })
    })

    return CANONICAS.map((c) => {
      const list = scoresByDim[c.id] || []
      const avg = list.length > 0 ? Number((list.reduce((acc, v) => acc + v, 0) / list.length).toFixed(2)) : 0
      return {
        id: c.id,
        label: c.label,
        fullName: c.fullName,
        avg,
        count: list.length,
      }
    })
  }, [db.formResponses, db.forms, formId])

  const docentesConsolidated = docentes.map((t) => {
    const periodFilter = formId === 'todos' ? undefined : formActual?.period
    const grade = getDocenteConsolidatedGrade(db, t.id, periodFilter)
    const statusInfo = isEvaluationConsolidated(grade, formActual)
    return {
      docente: t,
      grade,
      cadi: getDocenteCadi(db.cadis, t) || db.cadis.find((c) => c.docenteId === t.id),
      ...statusInfo,
    }
  })

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

      <Card className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div>
            <h3 className="font-semibold text-pine flex items-center gap-2">
              <Layers size={18} />Desempeño Global por Dimensiones MEDIT
            </h3>
            <p className="text-xs text-ink/60">
              Promedio ponderado de valoraciones recibidas por dimensión formativa institucional
            </p>
          </div>
          <span className="font-mono text-xs text-ochre bg-ochre/10 px-2.5 py-1 rounded border border-ochre/20">
            {formId === 'todos' || !formActual ? 'Consolidado Global (Todos los instrumentos)' : formActual.title}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {dimensionesMEDIT.map((dim) => (
            <Bar
              key={dim.id}
              label={`${dim.label} (${dim.count} respuestas)`}
              value={dim.avg}
              displayValue={dim.avg > 0 ? `${dim.avg.toFixed(1)} / 5.0` : 'Sin respuestas'}
            />
          ))}
        </div>
      </Card>

      <Card className="mb-6 p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4">
          <div>
            <h3 className="font-semibold text-pine">Consolidado por Docente (70% - 30%)</h3>
            <p className="text-xs text-ink/50">Desglose de calificaciones y clasificación frente al umbral de mejora (&lt; 4.0)</p>
          </div>
          <select className={`${input} w-auto`} value={formId} onChange={(e) => setFormId(e.target.value)}>
            <option value="todos">Todos los instrumentos (Consolidado general)</option>
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
              {docentesConsolidated.map(({ docente: t, grade, cadi, estaConsolidado }) => (
                <tr key={t.id} className="hover:bg-paper/30 transition">
                  <td className="p-3 font-semibold text-pine">{t.name}</td>
                  <td className="p-3 text-ink/70">{cadi?.nombre || '—'}</td>
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
                    {estaConsolidado ? (
                      grade.finalScore < 3.5 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 border border-red-300">
                          <AlertTriangle size={11} /> En Seguimiento (&lt; 3.5)
                        </span>
                      ) : grade.finalScore <= 3.9 ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-300">
                          <AlertTriangle size={11} /> Aceptable (3.5 – 3.9)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 border border-emerald-300">
                          <Check size={11} /> Satisfactorio (≥ 4.0)
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 border border-amber-300">
                        <Clock size={11} /> En Curso
                      </span>
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
              <Bar key={a.id} label={`${a.title} · ${n}/${docentes.length} docentes`} value={n} max={Math.max(docentes.length, 1)} />
            ))
          ) : (
            <Empty text="No hay autoevaluaciones." />
          )}
        </Card>
        <Card className="space-y-4">
          <h3 className="font-semibold text-pine">Distribución de Cumplimiento</h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3 text-emerald-800 border border-emerald-200">
              <span className="font-semibold">Docentes con Desempeño Satisfactorio (≥ 4.0)</span>
              <span className="font-serif text-lg font-bold">
                {docentesConsolidated.filter((tc) => tc.grade.hasEvaluations && tc.grade.finalScore >= 4.0).length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-amber-800 border border-amber-200">
              <span className="font-semibold">Docentes con Desempeño Aceptable (3.5 – 3.9)</span>
              <span className="font-serif text-lg font-bold">
                {docentesConsolidated.filter((tc) => tc.grade.hasEvaluations && tc.grade.finalScore >= 3.5 && tc.grade.finalScore <= 3.9).length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 text-red-700 border border-red-200">
              <span className="font-semibold">Docentes En Seguimiento (&lt; 3.5)</span>
              <span className="font-serif text-lg font-bold">
                {docentesConsolidated.filter((tc) => tc.grade.hasEvaluations && tc.grade.finalScore < 3.5).length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-paper p-3 text-ink/70">
              <span>Docentes sin evaluaciones registradas</span>
              <span className="font-serif text-lg font-bold">
                {docentesConsolidated.filter((tc) => !tc.grade.hasEvaluations).length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

export const Estadisticas = Statistics
export default Statistics
