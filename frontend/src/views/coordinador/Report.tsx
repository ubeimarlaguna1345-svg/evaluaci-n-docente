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
  | 'Excelente'
  | 'Aceptable'
  | 'En seguimiento'
  | 'En Seguimiento'
  | 'Satisfactorio'
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
      nivel: 'Excelente',
      label: 'Excelente (≥ 4.0)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      borderClass: 'border-emerald-300',
      bgSoft: 'bg-emerald-50/70',
      textColor: 'text-emerald-800',
      tag: 'Excelente',
    }
  }
  if (score >= 3.5) {
    return {
      nivel: 'Aceptable',
      label: 'Aceptable (3.5 – 3.9)',
      badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
      borderClass: 'border-sky-300',
      bgSoft: 'bg-sky-50/70',
      textColor: 'text-sky-800',
      tag: 'Aceptable',
    }
  }
  return {
    nivel: 'En seguimiento',
    label: 'En seguimiento (< 3.5)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    borderClass: 'border-amber-300',
    bgSoft: 'bg-amber-50/70',
    textColor: 'text-amber-900',
    tag: 'En seguimiento',
  }
}


export function getFalenciaExplicitada(dimId: string, dimTitulo: string): string {
  const t = (dimTitulo || '').toLowerCase()
  if (
    t.includes('virtual') ||
    t.includes('medit') ||
    t.includes('digital') ||
    t.includes('tecnol') ||
    t.includes('metodolog') ||
    dimId === 'dim-3'
  ) {
    return 'Subutilización de la plataforma virtual, falta de recursos interactivos y necesidad de articular casos prácticos.'
  }
  if (
    t.includes('nota') ||
    t.includes('retroaliment') ||
    dimId === 'dim-4'
  ) {
    return 'Falta de oportunidad en la devolución de calificaciones y ausencia de retroalimentación formativa previa a cortes sumativos.'
  }
  if (
    t.includes('pedagóg') ||
    t.includes('didáct') ||
    t.includes('claridad') ||
    t.includes('dominio') ||
    dimId === 'dim-1'
  ) {
    return 'Necesidad de reestructurar la planeación de clase, dinamizar la didáctica y clarificar criterios evaluativos con antelación.'
  }
  return 'Oportunidad de fortalecimiento en la empatía pedagógica, atención respetuosa a dudas y acuerdos de convivencia académica en el aula.'
}

export function getCorreccionPorDimension(dimTituloOrId: string): string {
  const t = (dimTituloOrId || '').toLowerCase()
  if (t.includes('retroaliment') || t.includes('nota') || t.includes('dim-4')) {
    return 'Corregir retrasos en la entrega de notas y garantizar retroalimentación oportuna en talleres y evaluaciones.'
  }
  if (t.includes('pedagóg') || t.includes('didáct') || t.includes('claridad') || t.includes('dominio') || t.includes('dim-1')) {
    return 'Reestructurar la planeación de clase, dinamizar la didáctica y clarificar criterios evaluativos.'
  }
  if (t.includes('digital') || t.includes('medit') || t.includes('tecnol') || t.includes('metodolog') || t.includes('dim-3')) {
    return 'Emplear efectivamente el aula virtual y recursos tecnológicos en el aprendizaje.'
  }
  if (t.includes('clima') || t.includes('comunicac') || t.includes('asertiv') || t.includes('convivenc') || t.includes('organizac') || t.includes('dim-2')) {
    return 'Mejorar la empatía, atención respetuosa a dudas y acuerdos de convivencia académica.'
  }
  return 'Reestructurar la planeación de clase, dinamizar la didáctica y clarificar criterios evaluativos.'
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
    titulo: 'Mediación Pedagógica y Didáctica',
    dimensionDb: 'Claridad conceptual y explicación',
    descripcion: 'Planeación de clase, dinamización didáctica, dominio disciplinar y clarificación de criterios evaluativos.',
    offset: 0.08,
  },
  {
    id: 'dim-2',
    numero: 2,
    titulo: 'Clima y Comunicación Asertiva',
    dimensionDb: 'Organización y cumplimiento del programa',
    descripcion: 'Empatía pedagógica, atención respetuosa a dudas, acuerdos de convivencia académica y puntualidad.',
    offset: 0.05,
  },
  {
    id: 'dim-3',
    numero: 3,
    titulo: 'Mediación Digital / MEDIT',
    dimensionDb: 'Metodología y aplicación práctica',
    descripcion: 'Uso efectivo del aula virtual, recursos tecnológicos de aprendizaje y articulación de casos prácticos MEDIT.',
    offset: -0.06,
  },
  {
    id: 'dim-4',
    numero: 4,
    titulo: 'Retroalimentación Formativa',
    dimensionDb: 'Retroalimentación y entrega oportuna de notas',
    descripcion: 'Oportunidad en la entrega de notas, retroalimentación oportuna en talleres y evaluaciones, y disposición para asesorías.',
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
          (x.desempeno.nivel === 'Excelente' ||
            x.desempeno.nivel === 'Satisfactorio' ||
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
        (x) =>
          x.estaConsolidado &&
          (x.desempeno.nivel === 'En seguimiento' ||
            x.desempeno.nivel === 'En Seguimiento')
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
        (tierFilter === 'En Curso'
          ? !estaConsolidado
          : (estaConsolidado && (
              desempeno.nivel === tierFilter ||
              (tierFilter === 'Excelente' && (desempeno.nivel === 'Satisfactorio' || desempeno.nivel === 'Excelente')) ||
              (tierFilter === 'En seguimiento' && (desempeno.nivel === 'En Seguimiento' || desempeno.nivel === 'En seguimiento'))
            )))

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

    const dimensionesEnSeguimiento = useMemo(() => {
    return dimensionesCalculadas.filter(
      (d) => d.score !== null && (d.score < 3.5 || d.porcentaje < 70)
    )
  }, [dimensionesCalculadas])

  const nivelGlobalEfectivo = useMemo<'En seguimiento' | 'Aceptable' | 'Excelente'>(() => {
    if (dimensionesEnSeguimiento.length > 0) return 'En seguimiento'
    const score = activeDetail?.grade.finalScore ?? 0
    if (score < 3.5) return 'En seguimiento'
    if (score <= 3.9) return 'Aceptable'
    return 'Excelente'
  }, [activeDetail, dimensionesEnSeguimiento])

  const recomendacionesFormativas = useMemo<string[]>(() => {
    if (nivelGlobalEfectivo === 'En seguimiento') {
      return [
        'Establecer calendario obligatorio de retroalimentación en un plazo no mayor a 8 días post-evaluación.',
        'Reestructurar las aulas virtuales en la plataforma institucional integrando recursos educativos digitales activos.',
        'Asistir al programa de acompañamiento pedagógico y tutoría docente de la sede.',
      ]
    }
    if (nivelGlobalEfectivo === 'Aceptable') {
      return [
        'Publicar rúbricas detalladas al inicio de cada corte evaluativo.',
        'Fortalecer el aprendizaje basado en problemas reales del entorno.',
      ]
    }
    return [
      'Liderar semilleros o comunidades de práctica pedagógica.',
      'Producir y documentar Recursos Educativos Abiertos (REA).',
    ]
  }, [nivelGlobalEfectivo])

  const diagnosticoPedagogico = useMemo(() => {
    if (!activeDetail || !dimensionesCalculadas.length) return null

    const conScore = dimensionesCalculadas.filter((d) => d.score !== null)
    if (conScore.length === 0) return null

    const dimensionMayor = [...conScore].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]
    const dimensionMenor = [...conScore].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
    const finalScore = activeDetail.grade.finalScore

    // Escala institucional exacta:
    // 1. NIVEL CRÍTICO: Menor a 3.5 (< 3.5) -> "En seguimiento"
    // 2. NIVEL MEDIO: De 3.5 a 3.9 (>= 3.5 y <= 3.9) -> "Aceptable"
    // 3. NIVEL ALTO: De 4.0 en adelante (>= 4.0) -> "Excelente"
    const esCritico = finalScore < 3.5
    const esMedio = finalScore >= 3.5 && finalScore <= 3.9
    const esAlto = finalScore >= 4.0

    const rango: 'critico' | 'medio' | 'alto' = esCritico ? 'critico' : esMedio ? 'medio' : 'alto'
    const nivelBadge = getNivelDesempeno(finalScore)

    // 1. Diagnóstico por nivel
    let diagnostico = ''
    if (esCritico) {
      diagnostico = 'Alerta pedagógica y acompañamiento institucional prioritario.'
    } else if (esMedio) {
      diagnostico = 'Cumplimiento básico de los criterios evaluativos con margen claro de mejora continua.'
    } else {
      diagnostico = 'Desempeño docente sobresaliente y alineado con los estándares del MEDIT.'
    }

    // 2. Puntos fuertes
    let puntosFuertesTexto = ''
    if (esAlto) {
      puntosFuertesTexto = `Felicitación institucional por su destacado liderazgo en la dimensión "${dimensionMayor.titulo}" (${dimensionMayor.score !== null ? dimensionMayor.score.toFixed(2) : '—'} / 5.00), evidenciando alto dominio temático, metodología pedagógica y uso efectivo de tecnologías en el aprendizaje.`
    } else if (esMedio) {
      puntosFuertesTexto = `Se reconoce la dimensión "${dimensionMayor.titulo}" (${dimensionMayor.score !== null ? dimensionMayor.score.toFixed(2) : '—'} / 5.00) como base sólida de su trabajo docente, constituyendo el pilar formativo para impulsar las áreas de oportunidad.`
    } else {
      puntosFuertesTexto = `La dimensión con mejor desempeño relativo corresponde a "${dimensionMayor.titulo}" (${dimensionMayor.score !== null ? dimensionMayor.score.toFixed(2) : '—'} / 5.00), constituyendo el punto de partida sobre el cual cimentar el plan de mejoramiento institucional.`
    }
    const fortalezasDestacadas = conScore.filter((d) => (d.score ?? 0) >= 4.0)

    // 3. Aspectos a corregir y oportunidades de desarrollo
    let analisisMenorTexto = ''
    const queDebeCorregir: string[] = []

    if (esCritico) {
      analisisMenorTexto = `Se identifica la dimensión "${dimensionMenor.titulo}" (${dimensionMenor.score !== null ? dimensionMenor.score.toFixed(2) : '—'} / 5.00) como la causa crítica del bajo desempeño docente.`
      queDebeCorregir.push(getCorreccionPorDimension(dimensionMenor.titulo))
    } else if (esMedio) {
      analisisMenorTexto = `Se reconoce la dimensión "${dimensionMayor.titulo}" como base de su trabajo, pero se advierte que la dimensión "${dimensionMenor.titulo}" (${dimensionMenor.score !== null ? dimensionMenor.score.toFixed(2) : '—'} / 5.00) está frenando su consolidación institucional.`
      queDebeCorregir.push(
        `Ajustar la planeación y reforzar la dimensión más baja (${dimensionMenor.titulo}) para superar el umbral básico.`,
        'Socializar y dar estricto cumplimiento al acuerdo pedagógico concertado con los estudiantes.'
      )
    } else {
      analisisMenorTexto = `Margen de optimización: De manera constructiva, se señala que la dimensión "${dimensionMenor.titulo}" (${dimensionMenor.score !== null ? dimensionMenor.score.toFixed(2) : '—'} / 5.00) es la clave para perfeccionar su práctica pedagógica.`
      queDebeCorregir.push(
        `Continuar fortaleciendo la dimensión ${dimensionMenor.titulo} para consolidar la máxima excelencia pedagógica en el siguiente período académico.`
      )
    }

    // 4. Plan de acción y consejos formativos
    let planAccionTitulo = ''
    let planAccionDetalle = ''
    const consejosFormativos: string[] = []

    if (esCritico) {
      planAccionTitulo = 'Plan de Acción y Compromiso Obligatorio'
      planAccionDetalle = 'Compromiso pedagógico obligatorio, seguimiento por coordinación académica y participación en talleres de cualificación docente.'
      consejosFormativos.push(
        'Compromiso pedagógico obligatorio: Firma de acuerdos y ajuste de planeación curricular.',
        'Seguimiento por coordinación académica: Sesiones quincenales de verificación de avances pedagógicos.',
        'Participación en talleres de cualificación docente MEDIT y acompañamiento entre pares.'
      )
    } else if (esMedio) {
      planAccionTitulo = 'Plan de Optimización Metodológica'
      planAccionDetalle = 'Recomendaciones prácticas de optimización metodológica para alcanzar el nivel de excelencia en el siguiente período.'
      consejosFormativos.push(
        'Revisar y ajustar el cronograma de evaluaciones para garantizar retroalimentación oportuna en cada corte.',
        'Incorporar dinámicas de participación activa y talleres aplicados a problemas reales del entorno regional.',
        'Socializar periódicamente el avance de los acuerdos pedagógicos concertados con los estudiantes.'
      )
    } else {
      planAccionTitulo = 'Consejos Formativos de Proyección y Liderazgo Académico'
      planAccionDetalle = 'Estrategias de proyección docente y liderazgo en la comunidad académica institucional:'
      consejosFormativos.push(
        'Liderar semilleros de investigación, comunidades de aprendizaje o mentoría a otros docentes.',
        'Producir recursos educativos abiertos (REA/OVA) en el ecosistema digital institucional.',
        'Compartir metodologías activas y experiencias exitosas en los comités de currículo y jornadas docentes de la Facultad.'
      )
    }

    return {
      rango,
      esCritico,
      esMedio,
      esAlto,
      nivelBadge,
      diagnostico,
      dimensionMayor,
      dimensionMenor,
      puntosFuertesTexto,
      fortalezasDestacadas,
      analisisMenorTexto,
      queDebeCorregir,
      planAccionTitulo,
      planAccionDetalle,
      consejosFormativos,
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
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Excelente</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold text-emerald-700">{countsByTier.satisfactorio}</span>
                  <span className="text-xs text-ink/40">de {countsByTier.total}</span>
                </div>
                <span className="mt-1 inline-flex text-[11px] text-emerald-700 font-medium">≥ 4.0 · Desempeño sobresaliente</span>
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
                <span className="mt-1 inline-flex text-[11px] text-sky-800 font-medium">3.5 – 3.9 · Cumplimiento básico</span>
              </div>
              <div className="rounded-full bg-amber-100 p-3 text-amber-700">
                <AlertTriangle size={24} />
              </div>
            </Card>

            <Card className="flex items-center justify-between p-4 border-l-4 border-amber-500">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">En seguimiento</p>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-serif text-3xl font-bold text-amber-800">
                    {countsByTier.seguimiento}
                  </span>
                  <span className="text-xs text-ink/40">&lt; 3.50</span>
                </div>
                <span className="mt-1 inline-flex text-[11px] text-amber-800 font-medium">Alerta pedagógica y acompañamiento</span>
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
                  {(['todos', 'Excelente', 'Aceptable', 'En seguimiento', 'En Curso'] as const).map(
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
                              <div className="text-[10px] text-ink/50">70%: {grade.studentWeighted?.toFixed(2)} pts ({grade.studentResponsesCount} resp.)</div>
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
                  /* DESGLOSE CUANTITATIVO DE PONDERACIÓN 70/30 */
                  diagnosticoPedagogico && (
                    <div className="mt-4 rounded-xl border border-line bg-white p-4.5 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 mb-4">
                        <div>
                          <h4 className="font-serif text-base font-bold text-pine">
                            Ponderación Oficial: 70% Heteroevaluación + 30% Autoevaluación
                          </h4>
                          <p className="text-[11px] text-ink/60">
                            Fórmula reglamentaria MEDIT: [(Promedio Estudiantes × 0.70) + (Autoevaluación × 0.30)]
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border shadow-2xs ${diagnosticoPedagogico.nivelBadge.badgeClass}`}
                        >
                          <span className="h-2 w-2 rounded-full bg-current" />
                          {diagnosticoPedagogico.nivelBadge.tag}
                        </span>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        {/* Heteroevaluación 70% */}
                        <div className="rounded-lg border border-line bg-paper/40 p-3.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-ink/60">
                            <span>Heteroevaluación</span>
                            <span className="rounded bg-pine/10 px-1.5 py-0.5 text-pine font-bold">70%</span>
                          </div>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="font-serif text-2xl font-bold text-pine">
                              {activeDetail.grade.studentAvg !== null ? activeDetail.grade.studentAvg.toFixed(2) : '—'}
                            </span>
                            <span className="text-xs text-ink/40">/ 5.00</span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink/70">
                            Aporte: <b>{activeDetail.grade.studentWeighted?.toFixed(2) || '0.00'}</b> / 3.50 pts
                          </p>
                          <div className="mt-2 pt-2 border-t border-line/60 text-[10px] text-ink/50 flex items-center gap-1">
                            <Users size={12} className="text-pine" />
                            <span>{metricasParticipacion.respondieron} evaluaciones ({metricasParticipacion.porcentaje}% part.)</span>
                          </div>
                        </div>

                        {/* Autoevaluación 30% */}
                        <div className="rounded-lg border border-line bg-paper/40 p-3.5">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-ink/60">
                            <span>Autoevaluación Docente</span>
                            <span className="rounded bg-ochre/15 px-1.5 py-0.5 text-ochre font-bold">30%</span>
                          </div>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="font-serif text-2xl font-bold text-ochre">
                              {activeDetail.grade.autoAvg !== null ? activeDetail.grade.autoAvg.toFixed(2) : '—'}
                            </span>
                            <span className="text-xs text-ink/40">/ 5.00</span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink/70">
                            Aporte: <b>{activeDetail.grade.autoWeighted?.toFixed(2) || '0.00'}</b> / 1.50 pts
                          </p>
                          <div className="mt-2 pt-2 border-t border-line/60 text-[10px] text-ink/50 flex items-center gap-1">
                            {activeDetail.tieneAutoevaluacion ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <Check size={12} /> Completada
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold flex items-center gap-1">
                                <Clock size={12} /> Pendiente
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Nota Consolidada MEDIT */}
                        <div className={`rounded-lg border p-3.5 ${diagnosticoPedagogico.nivelBadge.bgSoft} ${diagnosticoPedagogico.nivelBadge.borderClass}`}>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-ink/60">
                            <span>Nota Consolidada MEDIT</span>
                            <span className="rounded bg-white/80 px-1.5 py-0.5 font-bold font-mono text-ink/70 border border-line">
                              100%
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className="font-serif text-3xl font-bold text-pine">
                              {activeDetail.grade.finalScore.toFixed(2)}
                            </span>
                            <span className="text-xs text-ink/40">/ 5.00</span>
                          </div>
                          <p className="mt-1 text-[11px] text-ink/70">
                            Nivel: <b>{diagnosticoPedagogico.nivelBadge.label}</b>
                          </p>
                          <div className="mt-2 pt-2 border-t border-line/60 text-[10px] text-ink/60">
                            {diagnosticoPedagogico.diagnostico}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </section>

              {/* DESGLOSE POR DIMENSIONES MEDIT */}
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
                                ? 'bg-sky-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${dim.score !== null ? dim.porcentaje : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              
              {/* 1. BLOQUE: Diagnóstico Pedagógico y Falencias Detectadas */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:border-pine/30 print:p-4 print:break-inside-avoid">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <Sparkles className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Diagnóstico Pedagógico y Falencias Detectadas
                    </h3>
                    <p className="text-xs text-ink/60">
                      Análisis formativo y cualitativo derivado de las dimensiones evaluadas del modelo MEDIT
                    </p>
                  </div>
                </div>

                {dimensionesEnSeguimiento.length > 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-800 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-amber-900 mb-0.5">
                          Alerta Pedagógica: Dimensiones en Nivel "En seguimiento" (&lt; 3.5 o &lt; 70%)
                        </p>
                        <p className="leading-relaxed">
                          Se han identificado falencias críticas que requieren atención prioritaria y acompañamiento pedagógico institucional:
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {dimensionesEnSeguimiento.map((dim) => {
                        const falenciaTexto = getFalenciaExplicitada(dim.id, dim.titulo)
                        return (
                          <div
                            key={dim.id}
                            className="rounded-xl border border-amber-300/80 bg-amber-50/50 p-4 text-xs space-y-2 shadow-2xs"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                                  {dim.numero}
                                </span>
                                {dim.titulo}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 font-bold font-mono text-[10px] text-amber-900 border border-amber-300">
                                {dim.score !== null ? `${dim.score.toFixed(2)} / 5.0` : 'Sin datos'} ({dim.porcentaje}%)
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-amber-900 mb-1 flex items-center gap-1">
                                <AlertCircle size={13} className="text-amber-700" />
                                <span>Falencia detectada:</span>
                              </p>
                              <p className="text-amber-950 leading-relaxed pl-3 border-l-2 border-amber-300">
                                {falenciaTexto}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Puntos fuertes principales */}
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50/80 p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                      <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-900 mb-0.5">Puntos Fuertes Principales</p>
                        <p className="leading-relaxed">
                          {diagnosticoPedagogico?.puntosFuertesTexto ||
                            'Desempeño docente alineado con los estándares del MEDIT, con competencias consolidadas en mediación pedagógica y desarrollo de contenidos.'}
                        </p>
                      </div>
                    </div>

                    {/* Foco de perfeccionamiento constructivo */}
                    {diagnosticoPedagogico && (
                      <div className="rounded-lg border border-sky-300 bg-sky-50/70 p-3.5 text-xs text-sky-950 flex items-start gap-2.5">
                        <Lightbulb size={18} className="text-sky-700 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sky-900 mb-0.5">Foco de Perfeccionamiento Pedagógico</p>
                          <p className="leading-relaxed">
                            De manera constructiva, se señala que la dimensión <b>"{diagnosticoPedagogico.dimensionMenor.titulo}"</b> ({diagnosticoPedagogico.dimensionMenor.score !== null ? diagnosticoPedagogico.dimensionMenor.score.toFixed(2) : '—'} / 5.00) constituye el área de oportunidad clave para perfeccionar su práctica pedagógica y avanzar hacia la excelencia formativa.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* 2. BLOQUE: Plan de Acción y Recomendaciones Formativas (MEDIT) */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:border-pine/30 print:p-4 print:break-inside-avoid">
                <div className="flex items-center gap-2 border-b border-line pb-3">
                  <Target className="text-pine" size={18} />
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Plan de Acción y Recomendaciones Formativas (MEDIT)
                    </h3>
                    <p className="text-xs text-ink/60">
                      Acciones correctivas o de cualificación pedagógica estructuradas según el nivel institucional ({nivelGlobalEfectivo})
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-paper/40 p-4">
                  <ul className="space-y-2.5 text-xs list-none pl-0">
                    {recomendacionesFormativas.map((rec, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 rounded-lg bg-white p-3 border border-line shadow-2xs text-ink/90"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine text-white font-bold text-[10px]">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed font-medium">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

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
                              {coment.tipo === 'fortaleza' ? 'Fortaleza Reconocida' : 'Sugerencia Didáctica'}
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
