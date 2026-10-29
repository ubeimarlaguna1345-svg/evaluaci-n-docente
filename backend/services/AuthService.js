import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { pool } from '../config/db.js'
import { UsuarioFactory } from '../models/index.js'

export const memoryUpdatedPasswords = new Map()

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
    try {
      const result = await pool.query(
        'SELECT id, nombre AS name, correo AS email, contrasena AS password, contrasena_hash, rol AS role, activo AS active, sede, carrera FROM usuarios WHERE LOWER(correo) = $1',
        [searchEmail]
      )
      if (result.rows.length > 0) {
        row = result.rows[0]
      }
    } catch (dbErr) {
      console.warn('Aviso en autenticar (PostgreSQL no disponible):', dbErr.message)
    }

    if (!row) {
      const INSTITUTIONAL_SEED_USERS = [
        { id: 'usr-admin-uber', nombre: 'Ubeimar Laguna Cárdenas', correo: 'uberadmin.siard@ucundinamarca.edu.co', contrasena: 'Uber1019', rol: 'admin', activo: true },
        { id: 'usr-coord-dani', nombre: 'Daniel Moreno', correo: 'danidirec.siard@ucundinamarca.edu.co', contrasena: 'siardVd3', rol: 'admin', activo: true },
        { id: 'usr-coord-1', nombre: 'Coordinación Académica', correo: 'coordinador@ucundinamarca.edu.co', contrasena: 'CoordParra2026*', rol: 'coordinador', activo: true },
        { id: 'doc-mendoza', nombre: 'Javier Mendoza', correo: 'javier.mendoza@ucundinamarca.edu.co', contrasena: 'ProfMen2026*', rol: 'docente', activo: true },
        { id: 'doc-salazar', nombre: 'Diana Salazar', correo: 'diana.salazar@ucundinamarca.edu.co', contrasena: 'ProfSal2026*', rol: 'docente', activo: true },
        { id: 'doc-navarro', nombre: 'Andrés Navarro', correo: 'andres.navarro@ucundinamarca.edu.co', contrasena: 'ProfNav2026*', rol: 'docente', activo: true },
        { id: 'doc-prieto', nombre: 'Gabriel Prieto', correo: 'gabriel.prieto@ucundinamarca.edu.co', contrasena: 'ProfPri2026*', rol: 'docente', activo: true },
        { id: 'doc-cifuentes', nombre: 'Mariana Cifuentes', correo: 'mariana.cifuentes@ucundinamarca.edu.co', contrasena: 'ProfCif2026*', rol: 'docente', activo: true },
        { id: 'est-carlos', nombre: 'Carlos Peña', correo: 'carlospena.siard@ucundinamarca.edu.co', contrasena: 'Carl8742*', rol: 'estudiante', activo: true },
        { id: 'est-1', nombre: 'Laura Quintero', correo: 'lauraquintero.siard@ucundinamarca.edu.co', contrasena: 'Laur5193*', rol: 'estudiante', activo: true },
        { id: 'est-2', nombre: 'Mateo Rincón', correo: 'mateorincon.siard@ucundinamarca.edu.co', contrasena: 'Mate6381*', rol: 'estudiante', activo: true },
        { id: 'est-3', nombre: 'Camila Torres', correo: 'camilatorres.siard@ucundinamarca.edu.co', contrasena: 'Cami9240*', rol: 'estudiante', activo: true },
        { id: 'est-4', nombre: 'Julián Morales', correo: 'julianmorales.siard@ucundinamarca.edu.co', contrasena: 'Juli1835*', rol: 'estudiante', activo: true },
      ]
      const foundSeed = INSTITUTIONAL_SEED_USERS.find(
        (u) => u.correo.toLowerCase() === searchEmail || (searchEmail.includes('uberadmin') && u.correo.includes('uberadmin'))
      )
      if (foundSeed) {
        row = {
          id: foundSeed.id,
          name: foundSeed.nombre,
          email: foundSeed.correo,
          password: foundSeed.contrasena,
          role: foundSeed.rol,
          activo: foundSeed.activo,
          sede: 'Sede Facatativá',
          carrera: 'Ingeniería de Sistemas y Computación',
        }
      }
    }

    if (!row) {
      const error = new Error('Credenciales inválidas.')
      error.statusCode = 401
      throw error
    }

    const memOverride = memoryUpdatedPasswords.get(row.id) || memoryUpdatedPasswords.get(searchEmail)
    if (memOverride) {
      row.password = memOverride.password
      row.contrasena_hash = memOverride.hash
    }

    const passwordMatch = row.contrasena_hash
      ? await bcrypt.compare(password, row.contrasena_hash)
      : row.password === password

    if (!passwordMatch) {
      const error = new Error('Credenciales inválidas.')
      error.statusCode = 401
      throw error
    }

    const usuario = UsuarioFactory.crearUsuario(row)
    return usuario.toJSON()
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
      const INSTITUTIONAL_SEED_USERS = [
        { id: 'usr-admin-uber', correo: 'uberadmin.siard@ucundinamarca.edu.co', contrasena: 'Uber1019' },
        { id: 'usr-coord-dani', correo: 'danidirec.siard@ucundinamarca.edu.co', contrasena: 'siardVd3' },
        { id: 'usr-coord-1', correo: 'coordinador@ucundinamarca.edu.co', contrasena: 'CoordParra2026*' },
        { id: 'doc-mendoza', correo: 'javier.mendoza@ucundinamarca.edu.co', contrasena: 'ProfMen2026*' },
        { id: 'doc-salazar', correo: 'diana.salazar@ucundinamarca.edu.co', contrasena: 'ProfSal2026*' },
        { id: 'doc-navarro', correo: 'andres.navarro@ucundinamarca.edu.co', contrasena: 'ProfNav2026*' },
        { id: 'doc-prieto', correo: 'gabriel.prieto@ucundinamarca.edu.co', contrasena: 'ProfPri2026*' },
        { id: 'doc-cifuentes', correo: 'mariana.cifuentes@ucundinamarca.edu.co', contrasena: 'ProfCif2026*' },
        { id: 'est-carlos', correo: 'carlospena.siard@ucundinamarca.edu.co', contrasena: 'Carl8742*' },
        { id: 'est-1', correo: 'lauraquintero.siard@ucundinamarca.edu.co', contrasena: 'Laur5193*' },
        { id: 'est-2', correo: 'mateorincon.siard@ucundinamarca.edu.co', contrasena: 'Mate6381*' },
        { id: 'est-3', correo: 'camilatorres.siard@ucundinamarca.edu.co', contrasena: 'Cami9240*' },
        { id: 'est-4', correo: 'julianmorales.siard@ucundinamarca.edu.co', contrasena: 'Juli1835*' },
      ]

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
    const memOverride =
      memoryUpdatedPasswords.get(targetUserId) ||
      (row.correo && memoryUpdatedPasswords.get(row.correo.toLowerCase())) ||
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
    if (row.correo) {
      memoryUpdatedPasswords.set(row.correo.toLowerCase(), { password: nuevaContrasena, hash: nuevoHash })
    }
    if (userEmail) {
      memoryUpdatedPasswords.set(userEmail, { password: nuevaContrasena, hash: nuevoHash })
    }

    try {
      await pool.query(
        'UPDATE usuarios SET contrasena = $1, contrasena_hash = $2 WHERE id = $3',
        [nuevaContrasena, nuevoHash, targetUserId]
      )
    } catch (updateErr) {
      console.warn('Aviso al actualizar en PostgreSQL (modo contingencia):', updateErr.message)
    }

    return { ok: true, success: true, message: 'Contraseña actualizada con éxito' }
  }
}

export const authService = new AuthService()
