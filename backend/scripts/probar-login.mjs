import bcrypt from 'bcryptjs'
import pg from 'pg'
import dotenv from 'dotenv'
import path from 'node:path'
import readline from 'node:readline/promises'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'siard_udec',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

try {
  const correo = 'uberadmin.siard@ucundinamarca.edu.co'

  const resultado = await pool.query(
    'SELECT contrasena_hash, activo FROM usuarios WHERE LOWER(correo) = LOWER($1)',
    [correo]
  )

  if (resultado.rowCount === 0) {
    console.log('Usuario no encontrado.')
  } else {
    const clave = await rl.question('Escribe la contraseña del administrador: ')
    const coincide = await bcrypt.compare(
      clave,
      resultado.rows[0].contrasena_hash
    )

    console.log('Usuario activo:', resultado.rows[0].activo)
    console.log('Contraseña coincide:', coincide)
  }
} catch (error) {
  console.error('Error:', error.message)
} finally {
  rl.close()
  await pool.end()
}