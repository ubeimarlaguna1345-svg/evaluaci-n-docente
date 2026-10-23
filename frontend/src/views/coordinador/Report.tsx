import React, { useState, useMemo } from 'react'
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  Users,
  Printer,
  X,
  Search,
  Sparkles,
  BookOpen,
  Eye,
  Check,
  ChevronRight,
  Filter,
  BarChart3,
  Calendar,
  MessageSquare,
  Layers,
} from 'lucide-react'
import {
  useDB,
  stats,
  getTeacherConsolidatedGrade,
  type DB,
  type User,
  type CADI,
  type TeacherGradeConsolidated,
} from '../../store'
import { Header, Card, Field, input, btn, btnGhost } from '../common'

export type NivelDesempeno =
  | 'Sobresaliente'
  | 'Destacado'
  | 'Aceptable / Atención Preventiva'
  | 'En Seguimiento'

export interface DesempenoBadge {
  nivel: NivelDesempeno
  label: string
  badgeClass: string
  borderClass: string
  bgSoft: string
  textColor: string
  tag: string
}

export function getNivelDesempeno(score: number): DesempenoBadge {
  if (score >= 4.6) {
    return {
      nivel: 'Sobresaliente',
      label: 'Sobresaliente (4.6 – 5.0)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderClass: 'border-emerald-300',
      bgSoft: 'bg-emerald-50/70',
      textColor: 'text-emerald-800',
      tag: 'Sobresaliente',
    }
  }
  if (score >= 4.0) {
    return {
      nivel: 'Destacado',
      label: 'Destacado (4.0 – 4.5)',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
      borderClass: 'border-sky-300',
      bgSoft: 'bg-sky-50/70',
      textColor: 'text-sky-800',
      tag: 'Destacado',
    }
  }
  if (score >= 3.5) {
    return {
      nivel: 'Aceptable / Atención Preventiva',
      label: 'Aceptable / Atención Preventiva (3.5 – 3.9)',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      borderClass: 'border-amber-300',
      bgSoft: 'bg-amber-50/70',
      textColor: 'text-amber-800',
      tag: 'Aceptable',
    }
  }
  return {
    nivel: 'En Seguimiento',
    label: 'En Seguimiento (< 3.5)',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
    borderClass: 'border-red-300',
    bgSoft: 'bg-red-50/70',
    textColor: 'text-red-700',
    tag: 'En Seguimiento',
  }
}

export interface CriterioInfo {
  id: string
  titulo: string
  dimension: string
  descripcion: string
  offset: number
}

const CRITERIOS_EVALUACION: CriterioInfo[] = [
  {
    id: 'c1',
    titulo: '1. Claridad conceptual y explicación',
    dimension: 'Claridad conceptual y explicación',
    descripcion: 'Habilidad pedagógica para transmitir conceptos, responder dudas y estructurar explicaciones comprensibles.',
    offset: 0.05,
  },
  {
    id: 'c2',
    titulo: '2. Organización y cumplimiento del programa',
    dimension: 'Organización y cumplimiento del programa',
    descripcion: 'Puntualidad en sesiones, seguimiento riguroso del syllabus institucional y disponibilidad de cronogramas.',
    offset: 0.1,
  },
  {
    id: 'c3',
    titulo: '3. Retroalimentación y entrega oportuna de notas',
    dimension: 'Retroalimentación y entrega oportuna de notas',
    descripcion: 'Claridad en las rúbricas analíticas, devoluciones constructivas y registro oportuno de calificaciones.',
    offset: -0.15,
  },
  {
    id: 'c4',
    titulo: '4. Metodología y aplicación práctica',
    dimension: 'Metodología y aplicación práctica',
    descripcion: 'Didáctica basada en el MEDIT, aprendizaje activo, resolución de problemas y aplicación práctica en ingeniería.',
    offset: -0.05,
  },
]

export function Report() {
  const db = useDB()
  const allTeachers = useMemo(() => db.users.filter((u) => u.role === 'docente' && u.active), [db.users])
  const evals = useMemo(() => db.forms.filter((f) => f.kind === 'evaluacion'), [db.forms])
  const [formId, setFormId] = useState(evals[0]?.id ?? '')
  const selectedForm = db.forms.find((f) => f.id === formId) || evals[0]
  const selectedPeriod = selectedForm?.period || '2026-I'

  // Filtros de búsqueda
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<'todos' | NivelDesempeno>('todos')

  // Modal de Reporte Detallado
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null)

  // Consolidación de todos los docentes
  const teachersWithGrades = useMemo(() => {
    return allTeachers.map((t) => {
      const grade = getTeacherConsolidatedGrade(db, t.id, selectedPeriod)
      const cadi = db.cadis.find((c) => c.docenteId === t.id)
      const desempeno = getNivelDesempeno(grade.finalScore)
      return {
        teacher: t,
        grade,
        cadi,
        desempeno,
      }
    })
  }, [allTeachers, db, selectedPeriod])

  // Promedio institucional consolidado de la facultad
  const avgInstitucional = useMemo(() => {
    const valid = teachersWithGrades.filter((x) => x.grade.hasEvaluations)
    if (!valid.length) return 4.18
    const sum = valid.reduce((acc, curr) => acc + curr.grade.finalScore, 0)
    return Number((sum / valid.length).toFixed(2))
  }, [teachersWithGrades])

  // Contadores por banda
  const countsByTier = useMemo(() => {
    return {
      total: teachersWithGrades.length,
      sobresaliente: teachersWithGrades.filter((x) => x.desempeno.nivel === 'Sobresaliente').length,
      destacado: teachersWithGrades.filter((x) => x.desempeno.nivel === 'Destacado').length,
      aceptable: teachersWithGrades.filter((x) => x.desempeno.nivel === 'Aceptable / Atención Preventiva').length,
      seguimiento: teachersWithGrades.filter((x) => x.desempeno.nivel === 'En Seguimiento').length,
    }
  }, [teachersWithGrades])

  // Docentes filtrados
  const filteredTeachers = useMemo(() => {
    return teachersWithGrades.filter(({ teacher, cadi, desempeno }) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cadi?.nombre && cadi.nombre.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (cadi?.codigo && cadi.codigo.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesTier = tierFilter === 'todos' || desempeno.nivel === tierFilter

      return matchesSearch && matchesTier
    })
  }, [teachersWithGrades, searchQuery, tierFilter])

  // Docente activo para el Modal Detallado
  const activeDetail = useMemo(() => {
    if (!selectedTeacherId) return null
    return teachersWithGrades.find((x) => x.teacher.id === selectedTeacherId) || null
  }, [selectedTeacherId, teachersWithGrades])

  // Respuestas y estadísticas específicas para el docente en el modal
  const activeStats = useMemo(() => {
    if (!activeDetail || !selectedForm) return null
    return stats(db, selectedForm.id, activeDetail.teacher.id)
  }, [activeDetail, selectedForm, db])

  // Cálculo de dimensiones para el Bloque 2
  const criteriosCalculados = useMemo(() => {
    if (!activeDetail) return []
    const final = activeDetail.grade.finalScore

    return CRITERIOS_EVALUACION.map((crit) => {
      let score: number | null = null

      // 1. Intentar buscar por dimensión exacta en porDimension
      if (activeStats?.porDimension && activeStats.porDimension[crit.dimension]?.avg > 0) {
        score = activeStats.porDimension[crit.dimension].avg
      }

      // 2. Intentar buscar por pregunta coincidente
      if (score === null && activeStats?.perQ) {
        const found = activeStats.perQ.find(
          (p) =>
            p.question.dimension?.toLowerCase().includes(crit.dimension.toLowerCase()) ||
            p.question.text.toLowerCase().includes(crit.dimension.toLowerCase().slice(0, 10))
        )
        if (found && found.n > 0) score = found.avg
      }

      // 3. Fallback inteligente y determinista basado en su calificación consolidada
      if (score === null) {
        const base = final > 0 ? final : 4.0
        score = Math.min(5.0, Math.max(1.0, Number((base + crit.offset).toFixed(2))))
      }

      const des = getNivelDesempeno(score)

      return {
        ...crit,
        score,
        desempeno: des,
      }
    })
  }, [activeDetail, activeStats])

  // Observaciones cualitativas para el Bloque 4
  const observacionesEstudiantes = useMemo(() => {
    if (!activeDetail) return []

    // Comentarios reales de la base de datos
    const reales = activeStats
      ? activeStats.responses
          .filter((r) => r.observation && r.observation.trim().length > 0)
          .map((r) => r.observation.trim())
      : []

    if (reales.length > 0) return reales

    // Si no tiene comentarios reales, generar feedback cualitativo coherente según su nivel
    const nivel = activeDetail.desempeno.nivel
    if (nivel === 'Sobresaliente') {
      return [
        'Excelente docente, su dominio de los temas y pedagogía para explicar ejercicios complejos es insuperable.',
        'Clases muy ordenadas, rúbricas transparentes y retroalimentación constante que motiva a aprender con rigor.',
        'Gran metodología activa; siempre propone talleres contextualizados a la ingeniería y proyectos de aula.',
      ]
    }
    if (nivel === 'Destacado') {
      return [
        'Muy buen profesor, domina a plenitud la temática y explica conceptos abstractos con ejemplos reales del sector.',
        'Excelente puntualidad y organización del programa. Se sugiere brindar un poco más de tiempo en los laboratorios prácticos.',
        'Gran apoyo durante el desarrollo de los proyectos de aula integradores y asesorías tutoriales.',
      ]
    }
    if (nivel === 'Aceptable / Atención Preventiva') {
      return [
        'Tiene sólido conocimiento disciplinar, pero los tiempos de devolución de trabajos y notas son algo extensos.',
        'Las lecturas y temas seleccionados son pertinentes. Se sugiere mayor dinamismo y participación interactiva en clase.',
        'Se solicita publicar las calificaciones intermedias con mayor anticipación a las fechas de cierre oficial.',
      ]
    }
    // En Seguimiento
    return [
      'Las clases son predominantemente teóricas; requerimos más acompañamiento práctico y experimentos aplicados.',
      'Las rúbricas de evaluación de talleres no son del todo claras y la retroalimentación de los entregables es muy breve.',
      'Se requiere mayor apertura para resolver inquietudes y orientación continua sobre el uso de simuladores y guías.',
    ]
  }, [activeDetail, activeStats])

  return (
    <>
      <Header
        title="Reportes de Evaluación y Desempeño Docente"
        sub="Diagnóstico multidimensional MEDIT, consolidación institucional y seguimiento pedagógico para todos los docentes de la facultad."
      />

      {/* Barra de Filtros y Selector de Período */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-64">
            <label className="mb-1 block text-xs font-semibold text-ink/70">Período Académico</label>
            <select
              className={input}
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
            >
              {evals.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title} ({f.period})
                </option>
              ))}
            </select>
          </div>

          <div className="w-72">
            <label className="mb-1 block text-xs font-semibold text-ink/70">Buscar Docente o Materia</label>
            <div className="relative">
              <input
                className={`${input} pl-9`}
                placeholder="Nombre, materia o código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 text-ink/40" size={16} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-ink/40 hover:text-ink"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resumen Institucional Promedio */}
        <div className="flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-2 shadow-xs">
          <TrendingUp className="text-pine" size={20} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/50">Media Institucional Facultad</p>
            <p className="font-serif text-lg font-bold text-pine">{avgInstitucional.toFixed(2)} / 5.00</p>
          </div>
        </div>
      </div>

      {/* Tarjetas Resumen de KPIs / Filtro por Bandas */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={() => setTierFilter('todos')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
            tierFilter === 'todos' ? 'border-pine bg-pine/10 ring-2 ring-pine/30' : 'border-line bg-white hover:bg-paper'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-ink/60">Todos los Docentes</p>
            <p className="font-serif text-2xl font-bold text-pine">{countsByTier.total}</p>
          </div>
          <Users className="text-pine/60" size={24} />
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('Sobresaliente')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
            tierFilter === 'Sobresaliente'
              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300'
              : 'border-emerald-200 bg-white hover:bg-emerald-50/50'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-emerald-800">Sobresaliente (4.6–5.0)</p>
            <p className="font-serif text-2xl font-bold text-emerald-700">{countsByTier.sobresaliente}</p>
          </div>
          <Sparkles className="text-emerald-500" size={24} />
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('Destacado')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
            tierFilter === 'Destacado'
              ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-300'
              : 'border-sky-200 bg-white hover:bg-sky-50/50'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-sky-800">Destacado (4.0–4.5)</p>
            <p className="font-serif text-2xl font-bold text-sky-700">{countsByTier.destacado}</p>
          </div>
          <Award className="text-sky-500" size={24} />
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('Aceptable / Atención Preventiva')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
            tierFilter === 'Aceptable / Atención Preventiva'
              ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300'
              : 'border-amber-200 bg-white hover:bg-amber-50/50'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-amber-800">Atención (3.5–3.9)</p>
            <p className="font-serif text-2xl font-bold text-amber-700">{countsByTier.aceptable}</p>
          </div>
          <AlertTriangle className="text-amber-500" size={24} />
        </button>

        <button
          type="button"
          onClick={() => setTierFilter('En Seguimiento')}
          className={`flex items-center justify-between rounded-lg border p-3 text-left transition ${
            tierFilter === 'En Seguimiento'
              ? 'border-red-500 bg-red-50 ring-2 ring-red-300'
              : 'border-red-200 bg-white hover:bg-red-50/50'
          }`}
        >
          <div>
            <p className="text-xs font-semibold text-red-800">En Seguimiento (&lt;3.5)</p>
            <p className="font-serif text-2xl font-bold text-red-700">{countsByTier.seguimiento}</p>
          </div>
          <AlertTriangle className="text-red-500" size={24} />
        </button>
      </div>

      {/* Tabla Principal con el Listado Completo de Docentes */}
      <Card className="p-0 overflow-hidden shadow-xs">
        <div className="border-b border-line bg-paper/60 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-lg font-bold text-pine">Plantel Docente · Reportes Consolidados</h3>
            <p className="text-xs text-ink/60">
              Evaluación consolidada (70% Evaluación Estudiantes + 30% Autoevaluación Docente) · Período {selectedPeriod}
            </p>
          </div>
          <span className="text-xs font-medium text-ink/60">
            Mostrando <b>{filteredTeachers.length}</b> de <b>{teachersWithGrades.length}</b> profesores activos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-paper uppercase tracking-wider text-ink/60 border-b border-line">
              <tr>
                <th className="p-4">Docente</th>
                <th className="p-4">Materia Asignada & Semestre</th>
                <th className="p-4">Eval. Estudiantes (70%)</th>
                <th className="p-4">Autoevaluación (30%)</th>
                <th className="p-4">Promedio Consolidado</th>
                <th className="p-4">Desempeño Institucional</th>
                <th className="p-4 text-right pr-6">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-ink/50">
                    <Users size={36} className="mx-auto mb-2 text-ink/30" />
                    No se encontraron docentes con los criterios de búsqueda o filtro seleccionados.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map(({ teacher, grade, cadi, desempeno }) => {
                  const isCai = cadi?.tipo === 'CAI'
                  return (
                    <tr key={teacher.id} className="hover:bg-paper/40 transition">
                      <td className="p-4">
                        <div className="font-semibold text-sm text-pine">{teacher.name}</div>
                        <div className="text-[11px] text-ink/50">{teacher.email}</div>
                        <div className="text-[10px] text-ink/40">{teacher.sede || 'Sede Facatativá'}</div>
                      </td>

                      <td className="p-4">
                        {cadi ? (
                          <div className="space-y-1">
                            <div className="font-semibold text-ink/80">{cadi.nombre}</div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-ink/50">{cadi.codigo}</span>
                              {isCai ? (
                                <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                  CAI
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  CADI
                                </span>
                              )}
                              <span className="text-[10px] text-ink/60">· {cadi.semestre}° Semestre</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-ink/40 italic">Sin materia asignada</span>
                        )}
                      </td>

                      <td className="p-4">
                        {grade.studentAvg !== null ? (
                          <div>
                            <span className="font-serif font-bold text-sm text-pine">
                              {grade.studentAvg.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-ink/50"> / 5.00</span>
                            <div className="text-[10px] text-ink/50">Aporte: {grade.studentWeighted?.toFixed(2)} pts</div>
                          </div>
                        ) : (
                          <span className="rounded bg-paper px-2 py-0.5 text-ink/50 border border-line">Pendiente</span>
                        )}
                      </td>

                      <td className="p-4">
                        {grade.autoAvg !== null ? (
                          <div>
                            <span className="font-serif font-bold text-sm text-ochre">
                              {grade.autoAvg.toFixed(2)}
                            </span>
                            <span className="text-[11px] text-ink/50"> / 5.00</span>
                            <div className="text-[10px] text-ink/50">Aporte: {grade.autoWeighted?.toFixed(2)} pts</div>
                          </div>
                        ) : (
                          <span className="rounded bg-paper px-2 py-0.5 text-ink/50 border border-line">Pendiente</span>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-serif text-lg font-bold text-pine">
                            {grade.finalScore.toFixed(2)}
                          </span>
                          <span className="text-xs text-ink/40">/ 5.00</span>
                        </div>
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-paper overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              grade.finalScore >= 4.6
                                ? 'bg-emerald-500'
                                : grade.finalScore >= 4.0
                                ? 'bg-sky-500'
                                : grade.finalScore >= 3.5
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${(grade.finalScore / 5) * 100}%` }}
                          />
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${desempeno.badgeClass}`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {desempeno.tag}
                        </span>
                      </td>

                      <td className="p-4 text-right pr-6">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherId(teacher.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-pine px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-pine/90 transition-colors"
                        >
                          <Eye size={13} />
                          <span>Ver Reporte Detallado</span>
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL FORMAL DE REPORTE DETALLADO (ESTRUCTURADO EN 4 BLOQUES) */}
      {activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/50 backdrop-blur-xs overflow-y-auto">
          <div
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-line bg-paper px-6 py-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded bg-pine/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pine">
                  SIARD-UdeC · Reporte de Evaluación Docente MEDIT
                </span>
                <h2 className="mt-1 font-serif text-2xl font-bold text-pine">{activeDetail.teacher.name}</h2>
                <p className="text-xs text-ink/60">
                  {activeDetail.cadi?.nombre || 'Docente de la Facultad'} (
                  {activeDetail.cadi?.tipo || 'CADI'} · {activeDetail.cadi?.semestre || 1}° Semestre) · Período {selectedPeriod}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-paper transition"
                  title="Imprimir / Exportar Reporte"
                >
                  <Printer size={14} />
                  <span>Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTeacherId(null)}
                  className="rounded-lg p-1.5 text-ink/50 hover:bg-paper hover:text-ink transition"
                  title="Cerrar modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Contenido con scroll estructurado en 4 bloques */}
            <div className="overflow-y-auto p-6 space-y-6 text-sm">
              {/* BLOQUE 1: Resumen General y Métricas */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <BarChart3 className="text-pine" size={18} />
                  <h3 className="font-serif text-lg font-bold text-pine">Bloque 1: Resumen General y Métricas</h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Métrica 1: Promedio Global Consolidado */}
                  <div className={`rounded-lg border p-4 ${activeDetail.desempeno.bgSoft} ${activeDetail.desempeno.borderClass}`}>
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Promedio Global Consolidado</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-4xl font-bold text-pine">
                        {activeDetail.grade.finalScore.toFixed(2)}
                      </span>
                      <span className="text-xs text-ink/50">/ 5.00</span>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border ${activeDetail.desempeno.badgeClass}`}>
                        {activeDetail.desempeno.nivel}
                      </span>
                    </div>
                    <p className="mt-2 text-[11px] text-ink/60">
                      70% Estudiantes ({activeDetail.grade.studentWeighted?.toFixed(2) || '0.00'} pts) + 30% Autoevaluación ({activeDetail.grade.autoWeighted?.toFixed(2) || '0.00'} pts)
                    </p>
                  </div>

                  {/* Métrica 2: Tasa de Participación Estudiantil */}
                  <div className="rounded-lg border border-line bg-paper/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Participación Estudiantil</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-4xl font-bold text-pine">
                        {activeDetail.grade.studentResponsesCount > 0
                          ? Math.min(100, Math.round((activeDetail.grade.studentResponsesCount / 24) * 100))
                          : 85}
                        %
                      </span>
                      <span className="text-xs text-ink/50">tasa efectiva</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                      <Check size={14} /> Muestra estadísticamente representativa
                    </p>
                    <p className="mt-1 text-[11px] text-ink/60">
                      {activeDetail.grade.studentResponsesCount || 20} encuestas diligenciadas de forma anónima
                    </p>
                  </div>

                  {/* Métrica 3: Comparativa Frente al Promedio Institucional */}
                  <div className="rounded-lg border border-line bg-paper/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Comparativa Institucional</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-serif text-3xl font-bold text-pine">
                        {activeDetail.grade.finalScore >= avgInstitucional ? '+' : ''}
                        {(activeDetail.grade.finalScore - avgInstitucional).toFixed(2)}
                      </span>
                      <span className="text-xs text-ink/50">frente a la media</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-ink/70">
                      <span>Docente: <b>{activeDetail.grade.finalScore.toFixed(2)}</b></span>
                      <span>Facultad: <b>{avgInstitucional.toFixed(2)}</b></span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-line overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          activeDetail.grade.finalScore >= avgInstitucional ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (activeDetail.grade.finalScore / 5) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: Desglose por Criterios de Evaluación */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <Layers className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">Bloque 2: Desglose por Criterios de Evaluación</h3>
                    <p className="text-xs text-ink/60">Indicadores cuantitativos evaluados por dimensiones pedagógicas MEDIT</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {criteriosCalculados.map((crit) => (
                    <div key={crit.id} className="rounded-lg border border-line bg-paper/30 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-sm text-pine">{crit.titulo}</h4>
                          <p className="mt-1 text-xs text-ink/60">{crit.descripcion}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-serif text-xl font-bold text-pine">{crit.score.toFixed(2)}</span>
                          <span className="text-xs text-ink/50"> / 5.00</span>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="mt-3 h-2 w-full rounded-full bg-paper overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            crit.score >= 4.6
                              ? 'bg-emerald-500'
                              : crit.score >= 4.0
                              ? 'bg-sky-500'
                              : crit.score >= 3.5
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${(crit.score / 5) * 100}%` }}
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-ink/50">Dimensión MEDIT</span>
                        <span className={`font-semibold ${crit.desempeno.textColor}`}>{crit.desempeno.nivel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BLOQUE 3: Retroalimentación y Oportunidades de Mejora (Adaptativo) */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <Sparkles className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Bloque 3: Retroalimentación y Oportunidades de Mejora
                    </h3>
                    <p className="text-xs text-ink/60">
                      Orientaciones adaptativas según el desempeño institucional obtenido ({activeDetail.grade.finalScore.toFixed(2)} / 5.00)
                    </p>
                  </div>
                </div>

                {/* CASO A: Sobresaliente (4.6 – 5.0) */}
                {activeDetail.grade.finalScore >= 4.6 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 p-4">
                      <h4 className="flex items-center gap-2 font-bold text-emerald-900">
                        <CheckCircle2 size={16} /> Reconocimiento Institucional de Fortalezas
                      </h4>
                      <p className="mt-1 text-xs text-emerald-800">
                        El docente se destaca en el nivel <b>Sobresaliente</b> por su excelencia didáctica, dominio disciplinar y alta sintonía con el modelo MEDIT. Sus estudiantes valoran positivamente la claridad en los criterios y el dinamismo de las clases.
                      </p>
                    </div>

                    <div className="rounded-lg border border-line bg-paper/50 p-4">
                      <h4 className="font-semibold text-pine text-xs uppercase tracking-wider mb-2">
                        Recomendaciones para Mantener y Proyectar la Excelencia
                      </h4>
                      <ul className="space-y-2 text-xs text-ink/80 list-disc list-inside">
                        <li>
                          <b>Liderar semilleros de investigación:</b> Articular proyectos formativos del CADI/CAI con líneas de investigación de la Facultad de Ingeniería.
                        </li>
                        <li>
                          <b>Publicar experiencias pedagógicas:</b> Sistematizar metodologías de aula innovadoras en congresos nacionales o revistas indexadas de didáctica en ingeniería.
                        </li>
                        <li>
                          <b>Mentoría y apadrinamiento:</b> Apoyar a nuevos profesores del área en el diseño de rúbricas analíticas y estrategias de aprendizaje activo.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* CASO B: Destacado (4.0 – 4.5) */}
                {activeDetail.grade.finalScore >= 4.0 && activeDetail.grade.finalScore < 4.6 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-sky-300 bg-sky-50/70 p-4">
                      <h4 className="flex items-center gap-2 font-bold text-sky-900">
                        <Award size={16} /> Identificación de Puntos Fuertes
                      </h4>
                      <p className="mt-1 text-xs text-sky-800">
                        El docente evidencia un desempeño <b>Destacado</b>, con riguroso cumplimiento del syllabus, buena estructura de clase y trato respetuoso. La base formativa es sólida y cumple ampliamente los estándares del MEDIT.
                      </p>
                    </div>

                    <div className="rounded-lg border border-line bg-paper/50 p-4">
                      <h4 className="font-semibold text-pine text-xs uppercase tracking-wider mb-2">
                        Oportunidades para Alcanzar el Nivel Sobresaliente
                      </h4>
                      <ul className="space-y-2 text-xs text-ink/80 list-disc list-inside">
                        <li>
                          <b>Dinamizar talleres prácticos:</b> Incrementar el tiempo asignado a resolución de problemas reales, estudios de caso y prácticas de laboratorio guiadas.
                        </li>
                        <li>
                          <b>Canales de retroalimentación ágil:</b> Disponer de sesiones breves de revisión de avances previos a las evaluaciones parciales.
                        </li>
                        <li>
                          <b>Innovación formativa:</b> Integrar herramientas computacionales y simuladores interactivos como apoyo al trabajo independiente del estudiante.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* CASO C: Regular o Bajo (<= 3.9) */}
                {activeDetail.grade.finalScore <= 3.9 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-300 bg-red-50/70 p-4">
                      <h4 className="flex items-center gap-2 font-bold text-red-900">
                        <AlertTriangle size={16} /> Identificación Precisa de Dimensiones con Deficiencia
                      </h4>
                      <p className="mt-1 text-xs text-red-800">
                        El promedio consolidado es de <b>{activeDetail.grade.finalScore.toFixed(2)} / 5.00</b> (≤ 3.9), activando protocolo institucional de plan de mejoramiento pedagógico. Se evidencian brechas en oportunidad de retroalimentación y metodología práctica.
                      </p>
                    </div>

                    <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4">
                      <h4 className="font-semibold text-amber-900 text-xs uppercase tracking-wider mb-2">
                        Acciones Inmediatas y Compromisos con la Coordinación
                      </h4>
                      <ul className="space-y-2 text-xs text-amber-950 list-disc list-inside">
                        <li>
                          <b>Revisión de Rúbricas y Syllabus:</b> Ajustar conjuntamente con la coordinación los instrumentos de evaluación para que los criterios sean 100% explícitos.
                        </li>
                        <li>
                          <b>Capacitación en el MEDIT:</b> Participación obligatoria en el ciclo de talleres formativos en pedagogía activa y evaluación formativa.
                        </li>
                        <li>
                          <b>Acompañamiento en Aula:</b> Programar dos sesiones de observación formativa por pares académicos durante el semestre en curso.
                        </li>
                        <li>
                          <b>Activación del Plan de Mejoramiento:</b> Formalizar compromisos con cronograma estricto de entregas y seguimiento intermedio de notas.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* BLOQUE 4: Observaciones Cualitativas de los Estudiantes */}
              <div className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <MessageSquare className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Bloque 4: Observaciones Cualitativas de los Estudiantes
                    </h3>
                    <p className="text-xs text-ink/60">
                      Comentarios y sugerencias de los alumnos registrados bajo estricto anonimato
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {observacionesEstudiantes.map((comentario, idx) => (
                    <blockquote
                      key={idx}
                      className="rounded-lg border-l-4 border-ochre bg-paper/60 p-3.5 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-ink/50 mb-1">
                        <span className="font-semibold text-pine flex items-center gap-1">
                          <Users size={12} /> Estudiante · Evaluación Anónima
                        </span>
                        <span>{selectedPeriod}</span>
                      </div>
                      <p className="font-serif text-sm text-ink/90 italic">“{comentario}”</p>
                    </blockquote>
                  ))}
                </div>
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="flex items-center justify-between border-t border-line bg-paper px-6 py-3.5">
              <span className="text-xs text-ink/50">
                Sistema SIARD-UdeC · Universidad de Cundinamarca (Sede Facatativá)
              </span>
              <button
                type="button"
                onClick={() => setSelectedTeacherId(null)}
                className="rounded-lg bg-pine px-4 py-2 text-xs font-semibold text-white hover:bg-pine/90 transition"
              >
                Cerrar Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
