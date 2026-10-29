export interface CadiItem {
  id: string
  codigo: string
  nombre: string
  semestre: string | number
  docenteAsignado: string
  tipo: string
  docenteId?: string
  esArticulador?: boolean
}

export const INITIAL_CADIS: CadiItem[] = [
  {
    id: 'cadi-1',
    codigo: 'MAT101',
    nombre: 'Cálculo Diferencial',
    semestre: '1° Semestre',
    docenteAsignado: 'Diana Salazar',
    tipo: 'CADI',
    docenteId: 'doc-salazar',
  },
  {
    id: 'cadi-2',
    codigo: 'CAI101',
    nombre: 'Lectura Crítica y Competencias Comunicativas',
    semestre: '1° Semestre',
    docenteAsignado: 'Gabriel Prieto',
    tipo: 'CAI',
    docenteId: 'doc-prieto',
  },
  {
    id: 'cadi-3',
    codigo: 'CAI201',
    nombre: 'Ética y Ciudadanía',
    semestre: '2° Semestre',
    docenteAsignado: 'Mariana Cifuentes',
    tipo: 'CAI',
    docenteId: 'doc-cifuentes',
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
  },
]

export default INITIAL_CADIS

