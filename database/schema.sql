-- SIARD-UdeC · Esquema relacional
-- Compatible con SQLite (usado en la app), PostgreSQL y MySQL 8 con cambios mínimos.

CREATE TABLE IF NOT EXISTS usuarios (
  id          TEXT PRIMARY KEY,
  nombre      TEXT NOT NULL,
  correo      TEXT NOT NULL UNIQUE,
  contrasena  TEXT NOT NULL,
  rol         TEXT NOT NULL CHECK (rol IN ('admin','coordinador','docente','estudiante')),
  activo      INTEGER NOT NULL DEFAULT 1                         -- REQ-05: baja lógica
);

CREATE TABLE IF NOT EXISTS formularios (                         -- REQ-10 / REQ-11
  id            TEXT PRIMARY KEY,
  tipo          TEXT NOT NULL CHECK (tipo IN ('evaluacion','autoevaluacion')),  -- REQ-13
  titulo        TEXT NOT NULL,
  descripcion   TEXT NOT NULL DEFAULT '',
  periodo       TEXT NOT NULL,
  fecha_inicio  TEXT NOT NULL,                                    -- REQ-06
  fecha_cierre  TEXT NOT NULL,
  CHECK (fecha_cierre > fecha_inicio)
);

CREATE TABLE IF NOT EXISTS preguntas (                           -- REQ-12 / REQ-03
  id              TEXT PRIMARY KEY,
  formulario_id   TEXT REFERENCES formularios(id) ON DELETE CASCADE,  -- NULL si pertenece a una retroalimentación
  enunciado       TEXT NOT NULL,
  tipo_respuesta  TEXT NOT NULL CHECK (tipo_respuesta IN ('escala','seleccion','texto')),  -- REQ-04
  obligatoria     INTEGER NOT NULL DEFAULT 1,
  orden           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opciones (
  pregunta_id  TEXT NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
  orden        INTEGER NOT NULL,
  texto        TEXT NOT NULL,
  PRIMARY KEY (pregunta_id, orden)
);

CREATE TABLE IF NOT EXISTS retroalimentaciones (                 -- REQ-03
  id            TEXT PRIMARY KEY,
  docente_id    TEXT NOT NULL REFERENCES usuarios(id),
  pregunta_id   TEXT NOT NULL REFERENCES preguntas(id),
  curso         TEXT NOT NULL,
  fecha_inicio  TEXT NOT NULL,
  fecha_cierre  TEXT NOT NULL,
  creada_en     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (        -- REQ-17 / REQ-07
  id                   TEXT PRIMARY KEY,
  retroalimentacion_id TEXT NOT NULL REFERENCES retroalimentaciones(id) ON DELETE CASCADE,
  estudiante_id        TEXT NOT NULL REFERENCES usuarios(id),
  valor                TEXT NOT NULL,
  fecha                TEXT NOT NULL,
  UNIQUE (retroalimentacion_id, estudiante_id)
);

CREATE TABLE IF NOT EXISTS respuestas_formulario (               -- REQ-15 / REQ-16 / REQ-14
  id             TEXT PRIMARY KEY,
  formulario_id  TEXT NOT NULL REFERENCES formularios(id) ON DELETE CASCADE,
  usuario_id     TEXT NOT NULL REFERENCES usuarios(id),
  docente_id     TEXT NOT NULL REFERENCES usuarios(id),          -- docente evaluado (o él mismo en autoevaluación)
  observacion    TEXT NOT NULL DEFAULT '' CHECK (length(observacion) <= 500),
  fecha          TEXT NOT NULL,
  UNIQUE (formulario_id, usuario_id, docente_id)
);

CREATE TABLE IF NOT EXISTS detalle_respuesta (
  respuesta_id  TEXT NOT NULL REFERENCES respuestas_formulario(id) ON DELETE CASCADE,
  pregunta_id   TEXT NOT NULL REFERENCES preguntas(id),
  valor         TEXT NOT NULL,
  PRIMARY KEY (respuesta_id, pregunta_id)
);

-- REQ-08 / REQ-09: promedio por docente, formulario y pregunta de escala
CREATE VIEW IF NOT EXISTS v_promedios AS
SELECT rf.formulario_id, rf.docente_id, p.id AS pregunta_id, p.enunciado,
       AVG(CAST(d.valor AS REAL)) AS promedio, COUNT(*) AS n
FROM detalle_respuesta d
JOIN respuestas_formulario rf ON rf.id = d.respuesta_id
JOIN preguntas p ON p.id = d.pregunta_id
WHERE p.tipo_respuesta = 'escala'
GROUP BY rf.formulario_id, rf.docente_id, p.id;
