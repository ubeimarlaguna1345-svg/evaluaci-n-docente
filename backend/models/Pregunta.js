export class Pregunta {
  #id
  #formularioId
  #enunciado
  #tipo
  #dimension
  #bloque
  #obligatoria
  #orden
  #opciones

  constructor({
    id = '',
    formularioId = '',
    enunciado = '',
    text = '',
    tipo = 'escala',
    type = 'escala',
    dimension = 'General',
    bloque = 'docente',
    obligatoria = true,
    required = true,
    orden = 0,
    opciones = [],
    options = [],
  } = {}) {
    this.#id = id || ''
    this.#formularioId = formularioId || ''
    this.#enunciado = (enunciado || text || '').trim()
    this.#tipo = tipo || type || 'escala'
    this.#dimension = dimension || 'General'
    this.#bloque = bloque || 'docente'
    this.#obligatoria = obligatoria ?? required ?? true
    this.#orden = Number(orden) || 0
    this.#opciones = Array.isArray(opciones) && opciones.length > 0 ? opciones : (Array.isArray(options) ? options : [])
  }

  getId() {
    return this.#id
  }

  getFormularioId() {
    return this.#formularioId
  }

  getEnunciado() {
    return this.#enunciado
  }

  getTipo() {
    return this.#tipo
  }

  getDimension() {
    return this.#dimension
  }

  getBloque() {
    return this.#bloque
  }

  isObligatoria() {
    return this.#obligatoria
  }

  getOrden() {
    return this.#orden
  }

  getOpciones() {
    return this.#opciones
  }

  esValido() {
    return Boolean(this.#enunciado.trim() && ['escala', 'seleccion', 'texto'].includes(this.#tipo))
  }

  esEscala() {
    return this.#tipo === 'escala'
  }

  esSeleccion() {
    return this.#tipo === 'seleccion'
  }

  toJSON() {
    return {
      id: this.#id,
      formularioId: this.#formularioId,
      enunciado: this.#enunciado,
      text: this.#enunciado,
      tipo: this.#tipo,
      type: this.#tipo,
      dimension: this.#dimension,
      bloque: this.#bloque,
      obligatoria: this.#obligatoria,
      required: this.#obligatoria,
      orden: this.#orden,
      options: this.#opciones,
    }
  }
}
