import React, { useState, useEffect } from 'react'
import {
  X,
  User as UserIcon,
  Mail,
  Shield,
  Building2,
  GraduationCap,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react'
import { ROLE_LABEL, type User } from '../store'
import { usuarioService } from '../services/usuarioService'

export interface ModalPerfilProps {
  user: User
  onClose: () => void
}

export function ModalPerfil({ user, onClose }: ModalPerfilProps) {
  const [contrasenaActual, setContrasenaActual] = useState('')
  const [nuevaContrasena, setNuevaContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')

  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirmar, setShowConfirmar] = useState(false)

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, loading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (!contrasenaActual.trim()) {
      return setMsg({ kind: 'err', text: 'Por favor ingresa tu contraseña actual.' })
    }
    if (!nuevaContrasena.trim()) {
      return setMsg({ kind: 'err', text: 'Por favor ingresa la nueva contraseña.' })
    }
    if (nuevaContrasena.length < 6) {
      return setMsg({ kind: 'err', text: 'La nueva contraseña debe tener al menos 6 caracteres.' })
    }
    if (nuevaContrasena !== confirmarContrasena) {
      return setMsg({ kind: 'err', text: 'La nueva contraseña y su confirmación no coinciden.' })
    }

    try {
      setLoading(true)
      const res = await usuarioService.cambiarContrasena(
        user.id,
        contrasenaActual,
        nuevaContrasena
      )

      setMsg({
        kind: 'ok',
        text: res.message || 'Contraseña actualizada con éxito.',
      })
      setContrasenaActual('')
      setNuevaContrasena('')
      setConfirmarContrasena('')
    } catch (err) {
      setMsg({
        kind: 'err',
        text: (err as Error).message || 'Error al actualizar la contraseña.',
      })
    } finally {
      setLoading(false)
    }
  }

  const sedeInstitucional = user.sede?.trim() || 'Sede Facatativá'
  const carreraInstitucional = user.carrera?.trim() || 'Ingeniería de Sistemas y Computación'
  const rolInstitucional = ROLE_LABEL[user.role] || user.role

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-perfil-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between border-b border-line bg-paper/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-paper shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-ochre">SIARD-UdeC • Seguridad</p>
              <h2 id="modal-perfil-title" className="font-serif text-xl font-bold text-pine">
                Mi Perfil y Seguridad
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-paper hover:text-ink transition disabled:opacity-50"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(85vh-80px)] overflow-y-auto">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/70">
                <UserIcon size={14} className="text-pine" />
                Información Institucional
              </h3>
              <span className="inline-flex items-center rounded-full bg-paper px-2 py-0.5 text-[11px] font-mono text-ink/60 border border-line">
                Solo lectura
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-line/80 bg-paper/40 p-3.5 space-y-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                  <UserIcon size={12} className="text-moss" /> Nombre Completo
                </span>
                <p className="text-sm font-semibold text-ink break-words">{user.name}</p>
              </div>

              <div className="rounded-xl border border-line/80 bg-paper/40 p-3.5 space-y-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                  <Mail size={12} className="text-moss" /> Correo Institucional
                </span>
                <p className="text-sm font-medium text-ink break-words font-mono text-[13px]">{user.email}</p>
              </div>

              <div className="rounded-xl border border-line/80 bg-paper/40 p-3.5 space-y-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                  <Shield size={12} className="text-moss" /> Rol en SIARD-UdeC
                </span>
                <p className="inline-block rounded-md bg-pine/10 px-2.5 py-0.5 text-xs font-semibold text-pine">
                  {rolInstitucional}
                </p>
              </div>

              <div className="rounded-xl border border-line/80 bg-paper/40 p-3.5 space-y-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                  <Building2 size={12} className="text-moss" /> Sede Institucional
                </span>
                <p className="text-sm font-medium text-ink">{sedeInstitucional}</p>
              </div>

              <div className="sm:col-span-2 rounded-xl border border-line/80 bg-paper/40 p-3.5 space-y-1">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink/50">
                  <GraduationCap size={12} className="text-moss" /> Carrera / Programa Académico
                </span>
                <p className="text-sm font-medium text-ink">{carreraInstitucional}</p>
              </div>
            </div>
          </section>

          <hr className="border-line" />

          <section className="space-y-4">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/70">
                <KeyRound size={14} className="text-pine" />
                Actualizar Contraseña
              </h3>
              <p className="text-xs text-ink/60">
                Tu nueva contraseña debe tener un mínimo de 6 caracteres para proteger tu cuenta.
              </p>
            </div>

            {msg && (
              <div
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-sm transition-all ${
                  msg.kind === 'ok'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
                role="alert"
              >
                {msg.kind === 'ok' ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                )}
                <span className="font-medium">{msg.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1" htmlFor="contrasenaActual">
                  Contraseña actual *
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                    <Lock size={15} />
                  </div>
                  <input
                    id="contrasenaActual"
                    type={showActual ? 'text' : 'password'}
                    value={contrasenaActual}
                    onChange={(e) => setContrasenaActual(e.target.value)}
                    placeholder="Ingresa tu contraseña actual"
                    disabled={loading}
                    className="w-full rounded-lg border border-line bg-white pl-9 pr-10 py-2 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowActual(!showActual)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink transition"
                    title={showActual ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1" htmlFor="nuevaContrasena">
                  Nueva contraseña * (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                    <KeyRound size={15} />
                  </div>
                  <input
                    id="nuevaContrasena"
                    type={showNueva ? 'text' : 'password'}
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    disabled={loading}
                    className="w-full rounded-lg border border-line bg-white pl-9 pr-10 py-2 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNueva(!showNueva)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink transition"
                    title={showNueva ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/70 mb-1" htmlFor="confirmarContrasena">
                  Confirmar nueva contraseña *
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                    <KeyRound size={15} />
                  </div>
                  <input
                    id="confirmarContrasena"
                    type={showConfirmar ? 'text' : 'password'}
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    disabled={loading}
                    className="w-full rounded-lg border border-line bg-white pl-9 pr-10 py-2 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmar(!showConfirmar)}
                    tabIndex={-1}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink transition"
                    title={showConfirmar ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-pine hover:bg-paper/40 transition disabled:opacity-50"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={loading || !contrasenaActual || !nuevaContrasena || !confirmarContrasena}
                  className="inline-flex items-center gap-2 rounded-lg bg-pine px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-moss transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Guardar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
