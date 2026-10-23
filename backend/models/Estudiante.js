import { Usuario } from './Usuario.js'

export class Estudiante extends Usuario {
  #sede

  constructor(datos = {}) {
    super({ ...datos, rol: 'estudiante' })
    this.#sede = datos.sede?.trim() || 'Sede Facatativá'
  }

  getSede() {
    return this.#sede
  }

  obtenerPermisos() {
    return ['evaluar_docente', 'ver_mis_respuestas']
  }

  toJSON() {
    return {
      ...super.toJSON(),
      sede: this.#sede,
    }
  }
}
