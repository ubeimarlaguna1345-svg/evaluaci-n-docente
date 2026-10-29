import React, { useState, useEffect } from 'react'
import {
  X,
  Lock,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { ROLE_LABEL, actions, type User } from '../store'
import { usuarioService } from '../services/usuarioService'

export interface ChangePasswordModalProps {
  user: User
  onClose: () => void
}

export function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showActual, setShowActual] = useState(false)
  const [showNueva, setShowNueva] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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

    if (!passwordActual.trim() || !passwordNueva.trim() || !confirmPassword.trim()) {
      return setMsg({ kind: 'err', text: 'Por favor completa todos los campos requeridos.' })
    }

    if (passwordNueva.length < 6) {
      return setMsg({ kind: 'err', text: 'La nueva contraseña debe tener al menos 6 caracteres.' })
    }

    if (passwordNueva !== confirmPassword) {
      return setMsg({ kind: 'err', text: 'La nueva contraseña y su confirmación no coinciden.' })
    }

    try {
      setLoading(true)
      const res = await usuarioService.cambiarPassword(
        { id: user.id, email: user.email },
        passwordActual,
        passwordNueva
      )

      if (res.ok || res.success) {
        // Actualizar la contraseña en el estado y almacenamiento local
        await actions.cambiarContrasena(user.id, passwordActual, passwordNueva)

        try {
          if (typeof localStorage !== 'undefined') {
            const rawUser = localStorage.getItem('siard_user')
            if (rawUser) {
              const uObj = JSON.parse(rawUser)
              uObj.password = passwordNueva
              localStorage.setItem('siard_user', JSON.stringify(uObj))
            } else {
              localStorage.setItem('siard_user', JSON.stringify({ ...user, password: passwordNueva }))
            }
          }
          if (typeof sessionStorage !== 'undefined') {
            const rawUser = sessionStorage.getItem('currentUser') || sessionStorage.getItem('siard_user')
            if (rawUser) {
              const uObj = JSON.parse(rawUser)
              uObj.password = passwordNueva
              sessionStorage.setItem('currentUser', JSON.stringify(uObj))
              sessionStorage.setItem('siard_user', JSON.stringify(uObj))
            } else {
              sessionStorage.setItem('currentUser', JSON.stringify({ ...user, password: passwordNueva }))
              sessionStorage.setItem('siard_user', JSON.stringify({ ...user, password: passwordNueva }))
            }
          }
        } catch {}

        setMsg({
          kind: 'ok',
          text: 'Contraseña actualizada correctamente.',
        })
        setPasswordActual('')
        setPasswordNueva('')
        setConfirmPassword('')

        // Cerrar el modal después de confirmación visual
        setTimeout(() => {
          onClose()
        }, 1200)
      } else {
        setMsg({
          kind: 'err',
          text: res.message || 'Error al actualizar la contraseña.',
        })
      }
    } catch (err) {
      setMsg({
        kind: 'err',
        text: (err as Error).message || 'Error al actualizar la contraseña.',
      })
    } finally {
      setLoading(false)
    }
  }

  const rolInstitucional = ROLE_LABEL[user.role] || user.role

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-password-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-white shadow-2xl overflow-hidden my-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-line bg-paper/60 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine text-paper shadow-sm">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-wider text-ochre">SIARD-UdeC • Seguridad</p>
              <h2 id="modal-password-title" className="font-serif text-xl font-bold text-pine">
                Seguridad y Cambio de Contraseña
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-paper hover:text-ink transition disabled:opacity-50 cursor-pointer"
            title="Cerrar modal"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-5">
          {/* Subtítulo con nombre y correo en modo solo lectura */}
          <div className="rounded-xl border border-line bg-paper/40 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink/60">Usuario Autenticado</p>
              <span className="inline-block rounded-md bg-pine/10 px-2 py-0.5 text-[11px] font-semibold text-pine">
                {rolInstitucional}
              </span>
            </div>
            <p className="text-sm font-bold text-ink">{user.name}</p>
            <p className="text-xs font-mono text-ink/70">{user.email}</p>
          </div>

          {/* Mensajes de feedback */}
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

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo 1: Contraseña actual */}
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1" htmlFor="passwordActual">
                Contraseña actual *
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                  <Lock size={15} />
                </div>
                <input
                  id="passwordActual"
                  type={showActual ? 'text' : 'password'}
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  disabled={loading}
                  className="w-full rounded-lg border border-line bg-white pl-9 pr-10 py-2.5 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper/50"
                />
                <button
                  type="button"
                  onClick={() => setShowActual(!showActual)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink transition cursor-pointer"
                  title={showActual ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showActual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo 2: Nueva contraseña */}
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1" htmlFor="passwordNueva">
                Nueva contraseña *
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                  <KeyRound size={15} />
                </div>
                <input
                  id="passwordNueva"
                  type={showNueva ? 'text' : 'password'}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={loading}
                  className="w-full rounded-lg border border-line bg-white pl-9 pr-10 py-2.5 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper/50"
                />
                <button
                  type="button"
                  onClick={() => setShowNueva(!showNueva)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink transition cursor-pointer"
                  title={showNueva ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showNueva ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo 3: Confirmar nueva contraseña */}
            <div>
              <label className="block text-xs font-semibold text-ink/70 mb-1" htmlFor="confirmPassword">
                Confirmar nueva contraseña *
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40">
                  <KeyRound size={15} />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la nueva contraseña"
                  disabled={loading}
                  className="w-full rounded-lg border border-line bg-white pl-9 pr-10 py-2.5 text-sm outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/20 disabled:bg-paper/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink/40 hover:text-ink transition cursor-pointer"
                  title={showConfirm ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-line">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink hover:border-pine hover:bg-paper/40 transition disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading || !passwordActual || !passwordNueva || !confirmPassword}
                className="inline-flex items-center gap-2 rounded-lg bg-pine px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-moss transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound size={16} />
                    <span>Actualizar contraseña</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePasswordModal

