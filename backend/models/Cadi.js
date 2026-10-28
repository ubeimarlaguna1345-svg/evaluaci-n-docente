export class Cadi {
  #id
  #codigo
  #nombre
  #semestre
  #tipo
  #esArticulador
  #docenteId

  constructor({
    id = '',
    codigo = '',
    nombre = '',
    semestre = 1,
    tipo = 'CADI',
    esArticulador = false,
    es_articulador = false,
    docenteId = null,
    docente_id = null,
  } = {}) {
    this.#id = id || ''
    this.#codigo = (codigo || '').trim().toUpperCase()
    this.#nombre = (nombre || '').trim()
    this.#semestre = Number(semestre) || 1
    this.#tipo = tipo === 'CAI' ? 'CAI' : 'CADI'
    this.#esArticulador = Boolean(esArticulador ?? es_articulador ?? false)
    this.#docenteId = docenteId || docente_id || null
  }

  getId() {
    return this.#id
  }

  getCodigo() {
    return this.#codigo
  }

  getNombre() {
    return this.#nombre
  }

  getSemestre() {
    return this.#semestre
  }

  getTipo() {
    return this.#tipo
  }

  isArticulador() {
    return this.#esArticulador
  }

  getDocenteId() {
    return this.#docenteId
  }

  esValido() {
    return Boolean(this.#codigo && this.#nombre && this.#semestre >= 1)
  }

  esCadi() {
    return this.#tipo === 'CADI'
  }

  esCai() {
    return this.#tipo === 'CAI'
  }

  toJSON() {
    return {
      id: this.#id,
      codigo: this.#codigo,
      nombre: this.#nombre,
      semestre: this.#semestre,
      tipo: this.#tipo,
      esArticulador: this.#esArticulador,
      docenteId: this.#docenteId,
    }
  }
}
