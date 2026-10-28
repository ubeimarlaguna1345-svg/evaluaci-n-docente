export class Respuesta {
  #id
  #formularioId
  #usuarioId
  #docenteId
  #observacion
  #fecha
  #detalles

  constructor({
    id = '',
    formularioId = '',
    formId = '',
    usuarioId = '',
    userId = '',
    docenteId = '',
    teacherId = '',
    observacion = '',
    observation = '',
    fecha = null,
    date = null,
    detalles = {},
    answers = {},
  } = {}) {
    this.#id = id || ''
    this.#formularioId = formularioId || formId || ''
    this.#usuarioId = usuarioId || userId || ''
    this.#docenteId = docenteId || teacherId || ''
    this.#observacion = (observacion || observation || '').trim()
    this.#fecha = fecha || date || new Date().toISOString()
    this.#detalles = detalles && Object.keys(detalles).length > 0 ? detalles : (answers || {})
  }

  getId() {
    return this.#id
  }

  getFormularioId() {
    return this.#formularioId
  }

  getUsuarioId() {
    return this.#usuarioId
  }

  getDocenteId() {
    return this.#docenteId
  }

  getObservacion() {
    return this.#observacion
  }

  getFecha() {
    return this.#fecha
  }

  getDetalles() {
    return this.#detalles
  }

  esValido() {
    return Boolean(this.#formularioId && this.#usuarioId && this.#docenteId && Object.keys(this.#detalles).length > 0)
  }

  toJSON() {
    return {
      id: this.#id,
      formularioId: this.#formularioId,
      formId: this.#formularioId,
      usuarioId: this.#usuarioId,
      userId: this.#usuarioId,
      docenteId: this.#docenteId,
      teacherId: this.#docenteId,
      observacion: this.#observacion,
      observation: this.#observacion,
      fecha: this.#fecha,
      date: this.#fecha,
      detalles: this.#detalles,
      answers: this.#detalles,
    }
  }
}
