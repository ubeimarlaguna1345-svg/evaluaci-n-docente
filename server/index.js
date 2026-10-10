import 'dotenv/config'
import express from 'express'
import pg from 'pg'

const { Pool } = pg
const app = express()
const PORT = Number(process.env.PORT || 3001)

app.use(express.json())

if (!process.env.DB_PASSWORD) {
  console.error('Falta DB_PASSWORD. Configúrala en el archivo .env.')
  process.exit(1)
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'siard_udec',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

app.get('/', (_req, res) => {
  res.json({
    app: 'SIARD-UdeC API',
    status: 'running',
  })
})

app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS db_user
    `)

    res.json({
      ok: true,
      message: 'Conexión con PostgreSQL correcta',
      database: result.rows[0].database,
      db_user: result.rows[0].db_user,
    })
  } catch (error) {
    console.error('Error de conexión con PostgreSQL:', error.message)

    res.status(500).json({
      ok: false,
      message: 'No se pudo conectar con PostgreSQL.',
      detail: 'Revisa la configuración de la conexión.',
    })
  }
})

const server = app.listen(PORT, () => {
  console.log(`SIARD-UdeC API disponible en http://localhost:${PORT}`)
})

async function shutdown() {
  server.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
