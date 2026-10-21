import { useEffect } from 'react'
import { useDB, initDB } from './store'
import { Shell } from './views/common/Shell'
import { Msg } from './views/common/Components'

export default function App() {
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
          <button
            type="button"
            onClick={() => initDB()}
            className="w-full inline-flex justify-center items-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-semibold text-white hover:bg-moss"
          >
            Reintentar Conexión
          </button>
        </div>
      </div>
    )
  }

  return <Shell />
}
