import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { Newspaper, Plus, Trash2, Edit, Eye, EyeOff, Upload, Loader2 } from 'lucide-react'
import { getNoticias, createNoticia, updateNoticia, deleteNoticia, logAdminAction, supabase } from '../../lib/supabase'

export function AdminNewsPage() {
  const [noticias, setNoticias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', categoria: 'Ley', fuente: '', estado: 'Vigente', fecha_publicacion: new Date().toISOString().split('T')[0], pdf_url: '', imagen_url: '', autor: '', is_published: true })

  const fetchNoticias = async () => {
    setLoading(true)
    try { const data = await getNoticias(); setNoticias(data) }
    catch { toast.error('Error al cargar noticias') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchNoticias() }, [])

  const handleSubmit = async () => {
    if (!form.titulo.trim() || !form.descripcion.trim()) { toast.error('Completa titulo y descripcion'); return }
    try {
      if (editId) {
        await updateNoticia(editId, form)
        await logAdminAction('update_noticia', 'noticia', editId)
        toast.success('Noticia actualizada')
      } else {
        await createNoticia(form)
        await logAdminAction('create_noticia', 'noticia')
        toast.success('Noticia creada')
      }
      setShowForm(false); setEditId(null); resetForm(); fetchNoticias()
    } catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta noticia?')) return
    try { await deleteNoticia(id); await logAdminAction('delete_noticia', 'noticia', id); toast.success('Eliminada'); fetchNoticias() }
    catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const handleTogglePublish = async (id: string, current: boolean) => {
    try { await updateNoticia(id, { is_published: !current }); await logAdminAction('toggle_noticia', 'noticia', id); toast.success(current ? 'Despublicada' : 'Publicada'); fetchNoticias() }
    catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const handleEdit = (n: any) => {
    setEditId(n.id); setForm({ titulo: n.titulo, descripcion: n.descripcion, categoria: n.categoria, fuente: n.fuente, estado: n.estado || 'Vigente', fecha_publicacion: n.fecha_publicacion, pdf_url: n.pdf_url || '', imagen_url: n.imagen_url || '', autor: n.autor || '', is_published: n.is_published !== false }); setShowForm(true)
  }

  const resetForm = () => setForm({ titulo: '', descripcion: '', categoria: 'Ley', fuente: '', estado: 'Vigente', fecha_publicacion: new Date().toISOString().split('T')[0], pdf_url: '', imagen_url: '', autor: '', is_published: true })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'pdf' | 'image') => {
    const file = e.target.files?.[0]; if (!file) return
    const setUploading = type === 'pdf' ? setUploadingPdf : setUploadingImage
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `noticias/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('noticias-pdf').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('noticias-pdf').getPublicUrl(path)
      const field = type === 'pdf' ? 'pdf_url' : 'imagen_url'
      setForm(prev => ({ ...prev, [field]: urlData.publicUrl }))
      toast.success(type === 'pdf' ? 'PDF subido correctamente' : 'Imagen subida correctamente')
    } catch (err: any) {
      console.error(`Error subiendo ${type}:`, err)
      toast.error(err?.message || `Error al subir ${type === 'pdf' ? 'el PDF' : 'la imagen'}. Verifica que el bucket de storage exista y sea público.`)
    }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Newspaper size={24} className="text-primary" />
          <div>
            <PageTitle>Gestion de Noticias</PageTitle>
            <PageDescription>Crear, editar y administrar noticias ({noticias.length} total)</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => { setShowForm(!showForm); setEditId(null); resetForm() }}>
              <Plus size={16} className="mr-2" />Nueva Noticia
            </Button>

            {showForm && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{editId ? 'Editar Noticia' : 'Nueva Noticia'}</h3>
                <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-muted-foreground mb-1">Titulo *</label><input type="text" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                  <div><label className="block text-sm font-medium text-muted-foreground mb-1">Descripcion *</label><textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none" /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Categoria</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"><option>Ley</option><option>Resolucion</option><option>Decreto</option><option>Directiva</option><option>Noticia</option></select></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Fuente</label><input type="text" value={form.fuente} onChange={e => setForm({ ...form, fuente: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Estado</label><select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"><option>Vigente</option><option>Nueva</option><option>Modificada</option><option>Derogada</option></select></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Fecha Publicacion</label><input type="date" value={form.fecha_publicacion} onChange={e => setForm({ ...form, fecha_publicacion: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">Autor</label><input type="text" value={form.autor} onChange={e => setForm({ ...form, autor: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                    <div><label className="block text-sm font-medium text-muted-foreground mb-1">URL PDF</label><input type="text" value={form.pdf_url} onChange={e => setForm({ ...form, pdf_url: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Subir PDF</label>
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors ${uploadingPdf ? 'bg-muted text-muted-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                        {uploadingPdf ? <><Loader2 size={16} className="animate-spin" />Subiendo...</> : <><Upload size={16} />Seleccionar PDF</>}
                        <input type="file" accept=".pdf" onChange={e => handleFileUpload(e, 'pdf')} className="hidden" disabled={uploadingPdf} />
                      </label>
                      {form.pdf_url && <span className="text-xs text-green-600 ml-2">PDF cargado</span>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Subir Imagen</label>
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors ${uploadingImage ? 'bg-muted text-muted-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                        {uploadingImage ? <><Loader2 size={16} className="animate-spin" />Subiendo...</> : <><Upload size={16} />Seleccionar Imagen</>}
                        <input type="file" accept="image/*" onChange={e => handleFileUpload(e, 'image')} className="hidden" disabled={uploadingImage} />
                      </label>
                      {form.imagen_url && <span className="text-xs text-green-600 ml-2">Imagen cargada</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={form.is_published} onChange={e => setForm({ ...form, is_published: e.target.checked })} className="rounded" />
                    <label className="text-sm">Publicada</label>
                  </div>
                  <div className="flex gap-3">
                    <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handleSubmit} disabled={uploadingPdf || uploadingImage}>{editId ? 'Actualizar' : 'Crear'}</Button>
                    <Button className="bg-secondary hover:bg-secondary/80" onClick={() => { setShowForm(false); setEditId(null) }}>Cancelar</Button>
                  </div>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {noticias.map(n => (
                <Card key={n.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${n.is_published !== false ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}`}>
                      {n.is_published !== false ? 'Publicada' : 'Borrador'}
                    </span>
                    <span className="text-xs text-muted-foreground">{n.categoria}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{n.titulo}</h4>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{n.descripcion}</p>
                  <div className="text-xs text-muted-foreground mb-3">{n.fecha_publicacion} | {n.fuente}</div>
                  <div className="flex gap-1">
                    <button onClick={() => handleTogglePublish(n.id, n.is_published !== false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title={n.is_published !== false ? 'Despublicar' : 'Publicar'}>{n.is_published !== false ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                    <button onClick={() => handleEdit(n)} className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600" title="Editar"><Edit size={14} /></button>
                    <button onClick={() => handleDelete(n.id)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600" title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </Card>
              ))}
            </div>
            {noticias.length === 0 && <p className="text-center text-muted-foreground py-8">No hay noticias</p>}
          </>
        )}
      </PageBody>
    </Page>
  )
}
