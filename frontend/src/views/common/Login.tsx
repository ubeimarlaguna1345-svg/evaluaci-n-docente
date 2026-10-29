import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { useDB, actions, ROLE_LABEL, CONTINGENCY_USERS, setCurrentUser, getChangedPassword, type User, type Role } from '../../store'
import { usuarioService } from '../../services'
import { Field, Msg, input, btn } from './Components'

export function Login({ onLogin }: { onLogin?: (u: User) => void }) {
  const db = useDB()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState<Role>('estudiante')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')

  const firstUser = db.users.length === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setErr('')
    setInfo('')

    try {
      if (firstUser) {
        if (!name.trim() || !email.trim() || !pass || !confirm) {
          setErr('Completa todos los campos.')
          return
        }
        if (pass.length < 8) {
          setErr('La contraseña debe tener al menos 8 caracteres.')
          return
        }
        if (pass !== confirm) {
          setErr('Las contraseñas no coinciden.')
          return
        }

        try {
          await actions.createUser({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: pass,
            role: 'admin',
            sede: 'Sede Facatativá',
            carrera: 'Ingeniería de Sistemas y Computación',
          })
          setInfo('Administrador creado en PostgreSQL. Ya puedes iniciar sesión.')
          setName('')
          setPass('')
          setConfirm('')
        } catch (e) {
          setErr((e as Error).message || 'No se pudo crear la cuenta en PostgreSQL.')
        }
        return
      }

      let cleanEmail = email.trim().toLowerCase().replace('@ucundinamarac.edu.co', '@ucundinamarca.edu.co')
      if (cleanEmail === 'uberadmin.siard@ucundinamarac.edu.co') {
        cleanEmail = 'uberadmin.siard@ucundinamarca.edu.co'
      }

      if (!cleanEmail || !pass) {
        setErr('Completa todos los campos.')
        return
      }

      const candidateUsers = [...db.users, ...CONTINGENCY_USERS]
      const u = candidateUsers.find((x) => {
        const dbEmail = (x.email || '').trim().toLowerCase()
        if (dbEmail === cleanEmail) return true
        if (cleanEmail.includes('uberadmin') && dbEmail.includes('uberadmin')) return true
        if (cleanEmail.includes('danidirec') && dbEmail.includes('danidirec')) return true
        return false
      })

      if (!u) {
        setErr('No existe una cuenta registrada con este correo electrónico.')
        return
      }

      if (u.role !== selectedRole) {
        setErr(`El correo ingresado no corresponde al rol de ${ROLE_LABEL[selectedRole]}. Esta cuenta está registrada como ${ROLE_LABEL[u.role]}.`)
        return
      }

      if (!u.active) {
        setErr('Esta cuenta fue dada de baja. Contacte al administrador.')
        return
      }

      const changedPass =
        getChangedPassword(cleanEmail) ||
        getChangedPassword(u.id) ||
        (cleanEmail.includes('uberadmin') ? getChangedPassword('uberadmin.siard@ucundinamarca.edu.co') : null)
      const expectedPassword = changedPass || u.password

      // 1. Validar primero contra el backend (PostgreSQL / AuthService)
      let backendAuthUser: User | null = null
      let token = 'demo_token'
      try {
        const res = await usuarioService.login(cleanEmail, pass)
        if (res?.ok && res?.user) {
          backendAuthUser = res.user
          token = (res as any).token || (res as any).user?.token || 'session_token_' + Date.now()
        }
      } catch (apiErr: any) {
        const errMsg = (apiErr?.message || '').toLowerCase()
        if (
          errMsg.includes('credenciales') ||
          errMsg.includes('contraseña') ||
          errMsg.includes('incorrect') ||
          apiErr?.status === 401 ||
          apiErr?.statusCode === 401
        ) {
          setErr('Contraseña incorrecta.')
          return
        }
      }

      let usuarioAutenticado: User

      // 2. Si el backend autenticó correctamente:
      if (backendAuthUser) {
        const userRole = (backendAuthUser.role || u.role) as Role
        if (userRole !== selectedRole) {
          setErr(`El correo ingresado no corresponde al rol de ${ROLE_LABEL[selectedRole]}. Esta cuenta está registrada como ${ROLE_LABEL[userRole]}.`)
          return
        }
        usuarioAutenticado = {
          ...u,
          ...backendAuthUser,
          password: pass,
          role: userRole,
        }
      } else {
        // 3. Contingencia / fallback offline: validación rigurosa invalidando credenciales anteriores
        if (pass !== expectedPassword) {
          setErr('Contraseña incorrecta.')
          return
        }
        usuarioAutenticado = {
          ...u,
          password: pass,
        }
      }

      // Sincronización previa a la navegación:
      // 1. Guardar de inmediato en localStorage y sessionStorage
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('siard_user', JSON.stringify(usuarioAutenticado))
          localStorage.setItem('currentUser', JSON.stringify(usuarioAutenticado))
          localStorage.setItem('siard_token', token || 'demo_token')
          localStorage.setItem('siard-me', usuarioAutenticado.id)
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('siard_user', JSON.stringify(usuarioAutenticado))
          sessionStorage.setItem('currentUser', JSON.stringify(usuarioAutenticado))
          sessionStorage.setItem('siard_token', token || 'demo_token')
          sessionStorage.setItem('siard-me', usuarioAutenticado.id)
        }
      } catch {}

      // 2. Actualizar el estado global / contexto de autenticación de forma síncrona
      setCurrentUser(usuarioAutenticado)
      if (onLogin) {
        onLogin(usuarioAutenticado)
      }

      // 3. Ejecutar la navegación programática según el rol:
      const targetPath = `/${usuarioAutenticado.role}`
      navigate(targetPath)
    } catch (err: any) {
      setErr(err?.message || 'Error al iniciar sesión. Por favor intente nuevamente.')
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-pine p-12 text-paper lg:flex">
        <div className="flex items-center gap-3">
          <GraduationCap />
          <span className="text-sm font-semibold tracking-wider">
            UNIVERSIDAD DE CUNDINAMARCA · FACULTAD DE INGENIERÍA
          </span>
        </div>

        <div>
          <p className="font-mono text-xs text-ochre">SIARD-UdeC</p>
          <h1 className="mt-3 max-w-lg font-serif text-6xl leading-[1.02]">
            Sistema Integral de Autoevaluación y Retroalimentación Docente
          </h1>
          <p className="mt-6 max-w-md text-paper/70">
            Evaluación institucional, autoevaluación y retroalimentación de clase en un solo lugar, conectado a PostgreSQL.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-px border-t border-paper/20 pt-6 text-xs text-paper/60">
          {(['admin', 'coordinador', 'docente', 'estudiante'] as Role[]).map((r) => (
            <span key={r}>{ROLE_LABEL[r]}</span>
          ))}
        </div>

        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full border-[48px] border-moss/40" />
      </section>

      <section className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h2 className="font-serif text-4xl text-pine">
              {firstUser ? 'Crear administrador' : 'Iniciar sesión'}
            </h2>
            {!firstUser && (
              <p className="mt-1 text-xs text-ink/60">
                Seleccione su rol institucional e ingrese con sus credenciales.
              </p>
            )}
          </div>

          {!firstUser && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink/70">
                Rol institucional
              </label>
              <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-paper/60 p-1.5 sm:grid-cols-4">
                {([
                  { id: 'estudiante', label: 'Estudiante' },
                  { id: 'docente', label: 'Docente' },
                  { id: 'coordinador', label: 'Coordinador' },
                  { id: 'admin', label: 'Administrador' },
                ] as const).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelectedRole(r.id); setErr('') }}
                    className={`rounded-md py-2 px-1 text-center text-xs font-medium transition-all cursor-pointer ${
                      selectedRole === r.id
                        ? 'bg-pine text-white shadow-sm ring-1 ring-pine'
                        : 'text-ink/70 hover:bg-white hover:text-pine'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {firstUser && (
            <Field label="Nombre completo">
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>
          )}

          <Field label="Correo institucional">
            <input
              type="email"
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field label="Contraseña">
            <input
              type="password"
              className={input}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </Field>

          {firstUser && (
            <Field label="Confirmar contraseña">
              <input
                type="password"
                className={input}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </Field>
          )}

          {info && <Msg kind="ok" text={info} />}
          {err && <Msg kind="err" text={err} />}

          <button
            type="submit"
            className={`${btn} w-full justify-center`}
          >
            {firstUser ? 'Crear administrador' : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}
