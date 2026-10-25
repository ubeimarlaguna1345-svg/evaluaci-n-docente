import { Usuario } from './Usuario.js'

export class Admin extends Usuario {
  constructor(datos = {}) {
    super({ ...datos, rol: 'admin' })
  }

  obtenerPermisos() {
    return ['administracion_total', 'gestion_usuarios', 'configuracion_sistema']
  }
}
