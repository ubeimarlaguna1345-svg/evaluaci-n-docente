import { Usuario } from './Usuario.js'

/**
 * Subclase Directivo (POO - Herencia y Polimorfismo)
 */
export class Directivo extends Usuario {
  constructor(datos = {}) {
    super({ ...datos, rol: 'directivo' })
  }

  obtenerPermisos() {
    return ['dashboard_directivo', 'reportes_facultad', 'indicadores_medit']
  }
}
