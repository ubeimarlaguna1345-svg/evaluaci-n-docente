import { Usuario } from './Usuario.js'
import { Estudiante } from './Estudiante.js'
import { Docente } from './Docente.js'
import { Coordinador } from './Coordinador.js'
import { Admin } from './Admin.js'

export class UsuarioFactory {
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
