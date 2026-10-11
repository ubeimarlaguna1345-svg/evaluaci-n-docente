import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pg from 'pg'
import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

const { Pool } = pg
const app = express()
const PORT = Number(process.env.PORT || 3001)

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || 'siard_udec',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
})

app.use(cors({
  origin: 'http://localhost:5173',
}))

app.use(express.json())


app.get('/api/auth/status', async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT 1 FROM usuarios WHERE rol = 'admin' LIMIT 1"
    )

    res.json({
      ok: true,
      adminExists: result.rowCount > 0,
    })
  } catch (error) {
    console.error('Error al consultar el estado inicial:', error.message)

    res.status(500).json({
      ok: false,
      message: 'No fue posible consultar el estado inicial.',
    })
  }
})


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      ok: false,
      message: 'Correo y contraseña son obligatorios.',
    })
  }

  try {
    const result = await pool.query(
      `SELECT id, nombre, correo, contrasena_hash, rol, activo
       FROM usuarios
       WHERE LOWER(correo) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    )

    const user = result.rows[0]

    console.log('Login - usuario encontrado:', Boolean(user))
console.log('Login - cuenta activa:', user?.activo)

    if (!user || !user.activo) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales incorrectas o cuenta inactiva.',
      })
    }

    const bcrypt = await import('bcryptjs')
    const validPassword = await bcrypt.default.compare(
      password,
      user.contrasena_hash
    )

    console.log('Login - contraseña válida:', validPassword)

    if (!validPassword) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales incorrectas o cuenta inactiva.',
      })
    }

    
const token = jwt.sign(
  {
    sub: String(user.id),
    role: user.rol,
  },
  process.env.JWT_SECRET,
  { expiresIn: '2h' }
)

return res.json({
  ok: true,
  token,
  user: {
    id: user.id,
    name: user.nombre,
    email: user.correo,
    role: user.rol,
    active: user.activo,
  },
})

  } catch (error) {
    console.error('Error en el inicio de sesión:', error.message)

    return res.status(500).json({
      ok: false,
      message: 'No fue posible iniciar sesión. Inténtalo más tarde.',
    })
  }
})


app.post('/api/auth/setup-admin', async (req, res) => {
  const { setupKey, name, email, password } = req.body || {}

  if (
    typeof process.env.ADMIN_SETUP_KEY !== 'string' ||
    !process.env.ADMIN_SETUP_KEY ||
    setupKey !== process.env.ADMIN_SETUP_KEY
  ) {
    return res.status(403).json({
      ok: false,
      message: 'No autorizado.',
    })
  }

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    password.length < 12
  ) {
    return res.status(400).json({
      ok: false,
      message:
        'Completa el nombre, el correo y una contraseña de al menos 12 caracteres.',
    })
  }

  try {
    const existing = await pool.query(
      "SELECT 1 FROM usuarios WHERE rol = 'admin' LIMIT 1"
    )

    if (existing.rowCount > 0) {
      return res.status(409).json({
        ok: false,
        message:
          'Ya existe un administrador. No se puede repetir la configuración inicial.',
      })
    }

    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.default.hash(password, 12)
   const id = crypto.randomUUID()

await pool.query(
  `INSERT INTO usuarios
   (id, nombre, correo, contrasena_hash, rol, activo)
   VALUES ($1, $2, $3, $4, 'admin', TRUE)`,
  [id, name.trim(), email.trim().toLowerCase(), passwordHash]
)

    return res.status(201).json({
      ok: true,
      message: 'Administrador creado correctamente.',
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        ok: false,
        message: 'Ese correo ya está registrado.',
      })
    }

    console.error('Error al crear el administrador:', error.message)

    return res.status(500).json({
      ok: false,
      message: 'No fue posible crear el administrador.',
    })
  }
})


if (!process.env.DB_PASSWORD) {
  console.error('Falta DB_PASSWORD. Configúrala en el archivo .env.')
  process.exit(1)
}



app.get('/', (_req, res) => {
  res.json({
    app: 'SIARD-UdeC API',
    status: 'running',
  })
})


app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT current_database() AS database, current_user AS db_user'
    )

    return res.json({
      ok: true,
      message: 'Conexión con PostgreSQL correcta',
      database: result.rows[0].database,
      db_user: result.rows[0].db_user,
    })
  } catch (error) {
    console.error('Error de conexión con PostgreSQL:', error.message)

    return res.status(500).json({
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