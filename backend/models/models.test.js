import { describe, it, expect } from 'vitest'
import {
  Usuario,
  Estudiante,
  Docente,
  Coordinador,
  Admin,
  Directivo,
  UsuarioFactory,
  Evaluacion,
} from './index.js'

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

      // Verificar que los atributos privados no son accesibles directamente
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

    it('Admin y Directivo: deben tener sus respectivos permisos institucionales', () => {
      const admin = new Admin({ id: 'adm-1', nombre: 'Admin', correo: 'admin@udec.edu.co' })
      expect(admin.obtenerPermisos()).toContain('administracion_total')

      const dir = new Directivo({ id: 'dir-1', nombre: 'Decano', correo: 'decano@udec.edu.co' })
      expect(dir.obtenerPermisos()).toContain('dashboard_directivo')
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
      // (5 + 4 + 5) / 3 = 4.67
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
})
