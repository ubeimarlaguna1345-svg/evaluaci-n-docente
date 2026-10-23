import { Usuario } from './Usuario.js'

export class Coordinador extends Usuario {
  #sede

  constructor(datos = {}) {
    super({ ...datos, rol: 'coordinador' })
    this.#sede = datos.sede?.trim() || 'Sede Facatativá'
  }

  getSede() {
    return this.#sede
  }

  obtenerPermisos() {
    return ['reportes_medit', 'planes_mejora', 'gestion_docentes']
  }

  toJSON() {
    return {
      ...super.toJSON(),
      sede: this.#sede,
    }
  }
}
