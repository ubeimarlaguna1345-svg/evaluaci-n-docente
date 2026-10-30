export interface MockCADI {
  id: string
  codigo: string
  nombre: string
  semestre: number | string
  docenteAsignado: string
  tipo: string
  docenteId: string
  esArticulador?: boolean
}

export interface MockUser {
  id: string
  name: string
  nombre?: string
  email: string
  password: string
  role: 'admin' | 'coordinador' | 'docente' | 'estudiante'
  rol?: string
  active: boolean
  estado?: string
  sede?: string
  carrera?: string
}

/**
 * 1. Evaluaciones por defecto: 0 evaluaciones (array vacío [])
 */
export const INITIAL_EVALUACIONES: any[] = []
export const initialEvaluaciones: any[] = INITIAL_EVALUACIONES

/**
 * 2. CADIs Oficiales Asignados (Exactamente 5 materias vinculadas a sus docentes oficiales)
 */
export const INITIAL_CADIS: MockCADI[] = [
  {
    id: 'cadi-1',
    codigo: 'MAT101',
    nombre: 'Cálculo Diferencial',
    semestre: '1° Semestre',
    docenteAsignado: 'Diana Salazar',
    tipo: 'CADI',
    docenteId: 'doc-salazar',
    esArticulador: false,
  },
  {
    id: 'cadi-2',
    codigo: 'CAI101',
    nombre: 'Lectura Crítica y Competencias Comunicativas',
    semestre: '1° Semestre',
    docenteAsignado: 'Gabriel Prieto',
    tipo: 'CAI',
    docenteId: 'doc-prieto',
    esArticulador: false,
  },
  {
    id: 'cadi-3',
    codigo: 'CAI201',
    nombre: 'Ética y Ciudadanía',
    semestre: '2° Semestre',
    docenteAsignado: 'Mariana Cifuentes',
    tipo: 'CAI',
    docenteId: 'doc-cifuentes',
    esArticulador: false,
  },
  {
    id: 'cadi-4',
    codigo: 'SIS301',
    nombre: 'Programación II',
    semestre: '3° Semestre',
    docenteAsignado: 'Andrés Navarro',
    tipo: 'CADI',
    docenteId: 'doc-navarro',
    esArticulador: true,
  },
  {
    id: 'cadi-5',
    codigo: 'ELC301',
    nombre: 'Electrónica Básica',
    semestre: '3° Semestre',
    docenteAsignado: 'Javier Mendoza',
    tipo: 'CADI',
    docenteId: 'doc-mendoza',
    esArticulador: false,
  },
]

/**
 * 3. Usuarios Oficiales Canónicos:
 * 1 Admin, 1 Coordinador (Jaime Parra), 5 Docentes, 5 Estudiantes
 */
export const INITIAL_USERS: MockUser[] = [
  {
    id: 'usr-admin-uber',
    name: 'Ubeimar Laguna Cárdenas',
    nombre: 'Ubeimar Laguna Cárdenas',
    email: 'uberadmin.siard@ucundinamarca.edu.co',
    password: 'Uber1019',
    role: 'admin',
    rol: 'admin',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'user-coord-1',
    name: 'Jaime Parra',
    nombre: 'Jaime Parra',
    email: 'jaime.parra.siard@ucundinamarca.edu.co',
    password: 'CoordParra2026*',
    role: 'coordinador',
    rol: 'coordinador',
    active: true,
    estado: 'Activa',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-salazar',
    name: 'Diana Salazar',
    nombre: 'Diana Salazar',
    email: 'prof.salazar.siard@ucundinamarca.edu.co',
    password: 'ProfSal2026*',
    role: 'docente',
    rol: 'docente',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-prieto',
    name: 'Gabriel Prieto',
    nombre: 'Gabriel Prieto',
    email: 'prof.prieto.siard@ucundinamarca.edu.co',
    password: 'ProfPri2026*',
    role: 'docente',
    rol: 'docente',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-cifuentes',
    name: 'Mariana Cifuentes',
    nombre: 'Mariana Cifuentes',
    email: 'prof.cifuentes.siard@ucundinamarca.edu.co',
    password: 'ProfCif2026*',
    role: 'docente',
    rol: 'docente',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-navarro',
    name: 'Andrés Navarro',
    nombre: 'Andrés Navarro',
    email: 'prof.navarro.siard@ucundinamarca.edu.co',
    password: 'ProfNav2026*',
    role: 'docente',
    rol: 'docente',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'doc-mendoza',
    name: 'Javier Mendoza',
    nombre: 'Javier Mendoza',
    email: 'prof.mendoza.siard@ucundinamarca.edu.co',
    password: 'ProfMen2026*',
    role: 'docente',
    rol: 'docente',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-carlos',
    name: 'Carlos Peña',
    nombre: 'Carlos Peña',
    email: 'carlospena.siard@ucundinamarca.edu.co',
    password: 'Carl8742*',
    role: 'estudiante',
    rol: 'estudiante',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-1',
    name: 'Laura Quintero',
    nombre: 'Laura Quintero',
    email: 'lauraquintero.siard@ucundinamarca.edu.co',
    password: 'Laur5193*',
    role: 'estudiante',
    rol: 'estudiante',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-2',
    name: 'Mateo Rincón',
    nombre: 'Mateo Rincón',
    email: 'mateorincon.siard@ucundinamarca.edu.co',
    password: 'Mate6381*',
    role: 'estudiante',
    rol: 'estudiante',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-3',
    name: 'Camila Torres',
    nombre: 'Camila Torres',
    email: 'camilatorres.siard@ucundinamarca.edu.co',
    password: 'Cami9240*',
    role: 'estudiante',
    rol: 'estudiante',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
  {
    id: 'est-4',
    name: 'Julián Morales',
    nombre: 'Julián Morales',
    email: 'julianmorales.siard@ucundinamarca.edu.co',
    password: 'Juli1835*',
    role: 'estudiante',
    rol: 'estudiante',
    active: true,
    estado: 'Activo',
    sede: 'Sede Facatativá',
    carrera: 'Ingeniería de Sistemas y Computación',
  },
]

