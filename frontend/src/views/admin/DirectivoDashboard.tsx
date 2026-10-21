import { useState } from 'react'
import { Building2, Users, ClipboardList, Star, AlertTriangle } from 'lucide-react'
import { useDB, getFacultyGlobalMetrics } from '../../store'
import { Header, Card, input } from '../common'

export function DirectivoDashboard() {
  const db = useDB()
  const metrics = getFacultyGlobalMetrics(db)
  const [filterCadi, setFilterCadi] = useState<string>('')

  const filteredTeachers = metrics.teachers.filter(
    (item) => !filterCadi || item.cadi?.id === filterCadi
  )

  return (
    <div className="space-y-6">
      <Header
        title="Panel Directivo y Calidad Académica"
        sub="Monitoreo consolidado de la Facultad de Ingeniería (Sede Facatativá), participación estudiantil y ranking de reputación docente."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="bg-pine text-paper p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-paper/70">
            <span className="text-xs uppercase tracking-wider font-semibold">Promedio Facultad</span>
            <Building2 size={18} />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold">{metrics.overallAvg.toFixed(2)}</p>
            <p className="text-xs text-paper/60">sobre 5.00 institucional</p>
          </div>
          <div className="text-[11px] text-paper/70 border-t border-paper/15 pt-2">
            Consolidado histórico v_promedios
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-moss/30 bg-moss/5">
          <div className="flex items-center justify-between text-pine">
            <span className="text-xs uppercase tracking-wider font-semibold">Estudiantes Evaluadores</span>
            <Users size={18} />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold text-pine">{metrics.evaluatedStudents}</p>
            <p className="text-xs text-ink/60">estudiantes han participado</p>
          </div>
          <div className="text-[11px] text-ink/50 border-t border-line pt-2">
            Participación activa en el sistema
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-ochre/30 bg-ochre/5">
          <div className="flex items-center justify-between text-ochre">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Evaluaciones</span>
            <ClipboardList size={18} />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold text-ochre">{metrics.totalEvaluations}</p>
            <p className="text-xs text-ink/60">respuestas diligenciadas</p>
          </div>
          <div className="text-[11px] text-ink/50 border-t border-line pt-2">
            Evaluaciones y autoevaluaciones
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between border-line bg-paper">
          <div className="flex items-center justify-between text-pine">
            <span className="text-xs uppercase tracking-wider font-semibold">Docentes Destacados</span>
            <Star size={18} className="text-ochre" />
          </div>
          <div className="my-2">
            <p className="font-serif text-5xl font-bold text-pine">
              {metrics.topTeachersCount} <span className="text-2xl font-normal text-ink/40">/ {metrics.teachers.length}</span>
            </p>
            <p className="text-xs text-ink/60">con promedio ≥ 4.5</p>
          </div>
          <div className="text-[11px] text-ink/50 border-t border-line pt-2">
            {metrics.teachers.length > 0
              ? `${Math.round((metrics.topTeachersCount / metrics.teachers.length) * 100)}% de la planta docente`
              : 'Sin docentes'}
          </div>
        </Card>
      </div>

      <Card className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-5">
          <div>
            <h3 className="font-serif text-2xl text-pine">Ranking de Reputación Docente</h3>
            <p className="text-xs text-ink/60">Docentes ordenados por promedio general de calificación (de mayor a menor)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-ink/60 uppercase">Filtrar por CADI:</span>
            <select
              className={`${input} w-auto py-1.5 text-xs`}
              value={filterCadi}
              onChange={(e) => setFilterCadi(e.target.value)}
            >
              <option value="">Todos los CADIs</option>
              {db.cadis.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/60">
              <tr>
                <th className="p-4">Posición / Docente</th>
                <th>CADI / Asignatura</th>
                <th>Eval. Estudiantes (70%)</th>
                <th>Autoevaluación (30%)</th>
                <th>Definitiva Consolidada</th>
                <th>Reputación / Estado</th>
                <th className="p-4">Desempeño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {filteredTeachers.map((item, index) => (
                <tr key={item.teacher.id} className="hover:bg-paper/40 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0 ? 'bg-ochre text-white' : index === 1 ? 'bg-pine text-white' : 'bg-line text-ink/70'
                      }`}>
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-sm text-pine">{item.teacher.name}</p>
                        <p className="font-mono text-xs text-ink/50">{item.teacher.email}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {item.cadi ? (
                      <div>
                        <p className="font-medium">{item.cadi.nombre}</p>
                        <span className="text-[11px] text-ochre font-mono">
                          {item.cadi.esArticulador ? '★ CADI Articulador' : item.cadi.codigo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-ink/40">Sin CADI asignado</span>
                    )}
                  </td>
                  <td>
                    {item.consolidated.studentAvg !== null ? (
                      <div>
                        <span className="font-semibold font-mono text-sm">{item.consolidated.studentAvg.toFixed(2)}</span>
                        <span className="text-[11px] text-ink/50"> ({item.consolidated.studentWeighted?.toFixed(2)} pts)</span>
                        <p className="text-[10px] text-ink/40">{item.consolidated.studentResponsesCount} respuestas</p>
                      </div>
                    ) : (
                      <span className="rounded bg-ochre/15 px-2 py-0.5 text-[11px] font-medium text-ochre">Pendiente</span>
                    )}
                  </td>
                  <td>
                    {item.consolidated.autoAvg !== null ? (
                      <div>
                        <span className="font-semibold font-mono text-sm">{item.consolidated.autoAvg.toFixed(2)}</span>
                        <span className="text-[11px] text-ink/50"> ({item.consolidated.autoWeighted?.toFixed(2)} pts)</span>
                        <p className="text-[10px] text-ink/40">Diligenciada</p>
                      </div>
                    ) : (
                      <span className="rounded bg-ochre/15 px-2 py-0.5 text-[11px] font-medium text-ochre">Pendiente</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-baseline gap-1">
                      <span className="font-serif text-lg font-bold text-pine">
                        {item.consolidated.hasEvaluations ? item.consolidated.finalScore.toFixed(2) : '—'}
                      </span>
                      <span className="text-[11px] text-ink/50">/ 5.00</span>
                    </div>
                    {item.consolidated.requierePlanMejora ? (
                      <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        <AlertTriangle size={10} /> Plan de mejora (≤ 3.9)
                      </span>
                    ) : item.consolidated.hasEvaluations ? (
                      <span className="text-[10px] text-moss font-medium">✓ Satisfactorio</span>
                    ) : (
                      <span className="text-[10px] text-ink/40">Sin evaluar</span>
                    )}
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${item.badgeClass}`}>
                      {item.label}
                    </span>
                    {item.consolidated.isProvisional && (
                      <p className="text-[10px] text-ochre font-medium mt-0.5">Nota Provisional</p>
                    )}
                  </td>
                  <td className="p-4 w-44">
                    <div className="w-full">
                      <div className="h-2 w-full rounded-full bg-paper">
                        <div
                          className={`h-2 rounded-full ${
                            item.avg >= 4.5 ? 'bg-moss' : item.avg >= 4.0 ? 'bg-pine' : item.avg >= 3.0 ? 'bg-ochre' : 'bg-red-500'
                          }`}
                          style={{ width: `${(item.avg / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
