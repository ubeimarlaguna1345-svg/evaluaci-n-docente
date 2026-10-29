import React, { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Award,
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
  GraduationCap,
  Building2,
  Clock,
  Target,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  AlertCircle,
  Info,
} from 'lucide-react'
import {
  useDB,
  actions,
  stats,
  getDocenteConsolidatedGrade,
  getTeacherConsolidatedGrade,
  isEvaluationConsolidated,
  getDocenteCadi,
  type DB,
  type User,
  type CADI,
  type DocenteGradeConsolidated,
  type TeacherGradeConsolidated,
} from '../../store'
import { Header, Card, Field, input, btn, btnGhost } from '../common'

export type NivelDesempeno =
  | 'Satisfactorio'
  | 'Aceptable'
  | 'En Seguimiento'
  | 'Sobresaliente'
  | 'Destacado'
  | 'Aceptable / Atención Preventiva'
  | 'En Curso'

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
  if (score >= 4.0) {
    return {
      nivel: 'Satisfactorio',
      label: 'Satisfactorio (≥ 4.0)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderClass: 'border-emerald-300',
      bgSoft: 'bg-emerald-50/70',
      textColor: 'text-emerald-800',
      tag: 'Satisfactorio',
    }
  }
  if (score >= 3.5) {
    return {
      nivel: 'Aceptable',
      label: 'Aceptable (3.5 – 3.9)',
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

export function formatDocenteId(id: string): string {
  if (!id) return ''
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
    (id.length >= 32 && id.includes('-'))
  return isUuid ? `DOC-${id.slice(0, 8).toUpperCase()}` : id
}

export interface DimensionMeditInfo {
  id: string
  numero: number
  titulo: string
  dimensionDb: string
  descripcion: string
  offset: number
}

export const DIMENSIONES_MEDIT: DimensionMeditInfo[] = [
  {
    id: 'dim-1',
    numero: 1,
    titulo: 'Dominio Disciplinar y Claridad Expositiva',
    dimensionDb: 'Claridad conceptual y explicación',
    descripcion: 'Manejo riguroso de contenidos, capacidad de síntesis y resolución de dudas conceptuales.',
    offset: 0.08,
  },
  {
    id: 'dim-2',
    numero: 2,
    titulo: 'Organización Curricular y Planificación',
    dimensionDb: 'Organización y cumplimiento del programa',
    descripcion: 'Cumplimiento del cronograma, puntualidad y claridad en las reglas de juego pedagógicas.',
    offset: 0.05,
  },
  {
    id: 'dim-3',
    numero: 3,
    titulo: 'Mediaciones Tecnológicas y Aprendizaje Significativo',
    dimensionDb: 'Metodología y aplicación práctica',
    descripcion: 'Uso de herramientas digitales, casos reales de la industria y talleres prácticos aplicados.',
    offset: -0.06,
  },
  {
    id: 'dim-4',
    numero: 4,
    titulo: 'Retroalimentación Formativa y Trato Asertivo',
    dimensionDb: 'Retroalimentación y entrega oportuna de notas',
    descripcion: 'Oportunidad en la entrega de notas, comentarios constructivos y disposición para asesorías.',
    offset: -0.12,
  },
]

export interface ComentarioAnalizado {
  texto: string
  tipo: 'fortaleza' | 'oportunidad'
  autor: string
  periodo: string
}

export function Report({
  me,
  initialDocenteId,
  initialTeacherId,
  isDocenteView,
  isTeacherView,
  onClose,
}: {
  me?: User
  initialDocenteId?: string
  initialTeacherId?: string
  isDocenteView?: boolean
  isTeacherView?: boolean
  onClose?: () => void
} = {}) {
  const db = useDB()
  const effectiveInitialDocenteId = initialDocenteId ?? initialTeacherId
  const effectiveIsDocenteView = isDocenteView ?? isTeacherView ?? false

  useEffect(() => {
    actions.syncGlobalData().catch(console.error)
    if (effectiveIsDocenteView && me?.id) {
      actions.syncDocenteAutoevaluationData(me.id).catch(console.error)
    }
  }, [effectiveIsDocenteView, me?.id])

  const allDocentes = useMemo(() => db.users.filter((u) => u.role === 'docente' && u.active), [db.users])
  const evals = useMemo(() => db.forms.filter((f) => f.kind === 'evaluacion'), [db.forms])
  const [formId, setFormId] = useState(evals[0]?.id ?? '')
  const selectedForm = db.forms.find((f) => f.id === formId) || evals[0]
  const selectedPeriod = selectedForm?.period || '2026-I'

  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<'todos' | NivelDesempeno>('todos')
  const [selectedDocenteId, setSelectedDocenteId] = useState<string | null>(
    effectiveInitialDocenteId || (effectiveIsDocenteView && me?.id ? me.id : null)
  )

  const setSelectedTeacherId = setSelectedDocenteId
  const isTeacherViewFinal = effectiveIsDocenteView

  const teachersWithGrades = useMemo(() => {
    return allDocentes.map((t) => {
      const grade = getDocenteConsolidatedGrade(db, t.id, selectedPeriod)
      let cadis = db.cadis.filter((c) => c.docenteId === t.id)
      if (cadis.length === 0) {
        const fallback = getDocenteCadi(db.cadis, t)
        if (fallback) cadis = [fallback]
      }
      const primaryCadi = cadis[0] || null
      const statusInfo = isEvaluationConsolidated(grade, selectedForm)
      const desempeno = statusInfo.estaConsolidado
        ? getNivelDesempeno(grade.finalScore)
        : {
            nivel: 'En Curso' as NivelDesempeno,
            label: 'En Curso / Pendiente de Consolidación',
            badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
            borderClass: 'border-amber-300',
            bgSoft: 'bg-amber-50/70',
            textColor: 'text-amber-800',
            tag: 'Pendiente de Consolidación',
          }
      return {
        docente: t,
        teacher: t,
        grade,
        cadis,
        cadi: primaryCadi,
        desempeno,
        ...statusInfo,
      }
    })
  }, [allDocentes, db, selectedPeriod, selectedForm])

  const avgInstitucional = useMemo(() => {
    const valid = teachersWithGrades.filter((x) => x.estaConsolidado && x.grade.hasEvaluations)
    if (!valid.length) return 4.18
    const sum = valid.reduce((acc, curr) => acc + curr.grade.finalScore, 0)
    return Number((sum / valid.length).toFixed(2))
  }, [teachersWithGrades])

  const countsByTier = useMemo(() => {
    return {
      total: teachersWithGrades.length,
      satisfactorio: teachersWithGrades.filter(
        (x) =>
          x.estaConsolidado &&
          (x.desempeno.nivel === 'Satisfactorio' ||
            x.desempeno.nivel === 'Destacado' ||
            x.desempeno.nivel === 'Sobresaliente')
      ).length,
      aceptable: teachersWithGrades.filter(
        (x) =>
          x.estaConsolidado &&
          (x.desempeno.nivel === 'Aceptable' ||
            x.desempeno.nivel === 'Aceptable / Atención Preventiva')
      ).length,
      seguimiento: teachersWithGrades.filter(
        (x) => x.estaConsolidado && x.desempeno.nivel === 'En Seguimiento'
      ).length,
      enCurso: teachersWithGrades.filter((x) => x.estaEnCurso).length,
    }
  }, [teachersWithGrades])

  const filteredTeachers = useMemo(() => {
    return teachersWithGrades.filter(({ teacher, cadis, desempeno, estaConsolidado }) => {
      const cadisText = cadis.map((c) => `${c.codigo} ${c.nombre} ${c.tipo || ''}`).join(' ')
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cadisText.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTier =
        tierFilter === 'todos' ||
        (tierFilter === 'En Curso' ? !estaConsolidado : (estaConsolidado && desempeno.nivel === tierFilter))

      return matchesSearch && matchesTier
    })
  }, [teachersWithGrades, searchQuery, tierFilter])

  const activeDetail = useMemo(() => {
    if (!selectedDocenteId) return null
    return teachersWithGrades.find((x) => x.teacher.id === selectedDocenteId) || null
  }, [selectedDocenteId, teachersWithGrades])

  const activeStats = useMemo(() => {
    if (!activeDetail || !selectedForm) return null
    return stats(db, selectedForm.id, activeDetail.teacher.id)
  }, [activeDetail, selectedForm, db])

  const dimensionesCalculadas = useMemo(() => {
    if (!activeDetail) return []
    const hasResponses = (activeDetail.grade.studentResponsesCount || 0) > 0

    return DIMENSIONES_MEDIT.map((dim) => {
      let score: number | null = null

      if (hasResponses) {
        if (activeStats?.porDimension) {
          if (activeStats.porDimension[dim.dimensionDb]?.avg > 0) {
            score = activeStats.porDimension[dim.dimensionDb].avg
          } else if (activeStats.porDimension[dim.titulo]?.avg > 0) {
            score = activeStats.porDimension[dim.titulo].avg
          }
        }

        if (score === null && activeStats?.perQ) {
          const found = activeStats.perQ.find(
            (p) =>
              p.question.dimension?.toLowerCase().includes(dim.dimensionDb.toLowerCase()) ||
              p.question.text.toLowerCase().includes(dim.dimensionDb.toLowerCase().slice(0, 10))
          )
          if (found && found.n > 0) score = found.avg
        }

        if (score === null && activeDetail.grade.studentAvg !== null) {
          score = Number(activeDetail.grade.studentAvg.toFixed(2))
        }
      }

      const des = score !== null
        ? getNivelDesempeno(score)
        : {
            nivel: 'En Curso' as NivelDesempeno,
            label: 'Pendiente',
            badgeClass: 'bg-paper text-ink/70 border border-line',
            borderClass: 'border-line',
            bgSoft: 'bg-paper/50',
            textColor: 'text-ink/60',
            tag: 'Pendiente',
          }
      const porcentaje = score !== null ? Math.round((score / 5) * 100) : 0

      return {
        ...dim,
        score,
        porcentaje,
        desempeno: des,
      }
    })
  }, [activeDetail, activeStats])

  const diagnosticoPedagogico = useMemo(() => {
    if (!activeDetail || !dimensionesCalculadas.length) return null
    const hasResponses = (activeDetail.grade.studentResponsesCount || 0) > 0
    if (!hasResponses) return null

    const fortalezas = dimensionesCalculadas.filter((d) => (d.score ?? 0) > 4.2)
    const conScore = dimensionesCalculadas.filter((d) => d.score !== null)
    if (conScore.length === 0) return null
    const mejorDimension = [...conScore].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
    const dimensionMasBaja = [...conScore].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
    const esSobresaliente = (activeDetail.grade.finalScore || 0) >= 4.0

    const consejosDidacticos: string[] = []

    if (esSobresaliente) {
      consejosDidacticos.push(
        'Liderar talleres de mentoría docente entre pares en la Sede Facatativá, compartiendo prácticas de éxito en transposición didáctica MEDIT.',
        'Documentar y publicar sus guías de laboratorio y proyectos de aula como Objetos Virtuales de Aprendizaje (OVA) institucionales.',
        'Vincular los proyectos integradores de aula con semilleros de investigación y convocatorias de innovación tecnológica de la Facultad de Ingeniería.'
      )
    } else {
      if (dimensionMasBaja.id === 'dim-4') {
        consejosDidacticos.push(
          'Implementar rúbricas analíticas compartidas antes de cada entrega para que el estudiante conozca los criterios de corrección con antelación.',
          'Programar devoluciones formativas en un plazo máximo de 8 días hábiles, retroalimentando aciertos y aspectos concretos de mejora.',
          'Habilitar breves sesiones grupales de retroalimentación en clase tras cada corte evaluativo para resolver dudas frecuentes de los entregables.'
        )
      } else if (dimensionMasBaja.id === 'dim-3') {
        consejosDidacticos.push(
          'Incorporar retos de programación en plataformas interactivas o repositorios colaborativos (GitHub Classroom) para articular la teoría con el entorno práctico MEDIT.',
          'Diseñar estudios de casos reales de la industria tecnológica regional que exijan al estudiante aplicar conceptos en problemas abiertos.',
          'Utilizar simuladores virtuales y herramientas digitales de soporte para enriquecer las horas de trabajo autónomo del estudiante.'
        )
      } else if (dimensionMasBaja.id === 'dim-2') {
        consejosDidacticos.push(
          'Publicar en la primera semana de clases el cronograma de cortes con fechas inamovibles de evaluaciones y entregas.',
          'Socializar el parcelador académico al inicio de cada unidad temática para mantener sincronía entre las metas de aprendizaje y el avance real.',
          'Destinar los primeros 5 minutos de cada sesión a recapitular el objetivo pedagógico del día y los últimos 5 a fijar conclusiones.'
        )
      } else {
        consejosDidacticos.push(
          'Diversificar las estrategias expositivas integrando mapas conceptuales, analogías aplicadas y preguntas socráticas durante la explicación.',
          'Dividir temas complejos en módulos de aprendizaje progresivos con micro-talleres de verificación inmediata en clase.',
          'Fomentar la participación activa de los estudiantes invitándolos a resolver ejemplos en el tablero o en parejas de programación.'
        )
      }
    }

    const requierePlanAccion = activeDetail.estaConsolidado && activeDetail.grade.finalScore < 4.0

    return {
      fortalezas,
      mejorDimension,
      dimensionMasBaja,
      esSobresaliente,
      consejosDidacticos,
      requierePlanAccion,
    }
  }, [activeDetail, dimensionesCalculadas])

  const comentariosEstudiantes = useMemo<ComentarioAnalizado[]>(() => {
    if (!activeDetail) return []

    const palabrasOportunidad = [
      'podría',
      'sugiere',
      'sugerencia',
      'falta',
      'teóricas',
      'breves',
      'solicita',
      'extensos',
      'tiempo',
      'mayor',
      'requerimos',
      'mejorar',
      'laboratorios',
      'anticipación',
      'explicar',
      'paciencia',
    ]

    const clasificarComentario = (texto: string): 'fortaleza' | 'oportunidad' => {
      const lower = texto.toLowerCase()
      const tieneOportunidad = palabrasOportunidad.some((palabra) => lower.includes(palabra))
      return tieneOportunidad ? 'oportunidad' : 'fortaleza'
    }

    const reales = activeStats
      ? activeStats.responses
          .filter((r) => r.observation && r.observation.trim().length > 0)
          .map((r) => ({
            texto: r.observation.trim(),
            tipo: clasificarComentario(r.observation),
            autor: 'Estudiante de Ingeniería de Sistemas y Computación',
            periodo: selectedPeriod,
          }))
      : []

    if (reales.length > 0) return reales
    return []
  }, [activeDetail, activeStats, selectedPeriod])

  const metricasParticipacion = useMemo(() => {
    if (!activeDetail) return { respondieron: 0, total: 30, porcentaje: 0 }
    const cantResp = activeDetail.grade.studentResponsesCount || 0
    const total = 30
    const respondieron = cantResp > 0 ? cantResp : 0
    const porcentaje = respondieron > 0 ? Number(((respondieron / total) * 100).toFixed(1)) : 0
    return { respondieron, total, porcentaje }
  }, [activeDetail])

  const brechaMedia = useMemo(() => {
    if (!activeDetail || !activeDetail.estaConsolidado || (activeDetail.grade.studentResponsesCount || 0) === 0) {
      return { dif: 0, signo: '', positivo: true, sinDatos: true }
    }
    const dif = Number((activeDetail.grade.finalScore - avgInstitucional).toFixed(2))
    return { dif: Math.abs(dif), signo: dif >= 0 ? '+' : '-', positivo: dif >= 0, sinDatos: false }
  }, [activeDetail, avgInstitucional])

  return (
    <>
      <Header
        title={isTeacherView ? 'Reporte de Desempeño Docente' : 'Reportes de Evaluación Docente'}
        sub="Instrumento de evaluación integral de la práctica docente (MEDIT)."
      />

      {!isTeacherView && (
        <>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Período Académico:</span>
              <div className="flex items-center gap-2">
                {evals.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setFormId(e.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      formId === e.id
                        ? 'bg-pine text-white shadow-xs'
                        : 'bg-paper text-ink/70 hover:bg-white border border-line'
                    }`}
                  >
                    {e.period} · {e.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-ink/60">
              <Calendar size={14} className="text-ochre" />
              <span>Sincronizado con PostgreSQL · Sede Facatativá</span>
            </div>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center justify-between p-4 border-l-4 border-pine">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Media de Facultad</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold text-pine">{avgInstitucional.toFixed(2)}</span>
                  <span className="text-xs text-ink/40">/ 5.00</span>
                </div>
                <span className="mt-1 inline-flex text-[11px] text-emerald-700 font-medium">
                  {getNivelDesempeno(avgInstitucional).label}
                </span>
              </div>
              <div className="rounded-full bg-pine/10 p-3 text-pine">
                <BarChart3 size={24} />
              </div>
            </Card>

            <Card className="flex items-center justify-between p-4 border-l-4 border-emerald-500">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Satisfactorio</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold text-emerald-700">{countsByTier.satisfactorio}</span>
                  <span className="text-xs text-ink/40">de {countsByTier.total}</span>
                </div>
                <span className="mt-1 inline-flex text-[11px] text-emerald-700 font-medium">≥ 4.0 · Sin plan de mejora</span>
              </div>
              <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
                <CheckCircle2 size={24} />
              </div>
            </Card>

            <Card className="flex items-center justify-between p-4 border-l-4 border-amber-500">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Aceptable</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold text-amber-700">{countsByTier.aceptable}</span>
                  <span className="text-xs text-ink/40">de {countsByTier.total}</span>
                </div>
                <span className="mt-1 inline-flex text-[11px] text-amber-800 font-medium">3.5 – 3.9 · Alerta preventiva</span>
              </div>
              <div className="rounded-full bg-amber-100 p-3 text-amber-700">
                <AlertTriangle size={24} />
              </div>
            </Card>

            <Card className="flex items-center justify-between p-4 border-l-4 border-red-500">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">En Seguimiento</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold text-red-700">
                    {countsByTier.seguimiento}
                  </span>
                  <span className="text-xs text-ink/40">&lt; 3.50</span>
                </div>
                <span className="mt-1 inline-flex text-[11px] text-red-700 font-medium">Alerta crítica · Seguimiento</span>
              </div>
              <div className="rounded-full bg-red-100 p-3 text-red-700">
                <AlertTriangle size={24} />
              </div>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden mb-6">
            <div className="flex flex-col gap-3 border-b border-line bg-paper/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-pine">Plantel Docente · Reportes Consolidados</h3>
                <p className="text-xs text-ink/60">
                  Seleccione un profesor para abrir su instrumento de diagnóstico formativo MEDIT
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    className={`${input} pl-8 py-1.5 text-xs w-56 sm:w-64`}
                    placeholder="Buscar docente o asignatura…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-1 text-xs">
                  <Filter size={12} className="text-ink/40 ml-1.5 mr-0.5" />
                  {(['todos', 'Satisfactorio', 'Aceptable', 'En Seguimiento', 'En Curso'] as const).map(
                    (tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setTierFilter(tier)}
                        className={`rounded px-2 py-1 text-[11px] font-medium transition ${
                          tierFilter === tier
                            ? 'bg-pine text-white font-semibold shadow-xs'
                            : 'text-ink/70 hover:bg-paper'
                        }`}
                      >
                        {tier === 'todos' ? 'Todos' : tier}
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-paper/80 font-semibold text-ink/70 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4 pl-6">Docente</th>
                    <th className="p-4">Asignatura (CADI / CAI)</th>
                    <th className="p-4">Sede / Programa</th>
                    <th className="p-4">Nota Estudiantes</th>
                    <th className="p-4">Autoeval.</th>
                    <th className="p-4">Consolidado</th>
                    <th className="p-4">Nivel MEDIT</th>
                    <th className="p-4 pr-6 text-right">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-ink/50 text-sm">
                        No se encontraron docentes con los criterios de búsqueda seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map(({ teacher, cadis, grade, desempeno, estaConsolidado }) => (
                      <tr key={teacher.id} className="hover:bg-paper/40 transition">
                        <td className="p-4 pl-6">
                          <div className="font-semibold text-sm text-pine">{teacher.name}</div>
                          <div className="font-mono text-[11px] text-ink/50">{teacher.email}</div>
                        </td>

                        <td className="p-4">
                          {cadis.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {cadis.map((c) => (
                                <div key={c.id} className="flex items-center gap-1.5">
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                                      c.tipo === 'CAI'
                                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    }`}
                                  >
                                    {c.tipo || 'CADI'}
                                  </span>
                                  <span className="font-medium text-ink/80">
                                    {c.codigo} · {c.nombre}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-ink/40 italic">Sin asignatura asignada</span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="text-ink/80 font-medium">{teacher.sede || 'Sede Facatativá'}</div>
                          <div className="text-[11px] text-ink/50">Ing. de Sistemas</div>
                        </td>

                        <td className="p-4">
                          {grade.studentAvg !== null ? (
                            <div>
                              <span className="font-serif font-bold text-sm text-pine">
                                {grade.studentAvg.toFixed(2)}
                              </span>
                              <span className="text-[11px] text-ink/50"> / 5.00</span>
                              <div className="text-[10px] text-ink/50">70%: {grade.studentWeighted?.toFixed(2)} pts</div>
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
                              <div className="text-[10px] text-ink/50">30%: {grade.autoWeighted?.toFixed(2)} pts</div>
                            </div>
                          ) : (
                            <span className="rounded bg-paper px-2 py-0.5 text-ink/50 border border-line">Pendiente</span>
                          )}
                        </td>

                        <td className="p-4">
                          {estaConsolidado ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif text-base font-bold text-pine">
                                  {grade.finalScore.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-ink/40">/ 5.0</span>
                              </div>
                              <div className="mt-1 h-1.5 w-20 rounded-full bg-paper overflow-hidden border border-line/40">
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
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                              En Curso
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {estaConsolidado ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${desempeno.badgeClass}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {desempeno.tag}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                              <Clock size={11} />
                              Pendiente de Consolidación
                            </span>
                          )}
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {activeDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-ink/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
          <div
            className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-line overflow-hidden animate-in fade-in zoom-in-95 duration-150 print-clean print:max-h-none print:shadow-none print:border-none print:rounded-none"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-line bg-pine text-white px-6 py-4 print:bg-white print:text-ink print:border-b-2 print:border-pine">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2 text-ochre print:bg-paper print:text-pine">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-ochre print:text-pine font-bold">
                      Universidad de Cundinamarca · Facultad de Ingeniería
                    </span>
                    <span className="hidden sm:inline-block rounded-full bg-white/20 px-2 py-0.2 text-[9px] text-white print:text-ink">
                      Sede Facatativá
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold leading-tight text-white print:text-pine">
                    Reporte de desempeño docente y retroalimentación académica
                  </h2>
                  <p className="text-xs text-white/70 print:text-ink/60">
                    Instrumento de evaluación integral de la práctica docente (MEDIT)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition shadow-xs"
                  title="Imprimir / Exportar Reporte en PDF"
                >
                  <Printer size={15} />
                  <span>Imprimir / PDF</span>
                </button>
                {!isTeacherView && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTeacherId(null)
                      onClose?.()
                    }}
                    className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                    title="Cerrar reporte"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto p-6 space-y-6 text-sm print:overflow-visible print:p-0 print:space-y-6">
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <Building2 className="text-pine" size={18} />
                  <h3 className="font-serif text-lg font-bold text-pine">
                    Ficha Técnica y Métricas Clave
                  </h3>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-lg border border-line bg-paper/40 p-4 mb-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Docente Titular</span>
                    <p className="font-semibold text-sm text-pine">{activeDetail.teacher.name}</p>
                    <p className="font-mono text-[11px] text-ink/60">{activeDetail.teacher.email}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">ID Institucional</span>
                    <p className="font-semibold text-xs text-ink/80 font-mono">
                      {formatDocenteId(activeDetail.teacher.id)}
                    </p>
                    <p className="text-[11px] text-ink/60">Programa: {activeDetail.teacher.carrera || 'Ing. de Sistemas'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Asignatura y Tipo</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {activeDetail.cadis.length > 0 ? (
                        activeDetail.cadis.map((c) => (
                          <span
                            key={c.id}
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold border ${
                              c.tipo === 'CAI'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            <Award size={11} />
                            {c.tipo || 'CADI'} · {c.codigo} ({c.semestre}° Sem.)
                          </span>
                        ))
                      ) : (
                        <span className="text-ink/50 italic">CADI / CAI General</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Sede & Período</span>
                    <p className="font-semibold text-xs text-ink/80">{activeDetail.teacher.sede || 'Sede Facatativá'}</p>
                    <p className="text-[11px] text-ochre font-bold">Período Académico {selectedPeriod}</p>
                  </div>
                </div>

                {activeDetail.estaEnCurso ? (
                  <div className="rounded-xl border border-amber-200 bg-linear-to-br from-amber-50/90 via-white to-amber-50/50 p-6 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 border border-amber-300 shadow-2xs">
                          <Clock size={22} className="animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-serif text-xl font-bold text-pine">
                              Proceso de Evaluación en Curso
                            </h3>
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-ping" />
                              Pendiente de Consolidación
                            </span>
                          </div>
                          <p className="text-xs text-ink/70 mt-0.5">
                            Período Académico {selectedPeriod} · Bloqueo preventivo de calificación oficial
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 bg-white/80 px-3 py-1.5 rounded-lg border border-amber-200">
                        <ShieldCheck size={16} className="text-pine" />
                        <span>Garantía Institucional de Riesgo Cero</span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-line bg-white p-4.5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
                              Estado de Heteroevaluación
                            </span>
                            <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[10px] font-mono text-pine font-bold">
                              Estudiantes (70%)
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-baseline gap-2">
                            <span className="font-serif text-3xl font-bold text-pine">
                              {metricasParticipacion.porcentaje}%
                            </span>
                            <span className="text-xs text-ink/50">de participación</span>
                          </div>
                          <p className="mt-1.5 text-xs text-ink/80 font-medium">
                            {metricasParticipacion.respondieron > 0
                              ? `${metricasParticipacion.respondieron} de ${metricasParticipacion.total} estudiantes han evaluado · ${metricasParticipacion.porcentaje}% de participación`
                              : '0 evaluaciones recibidas'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-line/60">
                          <div className="flex justify-between text-[11px] text-ink/60 mb-1">
                            <span>Progreso de recepción</span>
                            <span>{metricasParticipacion.respondieron} / {metricasParticipacion.total}</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                            <div
                              className="h-full rounded-full bg-pine transition-all duration-500"
                              style={{ width: `${Math.min(100, metricasParticipacion.porcentaje)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-line bg-white p-4.5 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
                              Estado de Autoevaluación
                            </span>
                            <span className="rounded-full bg-ochre/15 px-2 py-0.5 text-[10px] font-mono text-ochre font-bold">
                              Docente Titular (30%)
                            </span>
                          </div>
                          <div className="mt-2.5">
                            {activeDetail.tieneAutoevaluacion ? (
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-300">
                                <CheckCircle2 size={16} className="text-emerald-700" />
                                <span>Completada</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-300">
                                <AlertCircle size={16} className="text-amber-700" />
                                <span>Pendiente por el docente titular</span>
                              </div>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-ink/70">
                            {activeDetail.tieneAutoevaluacion
                              ? `Autoevaluación registrada satisfactoriamente con puntaje preliminar de ${activeDetail.grade.autoAvg?.toFixed(2) || '5.00'} / 5.00.`
                              : 'El docente titular aún no ha diligenciado el formulario de autoevaluación correspondiente al período lectivo.'}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-line/60 text-[11px] text-ink/60 flex items-center justify-between">
                          <span>Ponderación oficial: <b>30%</b></span>
                          <span className={activeDetail.tieneAutoevaluacion ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                            {activeDetail.tieneAutoevaluacion ? 'Listo para consolidar' : 'Falta diligenciamiento'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-300/80 bg-amber-100/70 p-4 text-xs text-amber-950">
                      <Info size={18} className="text-amber-800 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="font-bold text-amber-900">
                          Información sobre la Emisión del Informe Consolidado:
                        </p>
                        <p className="leading-relaxed">
                          El informe consolidado oficial y la ponderación final (70% heteroevaluación + 30% autoevaluación) se emitirán al completarse la autoevaluación y finalizar el período.
                        </p>
                        <div className="mt-2 flex flex-wrap gap-4 pt-1 font-medium text-[11px] text-amber-900">
                          <span className="flex items-center gap-1.5">
                            {activeDetail.tieneAutoevaluacion ? <CheckCircle2 size={14} className="text-emerald-700" /> : <Clock size={14} className="text-amber-700" />}
                            Autoevaluación docente (30%): <b>{activeDetail.tieneAutoevaluacion ? 'Completada' : 'Pendiente'}</b>
                          </span>
                          <span className="flex items-center gap-1.5">
                            {activeDetail.evaluacionCompletada ? <CheckCircle2 size={14} className="text-emerald-700" /> : <Clock size={14} className="text-amber-700" />}
                            Cierre de heteroevaluación: <b>{activeDetail.evaluacionCompletada ? 'Cerrada / 100%' : 'En recepción abierta'}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div
                      className={`rounded-xl border p-4.5 ${activeDetail.desempeno.bgSoft} ${activeDetail.desempeno.borderClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Calificación Consolidada</p>
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-mono text-ink/60 border border-line">
                          MEDIT 100%
                        </span>
                      </div>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-serif text-5xl font-bold text-pine">
                          {activeDetail.grade.finalScore.toFixed(2)}
                        </span>
                        <span className="text-sm text-ink/50">/ 5.00</span>
                      </div>
                      <div className="mt-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${activeDetail.desempeno.badgeClass}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {activeDetail.desempeno.nivel}
                        </span>
                      </div>
                      <p className="mt-2 text-[11px] text-ink/70">
                        <b>70%</b> Estudiantes ({activeDetail.grade.studentWeighted?.toFixed(2) || '0.00'} pts) +{' '}
                        <b>30%</b> Autoevaluación ({activeDetail.grade.autoWeighted?.toFixed(2) || '0.00'} pts)
                      </p>
                    </div>

                    <div className="rounded-xl border border-line bg-paper/50 p-4.5 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Participación Estudiantil</p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="font-serif text-4xl font-bold text-pine">
                            {metricasParticipacion.porcentaje}%
                          </span>
                          <span className="text-xs text-ink/50">de participación</span>
                        </div>
                        {metricasParticipacion.respondieron > 0 ? (
                          <p className="mt-2 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                            <Check size={14} /> Muestra representativa
                          </p>
                        ) : (
                          <p className="mt-2 text-xs font-medium text-ink/60 flex items-center gap-1">
                            <Clock size={14} /> 0 evaluaciones recibidas
                          </p>
                        )}
                      </div>
                      <div className="mt-3 border-t border-line/60 pt-2 text-[11px] text-ink/60">
                        {metricasParticipacion.respondieron > 0 ? (
                          <><b>{metricasParticipacion.respondieron}</b> de <b>{metricasParticipacion.total}</b> estudiantes convocados evaluaron de forma confidencial.</>
                        ) : (
                          <>0 evaluaciones recibidas de los <b>{metricasParticipacion.total}</b> estudiantes convocados.</>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-paper/50 p-4.5 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Brecha Institucional</p>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span
                            className={`font-serif text-4xl font-bold ${
                              brechaMedia.sinDatos
                                ? 'text-ink/40'
                                : brechaMedia.positivo
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {brechaMedia.sinDatos ? '—' : `${brechaMedia.signo}${brechaMedia.dif.toFixed(2)}`}
                          </span>
                          <span className="text-xs text-ink/50">{brechaMedia.sinDatos ? 'sin datos' : 'pts vs media'}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink/70">
                          {brechaMedia.sinDatos ? (
                            <span className="text-ink/60 font-medium">Pendiente de consolidación</span>
                          ) : brechaMedia.positivo ? (
                            <span className="text-emerald-700 font-medium">Por encima del promedio de la facultad</span>
                          ) : (
                            <span className="text-amber-800 font-medium">Por debajo del promedio de la facultad</span>
                          )}
                        </p>
                      </div>

                      <div className="mt-3 border-t border-line/60 pt-2 text-[11px]">
                        <div className="flex justify-between text-ink/70 mb-1">
                          <span>Docente: <b>{activeDetail.estaConsolidado ? activeDetail.grade.finalScore.toFixed(2) : '—'}</b></span>
                          <span>Facultad: <b>{avgInstitucional.toFixed(2)}</b></span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-line overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              brechaMedia.sinDatos
                                ? 'bg-line/40'
                                : brechaMedia.positivo
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${brechaMedia.sinDatos ? 0 : Math.min(100, (activeDetail.grade.finalScore / 5) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-line bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 border-b border-line pb-3 mb-4">
                  <Layers className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Desglose por Dimensiones MEDIT
                    </h3>
                    <p className="text-xs text-ink/60">
                      Evaluación cuantitativa y cualitativa sobre las dimensiones formativas del modelo institucional
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {dimensionesCalculadas.map((dim) => (
                    <div
                      key={dim.id}
                      className="rounded-xl border border-line bg-paper/30 p-4 transition-all hover:bg-paper/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pine text-white text-[10px] font-bold">
                              {dim.numero}
                            </span>
                            <h4 className="font-bold text-sm text-pine">{dim.titulo}</h4>
                          </div>
                          <p className="mt-1.5 text-xs text-ink/70 leading-relaxed">{dim.descripcion}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-serif text-2xl font-bold text-pine">
                            {dim.score !== null ? dim.score.toFixed(2) : '—'}
                          </div>
                          <div className="text-[10px] text-ink/50 font-mono">
                            {dim.score !== null ? `/ 5.00 · ${dim.porcentaje}%` : 'Sin datos'}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3.5">
                        <div className="flex justify-between items-center text-[11px] font-semibold mb-1">
                          <span className="text-ink/60">Nivel de Cumplimiento:</span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${dim.desempeno.badgeClass}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {dim.desempeno.tag}
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-line/80 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              dim.score === null
                                ? 'bg-line/40'
                                : dim.score >= 4.0
                                ? 'bg-emerald-500'
                                : dim.score >= 3.5
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${dim.score !== null ? dim.porcentaje : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {diagnosticoPedagogico && (
                <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 border-b border-line pb-3">
                    <Sparkles className="text-pine" size={18} />
                    <div>
                      <h3 className="font-serif text-lg font-bold text-pine">
                        Diagnóstico Pedagógico y Recomendaciones
                      </h3>
                      <p className="text-xs text-ink/60">
                        Estrategias didácticas y orientaciones formativas según el desempeño en cada dimensión
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4.5 text-emerald-950">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-900 mb-2">
                      <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                      <span>Fortalezas Pedagógicas Consolidadas (Dimensiones con Desempeño Superior a 4.2)</span>
                    </div>

                    {diagnosticoPedagogico.fortalezas.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs text-emerald-900 leading-relaxed">
                          El profesor evidencia un impacto formativo altamente favorable en el estudiantado de Ingeniería de Sistemas.
                          Se destacan de manera notable las siguientes competencias:
                        </p>
                        <ul className="grid gap-2 sm:grid-cols-2 text-xs list-none pl-0">
                          {diagnosticoPedagogico.fortalezas.map((f) => (
                            <li
                              key={f.id}
                              className="flex items-start gap-2 rounded-lg bg-white/70 p-2.5 border border-emerald-200"
                            >
                              <Check size={14} className="text-emerald-700 mt-0.5 shrink-0" />
                              <div>
                                <strong className="text-emerald-950">{f.titulo}</strong>
                                <span className="ml-1 text-[11px] font-bold text-emerald-800">
                                  ({f.score !== null ? f.score.toFixed(2) : '—'} / 5.0)
                                </span>
                                <p className="text-[11px] text-emerald-800 mt-0.5">{f.descripcion}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-xs text-emerald-900 leading-relaxed">
                        La dimensión con mayor solidez actual corresponde a{' '}
                        <b>{diagnosticoPedagogico.mejorDimension.titulo}</b> ({diagnosticoPedagogico.mejorDimension.score !== null ? diagnosticoPedagogico.mejorDimension.score.toFixed(2) : '—'} / 5.00),
                        constituyendo la base pedagógica clave sobre la cual apalancar el plan de mejoramiento integral.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/80 p-4.5 text-indigo-950">
                    <div className="flex items-center gap-2 font-bold text-sm text-indigo-900 mb-2">
                      <Lightbulb size={18} className="text-indigo-700 shrink-0" />
                      <span>Recomendaciones y Prácticas Didácticas Sugeridas</span>
                    </div>

                    <p className="text-xs text-indigo-900 mb-3 leading-relaxed">
                      Recomendaciones metodológicas precisas para potenciar la mediación pedagógica en el aula y elevar la satisfacción formativa de los estudiantes:
                    </p>

                    <div className="space-y-2.5">
                      {diagnosticoPedagogico.consejosDidacticos.map((consejo, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-lg bg-white/80 p-3 border border-indigo-150 text-xs shadow-2xs"
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <p className="text-indigo-950 leading-relaxed">{consejo}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {activeDetail.estaConsolidado && diagnosticoPedagogico.requierePlanAccion && (
                    <div className="rounded-xl border border-red-300 bg-red-50/80 p-4.5 text-red-950 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-sm text-red-900">
                        <AlertTriangle size={18} className="text-red-700 shrink-0" />
                        <span>Plan de Acción Inmediato (Compromisos Institucionales)</span>
                      </div>

                      <div className="rounded-lg bg-white/80 p-3 border border-red-200 text-xs text-red-950 leading-relaxed">
                        <p className="font-semibold text-red-900 mb-1">
                          ⚠️ Alerta de Umbral Institucional MEDIT Activada
                        </p>
                        La calificación consolidada ({activeDetail.grade.finalScore.toFixed(2)} / 5.00) se sitúa por debajo del límite de satisfacción institucional (4.00). Se establecen con carácter obligatorio los siguientes tres compromisos con la Coordinación del Programa de Ingeniería de Sistemas:
                      </div>

                      <div className="overflow-x-auto rounded-lg border border-red-200 bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-red-100/60 font-bold text-red-900 uppercase text-[10px] tracking-wider border-b border-red-200">
                            <tr>
                              <th className="p-2.5 pl-3">#</th>
                              <th className="p-2.5">Compromiso Pedagógico Obligatorio</th>
                              <th className="p-2.5">Plazo / Frecuencia</th>
                              <th className="p-2.5 pr-3">Evidencia Requerida</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-100 text-red-950">
                            <tr>
                              <td className="p-2.5 pl-3 font-bold text-red-700">1</td>
                              <td className="p-2.5 font-medium">
                                Ajuste y socialización del acuerdo pedagógico en el primer corte
                              </td>
                              <td className="p-2.5">Semana 2 del semestre</td>
                              <td className="p-2.5 pr-3 text-[11px] text-ink/70">
                                Acta firmada de concertación de rúbricas con estudiantes
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2.5 pl-3 font-bold text-red-700">2</td>
                              <td className="p-2.5 font-medium">
                                Establecimiento de 2 horas semanales de asesoría extracurricular presencial
                              </td>
                              <td className="p-2.5">Semanal fija</td>
                              <td className="p-2.5 pr-3 text-[11px] text-ink/70">
                                Planilla de asistencia de asesorías en cubículo docente
                              </td>
                            </tr>
                            <tr>
                              <td className="p-2.5 pl-3 font-bold text-red-700">3</td>
                              <td className="p-2.5 font-medium">
                                Sesión de seguimiento quincenal con la Coordinación de Ingeniería de Sistemas
                              </td>
                              <td className="p-2.5">Quincenal</td>
                              <td className="p-2.5 pr-3 text-[11px] text-ink/70">
                                Informe de avance del parcelador y corte de notas
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <MessageSquare className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Retroalimentación y Comentarios de Estudiantes
                    </h3>
                    <p className="text-xs text-ink/60">
                      Comentarios aportados por los estudiantes bajo confidencialidad institucional
                    </p>
                  </div>
                </div>

                {comentariosEstudiantes.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {comentariosEstudiantes.map((coment, idx) => (
                      <blockquote
                        key={idx}
                        className="rounded-xl border border-line bg-paper/40 p-4 text-xs shadow-2xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                                coment.tipo === 'fortaleza'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {coment.tipo === 'fortaleza' ? '✓ Fortaleza Reconocida' : '💡 Sugerencia Didáctica'}
                            </span>
                            <span className="font-mono text-[10px] text-ink/40">{coment.periodo}</span>
                          </div>
                          <p className="font-serif text-sm text-ink/90 italic leading-relaxed">
                            “{coment.texto}”
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-line/50 flex items-center gap-1.5 text-[10px] text-ink/50">
                          <ShieldCheck size={13} className="text-pine" />
                          <span>{coment.autor} · Comentario 100% Anónimo</span>
                        </div>
                      </blockquote>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line p-6 text-center text-xs text-ink/60 bg-paper/20">
                    <p className="font-medium text-ink/80">Aún no se registran observaciones cualitativas de estudiantes para este docente.</p>
                    <p className="mt-1 text-[11px] text-ink/50">Los comentarios aportados por los estudiantes se desplegarán aquí bajo confidencialidad institucional una vez se reciban respuestas.</p>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-line bg-paper/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-ink/70">
                  <p className="font-bold text-pine text-sm">Soporte de Evaluación Docente MEDIT</p>
                  <p className="text-ink/60">
                    Documento formal para el proceso de autoevaluación y aseguramiento de la calidad académica.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-pine/90 transition"
                  >
                    <Printer size={15} />
                    <span>Imprimir / Exportar Reporte (PDF)</span>
                  </button>

                  {!isTeacherView && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId(null)
                        onClose?.()
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-xs font-semibold text-ink hover:bg-paper transition"
                    >
                      Regresar al listado
                    </button>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
