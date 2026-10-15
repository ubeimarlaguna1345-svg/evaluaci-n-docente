-- SIARD-UdeC · Esquema Relacional PostgreSQL
-- Compatible con PostgreSQL 14+, administrado vía pgAdmin

-- 1. Tabla de Usuarios (con roles institucionales UdeC y control de baja lógica)
CREATE TABLE IF NOT EXISTS usuarios (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  correo          TEXT NOT NULL UNIQUE,
  contrasena      TEXT NOT NULL,
  contrasena_hash TEXT,
  rol             TEXT NOT NULL CHECK (rol IN ('admin', 'coordinador', 'docente', 'estudiante', 'directivo')),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  sede            TEXT NOT NULL DEFAULT 'Sede Facatativá',
  carrera         TEXT NOT NULL DEFAULT 'Ingeniería de Sistemas y Computación'
);

-- 2. CADIs (Campos de Aprendizaje Disciplinares - Lineamientos PGC UdeC)
CREATE TABLE IF NOT EXISTS cadis (
  id             TEXT PRIMARY KEY,
  codigo         TEXT NOT NULL UNIQUE,
  nombre         TEXT NOT NULL,
  semestre       INTEGER NOT NULL,
  es_articulador BOOLEAN NOT NULL DEFAULT FALSE,
  docente_id     TEXT REFERENCES usuarios(id) ON DELETE SET NULL
);

-- 3. Formularios de Evaluación y Autoevaluación
CREATE TABLE IF NOT EXISTS formularios (
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('evaluacion', 'autoevaluacion')),
  titulo        TEXT NOT NULL,
  descripcion   TEXT NOT NULL DEFAULT '',
  periodo       TEXT NOT NULL,
  cadi_id       TEXT REFERENCES cadis(id) ON DELETE SET NULL,
  fecha_inicio  TIMESTAMPTZ NOT NULL,
  fecha_cierre  TIMESTAMPTZ NOT NULL,
  CHECK (fecha_cierre > fecha_inicio)
);

-- 4. Preguntas asociadas a formularios o retroalimentaciones
CREATE TABLE IF NOT EXISTS preguntas (
  id              TEXT PRIMARY KEY,
  formulario_id   TEXT REFERENCES formularios(id) ON DELETE CASCADE,
  enunciado       TEXT NOT NULL,
  tipo_respuesta  TEXT NOT NULL CHECK (tipo_respuesta IN ('escala', 'seleccion', 'texto')),
  dimension       TEXT NOT NULL DEFAULT 'General',
  obligatoria     BOOLEAN NOT NULL DEFAULT TRUE,
  orden           INTEGER NOT NULL DEFAULT 0
);

-- 5. Opciones para preguntas de selección múltiple
CREATE TABLE IF NOT EXISTS opciones (
  pregunta_id  TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL,
  texto        TEXT NOT NULL,
  PRIMARY KEY (pregunta_id, orden)
);

-- 6. Retroalimentaciones rápidas de clase (Docente a estudiantes)
CREATE TABLE IF NOT EXISTS retroalimentaciones (
  id            TEXT PRIMARY KEY,
  docente_id    TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pregunta_id   TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  curso         TEXT NOT NULL,
  fecha_inicio  TIMESTAMPTZ NOT NULL,
  fecha_cierre  TIMESTAMPTZ NOT NULL,
  creada_en     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (fecha_cierre > fecha_inicio)
);

-- 7. Respuestas de estudiantes a retroalimentaciones de clase (voto único por sesión)
CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
  id                   TEXT PRIMARY KEY,
  retroalimentacion_id TEXT NOT NULL REFERENCES retroalimentaciones(id) ON DELETE CASCADE,
  estudiante_id        TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor                TEXT NOT NULL,
  fecha                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (retroalimentacion_id, estudiante_id)
);

-- 8. Respuestas a formularios institucionales (control de anonimato y bloqueo de doble voto)
CREATE TABLE IF NOT EXISTS respuestas_formulario (
  id             TEXT PRIMARY KEY,
  formulario_id  TEXT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  usuario_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  docente_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  observacion    VARCHAR(500) NOT NULL DEFAULT '' CHECK (CHAR_LENGTH(observacion) <= 500),
  fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (formulario_id, usuario_id, docente_id)
);

-- 9. Detalle de respuestas individuales por pregunta
CREATE TABLE IF NOT EXISTS detalle_respuesta (
  respuesta_id  TEXT NOT NULL REFERENCES respuestas_formulario(id) ON DELETE CASCADE,
  pregunta_id   TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  valor         TEXT NOT NULL,
  PRIMARY KEY (respuesta_id, pregunta_id)
);

-- Índices de optimización para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_formularios_periodo ON formularios(periodo);
CREATE INDEX IF NOT EXISTS idx_preguntas_formulario ON preguntas(formulario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_form ON respuestas_formulario(formulario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_doc ON respuestas_formulario(docente_id);

-- 10. Vista analítica para cálculo de promedios de escala
CREATE OR REPLACE VIEW v_promedios AS
SELECT
  rf.formulario_id,
  rf.docente_id,
  p.id AS pregunta_id,
  p.enunciado,
  AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC) AS promedio,
  COUNT(*) AS n
FROM detalle_respuesta d
JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
JOIN preguntas p ON p.id = d.pregunta_id
WHERE p.tipo_respuesta = 'escala'
GROUP BY
  rf.formulario_id,
  rf.docente_id,
  p.id,
  p.enunciado;
