import dotenv from 'dotenv'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Cargar variables de entorno desde .env.local y luego .env
dotenv.config({ path: '.env.local' })
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'siard_udec'}`

export const pool = new Pool({
  connectionString,
})

pool.on('error', (err) => {
  console.error('Error imprevisto en el Connection Pool de PostgreSQL:', err.message)
})

/**
 * Inicializa el esquema en PostgreSQL ejecutando database/schema.sql si las tablas no existen
 */
export async function initSchema() {
  try {
    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql')
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8')
      await pool.query(sql)
      console.log('✓ Esquema PostgreSQL verificado y sincronizado correctamente.')
      return true
    }
  } catch (error) {
    console.warn('Aviso al verificar esquema PostgreSQL:', error.message)
    return false
  }
}
