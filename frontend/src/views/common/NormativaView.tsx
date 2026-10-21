import { useState } from 'react'
import { BookOpen, Layers, Award, Scale as ScaleIcon, CheckCircle2 } from 'lucide-react'
import { Card, Header } from './Components'

export function NormativaView() {
  const [tab, setTab] = useState<'lineamientos' | 'medit' | 'calificacion' | 'limitaciones'>('lineamientos')

  return (
    <div className="space-y-6">
      <Header
        title="Normativa, Lineamientos PGC y MEDIT"
        sub="Marco institucional de la Universidad de Cundinamarca, dimensiones formativas del MEDIT, ponderación del 20% y superación de limitaciones del método tradicional."
      />

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {[
          { id: 'lineamientos', label: 'Marco Normativo UdeC', icon: BookOpen },
          { id: 'medit', label: 'Dimensiones MEDIT', icon: Layers },
          { id: 'calificacion', label: 'CADI Articulador y 20%', icon: Award },
          { id: 'limitaciones', label: 'Limitaciones vs. SIARD', icon: ScaleIcon },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === t.id ? 'bg-pine text-white shadow-sm' : 'border border-line bg-white text-ink/70 hover:border-pine'
            }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'lineamientos' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-pine">
            <h3 className="font-serif text-2xl text-pine">Lineamientos de Gestión del Conocimiento (PGC)</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              Aprobados formalmente mediante el <b>Acta No. 07 del 2023-07-07 del Consejo de Facultad de Ingeniería</b> de la 
              Universidad de Cundinamarca. Establece los procesos de formación en investigación como estrategia activa orientada desde los 
              Campos de Aprendizaje Disciplinares (CADIs) y articulada con los semilleros y grupos de investigación institucionales.
            </p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-3">
              <span className="rounded-full bg-ochre/15 px-3 py-1 font-mono text-xs font-semibold text-ochre">Acuerdo 09 de 2021 (Consejo Académico)</span>
              <h4 className="font-serif text-xl">Líneas de Investigación Translocales</h4>
              <p className="text-sm text-ink/70">Todos los PGC de la Facultad de Ingeniería deben responder a una de las tres líneas oficiales:</p>
              <ul className="space-y-2 text-sm text-ink/80">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-moss shrink-0" />
                  <span><b>1.</b> Aprendizaje, conocimiento, tecnologías, comunicación y digitalización.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-moss shrink-0" />
                  <span><b>2.</b> Gestión, emprendimiento, organizaciones sociales del conocimiento y aprendizaje.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 text-moss shrink-0" />
                  <span><b>3.</b> Transmodernidad, naturaleza, ambiente, biodiversidad, ancestralidad y familia.</span>
                </li>
              </ul>
            </Card>

            <Card className="space-y-3">
              <span className="rounded-full bg-moss/15 px-3 py-1 font-mono text-xs font-semibold text-pine">Estructura por Ciclos</span>
              <h4 className="font-serif text-xl">Ruta de Formación Investigativa</h4>
              <div className="space-y-3 text-sm">
                <div className="rounded border border-line bg-paper/50 p-2.5">
                  <p className="font-semibold text-pine">Ciclo I · Fundamentación (I a III Semestre)</p>
                  <p className="text-xs text-ink/60">Análisis de necesidades en la región, bases de datos y radicación ante el CADI Articulador en III Semestre.</p>
                </div>
                <div className="rounded border border-line bg-paper/50 p-2.5">
                  <p className="font-semibold text-pine">Ciclo II · Profundización (IV a VI Semestre)</p>
                  <p className="text-xs text-ink/60">Vinculación a semilleros de investigación, observaciones del comité y consolidación metodológica (CDIO).</p>
                </div>
                <div className="rounded border border-line bg-paper/50 p-2.5">
                  <p className="font-semibold text-pine">Ciclo III · Investigación-Producción (VII a IX Semestre)</p>
                  <p className="text-xs text-ink/60">Asignación de director por el comité para conversión en trabajo de grado y vinculación a grupos de investigación.</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="space-y-3 bg-paper">
            <h4 className="font-serif text-xl text-pine">Comité Evaluador de Ciclo (Sede Facatativá · Período 2025-2 / 2026-I)</h4>
            <p className="text-sm text-ink/70">
              Encargado de recibir, aceptar, hacer seguimiento, asesorar y evaluar los PGC (Numeral 3 de los lineamientos):
            </p>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 text-xs">
              <div className="rounded bg-white p-2.5 border border-line"><b>Oscar Morera</b> (Programación II · Articulador)</div>
              <div className="rounded bg-white p-2.5 border border-line"><b>Francisco Lanza</b> (Comité PGC)</div>
              <div className="rounded bg-white p-2.5 border border-line"><b>Angélica Bravo</b> (Evaluadora Fundamentación)</div>
              <div className="rounded bg-white p-2.5 border border-line"><b>Jaime Parra</b> (Dir. Ingeniería de Sistemas)</div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'medit' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-moss">
            <h3 className="font-serif text-2xl text-pine">Modelo Educativo Digital Transmoderno (MEDIT)</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              El MEDIT orienta el quehacer pedagógico hacia el diálogo constructivo y formativo entre <b>gestores del conocimiento</b> (docentes) 
              y <b>agentes transformadores</b> (estudiantes). La evaluación en SIARD-UdeC está estructurada en torno a sus 4 dimensiones cardinales:
            </p>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: '1. Dimensión Pedagógica y Didáctica',
                color: 'border-pine',
                desc: 'Adopción de metodologías activas como CDIO (Concebir, Diseñar, Implementar, Operar) en proyectos de ingeniería, acompañamiento dialógico y cumplimiento de los acuerdos de aprendizaje.',
                criterios: ['Uso del enfoque CDIO en proyectos tecnológicos.', 'Construcción dialógica y formativa del saber.', 'Cumplimiento de compromisos acordados.'],
              },
              {
                title: '2. Dimensión Disciplinar e Investigativa',
                color: 'border-moss',
                desc: 'Dominio conceptual y tecnológico del CADI, articulación de saberes de ciencias básicas e ingeniería con la investigación formativa, grupos y semilleros institucionales.',
                criterios: ['Solidez conceptual en ingeniería de software.', 'Articulación con semilleros de investigación.', 'Solución rigurosa a problemáticas del entorno.'],
              },
              {
                title: '3. Dimensión Relacional y Comunicación Asertiva',
                color: 'border-ochre',
                desc: 'Creación de un clima de aula basado en el respeto, la escucha activa, la retroalimentación constructiva continua y la confianza mutua entre estudiante y docente.',
                criterios: ['Retroalimentación oportuna en cada corte.', 'Comunicación abierta, respetuosa y transparente.', 'Resolución dialogada de inquietudes.'],
              },
              {
                title: '4. Dimensión Ética y Transmoderna',
                color: 'border-red-600',
                desc: 'Compromiso social con el entorno local y translocal, rigurosidad académica, confidencialidad en la evaluación, honestidad y control de plagio (Numeral 15 de los lineamientos).',
                criterios: ['Garantía estricta de confidencialidad y anonimato.', 'Responsabilidad social y ambiental.', 'Cero tolerancia al plagio académico.'],
              },
            ].map((d) => (
              <Card key={d.title} className={`border-t-4 ${d.color} space-y-3`}>
                <h4 className="font-serif text-lg font-semibold">{d.title}</h4>
                <p className="text-sm text-ink/70">{d.desc}</p>
                <div className="border-t border-line pt-2">
                  <p className="text-xs font-semibold uppercase text-ink/50">Criterios aplicados en SIARD:</p>
                  <ul className="mt-1 space-y-1 text-xs text-ink/70">
                    {d.criterios.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'calificacion' && (
        <div className="space-y-6">
          <Card className="border-l-4 border-l-ochre">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-ochre">Numeral 13 de los Lineamientos Oficiales</span>
                <h3 className="font-serif text-2xl text-pine">Ponderación del 20% en el CADI Articulador</h3>
                <p className="mt-1 text-sm text-ink/80">
                  "La calificación del PGC corresponderá al <b>20% de la nota final</b> del CADI o Núcleo temático Articulador que esté cursando el constructor del conocimiento."
                </p>
              </div>
              <div className="rounded-lg bg-pine p-4 text-center text-paper">
                <p className="font-serif text-4xl font-bold">20%</p>
                <p className="text-xs text-paper/70">Aporte a nota final</p>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="space-y-4">
              <h4 className="font-serif text-xl">CADIs Articuladores Oficiales (Pág. 7 del Documento)</h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-ink/50">
                    <th className="pb-2">Semestre</th>
                    <th className="pb-2">Ing. Sistemas y Computación</th>
                    <th className="pb-2">Ing. Software / Industrial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <tr className="bg-moss/10 font-medium">
                    <td className="py-2.5">Semestre III (Ciclo I)</td>
                    <td className="py-2.5 text-pine font-semibold">Programación II ★</td>
                    <td className="py-2.5">Programación II</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Semestre VI (Ciclo II)</td>
                    <td className="py-2.5">Ingeniería del Software II</td>
                    <td className="py-2.5">Profundización</td>
                  </tr>
                  <tr>
                    <td className="py-2.5">Semestre IX (Ciclo III)</td>
                    <td className="py-2.5">Línea de Profundización</td>
                    <td className="py-2.5">Profundización</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-ink/60">
                ★ <b>Numeral 5:</b> En la propuesta se deben relacionar mínimo <b>2 CADIs de diferentes líneas de saberes</b> (ej. Programación II + Bases de Datos).
              </p>
            </Card>

            <Card className="space-y-3">
              <h4 className="font-serif text-xl">Cronograma Oficial de Evaluación PGC</h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-ochre">Semana 5</span>
                  <div><b>Radicación de Propuesta (Ciclo I)</b><br />Entrega formal ante el CADI Articulador y Comité Evaluador.</div>
                </div>
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-ochre">Semana 10</span>
                  <div><b>Segundo Informe de Avance</b><br />Evidencia de un proceso estricto de ingeniería (CDIO) o investigación.</div>
                </div>
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-ochre">Semana 12</span>
                  <div><b>Sustentaciones del PGC</b><br />Exposición del prototipo ante el Comité Evaluador de Ciclo.</div>
                </div>
                <div className="flex items-center gap-3 rounded border border-line p-2">
                  <span className="font-mono font-bold text-pine">Semana 14</span>
                  <div><b>Publicación de Calificación Final</b><br />Promedio consolidado del comité, equivalente al 20% de la nota final.</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'limitaciones' && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-serif text-2xl text-pine">Superación de Limitaciones del Método Tradicional</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink/80">
              En concordancia con el <b>Objetivo Específico 1</b> de la propuesta, la plataforma SIARD-UdeC analiza y supera 
              directamente los cuellos de botella identificados en la evaluación docente convencional:
            </p>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full text-sm">
              <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/60">
                <tr>
                  <th className="p-4">Criterio / Factor</th>
                  <th className="p-4 text-red-700">Limitación Método Actual UdeC</th>
                  <th className="p-4 text-pine">Solución Implementada SIARD-UdeC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-xs">
                <tr>
                  <td className="p-4 font-semibold">Momento de Aplicación</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Se realiza únicamente en la semana 16, cuando el periodo ya finalizó. No permite mejoras durante el semestre.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Evaluación flexible + Retroalimentación de aula:</b> El docente lanza preguntas cortas en cualquier momento para medir el avance real de sus clases.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Estructura del Cuestionario</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Preguntas estáticas, rígidas e invariables que no se adaptan al tipo de proyecto ni al CADI.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Cuestionarios dinámicos:</b> Parametrizables por período, con preguntas de escala, selección múltiple y texto asociadas a dimensiones MEDIT.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Finalidad de la Calificación</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Enfoque puramente cuantitativo y punitivo, sin retroalimentación cualitativa útil para el profesor.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Reporte Formativo de Mejora Docente:</b> Identifica automáticamente fortalezas (≥4.0), oportunidades de mejora (&lt;3.5) y observaciones formativas.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Comunicación y Confianza</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Falta de canal formal y asertivo; temor de los estudiantes a represalias si expresan inconformidades.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Canal asertivo y confidencial:</b> Observaciones cualitativas (límite 500 caracteres) protegidas para salvaguardar el anonimato ético.
                  </td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Autoevaluación Docente</td>
                  <td className="p-4 text-red-800 bg-red-50/40">
                    Trámite administrativo desconectado de la percepción de los estudiantes en los proyectos.
                  </td>
                  <td className="p-4 text-pine bg-moss/5">
                    <b>Cruce dialógico:</b> Contraste entre la autoevaluación del gestor y la evaluación de los agentes transformadores en un solo informe.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
