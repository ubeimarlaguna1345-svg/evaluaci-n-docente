import { useState } from 'react'
import { FileText, CheckCircle2, AlertTriangle, Layers } from 'lucide-react'
import {
  useDB,
  stats,
  getTeacherConsolidatedGrade,
} from '../../store'
import { Header, Card, Field, Bar, input, btn, btnGhost } from '../common'

export function Report() {
  const db = useDB()
  const allTeachers = db.users.filter((u) => u.role === 'docente')
  const evals = db.forms.filter((f) => f.kind === 'evaluacion')
  const [formId, setFormId] = useState(evals[0]?.id ?? '')
  const selectedForm = db.forms.find((f) => f.id === formId)
  const selectedPeriod = selectedForm?.period

  const teachersWithGrades = allTeachers.map((t) => ({
    teacher: t,
    grade: getTeacherConsolidatedGrade(db, t.id, selectedPeriod),
    cadi: db.cadis.find((c) => c.docenteId === t.id),
  }))

  const improvementTeachers = teachersWithGrades.filter(
    (item) => item.grade.hasEvaluations && item.grade.finalScore <= 3.9
  )

  const [teacherId, setTeacherId] = useState(improvementTeachers[0]?.teacher.id ?? '')
  const [generated, setGenerated] = useState(false)

  const activeTeacherId = improvementTeachers.some((it) => it.teacher.id === teacherId)
    ? teacherId
    : (improvementTeachers[0]?.teacher.id ?? '')

  const currentItem = improvementTeachers.find((it) => it.teacher.id === activeTeacherId)
  const s = selectedForm && activeTeacherId ? stats(db, selectedForm.id, activeTeacherId) : null
  const auto = db.formResponses.filter(
    (r) => (r.userId === activeTeacherId || r.teacherId === activeTeacherId) &&
      db.forms.find((f) => f.id === r.formId)?.kind === 'autoevaluacion' &&
      (!selectedPeriod || db.forms.find((f) => f.id === r.formId)?.period === selectedPeriod)
  )

  const sortedDimensions = s && s.porDimension
    ? Object.entries(s.porDimension).sort((a, b) => a[1].avg - b[1].avg)
    : []

  const criticalDimensions = sortedDimensions.filter(([, data]) => data.avg <= 3.9)

  return (
    <>
      <Header
        title="Reporte de mejora docente"
        sub="Detección y formulación de planes de mejoramiento pedagógico (Umbral institucional: Calificación consolidada ≤ 3.9)."
      />

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <Field label="Evaluación / período">
            <select
              className={input}
              value={formId}
              onChange={(e) => {
                setFormId(e.target.value)
                setGenerated(false)
              }}
            >
              {evals.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title} ({f.period})
                </option>
              ))}
            </select>
          </Field>
        </div>

        {improvementTeachers.length > 0 && (
          <div className="flex-1 min-w-72">
            <Field label="Docente con Requerimiento de Plan de Mejora (Consolidado ≤ 3.9)">
              <select
                className={input}
                value={activeTeacherId}
                onChange={(e) => {
                  setTeacherId(e.target.value)
                  setGenerated(false)
                }}
              >
                {improvementTeachers.map(({ teacher, grade }) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} — Definitiva: {grade.finalScore.toFixed(2)} / 5.00 ({grade.statusLabel})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>

      {improvementTeachers.length === 0 ? (
        <Card className="border-moss/40 bg-moss/5 text-center p-8">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-moss/20 text-pine">
            <CheckCircle2 size={32} />
          </div>
          <h3 className="font-serif text-2xl font-bold text-pine">Desempeño Satisfactorio</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-pine/90">
            No hay docentes que requieran plan de mejora pedagógica en este período (todos los promedios son iguales o superiores a 4.0).
          </p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-ink/60">
            Los docentes evaluados en este ciclo académico cumplen con los estándares de excelencia del MEDIT y no ameritan apertura de plan de intervención.
          </p>
        </Card>
      ) : (
        <>
          <button
            className={`${btn} mb-6`}
            onClick={() => setGenerated(true)}
            disabled={!activeTeacherId}
          >
            <FileText size={16} />
            Generar reporte de mejora
          </button>

          {generated && currentItem && (
            <Card className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      ⚠️ Plan de Mejora Pedagógica Requerido
                    </span>
                    <span className="text-xs uppercase tracking-wider text-ochre">
                      {selectedForm?.period || 'Período Activo'}
                    </span>
                  </div>
                  <h2 className="mt-2 font-serif text-4xl text-pine">{currentItem.teacher.name}</h2>
                  <p className="mt-1 text-xs text-ink/60">
                    Docente / Gestor del conocimiento · {currentItem.teacher.sede || 'Facultad de Ingeniería'} · {currentItem.teacher.carrera}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">Nota Final Consolidada</p>
                  <p className="font-serif text-5xl font-bold text-red-600">
                    {currentItem.grade.finalScore.toFixed(2)}
                  </p>
                  <p className="text-xs text-ink/50">sobre 5.00 ({currentItem.grade.statusLabel})</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="rounded-lg border border-line bg-pine/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-pine">Eval. Estudiantes (70%)</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-pine">
                    {currentItem.grade.studentAvg !== null ? (
                      <>
                        {currentItem.grade.studentAvg.toFixed(2)}
                        <span className="text-xs font-normal text-ink/50"> / 5.00</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-ochre">Pendiente</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    {currentItem.grade.studentWeighted !== null
                      ? `Aporte: ${currentItem.grade.studentWeighted.toFixed(2)} / 3.50 pts`
                      : 'Pendiente de respuestas'}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-ochre/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ochre">Autoevaluación (30%)</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-ochre">
                    {currentItem.grade.autoAvg !== null ? (
                      <>
                        {currentItem.grade.autoAvg.toFixed(2)}
                        <span className="text-xs font-normal text-ink/50"> / 5.00</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-ochre">Pendiente</span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    {currentItem.grade.autoWeighted !== null
                      ? `Aporte: ${currentItem.grade.autoWeighted.toFixed(2)} / 1.50 pts`
                      : 'Autoevaluación pendiente'}
                  </p>
                </div>

                <div className="rounded-lg border border-red-300 bg-red-50/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Definitiva Consolidada</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-red-700">
                    {currentItem.grade.finalScore.toFixed(2)}
                    <span className="text-xs font-normal text-ink/50"> / 5.00</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {currentItem.grade.finalScore <= 3.9 ? 'Calificación ≤ 3.9 (Crítica)' : 'Satisfactoria'}
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-paper p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Ponderación PGC (20%)</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-pine">
                    {(currentItem.grade.finalScore * 0.20).toFixed(2)}
                    <span className="text-xs font-normal text-ink/50"> / 1.00 pts</span>
                  </p>
                  <p className="mt-1 text-xs text-ink/60">Numeral 13 Lineamientos PGC</p>
                </div>
              </div>

              <div className="space-y-4 rounded-lg border-2 border-red-200 bg-red-50/30 p-5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-red-600" size={20} />
                  <div>
                    <h3 className="font-semibold text-red-900">
                      Dimensiones MEDIT Críticas (Prioridad de Compromisos de Mejora)
                    </h3>
                    <p className="text-xs text-red-700/80">
                      Dimensiones evaluadas con puntaje promedio menor o igual a 3.9 que requieren intervención pedagógica prioritaria.
                    </p>
                  </div>
                </div>

                {criticalDimensions.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {criticalDimensions.map(([dim, data]) => (
                      <div key={dim} className="rounded-md border border-red-200 bg-white p-4 shadow-xs">
                        <div className="flex items-baseline justify-between">
                          <span className="font-semibold text-sm text-red-900">{dim}</span>
                          <span className="rounded bg-red-100 px-2 py-0.5 font-mono text-xs font-bold text-red-700">
                            {data.avg.toFixed(2)} / 5.00
                          </span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-paper">
                          <div
                            className="h-2 rounded-full bg-red-600"
                            style={{ width: `${(data.avg / 5) * 100}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-ink/60">
                          {data.count} preguntas evaluadas en esta dimensión.
                        </p>
                        <div className="mt-2 rounded bg-red-50 p-2 text-[11px] text-red-800">
                          <b>Recomendación MEDIT:</b> Formular compromisos formativos específicos en metodologías activas y acompañamiento tutorial para esta dimensión.
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-ink/60">
                    Las dimensiones individuales se encuentran homogéneas. Revisar oportunidades específicas por pregunta.
                  </p>
                )}
              </div>

              {sortedDimensions.length > 0 && (
                <div className="space-y-3 rounded-lg border border-line bg-paper/50 p-4">
                  <h3 className="flex items-center gap-2 font-semibold text-pine">
                    <Layers size={17} />Desglose Completo por Dimensiones del MEDIT
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {sortedDimensions.map(([dim, data]) => (
                      <Bar
                        key={dim}
                        label={`${dim} ${data.avg <= 3.9 ? '⚠️ (Crítico)' : ''} (${data.count} preg.)`}
                        value={data.avg}
                      />
                    ))}
                  </div>
                </div>
              )}

              {s && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-moss">Fortalezas detectadas (≥ 4.0)</h3>
                    {s.perQ.filter((p) => p.avg >= 4).map((p) => (
                      <Bar key={p.question.id} label={p.question.text} value={p.avg} />
                    ))}
                    {!s.perQ.some((p) => p.avg >= 4) && (
                      <p className="text-sm text-ink/50">Sin ítems con promedio ≥ 4.0.</p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold text-red-700">Oportunidades de mejora (&lt; 3.5)</h3>
                    {s.perQ.filter((p) => p.avg < 3.5 && p.n > 0).map((p) => (
                      <Bar key={p.question.id} label={p.question.text} value={p.avg} />
                    ))}
                    {!s.perQ.some((p) => p.avg < 3.5 && p.n > 0) && (
                      <p className="text-sm text-ink/50">Sin ítems por debajo de 3.5.</p>
                    )}
                  </div>
                </div>
              )}

              {s && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-pine">Observaciones cualitativas de estudiantes</h3>
                  {s.responses.filter((r) => r.observation).map((r) => (
                    <blockquote key={r.id} className="border-l-2 border-ochre pl-3 font-serif text-lg">
                      “{r.observation}”
                    </blockquote>
                  ))}
                  {!s.responses.some((r) => r.observation) && (
                    <p className="text-xs text-ink/50">Sin observaciones de texto en este período.</p>
                  )}
                </div>
              )}

              <p className="rounded-md bg-paper p-3 text-sm">
                Autoevaluación del docente: {auto.length ? `Diligenciada (${auto.length} registro)` : 'Pendiente por parte del docente.'}
              </p>

              <div className="rounded-lg border border-line bg-white p-5 space-y-3">
                <h3 className="font-serif text-xl text-pine">Formulación de Compromisos de Mejora Pedagógica</h3>
                <p className="text-xs text-ink/60">
                  De acuerdo con los lineamientos del MEDIT y los resultados críticos obtenidos (≤ 3.9), el docente y la coordinación establecen los siguientes compromisos:
                </p>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded border border-line p-3 bg-paper/40">
                    <b>Dimensión(es) a intervenir:</b>
                    <p className="mt-1 text-ink/80">
                      {criticalDimensions.length > 0
                        ? criticalDimensions.map(([d]) => d).join(', ')
                        : 'Actualización metodológica general'}
                    </p>
                  </div>
                  <div className="rounded border border-line p-3 bg-paper/40">
                    <b>Acciones pedagógicas recomendadas:</b>
                    <p className="mt-1 text-ink/80">
                      Participación en talleres de pedagogía activa del MEDIT, rediseño de rúbricas de evaluación de CADI y retroalimentación intermedia de clase.
                    </p>
                  </div>
                </div>
              </div>

              <button className={btnGhost} onClick={() => window.print()}>
                Imprimir / guardar PDF
              </button>
            </Card>
          )}
        </>
      )}
    </>
  )
}
