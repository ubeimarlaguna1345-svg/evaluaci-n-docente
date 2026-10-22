/**
 * Clase Base Usuario (POO - Abstracción y Encapsulamiento)
 * Representa a un usuario institucional en la plataforma SIARD-UdeC.
 */
export class Usuario {
  #id
  #nombre
  #correo
  #rol
  #activo
  #carrera
  #password

  constructor({
    id = '',
    nombre = '',
    name = '',
    correo = '',
    email = '',
    rol = 'usuario',
    role = 'usuario',
    activo = true,
    active = true,
    carrera = '',
    password = '',
    contrasena = '',
  } = {}) {
    this.#id = id || ''
    this.#nombre = (nombre || name || '').trim()
    this.#correo = (correo || email || '').trim().toLowerCase()
    this.#rol = rol || role || 'usuario'
    this.#activo = activo ?? active ?? true
    this.#carrera = carrera || ''
    this.#password = password || contrasena || ''
  }

  getId() {
    return this.#id
  }

  getNombre() {
    return this.#nombre
  }

  getCorreo() {
    return this.#correo
  }

  getRol() {
    return this.#rol
  }

  isActivo() {
    return this.#activo
  }

  getCarrera() {
    return this.#carrera
  }

  /**
   * Método polimórfico base de permisos del sistema.
   * Las subclases sobreescriben este método según su rol.
   * @returns {string[]}
   */
  obtenerPermisos() {
    return ['perfil']
  }

  /**
   * Serialización limpia para la API, sin exponer datos sensibles.
   */
  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      name: this.#nombre,
      correo: this.#correo,
      email: this.#correo,
      rol: this.#rol,
      role: this.#rol,
      activo: this.#activo,
      active: this.#activo,
      carrera: this.#carrera,
      permisos: this.obtenerPermisos(),
      ...(this.#password ? { password: this.#password } : {}),
    }
  }
}
