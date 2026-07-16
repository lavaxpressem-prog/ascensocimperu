import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { FileText, Plus, Trash2, Edit, ToggleLeft, ToggleRight, Upload, Download, Search } from 'lucide-react'
import { getQuestionsForAdmin, getQuestionsCountAdmin, createQuestion, updateQuestion, deleteQuestion, logAdminAction } from '../../lib/supabase'

export function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ numero: 0, pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: '', indice_correcto: 0, ubicacion: '', codigo: '' })

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const [data, count] = await Promise.all([getQuestionsForAdmin(page), getQuestionsCountAdmin()])
      setQuestions(data)
      setTotal(count)
    } catch { toast.error('Error al cargar preguntas') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchQuestions() }, [page])

  const filtered = questions.filter(q => !searchQuery || q.pregunta.toLowerCase().includes(searchQuery.toLowerCase()) || String(q.id).includes(searchQuery))

  const handleSubmit = async () => {
    if (!form.pregunta.trim() || !form.respuesta_correcta.trim()) { toast.error('Completa los campos requeridos'); return }
    const opts = form.opciones.filter(o => o.trim()).map((text, i) => ({ id: String.fromCharCode(97 + i), text }))
    try {
      if (editId) {
        await updateQuestion(editId, { pregunta: form.pregunta, opciones: opts, respuesta_correcta: form.respuesta_correcta, indice_correcto: form.indice_correcto, ubicacion: form.ubicacion, codigo: form.codigo })
        await logAdminAction('update_question', 'question', String(editId))
        toast.success('Pregunta actualizada')
      } else {
        await createQuestion({ numero: form.numero || total + 1, pregunta: form.pregunta, opciones: opts, respuesta_correcta: form.respuesta_correcta, indice_correcto: form.indice_correcto, ubicacion: form.ubicacion, codigo: form.codigo })
        await logAdminAction('create_question', 'question')
        toast.success('Pregunta creada')
      }
      setShowForm(false); setEditId(null); setForm({ numero: 0, pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: '', indice_correcto: 0, ubicacion: '', codigo: '' }); fetchQuestions()
    } catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar esta pregunta?')) return
    try { await deleteQuestion(id); await logAdminAction('delete_question', 'question', String(id)); toast.success('Eliminada'); fetchQuestions() }
    catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const handleEdit = (q: any) => {
    setEditId(q.id)
    const opts = Array.isArray(q.opciones) ? q.opciones : []
    setForm({ numero: q.numero, pregunta: q.pregunta, opciones: [...opts.map((o: any) => o.text || ''), '', '', '', ''].slice(0, 6), respuesta_correcta: q.respuesta_correcta, indice_correcto: q.indice_correcto, ubicacion: q.ubicacion || '', codigo: q.codigo || '' })
    setShowForm(true)
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(questions, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'preguntas_export.json'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Preguntas exportadas')
  }

  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      const text = await file.text(); const data = JSON.parse(text)
      if (!Array.isArray(data)) { toast.error('Formato invalido'); return }
      const questions = data.map((q: any, i: number) => ({ numero: q.numero || i + 1, pregunta: q.pregunta, opciones: q.opciones || [], respuesta_correcta: q.respuesta_correcta, indice_correcto: q.indice_correcto || 0, ubicacion: q.ubicacion || '', codigo: q.codigo || '' }))
      const { importQuestions } = await import('../../lib/supabase')
      await importQuestions(questions)
        await logAdminAction('import_questions', 'question', undefined, { count: questions.length })
      toast.success(`${questions.length} preguntas importadas`)
      fetchQuestions()
    } catch (err: any) { toast.error(err?.message || 'Error al importar') }
    e.target.value = ''
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <FileText size={24} className="text-primary" />
          <div>
            <PageTitle>Banco de Preguntas</PageTitle>
            <PageDescription>Gestionar preguntas del sistema ({total} total)</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ numero: 0, pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: '', indice_correcto: 0, ubicacion: '', codigo: '' }) }}>
                <Plus size={16} className="mr-2" />Nueva Pregunta
              </Button>
              <Button className="bg-secondary hover:bg-secondary/80" onClick={exportJSON}><Download size={16} className="mr-2" />Exportar JSON</Button>
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 cursor-pointer text-sm font-medium">
                <Upload size={16} />Importar JSON
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>

            {showForm && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{editId ? 'Editar Pregunta' : 'Nueva Pregunta'}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Numero</label><input type="number" value={form.numero} onChange={e => setForm({ ...form, numero: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Ubicacion</label><input type="text" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Codigo</label><input type="text" value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-muted-foreground mb-1">Pregunta *</label><textarea value={form.pregunta} onChange={e => setForm({ ...form, pregunta: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {form.opciones.map((opt, i) => (
                      <div key={i}><label className="block text-sm font-medium text-muted-foreground mb-1">Opcion {String.fromCharCode(65 + i)}</label><input type="text" value={opt} onChange={e => { const n = [...form.opciones]; n[i] = e.target.value; setForm({ ...form, opciones: n }) }} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Respuesta Correcta *</label><input type="text" value={form.respuesta_correcta} onChange={e => setForm({ ...form, respuesta_correcta: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Indice Correcto</label><select value={form.indice_correcto} onChange={e => setForm({ ...form, indice_correcto: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"><option value={0}>A (0)</option><option value={1}>B (1)</option><option value={2}>C (2)</option><option value={3}>D (3)</option><option value={4}>E (4)</option></select></div>
                  </div>
                  <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleSubmit}>{editId ? 'Actualizar' : 'Crear'}</Button>
                    <Button className="bg-secondary hover:bg-secondary/80" onClick={() => { setShowForm(false); setEditId(null) }}>Cancelar</Button>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input type="text" placeholder="Buscar preguntas..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[600px]">
                  <thead><tr className="border-b border-border"><th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">ID</th><th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Pregunta</th><th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Correcta</th><th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Acciones</th></tr></thead>
                  <tbody>
                    {filtered.map(q => (
                      <tr key={q.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-3 px-2 text-sm text-muted-foreground">{q.id}</td>
                        <td className="py-3 px-2 text-sm text-foreground max-w-[300px] truncate">{q.pregunta}</td>
                        <td className="py-3 px-2 text-sm text-foreground">{q.respuesta_correcta}</td>
                        <td className="py-3 px-2"><div className="flex gap-1 justify-end"><button onClick={() => handleEdit(q)} className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><Edit size={14} /></button><button onClick={() => handleDelete(q.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"><Trash2 size={14} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-sm text-muted-foreground">Pagina {page + 1} de {Math.ceil(total / 1000)}</span>
                <div className="flex gap-2">
                  <Button className="bg-secondary hover:bg-secondary/80 text-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                  <Button className="bg-secondary hover:bg-secondary/80 text-sm" disabled={(page + 1) * 1000 >= total} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
                </div>
              </div>
            </Card>
          </>
        )}
      </PageBody>
    </Page>
  )
}
