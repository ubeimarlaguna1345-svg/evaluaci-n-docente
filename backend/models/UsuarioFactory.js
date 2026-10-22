import { Usuario } from './Usuario.js'
import { Estudiante } from './Estudiante.js'
import { Docente } from './Docente.js'
import { Coordinador } from './Coordinador.js'
import { Admin } from './Admin.js'

/**
 * Patrón Factory Method (Creacional)
 * Centraliza la creación e instanciación de objetos de tipo Usuario según su rol institucional.
 */
export class UsuarioFactory {
  /**
   * Crea y retorna una instancia concreta según el rol del usuario.
   * @param {Object} datos
   * @returns {Usuario} Instancia de Estudiante, Docente, Coordinador, Admin o Usuario base.
   */
  static crearUsuario(datos = {}) {
    const rol = (datos.rol || datos.role || '').toLowerCase().trim()

    switch (rol) {
      case 'estudiante':
        return new Estudiante(datos)
      case 'docente':
        return new Docente(datos)
      case 'coordinador':
        return new Coordinador(datos)
      case 'admin':
        return new Admin(datos)
      default:
        return new Usuario(datos)
    }
  }
}
