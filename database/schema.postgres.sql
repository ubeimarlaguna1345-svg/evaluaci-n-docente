-- SIARD-UdeC
-- Esquema específico para PostgreSQL

CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    rol TEXT NOT NULL
        CHECK (rol IN ('admin', 'coordinador', 'docente', 'estudiante')),
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS formularios (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL
        CHECK (tipo IN ('evaluacion', 'autoevaluacion')),
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    periodo TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_cierre TIMESTAMPTZ NOT NULL,
    CHECK (fecha_cierre > fecha_inicio)
);

CREATE TABLE IF NOT EXISTS preguntas (
    id TEXT PRIMARY KEY,
    formulario_id TEXT REFERENCES formularios(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    tipo_respuesta TEXT NOT NULL
        CHECK (tipo_respuesta IN ('escala', 'seleccion', 'texto')),
    obligatorio BOOLEAN NOT NULL DEFAULT TRUE,
    orden INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opciones (
    pregunta_id TEXT NOT NULL
        REFERENCES preguntas(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL,
    texto TEXT NOT NULL,
    PRIMARY KEY (pregunta_id, orden)
);

CREATE TABLE IF NOT EXISTS retroalimentaciones (
    id TEXT PRIMARY KEY,
    docente_id TEXT NOT NULL REFERENCES usuarios(id),
    pregunta_id TEXT NOT NULL REFERENCES preguntas(id),
    curso TEXT NOT NULL,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_cierre TIMESTAMPTZ NOT NULL,
    creada_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (fecha_cierre > fecha_inicio)
);

CREATE TABLE IF NOT EXISTS respuestas_retroalimentacion (
    id TEXT PRIMARY KEY,
    retroalimentacion_id TEXT NOT NULL
        REFERENCES retroalimentaciones(id) ON DELETE CASCADE,
    estudiante_id TEXT NOT NULL REFERENCES usuarios(id),
    valor TEXT NOT NULL,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (retroalimentacion_id, estudiante_id)
);

CREATE TABLE IF NOT EXISTS respuestas_formulario (
    id TEXT PRIMARY KEY,
    formulario_id TEXT NOT NULL
        REFERENCES formularios(id) ON DELETE CASCADE,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id),
    docente_id TEXT NOT NULL REFERENCES usuarios(id),
    observacion TEXT NOT NULL DEFAULT ''
        CHECK (CHAR_LENGTH(observacion) <= 500),
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (formulario_id, usuario_id, docente_id)
);

CREATE TABLE IF NOT EXISTS detalle_respuesta (
    respuesta_id TEXT NOT NULL
        REFERENCES respuestas_formulario(id) ON DELETE CASCADE,
    pregunta_id TEXT NOT NULL
        REFERENCES preguntas(id) ON DELETE CASCADE,
    valor TEXT NOT NULL,
    PRIMARY KEY (respuesta_id, pregunta_id)
);

-- Índices para consultas frecuentes

CREATE INDEX IF NOT EXISTS idx_formularios_periodo
    ON formularios(periodo);

CREATE INDEX IF NOT EXISTS idx_preguntas_formulario
    ON preguntas(formulario_id);

CREATE INDEX IF NOT EXISTS idx_retroalimentaciones_docente
    ON retroalimentaciones(docente_id);

CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_formulario
    ON respuestas_formulario(formulario_id);

CREATE INDEX IF NOT EXISTS idx_respuestas_formulario_docente
    ON respuestas_formulario(docente_id);

-- Promedios de respuestas de escala por formulario,
-- docente evaluado y pregunta.

CREATE OR REPLACE VIEW v_promedios AS
SELECT
    rf.formulario_id,
    rf.docente_id,
    p.id AS pregunta_id,
    p.enunciado,
    AVG(NULLIF(BTRIM(d.valor), '')::NUMERIC) AS promedio,
    COUNT(*) AS n
FROM detalle_respuesta d
JOIN respuestas_formulario rf
    ON rf.id = d.respuesta_id
JOIN preguntas p
    ON p.id = d.pregunta_id
WHERE p.tipo_respuesta = 'escala'
GROUP BY
    rf.formulario_id,
    rf.docente_id,
    p.id,
    p.enunciado;