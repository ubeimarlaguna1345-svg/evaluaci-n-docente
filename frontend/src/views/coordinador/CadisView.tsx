import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Award } from 'lucide-react'
import { useDB, actions, type CADI } from '../../store'
import { Header, Card, Field, Msg, input, btn, btnGhost } from '../common'

export function CadisView() {
  const db = useDB()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cod, setCod] = useState('')
  const [nom, setNom] = useState('')
  const [tipo, setTipo] = useState<'CADI' | 'CAI'>('CADI')
  const [sem, setSem] = useState('3')
  const [docId, setDocId] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const docentes = db.users.filter((u) => u.role === 'docente' && u.active)

  const cancelar = () => {
    setEditingId(null)
    setCod('')
    setNom('')
    setTipo('CADI')
    setSem('3')
    setDocId('')
    setMsg(null)
  }

  const startEdit = (c: CADI) => {
    setEditingId(c.id)
    setCod(c.codigo)
    setNom(c.nombre)
    setTipo(c.tipo === 'CAI' ? 'CAI' : 'CADI')
    setSem(String(c.semestre))
    setDocId(c.docenteId || '')
    setMsg(null)
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cod.trim() || !nom.trim()) return setMsg({ kind: 'err', text: 'Código y nombre son obligatorios.' })

    const codigoTrim = cod.trim().toUpperCase()
    const existe = db.cadis.some(
      (c) => c.codigo.toLowerCase() === codigoTrim.toLowerCase() && c.id !== editingId
    )
    if (existe) {
      return setMsg({ kind: 'err', text: 'Ya existe otro campo de aprendizaje con ese código.' })
    }

    setLoading(true)
    try {
      if (editingId) {
        await actions.updateCADI(editingId, {
          codigo: codigoTrim,
          nombre: nom.trim(),
          semestre: Number(sem),
          tipo,
          docenteId: docId || null,
        })
        setMsg({ kind: 'ok', text: `${tipo} "${nom.trim()}" actualizado correctamente en PostgreSQL.` })
        cancelar()
      } else {
        await actions.createCADI({
          codigo: codigoTrim,
          nombre: nom.trim(),
          semestre: Number(sem),
          tipo,
          docenteId: docId || undefined,
        })
        setMsg({ kind: 'ok', text: `${tipo} "${nom.trim()}" registrado correctamente en PostgreSQL.` })
        setCod('')
        setNom('')
        setTipo('CADI')
        setDocId('')
      }
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al procesar el campo de aprendizaje.' })
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (c: CADI) => {
    const tipoLabel = c.tipo || 'CADI'
    const confirmar = window.confirm(`¿Estás seguro de eliminar el ${tipoLabel} "${c.nombre}" (${c.codigo})? Esta acción removerá la materia de PostgreSQL.`)
    if (!confirmar) return

    setLoading(true)
    try {
      await actions.deleteCADI(c.id)
      if (editingId === c.id) {
        cancelar()
      }
      setMsg({ kind: 'ok', text: `${tipoLabel} "${c.nombre}" eliminado correctamente de PostgreSQL.` })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al eliminar materia.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header
        title="Campos de Aprendizaje (CADIs / CAIs)"
        sub="Campos de Aprendizaje Disciplinares e Institucionales articulados al MEDIT y PGC de la Facultad de Ingeniería (Sede Facatativá)."
      />

      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <Card className={editingId ? 'ring-2 ring-pine/30 transition-all' : ''}>
          <form onSubmit={guardar} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                {editingId ? (
                  <>
                    <Pencil size={18} className="text-pine" />
                    <span>Modificar {tipo}</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>+ Registrar CADI / CAI</span>
                  </>
                )}
              </h3>
              {editingId && (
                <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">
                  Modo Edición
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_135px_80px] gap-3">
              <Field label="Código">
                <input
                  className={input}
                  value={cod}
                  onChange={(e) => setCod(e.target.value)}
                  placeholder="SIS301 / CAI101"
                />
              </Field>
              <Field label="Tipo de Campo">
                <select
                  className={input}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as 'CADI' | 'CAI')}
                >
                  <option value="CADI">CADI (Disciplinar)</option>
                  <option value="CAI">CAI (Institucional)</option>
                </select>
              </Field>
              <Field label="Semestre">
                <select className={input} value={sem} onChange={(e) => setSem(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => <option key={s} value={s}>{s}°</option>)}
                </select>
              </Field>
            </div>
            <Field label={`Nombre de la materia (${tipo})`}>
              <input
                className={input}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={tipo === 'CAI' ? 'Lectura Crítica' : 'Programación II'}
              />
            </Field>
            <Field label="Docente responsable">
              <select className={input} value={docId} onChange={(e) => setDocId(e.target.value)}>
                <option value="">Sin docente asignado</option>
                {docentes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            {msg && <Msg {...msg} />}
            <div className="flex items-center gap-2 pt-1">
              <button className={btn} disabled={loading}>
                {editingId ? 'Actualizar Materia' : 'Guardar Materia'}
              </button>
              {editingId && (
                <button type="button" onClick={cancelar} className={btnGhost} disabled={loading}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </Card>

        <Card className="p-0">
          <div className="border-b border-line p-4">
            <p className="font-semibold">Campos de Aprendizaje (CADIs / CAIs) registrados</p>
            <p className="text-xs text-ink/60">Campos Disciplinares e Institucionales articulados al MEDIT y PGC (Sede Facatativá)</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="p-4">Código / CADI / CAI</th>
                <th>Semestre</th>
                <th>Docente Asignado</th>
                <th className="text-right pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-xs">
              {db.cadis.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm text-ink/50">
                    <Award size={32} className="mx-auto mb-2 text-ink/30" />
                    No hay materias o campos de aprendizaje registrados. Registra uno nuevo desde el formulario.
                  </td>
                </tr>
              ) : (
                db.cadis.map((c) => {
                  const isCurrent = editingId === c.id
                  const isCai = c.tipo === 'CAI'
                  return (
                    <tr key={c.id} className={isCurrent ? 'bg-pine/5 font-medium' : undefined}>
                      <td className="p-4">
                        <div className="font-semibold text-pine">{c.nombre}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="font-mono text-xs text-ink/60">{c.codigo}</span>
                          {isCai ? (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                              CAI
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                              CADI
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{c.semestre}° Semestre</td>
                      <td>
                        <select
                          className={`${input} py-1 text-xs`}
                          value={c.docenteId || ''}
                          onChange={(e) => actions.assignCadiTeacher(c.id, e.target.value || null)}
                        >
                          <option value="">Sin asignar</option>
                          {docentes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td className="text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(c)}
                            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                              isCurrent
                                ? 'bg-pine text-white'
                                : 'text-pine hover:bg-pine/10'
                            }`}
                            title={`Editar ${c.tipo || 'CADI'}`}
                          >
                            <Pencil size={13} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(c)}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title={`Eliminar ${c.tipo || 'CADI'}`}
                          >
                            <Trash2 size={13} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}
