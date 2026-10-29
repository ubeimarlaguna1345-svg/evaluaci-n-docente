import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { UsuarioFactory } from '../models/index.js'

export const memoryUpdatedPasswords = new Map()

export const INSTITUTIONAL_SEED_USERS = [
  { id: 'usr-admin-uber', nombre: 'Ubeimar Laguna Cárdenas', correo: 'uberadmin.siard@ucundinamarca.edu.co', contrasena: 'Uber1019', rol: 'admin', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'usr-admin-dani', nombre: 'Daniel Moreno', correo: 'danidirec.siard@ucundinamarca.edu.co', contrasena: 'siardVd3', rol: 'admin', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'usr-coord-jaime', nombre: 'Jaime Parra', correo: 'jaimeparra.siard@ucundinamarca.edu.co', contrasena: 'CoordParra2026*', rol: 'coordinador', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'usr-coord-1', nombre: 'Coordinación Académica', correo: 'coordinador@ucundinamarca.edu.co', contrasena: 'CoordParra2026*', rol: 'coordinador', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'doc-mendoza', nombre: 'Javier Mendoza', correo: 'prof.mendoza.siard@ucundinamarca.edu.co', contrasena: 'ProfMen2026*', rol: 'docente', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'doc-salazar', nombre: 'Diana Salazar', correo: 'prof.salazar.siard@ucundinamarca.edu.co', contrasena: 'ProfSal2026*', rol: 'docente', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'doc-navarro', nombre: 'Andrés Navarro', correo: 'prof.navarro.siard@ucundinamarca.edu.co', contrasena: 'ProfNav2026*', rol: 'docente', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'doc-prieto', nombre: 'Gabriel Prieto', correo: 'prof.prieto.siard@ucundinamarca.edu.co', contrasena: 'ProfPri2026*', rol: 'docente', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'doc-cifuentes', nombre: 'Mariana Cifuentes', correo: 'prof.cifuentes.siard@ucundinamarca.edu.co', contrasena: 'ProfCif2026*', rol: 'docente', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'est-carlos', nombre: 'Carlos Peña', correo: 'carlospena.siard@ucundinamarca.edu.co', contrasena: 'Carl8742*', rol: 'estudiante', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'est-1', nombre: 'Laura Quintero', correo: 'lauraquintero.siard@ucundinamarca.edu.co', contrasena: 'Laur5193*', rol: 'estudiante', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'est-2', nombre: 'Mateo Rincón', correo: 'mateorincon.siard@ucundinamarca.edu.co', contrasena: 'Mate6381*', rol: 'estudiante', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'est-3', nombre: 'Camila Torres', correo: 'camilatorres.siard@ucundinamarca.edu.co', contrasena: 'Cami9240*', rol: 'estudiante', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
  { id: 'est-4', nombre: 'Julián Morales', correo: 'julianmorales.siard@ucundinamarca.edu.co', contrasena: 'Juli1835*', rol: 'estudiante', activo: true, sede: 'Sede Facatativá', carrera: 'Ingeniería de Sistemas y Computación' },
]

export class AuthService {
  async crearUsuario({ name, email, password, role, sede, carrera }) {
    if (!name?.trim() || !email?.trim() || !password || !role) {
      const error = new Error('Todos los campos son obligatorios.')
      error.statusCode = 400
      throw error
    }

    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)
    const usuarioDominio = UsuarioFactory.crearUsuario({
      id,
      nombre: name.trim(),
      correo: email.trim().toLowerCase(),
      rol: role,
      sede: sede?.trim() || 'Sede Facatativá',
      carrera: carrera?.trim() || 'Ingeniería de Sistemas y Computación',
    })

    const query = `
      INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, activo, sede, carrera)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
      RETURNING id, nombre AS name, correo AS email, contrasena AS password, rol AS role, activo AS active, sede, carrera
    `
    const result = await pool.query(query, [
      usuarioDominio.getId(),
      usuarioDominio.getNombre(),
      usuarioDominio.getCorreo(),
      password,
      passwordHash,
      usuarioDominio.getRol(),
      sede?.trim() || 'Sede Facatativá',
      carrera?.trim() || 'Ingeniería de Sistemas y Computación',
    ])

    const usuarioInstanciado = UsuarioFactory.crearUsuario(result.rows[0])
    return {
      ...result.rows[0],
      permisos: usuarioInstanciado.obtenerPermisos(),
    }
  }

  async obtenerTodos() {
    const result = await pool.query(
      "SELECT id, nombre AS name, correo AS email, rol AS role, activo AS active, COALESCE(sede, 'Sede Facatativá') AS sede, COALESCE(carrera, 'Ingeniería de Sistemas y Computación') AS carrera FROM usuarios WHERE activo = TRUE ORDER BY nombre"
    )
    return result.rows.map((row) => UsuarioFactory.crearUsuario(row).toJSON())
  }

  async autenticar(email, password) {
    if (!email || !password) {
      const error = new Error('Correo y contraseña requeridos.')
      error.statusCode = 400
      throw error
    }

    let searchEmail = (email || '').trim().toLowerCase()
    if (searchEmail === 'uberadmin.siard@ucundinamarac.edu.co') {
      searchEmail = 'uberadmin.siard@ucundinamarca.edu.co'
    }

    let row = null
    let dbConnected = false
    try {
      const result = await pool.query(
        `SELECT id, nombre, nombre AS name, correo, correo AS email, 
                contrasena, contrasena AS password, contrasena_hash, 
                rol, rol AS role, activo, activo AS active, sede, carrera 
         FROM usuarios 
         WHERE LOWER(TRIM(correo)) = LOWER(TRIM($1)) 
            OR (LOWER(TRIM(COALESCE(email, ''))) = LOWER(TRIM($1)))
            OR ($1 LIKE '%uberadmin%' AND LOWER(TRIM(correo)) LIKE '%uberadmin%')
         LIMIT 1`,
        [searchEmail]
      )
      dbConnected = true
      if (result.rows.length > 0) {
        row = result.rows[0]
      }
    } catch (dbErr) {
      try {
        const result2 = await pool.query(
          `SELECT id, nombre AS name, correo AS email, contrasena AS password, contrasena_hash, rol AS role, activo AS active, sede, carrera 
           FROM usuarios 
           WHERE LOWER(TRIM(correo)) = LOWER(TRIM($1)) 
              OR ($1 LIKE '%uberadmin%' AND LOWER(TRIM(correo)) LIKE '%uberadmin%')
           LIMIT 1`,
          [searchEmail]
        )
        dbConnected = true
        if (result2.rows.length > 0) {
          row = result2.rows[0]
        }
      } catch (err2) {
        console.warn('Aviso en autenticar (PostgreSQL no disponible):', err2.message)
        dbConnected = false
      }
    }

    // 1. SI EL USUARIO EXISTE EN NEON POSTGRESQL:
    if (row) {
      if (row.active === false || row.activo === false) {
        const error = new Error('Esta cuenta fue dada de baja. Contacte al administrador.')
        error.statusCode = 403
        throw error
      }

      // Comparar la contraseña ingresada con la almacenada (soportando texto plano o bcrypt)
      const storedHash = row.contrasena_hash
      const storedPlain = row.contrasena || row.password

      let passwordMatch = false
      if (storedHash) {
        passwordMatch = await bcrypt.compare(password, storedHash)
      }
      if (!passwordMatch && storedPlain) {
        passwordMatch = (storedPlain === password)
      }

      // SI NO COINCIDE (incluyendo si el usuario escribe la contraseña vieja): RETORNAR ESTRICTAMENTE 401 Unauthorized con "Contraseña incorrecta."
      if (!passwordMatch) {
        const error = new Error('Contraseña incorrecta.')
        error.statusCode = 401
        throw error
      }

      const usuario = UsuarioFactory.crearUsuario(row)
      return usuario.toJSON()
    }

    // 2. SI NO EXISTE EN NEON (o contingencia offline):
    const foundSeed = INSTITUTIONAL_SEED_USERS.find(
      (u) => u.correo.toLowerCase() === searchEmail || (searchEmail.includes('uberadmin') && u.correo.includes('uberadmin'))
    )

    if (foundSeed) {
      if (dbConnected) {
        const seedHash = await bcrypt.hash(foundSeed.contrasena, 10)
        try {
          await pool.query(
            `INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, activo, sede, carrera, email, password)
             VALUES ($1, $2, LOWER(TRIM($3)), $4, $5, $6, true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación', LOWER(TRIM($3)), $4)
             ON CONFLICT (correo) DO NOTHING`,
            [foundSeed.id, foundSeed.nombre, foundSeed.correo, foundSeed.contrasena, seedHash, foundSeed.rol]
          )
        } catch {}
      }

      const memOverride =
        memoryUpdatedPasswords.get(foundSeed.id) ||
        memoryUpdatedPasswords.get(foundSeed.correo.toLowerCase()) ||
        memoryUpdatedPasswords.get(searchEmail)
      const expectedPassword = memOverride ? memOverride.password : foundSeed.contrasena
      const expectedHash = memOverride ? memOverride.hash : null

      let seedMatch = false
      if (expectedHash) {
        seedMatch = await bcrypt.compare(password, expectedHash)
      }
      if (!seedMatch) {
        seedMatch = (expectedPassword === password)
      }

      if (!seedMatch) {
        const error = new Error('Contraseña incorrecta.')
        error.statusCode = 401
        throw error
      }

      const usuario = UsuarioFactory.crearUsuario({
        id: foundSeed.id,
        name: foundSeed.nombre,
        email: foundSeed.correo,
        password: expectedPassword,
        role: foundSeed.rol,
        activo: foundSeed.activo,
        sede: 'Sede Facatativá',
        carrera: 'Ingeniería de Sistemas y Computación',
      })
      return usuario.toJSON()
    }

    const error = new Error('No existe una cuenta registrada con este correo electrónico.')
    error.statusCode = 401
    throw error
  }

  async eliminarUsuario(id) {
    await pool.query('UPDATE cadis SET docente_id = NULL WHERE docente_id = $1', [id])
    await pool.query('DELETE FROM respuestas_formulario WHERE usuario_id = $1 OR docente_id = $1', [id])
    await pool.query('DELETE FROM respuestas_retroalimentacion WHERE estudiante_id = $1', [id])
    await pool.query('DELETE FROM retroalimentaciones WHERE docente_id = $1', [id])
    const delRes = await pool.query('DELETE FROM usuarios WHERE id = $1', [id])
    if (delRes.rowCount === 0) {
      await pool.query('UPDATE usuarios SET activo = FALSE WHERE id = $1', [id])
    }
    return { ok: true }
  }

  async cambiarContrasena(usuarioIdOrObj, contrasenaActualParam, nuevaContrasenaParam) {
    let userId = ''
    let userEmail = ''
    let contrasenaActual = ''
    let nuevaContrasena = ''

    if (usuarioIdOrObj && typeof usuarioIdOrObj === 'object') {
      userId = usuarioIdOrObj.userId || usuarioIdOrObj.usuarioId || usuarioIdOrObj.id || ''
      userEmail = usuarioIdOrObj.email || usuarioIdOrObj.correo || ''
      contrasenaActual = usuarioIdOrObj.contrasenaActual || usuarioIdOrObj.passwordActual || ''
      nuevaContrasena = usuarioIdOrObj.nuevaContrasena || usuarioIdOrObj.passwordNueva || ''
    } else {
      userId = usuarioIdOrObj || ''
      contrasenaActual = contrasenaActualParam || ''
      nuevaContrasena = nuevaContrasenaParam || ''
    }

    userId = String(userId || '').trim()
    userEmail = String(userEmail || '').trim().toLowerCase()
    if (userEmail === 'uberadmin.siard@ucundinamarac.edu.co') {
      userEmail = 'uberadmin.siard@ucundinamarca.edu.co'
    }

    if ((!userId && !userEmail) || !contrasenaActual || !nuevaContrasena) {
      const error = new Error('Todos los campos son obligatorios.')
      error.statusCode = 400
      throw error
    }

    if (typeof nuevaContrasena !== 'string' || nuevaContrasena.length < 6) {
      const error = new Error('La nueva contraseña debe tener al menos 6 caracteres.')
      error.statusCode = 400
      throw error
    }

    let row = null
    try {
      let queryStr = 'SELECT id, correo, contrasena, contrasena_hash FROM usuarios WHERE '
      const queryParams = []
      if (userId && userEmail) {
        queryParams.push(userId, userEmail)
        queryStr += 'id = $1 OR LOWER(correo) = LOWER($2)'
      } else if (userId) {
        queryParams.push(userId)
        queryStr += 'id = $1'
      } else {
        queryParams.push(userEmail)
        queryStr += 'LOWER(correo) = LOWER($1)'
      }

      if (userEmail && userEmail.includes('uberadmin')) {
        queryStr += ' OR LOWER(correo) LIKE \'%uberadmin%\''
      }

      const result = await pool.query(queryStr, queryParams)
      if (result.rows.length > 0) {
        row = result.rows[0]
      }
    } catch (dbErr) {
      console.warn('Aviso al buscar usuario en PostgreSQL:', dbErr.message)
    }

    // Fallback híbrido institucional si no se encontró en PostgreSQL
    if (!row) {
      const foundSeed = INSTITUTIONAL_SEED_USERS.find(
        (u) =>
          (userId && u.id === userId) ||
          (userEmail && (u.correo.toLowerCase() === userEmail || (userEmail.includes('uberadmin') && u.correo.includes('uberadmin'))))
      )

      if (foundSeed) {
        row = foundSeed
      }
    }

    if (!row) {
      const error = new Error('Usuario no encontrado.')
      error.statusCode = 404
      throw error
    }

    const targetUserId = row.id
    const targetEmail = row.correo || row.email || userEmail
    const memOverride =
      memoryUpdatedPasswords.get(targetUserId) ||
      (targetEmail && memoryUpdatedPasswords.get(targetEmail.toLowerCase())) ||
      (userEmail && memoryUpdatedPasswords.get(userEmail))
    if (memOverride) {
      row.contrasena = memOverride.password
      row.contrasena_hash = memOverride.hash
    }

    const passwordMatch = row.contrasena_hash
      ? await bcrypt.compare(contrasenaActual, row.contrasena_hash)
      : row.contrasena === contrasenaActual

    if (!passwordMatch) {
      const error = new Error('La contraseña actual es incorrecta')
      error.statusCode = 400
      throw error
    }

    const nuevoHash = await bcrypt.hash(nuevaContrasena, 10)
    memoryUpdatedPasswords.set(targetUserId, { password: nuevaContrasena, hash: nuevoHash })
    if (targetEmail) {
      memoryUpdatedPasswords.set(targetEmail.toLowerCase(), { password: nuevaContrasena, hash: nuevoHash })
    }
    if (userEmail) {
      memoryUpdatedPasswords.set(userEmail, { password: nuevaContrasena, hash: nuevoHash })
    }

    try {
      const updateRes = await pool.query(
        'UPDATE usuarios SET contrasena = $1, contrasena_hash = $2 WHERE id = $3',
        [nuevaContrasena, nuevoHash, targetUserId]
      )

      if (updateRes.rowCount === 0) {
        const seedUser = INSTITUTIONAL_SEED_USERS.find(
          (u) =>
            (targetUserId && u.id === targetUserId) ||
            (targetEmail && u.correo.toLowerCase() === targetEmail.toLowerCase()) ||
            (userEmail && u.correo.toLowerCase() === userEmail.toLowerCase())
        ) || {
          id: targetUserId || crypto.randomUUID(),
          nombre: row.nombre || row.name || 'Usuario Institucional',
          correo: targetEmail || userEmail,
          rol: row.rol || row.role || 'admin',
          sede: row.sede || 'Sede Facatativá',
          carrera: row.carrera || 'Ingeniería de Sistemas y Computación',
        }

        await pool.query(
          `INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, carrera, sede, activo, email, password)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $3, $4)
           ON CONFLICT (correo) DO UPDATE
           SET contrasena = EXCLUDED.contrasena,
               contrasena_hash = EXCLUDED.contrasena_hash,
               password = EXCLUDED.password`,
          [
            seedUser.id,
            seedUser.nombre,
            seedUser.correo,
            nuevaContrasena,
            nuevoHash,
            seedUser.rol,
            seedUser.carrera || 'Ingeniería de Sistemas y Computación',
            seedUser.sede || 'Sede Facatativá',
          ]
        )
      }
    } catch (updateErr) {
      console.warn('Aviso al actualizar en PostgreSQL (modo contingencia):', updateErr.message)
    }

    return { ok: true, success: true, message: 'Contraseña actualizada con éxito' }
  }
}

export const authService = new AuthService()
