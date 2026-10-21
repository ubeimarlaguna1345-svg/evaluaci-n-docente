import dotenv from 'dotenv'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'siard_udec'}`

function shouldEnableSSL() {
  const host = (process.env.DB_HOST || '').toLowerCase()
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === ''

  if (process.env.DATABASE_URL) {
    const urlStr = process.env.DATABASE_URL.toLowerCase()
    if (urlStr.includes('neon.tech') || urlStr.includes('sslmode=require') || urlStr.includes('ssl=true')) {
      return true
    }
    try {
      const parsed = new URL(process.env.DATABASE_URL)
      const parsedHost = (parsed.hostname || '').toLowerCase()
      if (parsedHost && parsedHost !== 'localhost' && parsedHost !== '127.0.0.1') {
        return true
      }
    } catch {
    }
  }

  if (!isLocalHost) {
    return true
  }

  return process.env.NODE_ENV === 'production'
}

const useSSL = shouldEnableSSL()

export const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (err) => {
  console.error('Error imprevisto en el Connection Pool de PostgreSQL:', err.message)
})

export async function initSchema() {
  try {
    const candidatePaths = [
      path.resolve(__dirname, '..', '..', 'database', 'schema.sql'),
      path.resolve(process.cwd(), 'database', 'schema.sql'),
      path.resolve(process.cwd(), '..', 'database', 'schema.sql'),
      path.resolve(__dirname, '..', '..', 'database', 'schema.postgres.sql'),
      path.resolve(process.cwd(), 'database', 'schema.postgres.sql'),
      path.resolve(process.cwd(), '..', 'database', 'schema.postgres.sql'),
    ]
    const schemaPath = candidatePaths.find((p) => fs.existsSync(p))
    if (schemaPath) {
      const sql = fs.readFileSync(schemaPath, 'utf-8')
      await pool.query(sql)
      await pool.query(`
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sede TEXT NOT NULL DEFAULT 'Sede Facatativá';
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera TEXT NOT NULL DEFAULT 'Ingeniería de Sistemas y Computación';
      `)
      console.log('✓ Esquema PostgreSQL verificado y sincronizado correctamente.')
      return true
    }
  } catch (error) {
    console.warn('Aviso al verificar esquema PostgreSQL:', error.message)
    return false
  }
}
