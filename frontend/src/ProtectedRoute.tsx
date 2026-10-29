import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore, getCurrentUser, setCurrentUser } from './store'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  role?: string
  children?: React.ReactNode
}

export const ProtectedRoute = ({ allowedRoles, role, children }: ProtectedRouteProps) => {
  const storeUser = useAppStore((state) => state.currentUser)

  let currentUser = storeUser || getCurrentUser()
  if (!currentUser) {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('siard_user')
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

  // 1. Si no hay usuario autenticado (currentUser === null), redirigir INMEDIATAMENTE a la ruta raíz / (Login)
  if (!currentUser) {
    return <Navigate to="/" replace />
  }

  // 2. Si el usuario está autenticado pero su rol no corresponde a la ruta, redirigir a su propio panel o a /
  const userRole = (currentUser as any).rol || currentUser.role
  const roles = allowedRoles || (role ? [role] : undefined)

  if (roles && !roles.includes(userRole)) {
    return <Navigate to={`/${userRole}`} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
