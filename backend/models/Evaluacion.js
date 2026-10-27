export class Evaluacion {
  #id
  #estudianteId
  #docenteId
  #formularioId
  #respuestas
  #observacion
  #fecha

  constructor({
    id = '',
    estudianteId = '',
    userId = '',
    usuarioId = '',
    docenteId = '',
    teacherId = '',
    formularioId = '',
    formId = '',
    respuestas = {},
    answers = {},
    observacion = '',
    observation = '',
    fecha = '',
    date = '',
  } = {}) {
    this.#id = id || ''
    this.#estudianteId = estudianteId || userId || usuarioId || ''
    this.#docenteId = docenteId || teacherId || ''
    this.#formularioId = formularioId || formId || ''
    this.#respuestas = respuestas && Object.keys(respuestas).length > 0 ? respuestas : (answers || {})
    this.#observacion = (observacion || observation || '').toString().slice(0, 500)
    this.#fecha = fecha || date || new Date().toISOString()
  }

  getId() {
    return this.#id
  }

  getEstudianteId() {
    return this.#estudianteId
  }

  getDocenteId() {
    return this.#docenteId
  }

  getFormularioId() {
    return this.#formularioId
  }

  getRespuestas() {
    return { ...this.#respuestas }
  }

  getObservacion() {
    return this.#observacion
  }

  getFecha() {
    return this.#fecha
  }

  calcularPromedio() {
    let suma = 0
    let total = 0
    for (const val of Object.values(this.#respuestas)) {
      const num = Number(val)
      if (!isNaN(num) && num > 0) {
        suma += num
        total++
      }
    }
    return total === 0 ? 0 : Number((suma / total).toFixed(2))
  }

  obtenerDesempeno() {
    const promedio = this.calcularPromedio()
    if (promedio >= 4.6) return 'Sobresaliente'
    if (promedio >= 4.0) return 'Destacado'
    if (promedio >= 3.5) return 'Aceptable'
    return 'En Seguimiento'
  }

  requierePlanMejora() {
    const promedio = this.calcularPromedio()
    return promedio > 0 && promedio <= 3.9
  }

  toJSON() {
    const promedio = this.calcularPromedio()
    return {
      id: this.#id,
      estudianteId: this.#estudianteId,
      userId: this.#estudianteId,
      docenteId: this.#docenteId,
      teacherId: this.#docenteId,
      formularioId: this.#formularioId,
      formId: this.#formularioId,
      respuestas: this.getRespuestas(),
      answers: this.getRespuestas(),
      observacion: this.#observacion,
      observation: this.#observacion,
      fecha: this.#fecha,
      date: this.#fecha,
      promedio,
      desempeno: this.obtenerDesempeno(),
      requierePlanMejora: this.requierePlanMejora(),
    }
  }
}
