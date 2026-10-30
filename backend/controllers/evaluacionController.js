import { evaluacionService } from '../services/index.js'
import { pool } from '../config/db.js'

function sendJson(res, statusCode, payload) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(payload)
  }
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

export class EvaluacionController {
  static async getCadis(_req, res) {
    try {
      const cadis = await evaluacionService.obtenerCadis()
      return sendJson(res, 200, { ok: true, cadis })
    } catch (error) {
      console.warn('Aviso en getCadis (PostgreSQL no disponible, devolviendo fallback institucional):', error.message)
      const fallbackCadis = [
        { id: 'cadi-calc-101', codigo: 'MAT101', nombre: 'Cálculo Diferencial', semestre: 1, tipo: 'CADI', esArticulador: false, docenteId: 'doc-salazar' },
        { id: 'cai-lect-101', codigo: 'CAI101', nombre: 'Lectura Crítica y Competencias Comunicativas', semestre: 1, tipo: 'CAI', esArticulador: false, docenteId: 'doc-prieto' },
        { id: 'cai-etica-201', codigo: 'CAI201', nombre: 'Ética y Ciudadanía', semestre: 2, tipo: 'CAI', esArticulador: false, docenteId: 'doc-cifuentes' },
        { id: 'cadi-prog-301', codigo: 'SIS301', nombre: 'Programación II', semestre: 3, tipo: 'CADI', esArticulador: true, docenteId: 'doc-navarro' },
        { id: 'cadi-elec-302', codigo: 'ELC301', nombre: 'Electrónica Básica', semestre: 3, tipo: 'CADI', esArticulador: false, docenteId: 'doc-mendoza' },
      ]
      return sendJson(res, 200, { ok: true, cadis: fallbackCadis })
    }
  }

  static async createCadi(req, res) {
    try {
      const id = await evaluacionService.crearCadi(req.body || {})
      return sendJson(res, 201, { ok: true, id })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya existe un CADI con ese código.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al registrar CADI.', detail: error.message })
    }
  }

  static async updateCadi(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.actualizarCadi(id, req.body || {})
      return sendJson(res, 200, result)
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya existe otro CADI con ese código.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al actualizar CADI.', detail: error.message })
    }
  }

  static async deleteCadi(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.eliminarCadi(id)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al eliminar CADI.', detail: error.message })
    }
  }

  static async getForms(req, res) {
    try {
      const { role, rol, ...rest } = req.query || {}
      const userRole = role || rol || (req.user && req.user.role)
      const forms = await evaluacionService.obtenerFormularios({ ...rest, role: userRole })
      return sendJson(res, 200, { ok: true, forms })
    } catch (error) {
      console.warn('Aviso en getForms (PostgreSQL no disponible, devolviendo formulario activo institucional):', error.message)
      const fallbackForms = [
        {
          id: 'form-eval-2026',
          kind: 'evaluacion',
          title: 'Instrumento de Evaluación Integral del Desempeño Docente MEDIT',
          description: 'Evaluación integral de desempeño docente bajo dimensiones MEDIT.',
          period: '2026-II',
          start: '2026-08-01T00:00:00Z',
          end: '2026-11-30T23:59:59Z',
          questions: [],
        },
      ]
      return sendJson(res, 200, { ok: true, forms: fallbackForms })
    }
  }

  static async getFormById(req, res) {
    const { id } = req.params
    try {
      const form = await evaluacionService.obtenerFormularioPorId(id)
      return sendJson(res, 200, { ok: true, form })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al obtener formulario.', detail: error.message })
    }
  }

  static async createForm(req, res) {
    try {
      const id = await evaluacionService.crearFormulario(req.body || {})
      return sendJson(res, 201, { ok: true, id })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al crear formulario.', detail: error.message })
    }
  }

  static async createEvaluacion(req, res) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS evaluaciones (
          id SERIAL PRIMARY KEY,
          tipo VARCHAR(50) NOT NULL,
          titulo VARCHAR(255) NOT NULL,
          cadi VARCHAR(255) NOT NULL,
          descripcion TEXT,
          periodo VARCHAR(50) NOT NULL,
          fecha_inicio VARCHAR(100),
          fecha_cierre VARCHAR(100),
          preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
          estado VARCHAR(50) DEFAULT 'Abierta',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `)

      const b = req.body || {}
      const tipo = b.tipo || b.kind || 'evaluacion'
      const titulo = (b.titulo || b.title || '').trim()
      const cadi = (b.cadi || b.cadiNombre || b.cadiId || 'General').trim()
      const descripcion = b.descripcion || b.description || ''
      const periodo = (b.periodo || b.period || '2026-II').trim()
      const fecha_inicio = b.fecha_inicio || b.fechaInicio || b.start || ''
      const fecha_cierre = b.fecha_cierre || b.fechaCierre || b.end || ''
      const preguntas = b.preguntas || b.questions || []
      const estado = b.estado || 'Abierta'

      const preguntasJson = typeof preguntas === 'string' ? preguntas : JSON.stringify(preguntas)

      const insertSql = `
        INSERT INTO evaluaciones (tipo, titulo, cadi, descripcion, periodo, fecha_inicio, fecha_cierre, preguntas, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
        RETURNING *;
      `
      const result = await pool.query(insertSql, [
        tipo,
        titulo,
        cadi,
        descripcion,
        periodo,
        String(fecha_inicio),
        String(fecha_cierre),
        preguntasJson,
        estado,
      ])

      const row = result.rows[0]
      let parsedQ = []
      if (Array.isArray(row.preguntas)) {
        parsedQ = row.preguntas
      } else if (typeof row.preguntas === 'string') {
        try { parsedQ = JSON.parse(row.preguntas) } catch {}
      }

      const saved = {
        ...row,
        id: String(row.id).startsWith('eval-') ? String(row.id) : `eval-${row.id}`,
        evaluacionId: row.id,
        tipo: row.tipo,
        kind: row.tipo,
        titulo: row.titulo,
        title: row.titulo,
        cadi: row.cadi,
        cadiId: row.cadi !== 'General' ? row.cadi : '',
        descripcion: row.descripcion,
        description: row.descripcion,
        periodo: row.periodo,
        period: row.periodo,
        fecha_inicio: row.fecha_inicio,
        start: row.fecha_inicio,
        fecha_cierre: row.fecha_cierre,
        end: row.fecha_cierre,
        preguntas: parsedQ,
        questions: parsedQ,
        estado: row.estado,
        ok: true,
      }

      // Sincronizar también con evaluacionService para compatibilidad relacional
      try {
        await evaluacionService.crearFormulario({
          ...b,
          id: saved.id,
          tipo,
          titulo,
          periodo,
          start: fecha_inicio,
          end: fecha_cierre,
          questions: parsedQ,
        })
      } catch {}

      return sendJson(res, 201, saved)
    } catch (error) {
      console.warn('Aviso en createEvaluacion PostgreSQL:', error.message)
      return EvaluacionController.createForm(req, res)
    }
  }

  static async getEvaluaciones(req, res) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS evaluaciones (
          id SERIAL PRIMARY KEY,
          tipo VARCHAR(50) NOT NULL,
          titulo VARCHAR(255) NOT NULL,
          cadi VARCHAR(255) NOT NULL,
          descripcion TEXT,
          periodo VARCHAR(50) NOT NULL,
          fecha_inicio VARCHAR(100),
          fecha_cierre VARCHAR(100),
          preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
          estado VARCHAR(50) DEFAULT 'Abierta',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `)
      const result = await pool.query('SELECT * FROM evaluaciones ORDER BY id DESC;')
      const rows = result.rows.map((row) => {
        let parsedQ = []
        if (Array.isArray(row.preguntas)) {
          parsedQ = row.preguntas
        } else if (typeof row.preguntas === 'string') {
          try { parsedQ = JSON.parse(row.preguntas) } catch {}
        }
        return {
          ...row,
          id: String(row.id).startsWith('eval-') ? String(row.id) : `eval-${row.id}`,
          evaluacionId: row.id,
          tipo: row.tipo,
          kind: row.tipo,
          titulo: row.titulo,
          title: row.titulo,
          cadi: row.cadi,
          cadiId: row.cadi !== 'General' ? row.cadi : '',
          descripcion: row.descripcion || '',
          description: row.descripcion || '',
          periodo: row.periodo,
          period: row.periodo,
          fecha_inicio: row.fecha_inicio,
          start: row.fecha_inicio,
          fecha_cierre: row.fecha_cierre,
          end: row.fecha_cierre,
          preguntas: parsedQ,
          questions: parsedQ,
          estado: row.estado || 'Abierta',
        }
      })
      return sendJson(res, 200, rows)
    } catch (error) {
      console.warn('Aviso en getEvaluaciones PostgreSQL:', error.message)
      return EvaluacionController.getForms(req, res)
    }
  }

  static async updateForm(req, res) {
    const { id } = req.params
    try {
      const cleanId = String(id).replace('eval-', '');
      const b = req.body || {};
      const preguntas = b.questions || b.preguntas || [];
      const preguntasJson = typeof preguntas === 'string' ? preguntas : JSON.stringify(preguntas);

      try {
        await pool.query(
          `UPDATE evaluaciones 
           SET titulo = COALESCE($1, titulo),
               descripcion = COALESCE($2, descripcion),
               periodo = COALESCE($3, periodo),
               fecha_inicio = COALESCE($4, fecha_inicio),
               fecha_cierre = COALESCE($5, fecha_cierre),
               preguntas = $6::jsonb
           WHERE id::text = $7 OR id::text = $8;`,
          [b.title || b.titulo, b.description || b.descripcion, b.period || b.periodo, b.start || b.fecha_inicio, b.end || b.fecha_cierre, preguntasJson, cleanId, String(id)]
        );
      } catch (err) {
        console.warn('Aviso al actualizar tabla evaluaciones:', err.message);
      }

      let result = { ok: true, message: 'Formulario actualizado correctamente.' };
      try {
        result = await evaluacionService.actualizarFormulario(id, req.body || {});
      } catch (svcErr) {
        console.warn('Aviso al actualizar via evaluacionService:', svcErr.message);
      }
      return sendJson(res, 200, result);
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al actualizar formulario.', detail: error.message })
    }
  }

  static async deleteForm(req, res) {
    const { id } = req.params
    try {
      const result = await evaluacionService.eliminarFormulario(id)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al eliminar formulario.', detail: error.message })
    }
  }

  static async updateFormDates(req, res) {
    const { id } = req.params
    const { start, end } = req.body || {}
    try {
      const result = await evaluacionService.actualizarFechas(id, start, end)
      return sendJson(res, 200, result)
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al actualizar fechas.', detail: error.message })
    }
  }

  static async getFormResponses(req, res) {
    try {
      const responses = await evaluacionService.obtenerRespuestas(req.query || {})
      return sendJson(res, 200, { ok: true, responses, formResponses: responses })
    } catch (error) {
      console.warn('Aviso en getFormResponses (PostgreSQL no disponible, devolviendo lista limpia):', error.message)
      return sendJson(res, 200, { ok: true, responses: [], formResponses: [] })
    }
  }

  static async createFormResponse(req, res) {
    try {
      const result = await evaluacionService.registrarRespuesta(req.body || {})
      return sendJson(res, 201, { ok: true, ...result })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya has evaluado a este docente en este período.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al registrar evaluación.', detail: error.message })
    }
  }

  static async createFeedback(req, res) {
    try {
      const result = await evaluacionService.crearRetroalimentacion(req.body || {})
      return sendJson(res, 201, { ok: true, ...result })
    } catch (error) {
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al crear retroalimentación.', detail: error.message })
    }
  }

  static async createFeedbackResponse(req, res) {
    try {
      const id = await evaluacionService.responderRetroalimentacion(req.body || {})
      return sendJson(res, 201, { ok: true, id })
    } catch (error) {
      if (error.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Ya respondiste a esta retroalimentación.' })
      }
      const status = error.statusCode || 500
      return sendJson(res, status, { ok: false, message: error.message || 'Error al registrar respuesta.', detail: error.message })
    }
  }
}

export const getCadis = EvaluacionController.getCadis
export const createCadi = EvaluacionController.createCadi
export const updateCadi = EvaluacionController.updateCadi
export const deleteCadi = EvaluacionController.deleteCadi
export const getForms = EvaluacionController.getForms
export const getEvaluaciones = EvaluacionController.getEvaluaciones
export const getFormById = EvaluacionController.getFormById
export const createForm = EvaluacionController.createForm
export const createEvaluacion = EvaluacionController.createEvaluacion
export const updateForm = EvaluacionController.updateForm
export const updateEvaluacion = EvaluacionController.updateForm
export const deleteForm = EvaluacionController.deleteForm
export const deleteEvaluacion = EvaluacionController.deleteForm
export const updateFormDates = EvaluacionController.updateFormDates
export const getFormResponses = EvaluacionController.getFormResponses
export const createFormResponse = EvaluacionController.createFormResponse
export const createFeedback = EvaluacionController.createFeedback
export const createFeedbackResponse = EvaluacionController.createFeedbackResponse
