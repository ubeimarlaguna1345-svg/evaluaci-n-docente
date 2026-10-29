import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore, setCurrentUser } from './store'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  role?: string
  children?: React.ReactNode
}

export const ProtectedRoute = ({ allowedRoles, role, children }: ProtectedRouteProps) => {
  const storeUser = useAppStore((state) => state.currentUser)

  // Prevenir expulsión prematura:
  // Al validar el acceso en /coordinador o /admin, verificar tanto el contexto reactivo como el respaldo en localStorage.getItem('siard_user')
  let currentUser = storeUser
  if (!currentUser) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('siard_user') || localStorage.getItem('currentUser')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.id && (parsed.role || parsed.rol) && parsed.active !== false) {
            currentUser = { ...parsed, role: parsed.role || parsed.rol, rol: parsed.rol || parsed.role }
            // Sincronizar contexto si estaba vacío
            setCurrentUser(currentUser)
          }
        }
      }
      if (!currentUser && typeof sessionStorage !== 'undefined') {
        const raw = sessionStorage.getItem('siard_user') || sessionStorage.getItem('currentUser')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.id && (parsed.role || parsed.rol) && parsed.active !== false) {
            currentUser = { ...parsed, role: parsed.role || parsed.rol, rol: parsed.rol || parsed.role }
            setCurrentUser(currentUser)
          }
        }
      }
    } catch {}
  }

  // 1. Si no hay usuario autenticado, expulsar a la pantalla de login
  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  // 2. Si el rol no coincide con los permisos requeridos, redirigir
  const userRole = (currentUser as any).rol || currentUser.role
  const roles = allowedRoles || (role ? [role] : undefined)

  if (roles && !roles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
