import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppStore } from './store'

interface ProtectedRouteProps {
  allowedRoles?: string[]
  children?: React.ReactNode
}

export const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const currentUser = useAppStore((state) => state.currentUser)

  // 1. Si no hay usuario autenticado, expulsar inmediatamente a la pantalla de login
  if (!currentUser) {
    return <Navigate replace to="/" />
  }

  // 2. Si el rol no coincide con los permisos requeridos, redirigir
  const userRole = (currentUser as any).rol || currentUser.role
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate replace to="/" />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
