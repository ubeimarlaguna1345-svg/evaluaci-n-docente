import dotenv from 'dotenv'
import pg from 'pg'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { Pool } = pg

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'siard_udec'}`

function shouldEnableSSL() {
  const host = (process.env.DB_HOST || '').toLowerCase()
  const isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === ''

  if (process.env.DATABASE_URL) {
    const urlStr = process.env.DATABASE_URL.toLowerCase()
    if (urlStr.includes('neon.tech') || urlStr.includes('sslmode=require') || urlStr.includes('ssl=true')) {
      return true
    }
    try {
      const parsed = new URL(process.env.DATABASE_URL)
      const parsedHost = (parsed.hostname || '').toLowerCase()
      if (parsedHost && parsedHost !== 'localhost' && parsedHost !== '127.0.0.1') {
        return true
      }
    } catch {
    }
  }

  if (!isLocalHost) {
    return true
  }

  return process.env.NODE_ENV === 'production'
}

const useSSL = shouldEnableSSL()

export const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (err) => {
  console.error('Error imprevisto en el Connection Pool de PostgreSQL:', err.message)
})

export async function initSchema() {
  try {
    const candidatePaths = [
      path.resolve(__dirname, '..', '..', 'database', 'schema.sql'),
      path.resolve(process.cwd(), 'database', 'schema.sql'),
      path.resolve(process.cwd(), '..', 'database', 'schema.sql'),
    ]
    const schemaPath = candidatePaths.find((p) => fs.existsSync(p))
    if (schemaPath) {
      const sql = fs.readFileSync(schemaPath, 'utf-8')
      await pool.query(sql)
      await pool.query(`
        ALTER TABLE cadis ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'CADI';
        ALTER TABLE cadis DROP CONSTRAINT IF EXISTS cadis_tipo_check;
        ALTER TABLE cadis ADD CONSTRAINT cadis_tipo_check CHECK (tipo IN ('CADI', 'CAI'));
        UPDATE cadis SET tipo = 'CADI' WHERE tipo IS NULL OR tipo = '';

        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sede TEXT NOT NULL DEFAULT 'Sede Facatativá';
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS carrera TEXT NOT NULL DEFAULT 'Ingeniería de Sistemas y Computación';
        UPDATE usuarios SET rol = 'coordinador' WHERE rol = 'directivo' OR nombre ILIKE '%Daniel%Moreno%';
        ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
        ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('admin', 'coordinador', 'docente', 'estudiante'));

        DELETE FROM usuarios WHERE LOWER(correo) = 'admin@ucundinamarca.edu.co' OR nombre ILIKE '%Administrador General%';

        DELETE FROM usuarios 
        WHERE rol = 'docente' 
          AND id NOT IN ('doc-navarro', 'doc-salazar', 'doc-prieto', 'doc-mendoza', 'doc-cifuentes')
          AND (
            LOWER(correo) IN ('andres.navarro@ucundinamarca.edu.co', 'diana.salazar@ucundinamarca.edu.co', 'gabriel.prieto@ucundinamarca.edu.co', 'javier.mendoza@ucundinamarca.edu.co', 'mariana.cifuentes@ucundinamarca.edu.co')
            OR nombre IN ('Andrés Navarro', 'Diana Salazar', 'Gabriel Prieto', 'Javier Mendoza', 'Mariana Cifuentes')
          );

        INSERT INTO usuarios (id, nombre, correo, contrasena, contrasena_hash, rol, activo, sede, carrera)
        VALUES
          ('usr-admin-uber', 'Ubeimar Laguna Cárdenas', 'uberadmin.siard@ucundinamarca.edu.co', 'Uber1019', '$2b$10$hQOVDOpqo.sfgkq3XUf2YOXlZ2xYsthTEDh3m/78OnFw3dox9IXee', 'admin', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('usr-admin-dani', 'Daniel Moreno', 'danidirec.siard@ucundinamarca.edu.co', 'siardVd3', '$2b$10$AiCgdmf6eF42W6T9L.tp/.c0a8fkgl5xEsb49b8T30vH4FKRqS0Zm', 'admin', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('usr-coord-jaime', 'Jaime Parra', 'jaimeparra.siard@ucundinamarca.edu.co', 'CoordParra2026*', '$2b$10$eoycADCQvycShajLWvqmzeD8bCScWV16wxve8JP/0rxmitcs9vWYa', 'coordinador', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('usr-coord-1', 'Coordinación Académica', 'coordinador@ucundinamarca.edu.co', 'coord123', '$2a$10$wT8K4cQZq7N9.ZzX8v1x4u1h.R2Q5iF2N2P7k1b9j2m3n4o5p6q7', 'coordinador', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('doc-navarro', 'Andrés Navarro', 'prof.navarro.siard@ucundinamarca.edu.co', 'ProfNav2026*', '$2b$10$OV6MhkNIUpEO.AH9XFD.ieK7saDUXX967sBD17IExwC6a6pttA3bC', 'docente', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('doc-salazar', 'Diana Salazar', 'prof.salazar.siard@ucundinamarca.edu.co', 'ProfSal2026*', '$2b$10$HgldVhTFZCPW6T4QB.EryeX6ALMqOIKh2mPhgRRuiPBhaq0Yw8GR2', 'docente', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('doc-prieto', 'Gabriel Prieto', 'prof.prieto.siard@ucundinamarca.edu.co', 'ProfPri2026*', '$2b$10$L8Zar5UpAq9mu9rRB.kcaO/q7aCUdCTS15qYVHNph1g/CSyu9lF8.', 'docente', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('doc-mendoza', 'Javier Mendoza', 'prof.mendoza.siard@ucundinamarca.edu.co', 'ProfMen2026*', '$2b$10$6MG0xd.Lwv33mNN8dvFXOedz8r2iaa2poH6113jf2R/VV2XA5TWZO', 'docente', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('doc-cifuentes', 'Mariana Cifuentes', 'prof.cifuentes.siard@ucundinamarca.edu.co', 'ProfCif2026*', '$2b$10$MkEAxIIUiVWwRV.GhWQs4eM/BH405FiJDQw3POj1MMyX.cTKcIA8a', 'docente', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('est-carlos', 'Carlos Peña', 'carlospena.siard@ucundinamarca.edu.co', 'Carl8742*', '$2b$10$XWUNWrJ64lkiC/DalTbR4.gNoXOxjieN9qQfdO2l71bM2IWK95QKu', 'estudiante', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('est-1', 'Laura Quintero', 'lauraquintero.siard@ucundinamarca.edu.co', 'Laur5193*', '$2b$10$ldL8RVzqcMIMeUgmTnkxQuXef/V90/wyJKTgaWCPMXevlVWccV0Ly', 'estudiante', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('est-2', 'Mateo Rincón', 'mateorincon.siard@ucundinamarca.edu.co', 'Mate6381*', '$2b$10$pHujpYosUc24f08wdjJAF.SEvG6LsGFEkjI.lq4iapXJAnsb4ciD.', 'estudiante', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('est-3', 'Camila Torres', 'camilatorres.siard@ucundinamarca.edu.co', 'Cami9240*', '$2b$10$YTBD1HgXtZD1dbSmYBchlOGQ9igxxUOR9yOyci735ZIHaRMeYbUOG', 'estudiante', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación'),
          ('est-4', 'Julián Morales', 'julianmorales.siard@ucundinamarca.edu.co', 'Juli1835*', '$2b$10$14nxj9TBi/e8HfzKX.8HOOTh1YwZUOrQ/OVV.qQNHQsKbTMX4X8RG', 'estudiante', true, 'Sede Facatativá', 'Ingeniería de Sistemas y Computación')
        ON CONFLICT (correo) DO UPDATE
        SET nombre = EXCLUDED.nombre, contrasena = EXCLUDED.contrasena, contrasena_hash = EXCLUDED.contrasena_hash, rol = EXCLUDED.rol, activo = TRUE;

        INSERT INTO cadis (id, codigo, nombre, semestre, tipo, es_articulador, docente_id)
        VALUES
          ('cadi-calc-101', 'MAT101', 'Cálculo Diferencial', 1, 'CADI', false, 'doc-salazar'),
          ('cai-lect-101', 'CAI101', 'Lectura Crítica y Competencias Comunicativas', 1, 'CAI', false, 'doc-prieto'),
          ('cadi-prog-301', 'SIS301', 'Programación II', 3, 'CADI', true, 'doc-navarro'),
          ('cadi-elec-302', 'ELC301', 'Electrónica Básica', 3, 'CADI', false, 'doc-mendoza'),
          ('cai-etica-201', 'CAI201', 'Ética y Ciudadanía', 2, 'CAI', false, 'doc-cifuentes')
        ON CONFLICT (codigo) DO UPDATE
        SET tipo = EXCLUDED.tipo, docente_id = COALESCE(cadis.docente_id, EXCLUDED.docente_id);

        CREATE TABLE IF NOT EXISTS formularios_eliminados (
          id TEXT PRIMARY KEY,
          fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre)
        SELECT 'form-eval-2026', 'evaluacion', 'Evaluación Docente 2026-I', 'Evaluación integral de desempeño docente bajo dimensiones MEDIT.', '2026-I', NULL, '2026-01-15T00:00:00Z', '2026-06-30T23:59:59Z'
        WHERE NOT EXISTS (SELECT 1 FROM formularios_eliminados WHERE id = 'form-eval-2026')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO formularios (id, tipo, titulo, descripcion, periodo, cadi_id, fecha_inicio, fecha_cierre)
        SELECT 'form-auto-2026', 'autoevaluacion', 'Autoevaluación Docente 2026-I', 'Instrumento de reflexión pedagógica y autoevaluación.', '2026-I', NULL, '2026-01-15T00:00:00Z', '2026-06-30T23:59:59Z'
        WHERE NOT EXISTS (SELECT 1 FROM formularios_eliminados WHERE id = 'form-auto-2026')
        ON CONFLICT (id) DO NOTHING;

        ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS bloque TEXT DEFAULT 'docente';

        INSERT INTO preguntas (id, formulario_id, enunciado, tipo_respuesta, dimension, obligatoria, orden, bloque)
        VALUES
          ('q-claridad', 'form-eval-2026', 'Demuestra dominio actualizado, solidez conceptual y promueve la indagación metódica y fuentes técnicas.', 'escala', 'Claridad conceptual y explicación', true, 1, 'docente'),
          ('q-doc-expositiva', 'form-eval-2026', 'Estructura sus clases con claridad expositiva y metodología adecuada para facilitar el aprendizaje.', 'escala', 'Claridad conceptual y explicación', true, 2, 'docente'),
          ('q-organizacion', 'form-eval-2026', 'Cumple con el cronograma académico, los horarios acordados y el seguimiento del CADI.', 'escala', 'Organización y cumplimiento del programa', true, 3, 'docente'),
          ('q-retro', 'form-eval-2026', 'Realiza retroalimentación oportuna y orienta constructivamente sobre los resultados de las evaluaciones.', 'escala', 'Retroalimentación y entrega oportuna de notas', true, 4, 'docente'),
          ('q-doc-comunicacion', 'form-eval-2026', 'Mantiene una comunicación respetuosa, asertiva y disposición para atender inquietudes pedagógicas.', 'escala', 'Retroalimentación y entrega oportuna de notas', true, 5, 'docente'),
          ('q-tic', 'form-eval-2026', 'Uso efectivo de plataformas virtuales, herramientas digitales y mediaciones tecnológicas en la formación.', 'escala', 'Modelo MEDIT y Mediaciones Tecnológicas', true, 6, 'medit'),
          ('q-metodologia', 'form-eval-2026', 'Aplicación de contenidos a problemas reales y casos del entorno para fomentar el aprendizaje significativo.', 'escala', 'Metodología y aplicación práctica', true, 7, 'medit'),
          ('q-medit-autonomo', 'form-eval-2026', 'Estímulo al trabajo colaborativo, aprendizaje autónomo y desarrollo del pensamiento crítico.', 'escala', 'Modelo MEDIT y Mediaciones Tecnológicas', true, 8, 'medit'),
          ('q-infraestructura', 'form-eval-2026', 'Disponibilidad, dotación, iluminación y condiciones físicas adecuadas en las aulas y laboratorios de la sede.', 'escala', 'Recursos y Gestión Institucional', true, 9, 'institucional'),
          ('q-conectividad', 'form-eval-2026', 'Calidad y estabilidad de la conectividad a internet, redes institucionales y soporte técnico provisto.', 'escala', 'Recursos y Gestión Institucional', true, 10, 'institucional'),
          ('q-facultad-comunicacion', 'form-eval-2026', '¿La facultad y sus dependencias comunicaron oportunamente el calendario académico, trámites y lineamientos institucionales?', 'escala', 'Recursos y Gestión Institucional', true, 11, 'institucional'),
          ('q-auto-1', 'form-auto-2026', 'Autoevaluación: Claridad didáctica y mediación pedagógica', 'escala', 'Claridad conceptual y explicación', true, 1, 'docente'),
          ('q-auto-2', 'form-auto-2026', 'Autoevaluación: Cumplimiento de planeación y rúbricas', 'escala', 'Organización y cumplimiento del programa', true, 2, 'docente'),
          ('q-auto-3', 'form-auto-2026', 'Autoevaluación: Oportunidad en retroalimentación formativa', 'escala', 'Retroalimentación y entrega oportuna de notas', true, 3, 'docente'),
          ('q-auto-4', 'form-auto-2026', 'Autoevaluación: Innovación en prácticas y proyectos MEDIT', 'escala', 'Metodología y aplicación práctica', true, 4, 'medit')
        ON CONFLICT (id) DO UPDATE
        SET enunciado = EXCLUDED.enunciado, dimension = EXCLUDED.dimension, orden = EXCLUDED.orden, bloque = EXCLUDED.bloque;

        INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
        VALUES
          ('rf-sal-1', 'form-eval-2026', 'est-1', 'doc-salazar', 'Excelente docente, su dominio de los temas de cálculo y paciencia para resolver dudas complejas es insuperable.', NOW() - INTERVAL '5 days'),
          ('rf-sal-2', 'form-eval-2026', 'est-2', 'doc-salazar', 'Clases muy ordenadas, rúbricas transparentes y retroalimentación constante que motiva a aprender.', NOW() - INTERVAL '4 days'),
          ('rf-sal-3', 'form-eval-2026', 'est-3', 'doc-salazar', 'Gran metodología práctica, siempre propone talleres contextualizados a la ingeniería.', NOW() - INTERVAL '3 days'),
          ('rf-sal-auto', 'form-auto-2026', 'doc-salazar', 'doc-salazar', 'Compromiso riguroso con la formación matemática y diseño de guías paso a paso.', NOW() - INTERVAL '2 days')
        ON CONFLICT (formulario_id, usuario_id, docente_id) DO NOTHING;

        INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
        VALUES
          ('rf-nav-1', 'form-eval-2026', 'est-1', 'doc-navarro', 'Muy buen profesor en programación, explica conceptos abstractos con ejemplos reales.', NOW() - INTERVAL '5 days'),
          ('rf-nav-2', 'form-eval-2026', 'est-2', 'doc-navarro', 'Excelente dinamismo en clase. Podría otorgar más margen de tiempo en los laboratorios prácticos.', NOW() - INTERVAL '4 days'),
          ('rf-nav-3', 'form-eval-2026', 'est-4', 'doc-navarro', 'Gran apoyo durante el desarrollo de los proyectos de aula integradores.', NOW() - INTERVAL '2 days'),
          ('rf-nav-auto', 'form-auto-2026', 'doc-navarro', 'doc-navarro', 'Fomento continuo del aprendizaje basado en problemas de desarrollo de software.', NOW() - INTERVAL '1 days')
        ON CONFLICT (formulario_id, usuario_id, docente_id) DO NOTHING;

        INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
        VALUES
          ('rf-cif-1', 'form-eval-2026', 'est-2', 'doc-cifuentes', 'Propicia debates éticos muy constructivos y analiza dilemas profesionales de ingeniería.', NOW() - INTERVAL '6 days'),
          ('rf-cif-2', 'form-eval-2026', 'est-3', 'doc-cifuentes', 'Cumplimiento impecable del cronograma y respeto mutuo en todas las sesiones.', NOW() - INTERVAL '4 days'),
          ('rf-cif-3', 'form-eval-2026', 'est-5', 'doc-cifuentes', 'Sería enriquecedor invitar expertos para profundizar en casos de bioética tecnológica.', NOW() - INTERVAL '2 days'),
          ('rf-cif-auto', 'form-auto-2026', 'doc-cifuentes', 'doc-cifuentes', 'Promoción constante de la responsabilidad social universitaria bajo el MEDIT.', NOW() - INTERVAL '1 days')
        ON CONFLICT (formulario_id, usuario_id, docente_id) DO NOTHING;

        INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
        VALUES
          ('rf-prie-1', 'form-eval-2026', 'est-1', 'doc-prieto', 'Tiene sólido conocimiento lingüístico, pero los tiempos de devolución de ensayos son algo extensos.', NOW() - INTERVAL '7 days'),
          ('rf-prie-2', 'form-eval-2026', 'est-3', 'doc-prieto', 'Las lecturas seleccionadas son buenas. Se sugiere mayor dinamismo y participación oral en clase.', NOW() - INTERVAL '5 days'),
          ('rf-prie-3', 'form-eval-2026', 'est-4', 'doc-prieto', 'Falta publicar las calificaciones intermedias con mayor anticipación a los cortes oficiales.', NOW() - INTERVAL '3 days'),
          ('rf-prie-auto', 'form-auto-2026', 'doc-prieto', 'doc-prieto', 'Reflexión pedagógica orientada a optimizar tiempos de corrección escrita.', NOW() - INTERVAL '2 days')
        ON CONFLICT (formulario_id, usuario_id, docente_id) DO NOTHING;

        INSERT INTO respuestas_formulario (id, formulario_id, usuario_id, docente_id, observacion, fecha)
        VALUES
          ('rf-men-1', 'form-eval-2026', 'est-2', 'doc-mendoza', 'Las clases son predominantemente teóricas; requerimos más acompañamiento práctico en banco de pruebas.', NOW() - INTERVAL '6 days'),
          ('rf-men-2', 'form-eval-2026', 'est-4', 'doc-mendoza', 'Las rúbricas de evaluación no son claras y las retroalimentaciones de los circuitos son muy breves.', NOW() - INTERVAL '4 days'),
          ('rf-men-3', 'form-eval-2026', 'est-5', 'doc-mendoza', 'Se solicita mayor apertura para resolver inquietudes y orientación sobre el uso de simuladores.', NOW() - INTERVAL '2 days'),
          ('rf-men-auto', 'form-auto-2026', 'doc-mendoza', 'doc-mendoza', 'Reconozco la necesidad de incorporar simulaciones virtuales para fortalecer el componente práctico.', NOW() - INTERVAL '1 days')
        ON CONFLICT (formulario_id, usuario_id, docente_id) DO NOTHING;

        INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor)
        VALUES
          ('rf-sal-1', 'q-claridad', '5'), ('rf-sal-1', 'q-organizacion', '5'), ('rf-sal-1', 'q-retro', '5'), ('rf-sal-1', 'q-metodologia', '5'),
          ('rf-sal-2', 'q-claridad', '5'), ('rf-sal-2', 'q-organizacion', '5'), ('rf-sal-2', 'q-retro', '4'), ('rf-sal-2', 'q-metodologia', '5'),
          ('rf-sal-3', 'q-claridad', '5'), ('rf-sal-3', 'q-organizacion', '4'), ('rf-sal-3', 'q-retro', '5'), ('rf-sal-3', 'q-metodologia', '5'),
          ('rf-sal-auto', 'q-auto-1', '5'), ('rf-sal-auto', 'q-auto-2', '5'), ('rf-sal-auto', 'q-auto-3', '4'), ('rf-sal-auto', 'q-auto-4', '5')
        ON CONFLICT (respuesta_id, pregunta_id) DO NOTHING;

        INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor)
        VALUES
          ('rf-nav-1', 'q-claridad', '5'), ('rf-nav-1', 'q-organizacion', '4'), ('rf-nav-1', 'q-retro', '4'), ('rf-nav-1', 'q-metodologia', '5'),
          ('rf-nav-2', 'q-claridad', '4'), ('rf-nav-2', 'q-organizacion', '5'), ('rf-nav-2', 'q-retro', '4'), ('rf-nav-2', 'q-metodologia', '4'),
          ('rf-nav-3', 'q-claridad', '5'), ('rf-nav-3', 'q-organizacion', '4'), ('rf-nav-3', 'q-retro', '4'), ('rf-nav-3', 'q-metodologia', '4'),
          ('rf-nav-auto', 'q-auto-1', '4'), ('rf-nav-auto', 'q-auto-2', '5'), ('rf-nav-auto', 'q-auto-3', '4'), ('rf-nav-auto', 'q-auto-4', '5')
        ON CONFLICT (respuesta_id, pregunta_id) DO NOTHING;

        INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor)
        VALUES
          ('rf-cif-1', 'q-claridad', '4'), ('rf-cif-1', 'q-organizacion', '5'), ('rf-cif-1', 'q-retro', '4'), ('rf-cif-1', 'q-metodologia', '4'),
          ('rf-cif-2', 'q-claridad', '4'), ('rf-cif-2', 'q-organizacion', '4'), ('rf-cif-2', 'q-retro', '4'), ('rf-cif-2', 'q-metodologia', '4'),
          ('rf-cif-3', 'q-claridad', '4'), ('rf-cif-3', 'q-organizacion', '5'), ('rf-cif-3', 'q-retro', '4'), ('rf-cif-3', 'q-metodologia', '4'),
          ('rf-cif-auto', 'q-auto-1', '4'), ('rf-cif-auto', 'q-auto-2', '4'), ('rf-cif-auto', 'q-auto-3', '4'), ('rf-cif-auto', 'q-auto-4', '5')
        ON CONFLICT (respuesta_id, pregunta_id) DO NOTHING;

        INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor)
        VALUES
          ('rf-prie-1', 'q-claridad', '4'), ('rf-prie-1', 'q-organizacion', '4'), ('rf-prie-1', 'q-retro', '3'), ('rf-prie-1', 'q-metodologia', '4'),
          ('rf-prie-2', 'q-claridad', '4'), ('rf-prie-2', 'q-organizacion', '4'), ('rf-prie-2', 'q-retro', '3'), ('rf-prie-2', 'q-metodologia', '4'),
          ('rf-prie-3', 'q-claridad', '4'), ('rf-prie-3', 'q-organizacion', '4'), ('rf-prie-3', 'q-retro', '3'), ('rf-prie-3', 'q-metodologia', '4'),
          ('rf-prie-auto', 'q-auto-1', '4'), ('rf-prie-auto', 'q-auto-2', '4'), ('rf-prie-auto', 'q-auto-3', '4'), ('rf-prie-auto', 'q-auto-4', '4')
        ON CONFLICT (respuesta_id, pregunta_id) DO NOTHING;

        INSERT INTO detalle_respuesta (respuesta_id, pregunta_id, valor)
        VALUES
          ('rf-men-1', 'q-claridad', '3'), ('rf-men-1', 'q-organizacion', '3'), ('rf-men-1', 'q-retro', '3'), ('rf-men-1', 'q-metodologia', '4'),
          ('rf-men-2', 'q-claridad', '3'), ('rf-men-2', 'q-organizacion', '4'), ('rf-men-2', 'q-retro', '3'), ('rf-men-2', 'q-metodologia', '3'),
          ('rf-men-3', 'q-claridad', '3'), ('rf-men-3', 'q-organizacion', '3'), ('rf-men-3', 'q-retro', '3'), ('rf-men-3', 'q-metodologia', '4'),
          ('rf-men-auto', 'q-auto-1', '4'), ('rf-men-auto', 'q-auto-2', '3'), ('rf-men-auto', 'q-auto-3', '3'), ('rf-men-auto', 'q-auto-4', '4')
        ON CONFLICT (respuesta_id, pregunta_id) DO NOTHING;
      `)
      console.log('✓ Esquema PostgreSQL verificado y sincronizado correctamente con docentes y evaluaciones.')
      return true
    }
  } catch (error) {
    console.warn('Aviso al verificar esquema PostgreSQL:', error.message)
    return false
  }
}
