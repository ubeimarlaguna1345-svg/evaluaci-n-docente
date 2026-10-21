import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { apiRouter } from './routes/index.js'
import { pool, initSchema } from './config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.resolve(rootDir, '.env.local') })
dotenv.config({ path: path.resolve(rootDir, '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 3001)

app.use(cors({
  origin: '*',
}))

app.use(express.json())

app.use('/api', apiRouter)

app.get('/', (_req, res) => {
  res.json({
    app: 'SIARD-UdeC API',
    architecture: 'Two-Tier Backend (MVC)',
    database: 'PostgreSQL',
    status: 'running',
    port: PORT,
  })
})

initSchema().catch((err) => {
  console.warn('Aviso al inicializar esquema PostgreSQL:', err.message)
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Servidor SIARD-UdeC Backend activo en http://localhost:${PORT}`)
})

async function shutdown() {
  console.log('Cerrando servidor SIARD-UdeC Backend...')
  server.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

export default app
