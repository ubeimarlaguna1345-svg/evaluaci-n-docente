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
    actions.syncAllResponses().catch(() => {})
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
      const tieneEvaluaciones = Boolean(
        grade.hasEvaluations ||
        (grade.studentResponsesCount ?? 0) > 0 ||
        (grade.autoResponsesCount ?? 0) > 0
      )
      const desempeno = tieneEvaluaciones
        ? getNivelDesempeno(grade.finalScore)
        : {
            nivel: 'En Curso' as NivelDesempeno,
            label: 'Sin evaluar / En Curso',
            badgeClass: 'bg-paper text-ink/70 border border-line',
            borderClass: 'border-line',
            bgSoft: 'bg-paper/50',
            textColor: 'text-ink/60',
            tag: 'Sin evaluar',
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
    const valid = teachersWithGrades.filter((x) => (x.grade.hasEvaluations || (x.grade.studentResponsesCount ?? 0) > 0) && x.grade.finalScore > 0)
    if (!valid.length) return 4.18
    const sum = valid.reduce((acc, curr) => acc + curr.grade.finalScore, 0)
    return Number((sum / valid.length).toFixed(2))
  }, [teachersWithGrades])

  const countsByTier = useMemo(() => {
    const hasEval = (x: any) => Boolean(x.grade.hasEvaluations || (x.grade.studentResponsesCount ?? 0) > 0 || (x.grade.autoResponsesCount ?? 0) > 0)
    return {
      total: teachersWithGrades.length,
      satisfactorio: teachersWithGrades.filter(
        (x) =>
          hasEval(x) &&
          (x.desempeno.nivel === 'Excelente' ||
            x.desempeno.nivel === 'Satisfactorio' ||
            x.desempeno.nivel === 'Destacado' ||
            x.desempeno.nivel === 'Sobresaliente')
      ).length,
      aceptable: teachersWithGrades.filter(
        (x) =>
          hasEval(x) &&
          (x.desempeno.nivel === 'Aceptable' ||
            x.desempeno.nivel === 'Aceptable / Atención Preventiva')
      ).length,
      seguimiento: teachersWithGrades.filter(
        (x) =>
          hasEval(x) &&
          (x.desempeno.nivel === 'En seguimiento' ||
            x.desempeno.nivel === 'En Seguimiento')
      ).length,
      enCurso: teachersWithGrades.filter((x) => x.estaEnCurso).length,
    }
  }, [teachersWithGrades])

  const filteredTeachers = useMemo(() => {
    return teachersWithGrades.filter(({ teacher, cadis, desempeno, estaConsolidado, grade }) => {
      const cadisText = cadis.map((c) => `${c.codigo} ${c.nombre} ${c.tipo || ''}`).join(' ')
      const matchesSearch =
        teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cadisText.toLowerCase().includes(searchQuery.toLowerCase())

      const hasEvaluations = Boolean(grade.hasEvaluations || (grade.studentResponsesCount ?? 0) > 0 || (grade.autoResponsesCount ?? 0) > 0)

      const matchesTier =
        tierFilter === 'todos' ||
        (tierFilter === 'En Curso'
          ? !estaConsolidado
          : (hasEvaluations && (
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
                          {grade.hasEvaluations ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-serif text-base font-bold text-pine">
                                  {grade.finalScore.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-ink/40">/ 5.0</span>
                                {!estaConsolidado && (
                                  <span className="text-[9px] rounded bg-ochre/15 px-1 py-0.2 text-ochre font-semibold">
                                    Provisional
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 h-1.5 w-20 rounded-full bg-paper overflow-hidden border border-line/40">
                                <div
                                  className={`h-full rounded-full ${
                                    grade.finalScore >= 4.0
                                      ? 'bg-emerald-500'
                                      : grade.finalScore >= 3.5
                                      ? 'bg-sky-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (grade.finalScore / 5) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-paper px-2 py-0.5 text-xs font-medium text-ink/50 border border-line">
                              Sin evaluar
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          {grade.hasEvaluations ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${desempeno.badgeClass}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {desempeno.tag} {!estaConsolidado && <span className="text-[9px] text-ink/50 font-normal">(En Curso)</span>}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-paper text-ink/50 border border-line">
                              <Clock size={11} />
                              Sin evaluar
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
              {/* FICHA TÉCNICA Y DATOS DE IDENTIFICACIÓN */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs print:p-4 print:border-line">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 mb-4">
                  <div>
                    <h3 className="font-serif text-lg font-bold text-pine">
                      Ficha Técnica y Datos de Identificación
                    </h3>
                    <p className="text-xs text-ink/60">
                      Registro formal institucional de la práctica docente en el período {selectedPeriod}
                    </p>
                  </div>

                  {/* Insignia Oficial Institucional */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink/60 uppercase tracking-wider">
                      Nivel Oficial:
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${
                        activeDetail.grade.finalScore < 3.5
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : activeDetail.grade.finalScore <= 3.9
                          ? 'bg-sky-100 text-sky-800 border-sky-300'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      {activeDetail.grade.finalScore < 3.5
                        ? 'En seguimiento'
                        : activeDetail.grade.finalScore <= 3.9
                        ? 'Aceptable'
                        : 'Excelente'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-lg border border-line bg-paper/40 p-4 text-xs">
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
                    <p className="text-[11px] text-ink/60">Programa: {activeDetail.teacher.carrera || 'Ingeniería de Sistemas'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Asignatura / CADI</span>
                    <div className="mt-0.5">
                      {activeDetail.cadis.length > 0 ? (
                        <p className="font-semibold text-xs text-ink/90">
                          {activeDetail.cadis.map((c) => `${c.codigo} - ${c.nombre} (${c.tipo || 'CADI'})`).join(', ')}
                        </p>
                      ) : (
                        <span className="text-ink/50 italic">CADI General</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">Sede y Período</span>
                    <p className="font-semibold text-xs text-ink/80">{activeDetail.teacher.sede || 'Sede Facatativá'}</p>
                    <p className="text-[11px] font-bold text-pine">Período Académico {selectedPeriod}</p>
                  </div>
                </div>
              </section>

              {/* SECCIÓN 1: BALANCE GENERAL DE LA PRÁCTICA DOCENTE */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:p-4 print:border-line print:break-inside-avoid">
                <div className="border-b border-line pb-3">
                  <h3 className="font-serif text-lg font-bold text-pine">
                    1. Balance General de la Práctica Docente
                  </h3>
                  <p className="text-xs text-ink/60">
                    Contraste cuantitativo y reflexivo entre la heteroevaluación estudiantil y la autoevaluación docente
                  </p>
                </div>

                {/* Tarjetas Cuantitativas Formales */}
                <div className="grid gap-3 sm:grid-cols-3">
                  {/* Heteroevaluación 70% */}
                  <div className="rounded-lg border border-line bg-paper/40 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink/70">
                      <span>Heteroevaluación Estudiantil</span>
                      <span className="font-mono font-bold text-pine">70%</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-serif text-3xl font-bold text-pine">
                        {activeDetail.grade.studentAvg !== null ? activeDetail.grade.studentAvg.toFixed(2) : '0.00'}
                      </span>
                      <span className="text-xs text-ink/40">/ 5.00</span>
                    </div>
                    <p className="mt-1 text-xs text-ink/70">
                      Aporte ponderado: <b>{activeDetail.grade.studentWeighted?.toFixed(2) || '0.00'}</b> / 3.50 pts
                    </p>
                    <div className="mt-2 pt-2 border-t border-line/60 text-[11px] text-ink/50">
                      Muestra: {metricasParticipacion.respondieron} evaluaciones ({metricasParticipacion.porcentaje}% de participación)
                    </div>
                  </div>

                  {/* Autoevaluación 30% */}
                  <div className="rounded-lg border border-line bg-paper/40 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-ink/70">
                      <span>Autoevaluación Docente</span>
                      <span className="font-mono font-bold text-ochre">30%</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-serif text-3xl font-bold text-ochre">
                        {activeDetail.grade.autoAvg !== null ? activeDetail.grade.autoAvg.toFixed(2) : '0.00'}
                      </span>
                      <span className="text-xs text-ink/40">/ 5.00</span>
                    </div>
                    <p className="mt-1 text-xs text-ink/70">
                      Aporte ponderado: <b>{activeDetail.grade.autoWeighted?.toFixed(2) || '0.00'}</b> / 1.50 pts
                    </p>
                    <div className="mt-2 pt-2 border-t border-line/60 text-[11px] text-ink/50">
                      Estado: {activeDetail.tieneAutoevaluacion ? 'Diligenciada y completada' : 'Pendiente de registro'}
                    </div>
                  </div>

                  {/* Calificación Consolidada MEDIT */}
                  <div className="rounded-lg border border-line bg-pine/5 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-pine">
                      <span>Nota Consolidada MEDIT</span>
                      <span className="font-mono font-bold">100%</span>
                    </div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-serif text-3xl font-bold text-pine">
                        {activeDetail.grade.finalScore.toFixed(2)}
                      </span>
                      <span className="text-xs text-ink/40">/ 5.00</span>
                    </div>
                    <p className="mt-1 text-xs text-ink/70">
                      Escala oficial: <b>{activeDetail.desempeno.tag}</b>
                    </p>
                    <div className="mt-2 pt-2 border-t border-line/60 text-[11px] text-ink/60">
                      Fórmula: [(Heteroevaluación × 0.70) + (Autoevaluación × 0.30)]
                    </div>
                  </div>
                </div>

                {/* Párrafo Explicativo de Fondo y Correspondencia */}
                <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink/80 leading-relaxed space-y-2">
                  <p className="font-semibold text-pine">
                    Análisis de correspondencia reflexiva y autopercepción:
                  </p>
                  {activeDetail.grade.autoAvg !== null && activeDetail.grade.studentAvg !== null ? (
                    (() => {
                      const diff = Number((activeDetail.grade.autoAvg - activeDetail.grade.studentAvg).toFixed(2))
                      if (diff > 0.4) {
                        return (
                          <p>
                            Al contrastar la heteroevaluación estudiantil ({activeDetail.grade.studentAvg.toFixed(2)}/5.00) con la autoevaluación del docente ({activeDetail.grade.autoAvg.toFixed(2)}/5.00), se evidencia una brecha de sobreestimación de +{diff} puntos en la percepción del profesor frente al grupo. Esta diferencia indica que los estándares de exigencia, claridad y retroalimentación percibidos por el docente difieren del grado de satisfacción y acompañamiento experimentado por los estudiantes en el aula. Resulta fundamental que el profesor revise los indicadores específicos señalados por el estudiantado para alinear sus criterios de calidad pedagógica con la realidad del curso.
                          </p>
                        )
                      }
                      if (diff < -0.4) {
                        return (
                          <p>
                            Al contrastar ambos instrumentos, se constata que la valoración otorgada por los estudiantes ({activeDetail.grade.studentAvg.toFixed(2)}/5.00) supera significativamente la autopercepción declarada por el docente ({activeDetail.grade.autoAvg.toFixed(2)}/5.00), con una diferencia favorable de +{Math.abs(diff)} puntos. Este comportamiento demuestra un alto sentido de exigencia y rigor autocrítico en el profesor, respaldado por una respuesta estudiantil plenamente favorable frente a sus mediaciones de clase y dominio disciplinar.
                          </p>
                        )
                      }
                      return (
                        <p>
                          Al contrastar ambos instrumentos, se constata una estrecha correspondencia y alineación formativa entre la autoevaluación del docente ({activeDetail.grade.autoAvg.toFixed(2)}/5.00) y la valoración otorgada por el grupo de estudiantes ({activeDetail.grade.studentAvg.toFixed(2)}/5.00), con una variación mínima de {Math.abs(diff)} puntos. Esta sincronía denota madurez reflexiva, conocimiento fidedigno de las dinámicas del aula y un diagnóstico acertado sobre los aciertos y retos presentes en el proceso de enseñanza.
                        </p>
                      )
                    })()
                  ) : (
                    <p>
                      El presente reporte consolida los resultados correspondientes a las respuestas estudiantiles recibidas ({activeDetail.grade.studentAvg !== null ? activeDetail.grade.studentAvg.toFixed(2) : '0.00'}/5.00). La autoevaluación docente institucional se encuentra en estado pendiente; una vez registrada en la plataforma, el sistema actualizará automáticamente el grado de correspondencia y alineación de criterios entre ambas valoraciones.
                    </p>
                  )}
                </div>
              </section>

              {/* TABLA FORMAL DE DESGLOSE POR DIMENSIONES MEDIT */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:p-4 print:border-line print:break-inside-avoid">
                <div className="border-b border-line pb-3">
                  <h3 className="font-serif text-lg font-bold text-pine">
                    Desglose Cuantitativo por Dimensiones MEDIT
                  </h3>
                  <p className="text-xs text-ink/60">
                    Evaluación desagregada sobre las cuatro dimensiones formativas del modelo institucional
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {dimensionesCalculadas.map((dim) => (
                    <div
                      key={dim.id}
                      className="rounded-lg border border-line bg-paper/30 p-3.5 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-pine">
                            Dimensión {dim.numero}: {dim.titulo}
                          </p>
                          <p className="text-[11px] text-ink/70 leading-snug mt-0.5">
                            {dim.descripcion}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-serif font-bold text-base text-pine">
                            {dim.score !== null ? dim.score.toFixed(2) : '0.00'}
                          </span>
                          <span className="text-[10px] text-ink/50"> / 5.0</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-line/50 text-[11px]">
                        <span className="text-ink/60">Nivel de desempeño:</span>
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${dim.desempeno.badgeClass}`}
                        >
                          {dim.desempeno.tag} ({dim.porcentaje}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* SECCIÓN 2: DIAGNÓSTICO PORMENORIZADO DE FALENCIAS Y ASPECTOS CRÍTICOS */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:p-4 print:border-line print:break-inside-avoid">
                <div className="border-b border-line pb-3">
                  <h3 className="font-serif text-lg font-bold text-pine">
                    2. Diagnóstico Pormenorizado de Falencias y Aspectos Críticos
                  </h3>
                  <p className="text-xs text-ink/60">
                    Análisis cualitativo y causal de las dimensiones con menor desempeño e ítems de verificación normativa
                  </p>
                </div>

                {/* Dimensión con menor calificación (Escala 1 a 5) */}
                <div className="rounded-lg border border-line bg-white p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-line/60 pb-2">
                    <p className="font-bold text-pine uppercase tracking-wider text-[11px]">
                      Dimensión con Menor Calificación Relativa: {dimensionesCalculadas.filter(d => d.score !== null).sort((a,b)=>(a.score||0)-(b.score||0))[0]?.titulo || 'Evaluación Formativa'} ({dimensionesCalculadas.filter(d => d.score !== null).sort((a,b)=>(a.score||0)-(b.score||0))[0]?.score?.toFixed(2) || '0.00'} / 5.00)
                    </p>
                    <span className="text-[10px] font-mono text-ink/50">Escala de 1 a 5</span>
                  </div>

                  {(() => {
                    const conScore = dimensionesCalculadas.filter(d => d.score !== null)
                    const dimMenor = conScore.length > 0
                      ? [...conScore].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
                      : dimensionesCalculadas[0]
                    const t = (dimMenor?.titulo || '').toLowerCase()
                    const id = dimMenor?.id || ''

                    if (t.includes('retroaliment') || t.includes('nota') || id === 'dim-4') {
                      return (
                        <p className="text-ink/80 leading-relaxed text-justify">
                          En la dimensión de Retroalimentación y Evaluación Formativa (promediada en {dimMenor?.score?.toFixed(2) || '0.00'} / 5.00), el análisis revela que la demora reiterada en la entrega de calificaciones y la ausencia de correcciones formativas previas a los exámenes parciales interrumpe el ciclo de aprendizaje de los estudiantes. Cuando las valoraciones se notifican de manera tardía o desprovistas de comentarios orientadores sobre los aciertos y errores cometidos, los estudiantes pierden la oportunidad de corregir vacíos conceptuales a tiempo. Esta situación genera desconcierto, inconformidad colectiva y limita severamente la efectividad del modelo de evaluación por competencias promovido por la institución.
                        </p>
                      )
                    }
                    if (t.includes('metodolog') || t.includes('aplicación') || t.includes('práctica') || id === 'dim-3') {
                      return (
                        <p className="text-ink/80 leading-relaxed text-justify">
                          En la dimensión de Metodología y Aplicación Práctica (promediada en {dimMenor?.score?.toFixed(2) || '0.00'} / 5.00), el diagnóstico señala una marcada preponderancia de la exposición teórica y magistral sobre el desarrollo de talleres aplicados. Este desbalance desconecta los contenidos académicos de los desafíos y problemáticas reales del ejercicio profesional de la ingeniería de sistemas, reduciendo la motivación del estudiantado y debilitando la apropiación de competencias técnicas que requieren experimentación directa en el aula.
                        </p>
                      )
                    }
                    if (t.includes('digital') || t.includes('virtual') || t.includes('medit') || t.includes('tecnol')) {
                      return (
                        <p className="text-ink/80 leading-relaxed text-justify">
                          En la dimensión de Mediación Tecnológica y Entorno Virtual MEDIT (promediada en {dimMenor?.score?.toFixed(2) || '0.00'} / 5.00), se comprueba una subutilización estructural del entorno virtual institucional. La plataforma opera primordialmente como un repositorio estático de archivos y diapositivas, careciendo de recursos interactivos, foros de discusión técnica, rúbricas digitales y actividades colaborativas que son necesarias para dinamizar el trabajo autónomo del estudiante fuera del aula presencial.
                        </p>
                      )
                    }
                    return (
                      <p className="text-ink/80 leading-relaxed text-justify">
                        En la dimensión de Claridad Conceptual y Comunicación Pedagógica (promediada en {dimMenor?.score?.toFixed(2) || '0.00'} / 5.00), se identifican dificultades notables en el ritmo didáctico de las clases, en la resolución pausada de inquietudes técnicas de alta complejidad y en la receptividad frente a las dudas expresadas por el curso. La falta de apertura dialógica o la celeridad excesiva en temas abstractos restringe la participación activa y obstaculiza la consolidación de las bases disciplinares de la materia.
                      </p>
                    )
                  })()}
                </div>

                {/* Ítems de Verificación Normativa (Preguntas de Sí/No) */}
                <div className="rounded-lg border border-line bg-paper/40 p-4 space-y-2 text-xs">
                  <p className="font-bold text-pine uppercase tracking-wider text-[11px]">
                    Compromisos Normativos con Observación (Verificación Institucional)
                  </p>
                  {(() => {
                    // Detectar si hay respuestas desfavorables en ítems normativos
                    const dimOrg = dimensionesCalculadas.find(d => d.id === 'dim-2' || d.titulo.toLowerCase().includes('clima') || d.dimensionDb.toLowerCase().includes('organización'))
                    const dimRetro = dimensionesCalculadas.find(d => d.id === 'dim-4' || d.titulo.toLowerCase().includes('retroaliment'))
                    const tieneAlertaNormativa = (dimOrg && dimOrg.score !== null && dimOrg.score < 3.5) || (dimRetro && dimRetro.score !== null && dimRetro.score < 3.5)

                    if (tieneAlertaNormativa) {
                      return (
                        <div className="space-y-1.5 text-ink/80 leading-relaxed">
                          <p>
                            A partir del cruce de respuestas cuantitativas y verificación de compromisos institucionales, se han registrado observaciones en los siguientes puntos normativos:
                          </p>
                          <ul className="list-disc pl-5 space-y-1">
                            {dimRetro && dimRetro.score !== null && dimRetro.score < 3.5 && (
                              <li>
                                <b>Entrega de calificaciones en plazos reglamentarios:</b> Se evidencia incumplimiento en la devolución de notas dentro de los plazos establecidos por el reglamento estudiantil, afectando el derecho a la revisión oportuna de evaluaciones.
                              </li>
                            )}
                            {dimOrg && dimOrg.score !== null && dimOrg.score < 3.5 && (
                              <li>
                                <b>Seguimiento al cronograma y concertación de acuerdos:</b> Se identifican discrepancias en el cumplimiento del cronograma académico pactado en el acuerdo pedagógico inicial y en la regularidad de las asesorías extracurriculares.
                              </li>
                            )}
                          </ul>
                        </div>
                      )
                    }
                    return (
                      <p className="text-ink/70 leading-relaxed">
                        No se registran observaciones desfavorables en los compromisos normativos de la facultad; el docente mantiene al día la concertación de acuerdos pedagógicos, la puntualidad en las sesiones de clase y la programación de horarios de asesoría académica.
                      </p>
                    )
                  })()}
                </div>
              </section>

              {/* SECCIÓN 3: RUTAS METODOLÓGICAS DE MEJORA CONTINUA */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:p-4 print:border-line print:break-inside-avoid">
                <div className="border-b border-line pb-3">
                  <h3 className="font-serif text-lg font-bold text-pine">
                    3. Rutas Metodológicas de Mejora Continua
                  </h3>
                  <p className="text-xs text-ink/60">
                    Plan formativo y estructurado de aplicación al aula con especificación del qué, el porqué y el cómo
                  </p>
                </div>

                {(() => {
                  const finalScore = activeDetail.grade.finalScore
                  const conScore = dimensionesCalculadas.filter(d => d.score !== null)
                  const dimMenor = conScore.length > 0
                    ? [...conScore].sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0]
                    : dimensionesCalculadas[0]
                  const nombreDimMenor = dimMenor?.titulo || 'Retroalimentación y Evaluación Formativa'
                  const notaDimMenor = dimMenor?.score !== null ? dimMenor.score.toFixed(2) : '0.00'

                  // CASO A: EN SEGUIMIENTO (< 3.5)
                  if (finalScore < 3.5) {
                    return (
                      <div className="space-y-4 text-xs">
                        <div className="border-b border-line pb-2">
                          <p className="font-bold text-amber-900 text-sm">
                            Ruta de Reestructuración Pedagógica Inmediata (Nivel En seguimiento)
                          </p>
                          <p className="text-ink/60 text-[11px]">
                            Intervención docente obligatoria para recuperar los estándares de calidad académica institucional
                          </p>
                        </div>

                        <div className="space-y-4">
                          {/* 1. Reorganización de la clase */}
                          <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                            <p className="font-bold text-pine text-xs">
                              1. Reorganización de la sesión de clase
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Qué:</b> Estructurar de manera invariable las sesiones de clase en tres fases temporales claramente diferenciadas.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Por qué:</b> La dispersión temporal y las exposiciones magistrales prolongadas provocan fatiga cognitiva, desconexión del grupo y disminución en la tasa de retención conceptual.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Cómo:</b> Destinar los primeros 15 minutos a la reactivación conceptual a partir del planteamiento de un problema real o caso de ingeniería, 30 minutos a la explicación nuclear del concepto clave, y el resto de la sesión a talleres guiados y resolución de ejercicios en equipos de trabajo con supervisión directa del docente en el aula.
                            </p>
                          </div>

                          {/* 2. Plan de evaluación formativa */}
                          <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                            <p className="font-bold text-pine text-xs">
                              2. Plan de evaluación formativa y retroalimentación oportuna
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Qué:</b> Publicar rúbricas analíticas transparentes antes de cada entrega y realizar devoluciones de notas con observaciones formativas en un plazo máximo de 5 días hábiles.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Por qué:</b> El estudiante requiere conocer los criterios de éxito antes de entregar y necesita recibir retroalimentación cuando los conceptos evaluados aún están frescos en su memoria para poder corregir desviaciones.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Cómo:</b> Cargar en el aula virtual matrices de valoración con descriptores claros de desempeño y entregar los parciales o talleres comentados individualmente con pautas explícitas de corrección antes del siguiente corte evaluativo.
                            </p>
                          </div>

                          {/* 3. Regularización de acuerdos de curso */}
                          <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                            <p className="font-bold text-pine text-xs">
                              3. Regularización y estricto cumplimiento de los acuerdos de curso
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Qué:</b> Ratificar el cronograma oficial de cortes y respetar rigurosamente las fechas pactadas desde el inicio de semestre.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Por qué:</b> Las alteraciones imprevistas de fechas provocan sobrecarga académica, cruces evaluativos y desconfianza del estudiantado en la seriedad del proceso formativo.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Cómo:</b> Formalizar el acta de concertación pedagógica firmada con los estudiantes durante la segunda semana académica y ceñirse al calendario establecido sin modificaciones extemporáneas.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // CASO B: ACEPTABLE (3.5 a 3.9)
                  if (finalScore <= 3.9) {
                    return (
                      <div className="space-y-4 text-xs">
                        <div className="border-b border-line pb-2">
                          <p className="font-bold text-sky-900 text-sm">
                            Ruta de Consolidación y Transición a la Excelencia (Nivel Aceptable)
                          </p>
                          <p className="text-ink/60 text-[11px]">
                            Estrategias metodológicas para superar el umbral básico y afianzar la práctica formativa
                          </p>
                        </div>

                        <div className="space-y-4">
                          {/* 1. Dinamización del aprendizaje */}
                          <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                            <p className="font-bold text-pine text-xs">
                              1. Dinamización del aprendizaje activo
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Qué:</b> Disminuir el componente magistral e incorporar metodologías de aprendizaje basado en proyectos (ABP) o análisis de casos contextualizados.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Por qué:</b> Para avanzar hacia la excelencia, el estudiante debe trascender la memorización y convertirse en protagonista de la construcción activa del conocimiento en situaciones reales.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Cómo:</b> Plantear un proyecto integrador semestral dividido en hitos de entrega periódicos, donde los estudiantes resuelvan problemáticas tecnológicas concretas de la región aplicando las competencias del CADI.
                            </p>
                          </div>

                          {/* 2. Fortalecimiento del área crítica */}
                          <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                            <p className="font-bold text-pine text-xs">
                              2. Fortalecimiento focalizado en el área crítica: {nombreDimMenor}
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Qué:</b> Concentrar las acciones pedagógicas de mejora en la dimensión {nombreDimMenor}.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Por qué:</b> Esta dimensión, promediada en {notaDimMenor} / 5.00, representa el principal factor que está frenando la consolidación institucional del docente hacia los estándares de excelencia.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Cómo:</b> Ejecutar un plan de choque didáctico específico durante las primeras cuatro semanas de clase enfocado en superar los puntos débiles detectados en dicha dimensión, solicitando retroalimentación intermedia al grupo.
                            </p>
                          </div>

                          {/* 3. Coherencia evaluativa */}
                          <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                            <p className="font-bold text-pine text-xs">
                              3. Coherencia y simetría evaluativa
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Qué:</b> Alinear con exactitud la dificultad, enfoque y temática de los talleres prácticos con los instrumentos de evaluación sumativa aplicados.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Por qué:</b> La disparidad entre lo ejercitado en clase y el nivel de exigencia de las pruebas parciales provoca frustración y desconfianza en el sistema de calificación.
                            </p>
                            <p className="text-ink/80 leading-relaxed">
                              <b>Cómo:</b> Diseñar talleres preparatorios con reactivos homólogos en complejidad a los de los exámenes parciales, dedicando una sesión previa de retroalimentación para resolver dudas frecuentes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  // CASO C: EXCELENTE (>= 4.0)
                  return (
                    <div className="space-y-4 text-xs">
                      <div className="border-b border-line pb-2">
                        <p className="font-bold text-emerald-900 text-sm">
                          Ruta de Innovación, Perfeccionamiento y Proyección (Nivel Excelente)
                        </p>
                        <p className="text-ink/60 text-[11px]">
                          Estrategias de liderazgo pedagógico, producción de recursos y mentoría docente institucional
                        </p>
                      </div>

                      <div className="space-y-4">
                        {/* 1. Perfeccionamiento del margen relativo */}
                        <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                          <p className="font-bold text-pine text-xs">
                            1. Perfeccionamiento del margen relativo: {nombreDimMenor}
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Qué:</b> Analizar la dimensión con menor calificación relativa ({nombreDimMenor}, promediada en {notaDimMenor} / 5.00) para ajustar aspectos metodológicos finos.
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Por qué:</b> En el nivel de excelencia institucional, el aseguramiento continuo de la calidad exige afinar los detalles pedagógicos para consolidar una práctica impecable en todas las dimensiones del MEDIT.
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Cómo:</b> Implementar instrumentos breves de sondeo a mitad de período para verificar la efectividad de los ajustes realizados en dicha dimensión y garantizar la plena satisfacción estudiantil.
                          </p>
                        </div>

                        {/* 2. Estrategias de aula avanzada */}
                        <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                          <p className="font-bold text-pine text-xs">
                            2. Implementación de estrategias de aula avanzada y semilleros
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Qué:</b> Implementar esquemas de aula invertida (flipped classroom) e involucrar a estudiantes destacados en proyectos de semilleros o investigación aplicada.
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Por qué:</b> Permite optimizar el tiempo presencial para debates y experimentación de alto nivel, al tiempo que impulsa la vocación investigativa y el relevo generacional en la facultad.
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Cómo:</b> Suministrar recursos audiovisuales y lecturas previas a la sesión, vinculando a los mejores estudiantes como monitores o coinvestigadores en convocatorias de innovación tecnológica.
                          </p>
                        </div>

                        {/* 3. Sistematización de buenas prácticas */}
                        <div className="rounded-lg border border-line bg-paper/30 p-4 space-y-1.5">
                          <p className="font-bold text-pine text-xs">
                            3. Sistematización y divulgación de buenas prácticas docentes
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Qué:</b> Redactar y documentar las guías didácticas, talleres y proyectos que demostraron mayor eficacia formativa durante el período.
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Por qué:</b> La transferencia del conocimiento pedagógico entre docentes eleva la calidad curricular del CADI y fortalece la cultura académica institucional.
                          </p>
                          <p className="text-ink/80 leading-relaxed">
                            <b>Cómo:</b> Publicar las guías como Recursos Educativos Abiertos (REA) institucionales y compartirlas como material de referencia en las jornadas de cualificación docente de la sede.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </section>

              {/* SECCIÓN 4: APORTES CUALITATIVOS DEL ESTUDIANTADO */}
              <section className="rounded-xl border border-line bg-white p-5 shadow-xs space-y-4 print:p-4 print:border-line print:break-inside-avoid">
                <div className="border-b border-line pb-3">
                  <h3 className="font-serif text-lg font-bold text-pine">
                    4. Aportes Cualitativos del Estudiantado
                  </h3>
                  <p className="text-xs text-ink/60">
                    Registro textual y confidencial de las apreciaciones cualitativas aportadas por los estudiantes
                  </p>
                </div>

                {comentariosEstudiantes.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-ink/70 font-semibold">
                      Observaciones cualitativas registradas en la evaluación:
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {comentariosEstudiantes.map((c, idx) => (
                        <blockquote
                          key={idx}
                          className="rounded-lg border-l-4 border-pine bg-paper/40 p-4 text-xs italic text-ink/90 shadow-2xs space-y-2"
                        >
                          <p className="leading-relaxed">"{c.texto}"</p>
                          <div className="text-[10px] text-ink/50 not-italic font-mono pt-2 border-t border-line/40">
                            Estudiante de Ingeniería de Sistemas · Período {c.periodo} · Comentario anónimo
                          </div>
                        </blockquote>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-line bg-paper/30 p-5 text-xs text-ink/70 text-center space-y-1">
                    <p className="font-medium text-ink/80">
                      No se registran observaciones textuales adicionales; el análisis y las rutas trazadas se derivan del comportamiento estadístico de los ítems cuantitativos y compromisos normativos.
                    </p>
                    <p className="text-[11px] text-ink/50">
                      Las observaciones que ingresen en futuras respuestas se incorporarán automáticamente a este apartado.
                    </p>
                  </div>
                )}
              </section>

              {/* SOPORTE DE EVALUACIÓN Y BOTONES DE ACCIÓN */}
              <section className="rounded-xl border border-line bg-paper/70 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 no-print">
                <div className="text-xs text-ink/70">
                  <p className="font-bold text-pine text-sm">
                    Soporte Formal de Evaluación y Mejora Continua MEDIT
                  </p>
                  <p className="text-ink/60">
                    Documento institucional para el aseguramiento de la calidad y seguimiento a la docencia universitaria.
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
