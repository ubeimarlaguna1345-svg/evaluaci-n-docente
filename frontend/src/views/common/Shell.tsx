import { useState, type ReactNode } from 'react'
import {
  Users,
  ClipboardList,
  BarChart3,
  FileText,
  Award,
  BookOpen,
  LogOut,
  UserCog,
} from 'lucide-react'
import { ModalPerfil } from '../../components/ModalPerfil'
import { useDB, ROLE_LABEL, type User, type Role } from '../../store'
import { Login } from './Login'
import { NormativaView } from './NormativaView'
import { StudentEvaluation } from '../estudiante'
import { SelfEvaluation } from '../docente'
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
  const cadisView: View = { id: 'cadis', label: 'CADIs / CAIs', icon: Award, render: () => <CadisView /> }

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
      { id: 'auto', label: 'Autoevaluación', icon: ClipboardList, render: (me) => <SelfEvaluation me={me} /> },
      { id: 'reporte-docente', label: 'Mis Resultados / Reporte', icon: FileText, render: (me) => <Report me={me} initialDocenteId={me.id} initialTeacherId={me.id} isDocenteView isTeacherView /> },
      normativaView,
    ],
    estudiante: [
      { id: 'eval', label: 'Evaluación docente', icon: ClipboardList, render: (me) => <StudentEvaluation me={me} /> },
      normativaView,
    ],
  }
})()

export function Shell() {
  const db = useDB()
  const [meId, setMeId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('siard-me') || localStorage.getItem('siard-me')
    } catch {
      return null
    }
  })
  const me = db.users.find((u) => u.id === meId && u.active)
  const [view, setView] = useState('')
  const [showProfile, setShowProfile] = useState(false)

  if (!me) {
    return (
      <Login
        onLogin={(u) => {
          try {
            sessionStorage.setItem('siard-me', u.id)
            localStorage.setItem('siard-me', u.id)
            localStorage.setItem('siard_user', JSON.stringify(u))
          } catch {}
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
          <div
            onClick={() => setShowProfile(true)}
            className="group cursor-pointer rounded-lg p-2 -m-2 transition hover:bg-paper/10"
            title="Ver mi perfil institucional y cambiar contraseña"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setShowProfile(true)
              }
            }}
          >
            <p className="text-sm font-semibold group-hover:text-ochre transition">{me.name}</p>
            <p className="text-xs text-paper/60">{ROLE_LABEL[me.role]}</p>
            {me.sede && <p className="text-[11px] text-paper/40 font-mono">{me.sede}</p>}
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <button
              type="button"
              className="flex items-center gap-2 text-xs font-medium text-ochre hover:text-paper transition text-left"
              onClick={() => setShowProfile(true)}
              title="Mi Perfil / Contraseña"
            >
              <UserCog size={14} />
              <span>Mi Perfil / Contraseña</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 text-xs text-paper/70 hover:text-paper transition text-left"
              onClick={() => {
                try {
                  sessionStorage.removeItem('siard-me')
                  localStorage.removeItem('siard-me')
                  localStorage.removeItem('siard_user')
                } catch {}
                setMeId(null)
              }}
            >
              <LogOut size={14} />
              <span>Salir</span>
            </button>
          </div>
        </div>
        <div className="m-3 flex items-center justify-between gap-2 md:hidden">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-ochre hover:text-paper"
            onClick={() => setShowProfile(true)}
            title="Mi Perfil / Contraseña"
          >
            <UserCog size={14} />
            <span>Mi Perfil / Contraseña</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-paper/75 hover:text-paper"
            onClick={() => {
              try {
                sessionStorage.removeItem('siard-me')
                localStorage.removeItem('siard-me')
                localStorage.removeItem('siard_user')
              } catch {}
              setMeId(null)
            }}
          >
            <LogOut size={14} />
            <span>Salir ({me.name})</span>
          </button>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 p-6 md:p-10">
        {current.render(me)}
      </main>

      {showProfile && (
        <ModalPerfil
          user={me}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  )
}
