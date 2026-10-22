import { Usuario } from './Usuario.js'

/**
 * Subclase Coordinador (POO - Herencia y Polimorfismo)
 */
export class Coordinador extends Usuario {
  #sede

  constructor(datos = {}) {
    super({ ...datos, rol: 'coordinador' })
    this.#sede = datos.sede?.trim() || 'Sede Facatativá'
  }

  getSede() {
    return this.#sede
  }

  /**
   * Sobreescritura polimórfica de permisos para coordinadores
   * @returns {string[]}
   */
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
