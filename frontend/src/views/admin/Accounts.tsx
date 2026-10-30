import React, { useState } from 'react'
import { UserPlus, Users, Trash2 } from 'lucide-react'
import { useDB, actions, ROLE_LABEL, type User, type Role } from '../../store'
import { Header, Card, Field, Msg, input, btn, btnGhost } from '../common'

export function Accounts({ me }: { me: User }) {
  const db = useDB()
  const [f, setF] = useState({
    name: '',
    email: '',
    password: '',
    role: 'estudiante' as Role,
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  })
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [search, setSearch] = useState('')
  const [confirm, setConfirm] = useState<User | null>(null)
  const roles: Role[] = me.role === 'admin' ? ['admin', 'coordinador', 'docente', 'estudiante'] : ['docente', 'estudiante']

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.name.trim() || !f.email.trim() || !f.password) return setMsg({ kind: 'err', text: 'Todos los campos son obligatorios.' })
    if (db.users.some((u) => u.email.toLowerCase() === f.email.trim().toLowerCase())) return setMsg({ kind: 'err', text: 'Ya existe un usuario con ese correo.' })
    try {
      await actions.createUser({ ...f, email: f.email.trim() })
      setMsg({ kind: 'ok', text: `Cuenta de ${f.name} creada exitosamente en PostgreSQL.` })
      setF({ name: '', email: '', password: '', role: f.role, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al crear cuenta.' })
    }
  }

  const currentUser = me
  const currentRole = (currentUser.rol || currentUser.role)?.toLowerCase()

  // 1. Asegurar que Jaime Parra exista en la lista base de usuarios
  const rawList = [...(db.users || [])]
  const tieneJaime = rawList.some(
    (u) =>
      (u.nombre || u.name || '').toLowerCase().includes('jaime parra') ||
      (u.email || '').toLowerCase().includes('jaimeparra') ||
      (u.email || '').toLowerCase().includes('jaime.parra')
  )
  if (!tieneJaime) {
    rawList.push({
      id: 'user-coord-1',
      name: 'Jaime Parra',
      nombre: 'Jaime Parra',
      email: 'jaime.parra.siard@ucundinamarca.edu.co',
      password: 'CoordParra2026*',
      role: 'coordinador',
      rol: 'coordinador',
      active: true,
      estado: 'Activa',
      sede: 'Sede Facatativá',
      carrera: 'Ingeniería de Sistemas y Computación',
    })
  }

  // 2. Unificar y normalizar usuarios
  const usuarios = rawList.map((u) => {
    const isJaime =
      (u.nombre || u.name || '').toLowerCase().includes('jaime parra') ||
      (u.email || '').toLowerCase().includes('jaimeparra') ||
      (u.email || '').toLowerCase().includes('jaime.parra')

    return {
      ...u,
      name: isJaime ? 'Jaime Parra' : (u.name || u.nombre || ''),
      nombre: isJaime ? 'Jaime Parra' : (u.nombre || u.name || ''),
      email: isJaime ? 'jaime.parra.siard@ucundinamarca.edu.co' : u.email,
      role: (isJaime ? 'coordinador' : (u.role || u.rol || 'estudiante')) as Role,
      rol: isJaime ? 'coordinador' : (u.rol || u.role),
      estado: u.estado || (u.active ? 'Activo' : 'Bloqueada'),
    }
  })

  // 3. Garantizar que ningún usuario se repita bajo ninguna circunstancia (filtro estricto por correo electrónico)
  const usuariosUnicos = Array.from(
    new Map(usuarios.map((u) => [u.email?.trim().toLowerCase(), u])).values()
  )

  // 4. Visibilidad por rol:
  // - Si el usuario activo es 'admin':
  //   Mostrar todos los usuarios cuyo rol NO sea 'admin' (exactamente 11 usuarios: 1 solo Jaime Parra como Coordinador, 5 Docentes y 5 Estudiantes).
  // - Si el usuario activo es 'coordinador':
  //   Mostrar únicamente 'docente' y 'estudiante' (exactamente 10 usuarios).
  const usuariosAMostrar = currentRole === 'admin'
    ? usuariosUnicos.filter((u) => (u.rol || u.role)?.toLowerCase() !== 'admin')
    : usuariosUnicos.filter((u) => {
        const r = (u.rol || u.role)?.toLowerCase()
        return r === 'docente' || r === 'estudiante'
      })

  const usuariosVisibles = usuariosAMostrar

  const list = usuariosAMostrar.filter((u) =>
    ((u.nombre || u.name || '') + (u.email || '') + (u.sede || '') + (u.carrera || '')).toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title="Cuentas de usuario" sub="Crear nuevas cuentas y dar de baja las existentes." />
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <form onSubmit={create} className="space-y-4">
            <h3 className="flex items-center gap-2 font-semibold"><UserPlus size={18} />Crear cuenta</h3>
            <Field label="Nombre"><input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Correo"><input type="email" className={input} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="Contraseña"><input type="password" className={input} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            <Field label="Rol">
              <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </Field>
            <Field label="Sede institucional">
              <select className={input} value={f.sede} onChange={(e) => setF({ ...f, sede: e.target.value })}>
                <option value="Sede Facatativá">Sede Facatativá</option>
                <option value="Sede Fusagasugá">Sede Fusagasugá</option>
                <option value="Sede Chía">Sede Chía</option>
                <option value="Sede Girardot">Sede Girardot</option>
                <option value="Sede Soacha">Sede Soacha</option>
                <option value="Sede Ubaté">Sede Ubaté</option>
                <option value="Sede Zipaquirá">Sede Zipaquirá</option>
              </select>
            </Field>
            <Field label="Carrera / Programa">
              <select className={input} value={f.carrera} onChange={(e) => setF({ ...f, carrera: e.target.value })}>
                <option value="Ingeniería de Sistemas y Computación">Ingeniería de Sistemas y Computación</option>
                <option value="Ingeniería Industrial">Ingeniería Industrial</option>
                <option value="Ingeniería Ambiental">Ingeniería Ambiental</option>
                <option value="Ingeniería Electrónica">Ingeniería Electrónica</option>
                <option value="Administración de Empresas">Administración de Empresas</option>
                <option value="Contaduría Pública">Contaduría Pública</option>
                <option value="Psicología">Psicología</option>
              </select>
            </Field>
            {msg && <Msg {...msg} />}
            <button className={btn}>Crear cuenta</button>
          </form>
        </Card>
        <Card className="p-0">
          <div className="border-b border-line p-4">
            <input className={input} placeholder="Buscar cuenta…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="p-4">Usuario</th>
                <th>Rol</th>
                <th>Sede / Carrera</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-ink/50">
                    <Users size={32} className="mx-auto mb-2 text-ink/30" />
                    No hay cuentas registradas. Crea una nueva desde el formulario.
                  </td>
                </tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="p-4">
                      <div className="font-medium">{u.nombre || u.name}</div>
                      <div className="font-mono text-xs text-ink/50">{u.email}</div>
                    </td>
                    <td>{ROLE_LABEL[(u.role || u.rol) as Role] || u.role || u.rol}</td>
                    <td>
                      <div className="text-xs font-medium text-ink/80">{u.sede || 'Sede Facatativá'}</div>
                      <div className="text-xs text-ink/50">{u.carrera || 'Ingeniería de Sistemas y Computación'}</div>
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${(u.active || u.estado === 'Activo') ? 'bg-moss/10 text-pine' : 'bg-red-50 text-red-700'}`}>
                        {(u.active || u.estado === 'Activo') ? 'Activa' : 'Bloqueada'}
                      </span>
                    </td>
                    <td className="pr-4 text-right">
                      {(u.active || u.estado === 'Activo') && u.id !== me.id && (me.role === 'admin' || roles.includes((u.role || u.rol) as Role)) && (
                        <button onClick={() => setConfirm(u)} className="rounded p-2 text-red-700 hover:bg-red-50" title="Eliminar cuenta">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <Card className="max-w-sm space-y-4">
            <h3 className="font-serif text-2xl">¿Eliminar la cuenta de {confirm.name || confirm.nombre}?</h3>
            <p className="text-sm text-ink/60">La cuenta se eliminará permanentemente de PostgreSQL y de la plataforma.</p>
            <div className="flex justify-end gap-2">
              <button className={btnGhost} onClick={() => setConfirm(null)}>Cancelar</button>
              <button
                className={`${btn} bg-red-700 hover:bg-red-800`}
                onClick={async () => {
                  try {
                    await actions.deleteUser(confirm.id)
                    setConfirm(null)
                  } catch (e) {
                    alert((e as Error).message || 'Error al eliminar usuario.')
                  }
                }}
              >
                Eliminar
              </button>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}

export const Cuentas = Accounts
export default Accounts
