/**
 * Clase de Dominio Evaluacion (POO - Encapsulamiento y Reglas de Negocio)
 * Modela la evaluación institucional aplicando las normas y fórmulas del MEDIT.
 */
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

  /**
   * Calcula el promedio aritmético de las respuestas numéricas válidas (escala 1 a 5).
   * @returns {number} Promedio con 2 decimales, o 0 si no hay respuestas cuantitativas.
   */
  calcularPromedio() {
    const valores = Object.values(this.#respuestas)
      .map((val) => Number(val))
      .filter((num) => !isNaN(num) && num > 0)

    if (valores.length === 0) return 0
    const suma = valores.reduce((acc, curr) => acc + curr, 0)
    return Number((suma / valores.length).toFixed(2))
  }

  /**
   * Determina el nivel de desempeño institucional:
   * - 'Sobresaliente' (promedio >= 4.6)
   * - 'Destacado'     (promedio >= 4.0)
   * - 'Aceptable'     (promedio >= 3.5)
   * - 'En Seguimiento' (promedio < 3.5)
   * @returns {'Sobresaliente' | 'Destacado' | 'Aceptable' | 'En Seguimiento'}
   */
  obtenerDesempeno() {
    const promedio = this.calcularPromedio()
    if (promedio >= 4.6) return 'Sobresaliente'
    if (promedio >= 4.0) return 'Destacado'
    if (promedio >= 3.5) return 'Aceptable'
    return 'En Seguimiento'
  }

  /**
   * Regla MEDIT: Determina si se requiere formular un Plan de Mejora Pedagógica.
   * Aplica cuando el promedio obtenido es menor o igual a 3.90.
   * @returns {boolean}
   */
  requierePlanMejora() {
    const promedio = this.calcularPromedio()
    return promedio > 0 && promedio <= 3.9
  }

  /**
   * Serializa la evaluación con sus métricas calculadas.
   */
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
