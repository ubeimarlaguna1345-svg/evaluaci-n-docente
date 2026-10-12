import { apiRouter } from './api.js'

/**
 * Plugin de Vite para manejar /api directamente con PostgreSQL dentro del servidor Vite.
 * Decora el objeto nativo http.ServerResponse de Node.js para garantizar compatibilidad.
 */
export function viteApiMiddleware() {
  return {
    name: 'vite-pg-api',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        // Métodos nativos de Node.js garantizados sobre http.ServerResponse
        if (!res.status) {
          res.status = function (statusCode) {
            this.statusCode = statusCode
            return this
          }
        }
        if (!res.json) {
          res.json = function (payload) {
            this.setHeader('Content-Type', 'application/json')
            this.end(JSON.stringify(payload))
            return this
          }
        }
        next()
      })

      server.middlewares.use('/api', apiRouter)
    },
  }
}
