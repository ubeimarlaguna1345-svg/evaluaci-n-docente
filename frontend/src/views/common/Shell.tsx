import { useState, type ReactNode } from 'react'
import {
  Users,
  ClipboardList,
  BarChart3,
  FileText,
  MessageSquare,
  Award,
  BookOpen,
  LogOut,
} from 'lucide-react'
import { useDB, ROLE_LABEL, type User, type Role } from '../../store'
import { Login } from './Login'
import { NormativaView } from './NormativaView'
import { StudentEvaluation, StudentFeedback } from '../estudiante'
import { TeacherFeedback, SelfEvaluation } from '../docente'
import { CadisView, FormsAdmin, Results, Statistics, Report } from '../coordinador'
import { Accounts } from '../admin'

export type View = {
  id: string
  label: string
  icon: typeof Users
  render: (me: User) => ReactNode
}

export const VIEWS: Record<Role, View[]> = (() => {
  const normativaView: View = { id: 'normativa', label: 'Normativa y MEDIT', icon: BookOpen, render: () => <NormativaView /> }
  const cadisView: View = { id: 'cadis', label: 'CADIs y PGC', icon: Award, render: () => <CadisView /> }

  const mgmt: View[] = [
    { id: 'cuentas', label: 'Cuentas', icon: Users, render: (me) => <Accounts me={me} /> },
    { id: 'formularios', label: 'Evaluaciones', icon: ClipboardList, render: () => <FormsAdmin /> },
    cadisView,
    { id: 'resultados', label: 'Resultados', icon: BarChart3, render: () => <Results /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, render: () => <Statistics /> },
    { id: 'reporte', label: 'Reporte de mejora', icon: FileText, render: () => <Report /> },
    normativaView,
  ]

  return {
    admin: mgmt,
    coordinador: mgmt,
    docente: [
      { id: 'retro', label: 'Retroalimentación', icon: MessageSquare, render: (me) => <TeacherFeedback me={me} /> },
      { id: 'auto', label: 'Autoevaluación', icon: ClipboardList, render: (me) => <SelfEvaluation me={me} /> },
      normativaView,
    ],
    estudiante: [
      { id: 'eval', label: 'Evaluación docente', icon: ClipboardList, render: (me) => <StudentEvaluation me={me} /> },
      { id: 'retro', label: 'Retroalimentación', icon: MessageSquare, render: (me) => <StudentFeedback me={me} /> },
      normativaView,
    ],
  }
})()

export function Shell() {
  const db = useDB()
  const [meId, setMeId] = useState<string | null>(() => sessionStorage.getItem('siard-me'))
  const me = db.users.find((u) => u.id === meId && u.active)
  const [view, setView] = useState('')

  if (!me) {
    return (
      <Login
        onLogin={(u) => {
          sessionStorage.setItem('siard-me', u.id)
          setMeId(u.id)
          setView('')
        }}
      />
    )
  }

  const views = VIEWS[me.role]
  const current = views.find((v) => v.id === view) ?? views[0]

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-pine text-paper md:sticky md:top-0 md:h-screen md:w-64">
        <div className="border-b border-paper/15 p-6">
          <p className="font-mono text-xs text-ochre">SIARD-UdeC</p>
          <p className="font-serif text-2xl leading-tight">Evaluación docente</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
          {views.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm ${
                current.id === v.id ? 'bg-paper text-pine' : 'text-paper/75 hover:bg-paper/10'
              }`}
            >
              <v.icon size={17} />
              {v.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto hidden space-y-3 border-t border-paper/15 p-4 md:block">
          <div>
            <p className="text-sm font-semibold">{me.name}</p>
            <p className="text-xs text-paper/60">{ROLE_LABEL[me.role]}</p>
            {me.sede && <p className="text-[11px] text-paper/40 font-mono">{me.sede}</p>}
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 text-xs text-paper/70 hover:text-paper"
              onClick={() => {
                sessionStorage.removeItem('siard-me')
                setMeId(null)
              }}
            >
              <LogOut size={14} />Salir
            </button>
          </div>
        </div>
        <button
          className="m-3 flex items-center gap-2 text-xs md:hidden"
          onClick={() => {
            sessionStorage.removeItem('siard-me')
            setMeId(null)
          }}
        >
          <LogOut size={14} />Salir ({me.name})
        </button>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">
        {current.render(me)}
      </main>
    </div>
  )
}
