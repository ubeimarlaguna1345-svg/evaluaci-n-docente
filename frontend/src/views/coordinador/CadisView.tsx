import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Award } from 'lucide-react'
import { useDB, actions, type CADI } from '../../store'
import { Header, Card, Field, Msg, input, btn, btnGhost } from '../common'

export function CadisView() {
  const db = useDB()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cod, setCod] = useState('')
  const [nom, setNom] = useState('')
  const [sem, setSem] = useState('3')
  const [docId, setDocId] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const docentes = db.users.filter((u) => u.role === 'docente' && u.active)

  const cancelar = () => {
    setEditingId(null)
    setCod('')
    setNom('')
    setSem('3')
    setDocId('')
    setMsg(null)
  }

  const startEdit = (c: CADI) => {
    setEditingId(c.id)
    setCod(c.codigo)
    setNom(c.nombre)
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
      return setMsg({ kind: 'err', text: 'Ya existe otro CADI con ese código.' })
    }

    setLoading(true)
    try {
      if (editingId) {
        await actions.updateCADI(editingId, {
          codigo: codigoTrim,
          nombre: nom.trim(),
          semestre: Number(sem),
          docenteId: docId || null,
        })
        setMsg({ kind: 'ok', text: `CADI "${nom.trim()}" actualizado correctamente en PostgreSQL.` })
        cancelar()
      } else {
        await actions.createCADI({
          codigo: codigoTrim,
          nombre: nom.trim(),
          semestre: Number(sem),
          docenteId: docId || undefined,
        })
        setMsg({ kind: 'ok', text: `CADI "${nom.trim()}" registrado correctamente en PostgreSQL.` })
        setCod(''); setNom(''); setDocId('')
      }
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al procesar CADI.' })
    } finally {
      setLoading(false)
    }
  }

  const eliminar = async (c: CADI) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar el CADI "${c.nombre}" (${c.codigo})? Esta acción removerá la materia de PostgreSQL.`)
    if (!confirmar) return

    setLoading(true)
    try {
      await actions.deleteCADI(c.id)
      if (editingId === c.id) {
        cancelar()
      }
      setMsg({ kind: 'ok', text: `CADI "${c.nombre}" eliminado correctamente de PostgreSQL.` })
    } catch (e) {
      setMsg({ kind: 'err', text: (e as Error).message || 'Error al eliminar CADI.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header
        title="CADIs y Núcleos Temáticos"
        sub="Campos de Aprendizaje Disciplinares articulados a los PGC de la Facultad de Ingeniería (Sede Facatativá)."
      />

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card className={editingId ? 'ring-2 ring-pine/30 transition-all' : ''}>
          <form onSubmit={guardar} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                {editingId ? (
                  <>
                    <Pencil size={18} className="text-pine" />
                    <span>Modificar CADI</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span>Registrar CADI / Materia</span>
                  </>
                )}
              </h3>
              {editingId && (
                <span className="rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine">
                  Modo Edición
                </span>
              )}
            </div>

            <div className="grid grid-cols-[1fr_90px] gap-3">
              <Field label="Código"><input className={input} value={cod} onChange={(e) => setCod(e.target.value)} placeholder="SIS301" /></Field>
              <Field label="Semestre">
                <select className={input} value={sem} onChange={(e) => setSem(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => <option key={s} value={s}>{s}°</option>)}
                </select>
              </Field>
            </div>
            <Field label="Nombre del CADI"><input className={input} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Programación II" /></Field>
            <Field label="Docente responsable">
              <select className={input} value={docId} onChange={(e) => setDocId(e.target.value)}>
                <option value="">Sin docente asignado</option>
                {docentes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            {msg && <Msg {...msg} />}
            <div className="flex items-center gap-2 pt-1">
              <button className={btn} disabled={loading}>
                {editingId ? 'Actualizar CADI' : 'Guardar CADI'}
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
            <p className="font-semibold">CADIs registrados en la Facultad</p>
            <p className="text-xs text-ink/60">Semestre III de Ingeniería de Sistemas y Computación (Facatativá)</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-paper text-left text-xs uppercase tracking-wider text-ink/50">
              <tr>
                <th className="p-4">Código / CADI</th>
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
                    No hay materias o CADIs registrados. Registra uno nuevo desde el formulario.
                  </td>
                </tr>
              ) : (
                db.cadis.map((c) => {
                  const isCurrent = editingId === c.id
                  return (
                    <tr key={c.id} className={isCurrent ? 'bg-pine/5 font-medium' : undefined}>
                      <td className="p-4">
                        <div className="font-semibold text-pine">{c.nombre}</div>
                        <div className="font-mono text-xs text-ink/50">{c.codigo}</div>
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
                            title="Editar CADI"
                          >
                            <Pencil size={13} />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminar(c)}
                            className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                            title="Eliminar CADI"
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
