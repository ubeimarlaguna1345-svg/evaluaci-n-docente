import { describe, it, expect, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import {
  Usuario,
  Estudiante,
  Docente,
  Coordinador,
  Admin,
  UsuarioFactory,
  Evaluacion,
} from './index.js'
import { cambiarContrasena } from '../controllers/usuarioController.js'
import { pool } from '../config/db.js'

describe('Capa de Dominio Orientada a Objetos (POO) - Backend SIARD-UdeC', () => {
  describe('Clase Base Usuario (Abstracción y Encapsulamiento)', () => {
    it('debe encapsular atributos con campos privados y exponer getters públicos', () => {
      const u = new Usuario({
        id: 'usr-1',
        nombre: 'Carlos Pérez',
        correo: 'carlos@udec.edu.co',
        rol: 'usuario',
      })

      expect(u.getId()).toBe('usr-1')
      expect(u.getNombre()).toBe('Carlos Pérez')
      expect(u.getCorreo()).toBe('carlos@udec.edu.co')
      expect(u.getRol()).toBe('usuario')
      expect(u.isActivo()).toBe(true)
      expect(u.id).toBeUndefined()
    })

    it('debe tener método polimórfico base obtenerPermisos() retornando perfil', () => {
      const u = new Usuario({ id: '1', nombre: 'Test', correo: 'test@udec.edu.co' })
      expect(u.obtenerPermisos()).toEqual(['perfil'])
    })

    it('debe serializar en toJSON() sin exponer campos sensibles', () => {
      const u = new Usuario({
        id: '1',
        nombre: 'Ana',
        correo: 'ana@udec.edu.co',
        rol: 'docente',
      })
      const json = u.toJSON()
      expect(json.id).toBe('1')
      expect(json.nombre).toBe('Ana')
      expect(json.permisos).toEqual(['perfil'])
    })
  })

  describe('Herencia y Polimorfismo en Subclases de Usuario', () => {
    it('Estudiante: debe heredar de Usuario, almacenar sede y sobreescribir obtenerPermisos()', () => {
      const est = new Estudiante({
        id: 'est-1',
        nombre: 'Laura Gómez',
        correo: 'laura@udec.edu.co',
        sede: 'Sede Facatativá',
      })

      expect(est).toBeInstanceOf(Usuario)
      expect(est).toBeInstanceOf(Estudiante)
      expect(est.getId()).toBe('est-1')
      expect(est.getNombre()).toBe('Laura Gómez')
      expect(est.getSede()).toBe('Sede Facatativá')
      expect(est.obtenerPermisos()).toEqual(['evaluar_docente', 'ver_mis_respuestas'])
      expect(est.toJSON().sede).toBe('Sede Facatativá')
    })

    it('Docente: debe heredar de Usuario, almacenar facultad/categoría y sobreescribir obtenerPermisos()', () => {
      const doc = new Docente({
        id: 'doc-1',
        nombre: 'Prof. Martínez',
        correo: 'martinez@udec.edu.co',
        facultad: 'Ingeniería',
        categoria: 'Titular',
      })

      expect(doc).toBeInstanceOf(Usuario)
      expect(doc).toBeInstanceOf(Docente)
      expect(doc.getFacultad()).toBe('Ingeniería')
      expect(doc.getCategoria()).toBe('Titular')
      expect(doc.obtenerPermisos()).toEqual(['autoevaluacion', 'ver_resultados_propios'])
      expect(doc.obtenerPermisos()).not.toContain('crear_formulario')
      expect(doc.obtenerPermisos()).not.toContain('gestionar_preguntas')
      expect(doc.toJSON().facultad).toBe('Ingeniería')
    })

    it('Coordinador: debe heredar de Usuario y sobreescribir obtenerPermisos() para gestión MEDIT', () => {
      const coord = new Coordinador({
        id: 'coord-1',
        nombre: 'Ing. Valenzuela',
        correo: 'valenzuela@udec.edu.co',
      })

      expect(coord).toBeInstanceOf(Usuario)
      expect(coord).toBeInstanceOf(Coordinador)
      expect(coord.obtenerPermisos()).toEqual(['reportes_medit', 'planes_mejora', 'gestion_docentes'])
    })

    it('Admin: debe tener permisos de administración total', () => {
      const admin = new Admin({ id: 'adm-1', nombre: 'Admin', correo: 'admin@udec.edu.co' })
      expect(admin.obtenerPermisos()).toContain('administracion_total')
    })
  })

  describe('Patrón Factory Method (UsuarioFactory)', () => {
    it('debe instanciar Estudiante cuando rol = "estudiante"', () => {
      const user = UsuarioFactory.crearUsuario({ rol: 'estudiante', nombre: 'Estudiante 1' })
      expect(user).toBeInstanceOf(Estudiante)
      expect(user.obtenerPermisos()).toEqual(['evaluar_docente', 'ver_mis_respuestas'])
    })

    it('debe instanciar Docente cuando role = "docente"', () => {
      const user = UsuarioFactory.crearUsuario({ role: 'docente', nombre: 'Docente 1' })
      expect(user).toBeInstanceOf(Docente)
      expect(user.obtenerPermisos()).toEqual(['autoevaluacion', 'ver_resultados_propios'])
    })

    it('debe instanciar Coordinador cuando rol = "coordinador"', () => {
      const user = UsuarioFactory.crearUsuario({ rol: 'coordinador', nombre: 'Coord 1' })
      expect(user).toBeInstanceOf(Coordinador)
      expect(user.obtenerPermisos()).toEqual(['reportes_medit', 'planes_mejora', 'gestion_docentes'])
    })

    it('debe instanciar Usuario base si el rol es desconocido', () => {
      const user = UsuarioFactory.crearUsuario({ rol: 'invitado', nombre: 'Invitado' })
      expect(user).toBeInstanceOf(Usuario)
      expect(user.obtenerPermisos()).toEqual(['perfil'])
    })
  })

  describe('Clase Evaluacion (Encapsulamiento y Reglas de Negocio MEDIT)', () => {
    it('debe encapsular atributos con campos privados y calcular promedio numérico', () => {
      const ev = new Evaluacion({
        id: 'ev-1',
        estudianteId: 'est-1',
        docenteId: 'doc-1',
        respuestas: { q1: '5', q2: '4', q3: '5' },
        observacion: 'Excelente profesor',
      })

      expect(ev.getId()).toBe('ev-1')
      expect(ev.getEstudianteId()).toBe('est-1')
      expect(ev.getDocenteId()).toBe('doc-1')
      expect(ev.getObservacion()).toBe('Excelente profesor')
      expect(ev.calcularPromedio()).toBe(4.67)
    })

    it('debe clasificar desempeño Sobresaliente (promedio >= 4.6)', () => {
      const ev = new Evaluacion({
        respuestas: { q1: '5', q2: '5', q3: '4.8' },
      })
      expect(ev.calcularPromedio()).toBeGreaterThanOrEqual(4.6)
      expect(ev.obtenerDesempeno()).toBe('Sobresaliente')
      expect(ev.requierePlanMejora()).toBe(false)
    })

    it('debe clasificar desempeño Destacado (promedio >= 4.0 y < 4.6)', () => {
      const ev = new Evaluacion({
        respuestas: { q1: '4', q2: '4.2' },
      })
      expect(ev.calcularPromedio()).toBe(4.1)
      expect(ev.obtenerDesempeno()).toBe('Destacado')
      expect(ev.requierePlanMejora()).toBe(false)
    })

    it('debe clasificar desempeño Aceptable (promedio >= 3.5 y < 4.0)', () => {
      const ev = new Evaluacion({
        respuestas: { q1: '3.6', q2: '3.8' },
      })
      expect(ev.calcularPromedio()).toBe(3.7)
      expect(ev.obtenerDesempeno()).toBe('Aceptable')
    })

    it('regla MEDIT: requierePlanMejora() debe retornar true si promedio <= 3.9', () => {
      const evMejora = new Evaluacion({
        respuestas: { q1: '3.5', q2: '3.9' },
      })
      expect(evMejora.calcularPromedio()).toBe(3.7)
      expect(evMejora.requierePlanMejora()).toBe(true)

      const evExcelente = new Evaluacion({
        respuestas: { q1: '4.5', q2: '4.5' },
      })
      expect(evExcelente.calcularPromedio()).toBe(4.5)
      expect(evExcelente.requierePlanMejora()).toBe(false)
    })

    it('debe clasificar desempeño En Seguimiento cuando promedio < 3.5', () => {
      const evBajo = new Evaluacion({
        respuestas: { q1: '2', q2: '3' },
      })
      expect(evBajo.calcularPromedio()).toBe(2.5)
      expect(evBajo.obtenerDesempeno()).toBe('En Seguimiento')
      expect(evBajo.requierePlanMejora()).toBe(true)
    })

    it('debe manejar respuestas vacías o no numéricas retornando promedio 0', () => {
      const evVacia = new Evaluacion({ respuestas: {} })
      expect(evVacia.calcularPromedio()).toBe(0)
      expect(evVacia.requierePlanMejora()).toBe(false)
    })
  })

  describe('Controlador Backend: cambiarContrasena', () => {
    function createMockRes() {
      return {
        statusCode: 200,
        headers: {},
        body: null,
        status(code) {
          this.statusCode = code
          return this
        },
        json(data) {
          this.body = data
          return this
        },
        setHeader(k, v) {
          this.headers[k] = v
        },
        end(str) {
          if (str) this.body = JSON.parse(str)
        },
      }
    }

    it('debe rechazar con 400 si faltan campos obligatorios', async () => {
      const req = { body: { usuarioId: '', contrasenaActual: '', nuevaContrasena: '' } }
      const res = createMockRes()

      await cambiarContrasena(req, res)

      expect(res.statusCode).toBe(400)
      expect(res.body.ok).toBe(false)
      expect(res.body.message).toBe('Todos los campos son obligatorios.')
    })

    it('debe rechazar con 400 si la nueva contraseña tiene menos de 6 caracteres', async () => {
      const req = { body: { usuarioId: 'usr-1', contrasenaActual: 'actual123', nuevaContrasena: '123' } }
      const res = createMockRes()

      await cambiarContrasena(req, res)

      expect(res.statusCode).toBe(400)
      expect(res.body.ok).toBe(false)
      expect(res.body.message).toBe('La nueva contraseña debe tener al menos 6 caracteres.')
    })

    it('debe rechazar con 404 si el usuario no existe', async () => {
      const req = { body: { usuarioId: 'usr-inexistente', contrasenaActual: 'actual123', nuevaContrasena: 'nueva123' } }
      const res = createMockRes()

      vi.spyOn(pool, 'query').mockResolvedValueOnce({ rows: [] })

      await cambiarContrasena(req, res)

      expect(res.statusCode).toBe(404)
      expect(res.body.ok).toBe(false)
      expect(res.body.message).toBe('Usuario no encontrado.')
    })

    it('debe rechazar con 400 si la contraseña actual no coincide', async () => {
      const hash = await bcrypt.hash('claveCorrecta', 10)
      const req = { body: { usuarioId: 'usr-1', contrasenaActual: 'claveEquivocada', nuevaContrasena: 'nuevaClave123' } }
      const res = createMockRes()

      vi.spyOn(pool, 'query').mockResolvedValueOnce({
        rows: [{ id: 'usr-1', contrasena: 'claveCorrecta', contrasena_hash: hash }],
      })

      await cambiarContrasena(req, res)

      expect(res.statusCode).toBe(400)
      expect(res.body.ok).toBe(false)
      expect(res.body.message).toBe('La contraseña actual es incorrecta')
    })

    it('debe actualizar la contraseña y retornar 200 cuando las credenciales son válidas', async () => {
      const hash = await bcrypt.hash('claveActual123', 10)
      const req = { body: { usuarioId: 'usr-1', contrasenaActual: 'claveActual123', nuevaContrasena: 'miNuevaClaveSegura' } }
      const res = createMockRes()

      const querySpy = vi.spyOn(pool, 'query')
        .mockResolvedValueOnce({
          rows: [{ id: 'usr-1', contrasena: 'claveActual123', contrasena_hash: hash }],
        })
        .mockResolvedValueOnce({ rowCount: 1 })

      await cambiarContrasena(req, res)

      expect(res.statusCode).toBe(200)
      expect(res.body.ok).toBe(true)
      expect(res.body.message).toBe('Contraseña actualizada con éxito')

      // Verificar que se invocó UPDATE en PostgreSQL con nuevaContrasena y hash
      expect(querySpy).toHaveBeenCalledTimes(2)
      const updateCall = querySpy.mock.calls[1]
      expect(updateCall[0]).toContain('UPDATE usuarios SET contrasena = $1, contrasena_hash = $2 WHERE id = $3')
      expect(updateCall[1][0]).toBe('miNuevaClaveSegura')
      expect(await bcrypt.compare('miNuevaClaveSegura', updateCall[1][1])).toBe(true)
      expect(updateCall[1][2]).toBe('usr-1')
    })
  })
})

