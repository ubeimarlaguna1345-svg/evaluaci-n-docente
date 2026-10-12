import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { apiRouter } from './api.js'
import { pool, initSchema } from './db.js'

const app = express()
const PORT = Number(process.env.PORT || 3001)

app.use(cors({
  origin: '*',
}))

app.use(express.json())

// Montar todas las rutas API conectadas a PostgreSQL
app.use('/api', apiRouter)

app.get('/', (_req, res) => {
  res.json({
    app: 'SIARD-UdeC API',
    database: 'PostgreSQL',
    status: 'running',
  })
})

// Inicializar esquema en arranque
initSchema().catch(console.error)

const server = app.listen(PORT, () => {
  console.log(`SIARD-UdeC API PostgreSQL disponible en http://localhost:${PORT}`)
})

async function shutdown() {
  server.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)