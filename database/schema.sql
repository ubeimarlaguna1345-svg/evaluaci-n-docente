CREATE TABLE IF NOT EXISTS usuarios (
  id              TEXT PRIMARY KEY,
  nombre          TEXT NOT NULL,
  correo          TEXT NOT NULL UNIQUE,
  contrasena      TEXT NOT NULL,
  contrasena_hash TEXT,
  rol             TEXT NOT NULL CHECK (rol IN ('admin', 'coordinador', 'docente', 'estudiante')),
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  sede            TEXT NOT NULL DEFAULT 'Sede Facatativá',
  carrera         TEXT NOT NULL DEFAULT 'Ingeniería de Sistemas y Computación'
);

CREATE TABLE IF NOT EXISTS cadis (
  id             TEXT PRIMARY KEY,
  codigo         TEXT NOT NULL UNIQUE,
  nombre         TEXT NOT NULL,
  semestre       INTEGER NOT NULL,
  tipo           TEXT NOT NULL DEFAULT 'CADI' CHECK (tipo IN ('CADI', 'CAI')),
  es_articulador BOOLEAN NOT NULL DEFAULT FALSE,
  docente_id     TEXT REFERENCES usuarios(id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS preguntas (
  id              TEXT PRIMARY KEY,
  formulario_id   TEXT REFERENCES formularios(id) ON DELETE CASCADE,
  enunciado       TEXT NOT NULL,
  tipo_respuesta  TEXT NOT NULL CHECK (tipo_respuesta IN ('escala', 'seleccion', 'texto')),
  dimension       TEXT NOT NULL DEFAULT 'General',
  obligatoria     BOOLEAN NOT NULL DEFAULT TRUE,
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opciones (
  pregunta_id  TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL,
  texto        TEXT NOT NULL,
  PRIMARY KEY (pregunta_id, orden)
);

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

CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
  id                   TEXT PRIMARY KEY,
  retroalimentacion_id TEXT NOT NULL REFERENCES retroalimentaciones(id) ON DELETE CASCADE,
  estudiante_id        TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  valor                TEXT NOT NULL,
  fecha                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (retroalimentacion_id, estudiante_id)
);

CREATE TABLE IF NOT EXISTS respuestas_formulario (
  id             TEXT PRIMARY KEY,
  formulario_id  TEXT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  usuario_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  docente_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  observacion    VARCHAR(500) NOT NULL DEFAULT '' CHECK (CHAR_LENGTH(observacion) <= 500),
  fecha          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (formulario_id, usuario_id, docente_id)
);

CREATE TABLE IF NOT EXISTS detalle_respuesta (
  respuesta_id  TEXT NOT NULL REFERENCES respuestas_formulario(id) ON DELETE CASCADE,
  pregunta_id   TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  valor         TEXT NOT NULL,
  PRIMARY KEY (respuesta_id, pregunta_id)
);

CREATE TABLE IF NOT EXISTS metadatos_evaluacion (
  id             TEXT PRIMARY KEY,
  formulario_id  TEXT REFERENCES formularios(id) ON DELETE CASCADE,
  docente_id     TEXT REFERENCES usuarios(id) ON DELETE SET NULL,
  periodo        TEXT NOT NULL,
  estado         TEXT NOT NULL DEFAULT 'activo',
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formularios_eliminados (
  id    TEXT PRIMARY KEY,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formularios_periodo ON formularios(periodo);
CREATE INDEX IF NOT EXISTS idx_preguntas_formulario ON preguntas(formulario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_form ON respuestas_formulario(formulario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_doc ON respuestas_formulario(docente_id);

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

CREATE OR REPLACE VIEW v_calificaciones_consolidadas AS
WITH promedios_estudiantes AS (
  SELECT
    rf.docente_id,
    f.periodo,
    ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS promedio_estudiantes,
    COUNT(DISTINCT rf.id) AS total_eval_estudiantes
  FROM detalle_respuesta d
  JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
  JOIN preguntas p ON p.id = d.pregunta_id
  JOIN formularios f ON f.id = rf.formulario_id
  WHERE p.tipo_respuesta = 'escala' AND f.tipo = 'evaluacion'
  GROUP BY rf.docente_id, f.periodo
),
promedios_auto AS (
  SELECT
    COALESCE(rf.docente_id, rf.usuario_id) AS docente_id,
    f.periodo,
    ROUND(AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC), 2) AS promedio_autoevaluacion,
    COUNT(DISTINCT rf.id) AS total_autoeval
  FROM detalle_respuesta d
  JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
  JOIN preguntas p ON p.id = d.pregunta_id
  JOIN formularios f ON f.id = rf.formulario_id
  WHERE p.tipo_respuesta = 'escala' AND f.tipo = 'autoevaluacion'
  GROUP BY COALESCE(rf.docente_id, rf.usuario_id), f.periodo
)
SELECT
  u.id AS docente_id,
  u.nombre AS docente_nombre,
  u.correo AS docente_correo,
  COALESCE(pe.periodo, pa.periodo, 'General') AS periodo,
  pe.promedio_estudiantes,
  ROUND(pe.promedio_estudiantes * 0.70, 2) AS eval_estudiantes_70,
  pa.promedio_autoevaluacion,
  ROUND(pa.promedio_autoevaluacion * 0.30, 2) AS autoevaluacion_30,
  ROUND(
    CASE
      WHEN pe.promedio_estudiantes IS NOT NULL AND pa.promedio_autoevaluacion IS NOT NULL
        THEN (pe.promedio_estudiantes * 0.70) + (pa.promedio_autoevaluacion * 0.30)
      WHEN pe.promedio_estudiantes IS NOT NULL THEN pe.promedio_estudiantes
      WHEN pa.promedio_autoevaluacion IS NOT NULL THEN pa.promedio_autoevaluacion
      ELSE 0
    END, 2
  ) AS nota_final_consolidada,
  CASE
    WHEN pe.promedio_estudiantes IS NOT NULL AND pa.promedio_autoevaluacion IS NOT NULL THEN 'completo'
    WHEN pe.promedio_estudiantes IS NOT NULL THEN 'pendiente_autoevaluacion'
    WHEN pa.promedio_autoevaluacion IS NOT NULL THEN 'pendiente_estudiantes'
    ELSE 'sin_evaluar'
  END AS estado,
  CASE
    WHEN ROUND(
      CASE
        WHEN pe.promedio_estudiantes IS NOT NULL AND pa.promedio_autoevaluacion IS NOT NULL
          THEN (pe.promedio_estudiantes * 0.70) + (pa.promedio_autoevaluacion * 0.30)
        WHEN pe.promedio_estudiantes IS NOT NULL THEN pe.promedio_estudiantes
        WHEN pa.promedio_autoevaluacion IS NOT NULL THEN pa.promedio_autoevaluacion
        ELSE 0
      END, 2
    ) <= 3.9 AND (pe.promedio_estudiantes IS NOT NULL OR pa.promedio_autoevaluacion IS NOT NULL) THEN TRUE
    ELSE FALSE
  END AS requiere_plan_mejora
FROM usuarios u
LEFT JOIN promedios_estudiantes pe ON pe.docente_id = u.id
LEFT JOIN promedios_auto pa ON pa.docente_id = u.id AND (pe.periodo IS NULL OR pa.periodo = pe.periodo)
WHERE u.rol = 'docente' AND u.activo = TRUE;
