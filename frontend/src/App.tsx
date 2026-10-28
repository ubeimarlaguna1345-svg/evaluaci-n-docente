import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useDB, initDB, actions } from './store'
import { Shell } from './views/common/Shell'
import { Msg } from './views/common/Components'
import { ProtectedRoute } from './ProtectedRoute'

export function AppContent() {
  const db = useDB()
  useEffect(() => {
    initDB()
  }, [])

  if (db.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center font-serif text-2xl text-pine">
        Conectando a PostgreSQL…
      </div>
    )
  }

  if (db.error && !db.connected) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-paper">
        <div className="max-w-md w-full space-y-4 rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="font-serif text-2xl text-pine">Conexión con PostgreSQL</h2>
          <Msg kind="err" text={db.error} />
          <p className="text-sm text-ink/70">
            Asegúrate de que el backend esté en ejecución y que la base de datos PostgreSQL esté accesible.
          </p>
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => initDB()}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss cursor-pointer"
            >
              Reintentar Conexión
            </button>
            <button
              type="button"
              onClick={() => actions.activateDemoMode()}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-pine text-pine bg-white hover:bg-pine/5 px-4 py-2.5 text-sm font-semibold transition cursor-pointer"
            >
              Continuar en modo demostración (Datos institucionales)
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Shell />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinador"
        element={
          <ProtectedRoute allowedRoles={['coordinador']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coordinador/*"
        element={
          <ProtectedRoute allowedRoles={['coordinador']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/docente"
        element={
          <ProtectedRoute allowedRoles={['docente']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/docente/*"
        element={
          <ProtectedRoute allowedRoles={['docente']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/estudiante"
        element={
          <ProtectedRoute allowedRoles={['estudiante']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route
        path="/estudiante/*"
        element={
          <ProtectedRoute allowedRoles={['estudiante']}>
            <Shell />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
