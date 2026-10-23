import { Usuario } from './Usuario.js'

export class Docente extends Usuario {
  #facultad
  #categoria
  #sede

  constructor(datos = {}) {
    super({ ...datos, rol: 'docente' })
    this.#facultad = datos.facultad?.trim() || 'Facultad de Ingeniería'
    this.#categoria = datos.categoria?.trim() || 'Docente de Planta'
    this.#sede = datos.sede?.trim() || 'Sede Facatativá'
  }

  getFacultad() {
    return this.#facultad
  }

  getCategoria() {
    return this.#categoria
  }

  getSede() {
    return this.#sede
  }

  obtenerPermisos() {
    return ['autoevaluacion', 'ver_resultados_propios']
  }

  toJSON() {
    return {
      ...super.toJSON(),
      facultad: this.#facultad,
      categoria: this.#categoria,
      sede: this.#sede,
    }
  }
}
