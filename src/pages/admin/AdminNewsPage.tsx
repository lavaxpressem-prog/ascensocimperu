import React, { useState, useEffect, useCallback } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { Newspaper, Plus, Trash2, Edit, Eye, EyeOff, Upload, Loader2, Archive, ArchiveRestore, Search, FileText, ExternalLink, Download, X, ChevronLeft, ChevronRight, Globe, Lock } from 'lucide-react'
import { supabase, getNoticiasAdmin, logAdminAction, type Noticia } from '../../lib/supabase'

type NewsStatus = 'all' | 'draft' | 'published' | 'archived'
type NewsCategory = 'all' | 'Ley' | 'Resolucion' | 'Decreto' | 'Directiva' | 'Noticia'

const CATEGORIES: NewsCategory[] = ['all', 'Ley', 'Resolucion', 'Decreto', 'Directiva', 'Noticia']
const STATUS_LABELS: Record<NewsStatus, string> = { all: 'Todos', draft: 'Borrador', published: 'Publicada', archived: 'Archivada' }
const MAX_PDF_SIZE_MB = 20
const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
}

interface FormData {
  titulo: string
  summary: string
  descripcion: string
  categoria: string
  autor: string
  is_pdf_public: boolean
  status: 'draft' | 'published'
}

const defaultForm: FormData = {
  titulo: '',
  summary: '',
  descripcion: '',
  categoria: 'Ley',
  autor: '',
  is_pdf_public: false,
  status: 'draft',
}

export function AdminNewsPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<NewsStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<NewsCategory>('all')
  const [page, setPage] = useState(0)
  const [previewNews, setPreviewNews] = useState<Noticia | null>(null)
  const PAGE_SIZE = 12

  const fetchNoticias = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getNoticiasAdmin({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        status: statusFilter,
        category: categoryFilter,
        search,
      })
      setNoticias(result.data)
      setTotalCount(result.count)
    } catch (err: unknown) {
      console.error('[AdminNews] Error cargando noticias:', err)
      toast.error('Error al cargar noticias')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, categoryFilter, search])

  useEffect(() => { fetchNoticias() }, [fetchNoticias])

  useEffect(() => { setPage(0) }, [search, statusFilter, categoryFilter])

  const resetForm = () => {
    setForm(defaultForm)
    setPdfFile(null)
    setEditId(null)
  }

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { toast.error('El título es requerido'); return }
    if (!form.summary.trim()) { toast.error('El resumen es requerido'); return }

    setUploading(true)
    setUploadProgress(0)

    try {
      if (editId) {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (!token) throw new Error('No hay sesión')

        const payload: Record<string, unknown> = {
          newsId: editId,
          title: form.titulo,
          summary: form.summary,
          content: form.descripcion,
          category: form.categoria,
          is_pdf_public: form.is_pdf_public,
          status: form.status,
        }

        const res = await fetch('/api/news/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error)

        if (pdfFile) {
          await handleUploadPdf(editId)
        }

        await logAdminAction('update_noticia', 'noticia', editId)
        toast.success('Noticia actualizada correctamente')
      } else {
        if (pdfFile) {
          await createWithPdf()
        } else {
          await createWithoutPdf()
        }
      }
      resetForm()
      setShowForm(false)
      await fetchNoticias()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar'
      toast.error(message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const createWithPdf = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('No hay sesión')

    const formData = new FormData()
    formData.append('pdf', pdfFile!)
    formData.append('title', form.titulo)
    formData.append('summary', form.summary)
    formData.append('content', form.descripcion)
    formData.append('category', form.categoria)
    formData.append('status', form.status)
    formData.append('is_pdf_public', String(form.is_pdf_public))

    const fakeProgress = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 300)

    try {
      const res = await fetch('/api/news/upload-pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await logAdminAction('create_noticia', 'noticia', data.newsId)
      toast.success('Noticia creada correctamente con PDF')
    } finally {
      clearInterval(fakeProgress)
      setUploadProgress(100)
    }
  }

  const createWithoutPdf = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('No hay sesión')

    const res = await fetch('/api/news/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: form.titulo,
        summary: form.summary,
        content: form.descripcion,
        category: form.categoria,
        status: form.status,
        is_pdf_public: form.is_pdf_public,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await logAdminAction('create_noticia', 'noticia', data.newsId)
    toast.success('Noticia creada correctamente')
  }

  const handleUploadPdf = async (newsId: string) => {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    if (!token || !pdfFile) return

    const formData = new FormData()
    formData.append('pdf', pdfFile)
    formData.append('news_id', newsId)

    const res = await fetch('/api/news/replace-pdf', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    await logAdminAction('upload_pdf', 'noticia', newsId)
  }

  const handleAction = async (newsId: string, action: string) => {
    const labels: Record<string, string> = {
      publish: '¿Seguro que deseas publicar esta noticia?',
      unpublish: '¿Seguro que deseas despublicar esta noticia?',
      archive: '¿Seguro que deseas archivar esta noticia?',
      unarchive: '¿Seguro que deseas restaurar esta noticia?',
      delete: '¿Seguro que deseas eliminar esta noticia? Esta acción no se puede deshacer.',
      delete_pdf: '¿Seguro que deseas eliminar el PDF de esta noticia?',
    }

    if (labels[action] && !confirm(labels[action])) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No hay sesión')

      const res = await fetch('/api/news/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newsId, action }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      await logAdminAction(`${action}_noticia`, 'noticia', newsId)
      toast.success(data.message || 'Acción completada')
      fetchNoticias()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al realizar la acción'
      toast.error(message)
    }
  }

  const handleEdit = (n: Noticia) => {
    setEditId(n.id)
    setForm({
      titulo: n.titulo,
      summary: n.summary || '',
      descripcion: n.descripcion,
      categoria: n.categoria,
      autor: n.autor || '',
      is_pdf_public: n.is_pdf_public || false,
      status: (n.status as 'draft' | 'published') || 'draft',
    })
    setPdfFile(null)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <Newspaper size={24} className="text-primary" />
          <div>
            <PageTitle>Gestion de Noticias</PageTitle>
            <PageDescription>Crear, editar y administrar noticias ({totalCount} total)</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading && noticias.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => {
                if (showForm) {
                  resetForm()
                  setShowForm(false)
                } else {
                  resetForm()
                  setShowForm(true)
                }
              }}>
                <Plus size={16} className="mr-2" />
                {showForm ? 'Cancelar' : 'Nueva Noticia'}
              </Button>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar noticias..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value as NewsStatus)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
                  {(Object.entries(STATUS_LABELS) as [NewsStatus, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as NewsCategory)}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c === 'all' ? 'Todas' : c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Form */}
            {showForm && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">{editId ? 'Editar Noticia' : 'Nueva Noticia'}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Titulo *</label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={e => setForm({ ...form, titulo: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                      placeholder="Titulo de la noticia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Resumen *</label>
                    <textarea
                      value={form.summary}
                      onChange={e => setForm({ ...form, summary: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                      placeholder="Resumen breve de la noticia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Contenido / Descripcion</label>
                    <textarea
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground resize-none"
                      placeholder="Contenido detallado de la noticia"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Categoria</label>
                      <select
                        value={form.categoria}
                        onChange={e => setForm({ ...form, categoria: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                      >
                        <option>Ley</option>
                        <option>Resolucion</option>
                        <option>Decreto</option>
                        <option>Directiva</option>
                        <option>Noticia</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Estado</label>
                      <select
                        value={form.status}
                        onChange={e => setForm({ ...form, status: e.target.value as 'draft' | 'published' })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                      >
                        <option value="draft">Borrador</option>
                        <option value="published">Publicada</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Autor</label>
                      <input
                        type="text"
                        value={form.autor}
                        onChange={e => setForm({ ...form, autor: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
                        placeholder="Autor de la noticia"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer py-2">
                        <input
                          type="checkbox"
                          checked={form.is_pdf_public}
                          onChange={e => setForm({ ...form, is_pdf_public: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm">PDF accesible publicamente</span>
                      </label>
                    </div>
                  </div>

                  {/* PDF Upload */}
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      PDF {editId ? '(Dejar vacio para mantener el actual)' : ''}
                    </label>
                    <div className="flex items-center gap-3">
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm transition-colors ${uploading ? 'bg-muted text-muted-foreground' : 'bg-secondary hover:bg-secondary/80'}`}>
                        {uploading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Subiendo PDF... {uploadProgress}%
                          </>
                        ) : (
                          <>
                            <Upload size={16} />
                            {pdfFile ? pdfFile.name : 'Seleccionar PDF'}
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.type !== 'application/pdf') {
                                toast.error('El archivo debe ser un PDF')
                                return
                              }
                              if (file.size > MAX_PDF_SIZE_BYTES) {
                                toast.error(`El archivo PDF supera el tamaño máximo permitido de ${MAX_PDF_SIZE_MB}MB`)
                                return
                              }
                              setPdfFile(file)
                            }
                          }}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      {pdfFile && (
                        <button
                          onClick={() => setPdfFile(null)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {editId && noticias.find(n => n.id === editId)?.google_drive_file_id && (
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF actual: {noticias.find(n => n.id === editId)?.pdf_name || 'Sin nombre'}
                      </p>
                    )}
                  </div>

                  {uploading && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      className="bg-primary hover:bg-primary/90 text-white"
                      onClick={handleSubmit}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
                      {editId ? 'Actualizar' : 'Crear Noticia'}
                    </Button>
                    <Button className="bg-secondary hover:bg-secondary/80" onClick={() => { resetForm(); setShowForm(false) }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* News Grid */}
            {noticias.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No hay noticias</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {noticias.map(n => (
                    <Card key={n.id} className="p-4 flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[n.status] || statusColors.draft}`}>
                          {n.status === 'published' ? 'Publicada' : n.status === 'archived' ? 'Archivada' : 'Borrador'}
                        </span>
                        <span className="text-xs text-muted-foreground">{n.categoria}</span>
                      </div>

                      <h4 className="font-semibold text-foreground text-sm mb-1 line-clamp-2">{n.titulo}</h4>
                      {n.summary && <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{n.summary}</p>}
                      {n.descripcion && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{n.descripcion}</p>}

                      <div className="text-xs text-muted-foreground mb-3">
                        {formatDate(n.fecha_publicacion)}
                        {n.fuente && ` | ${n.fuente}`}
                        {n.autor && ` | ${n.autor}`}
                      </div>

                      {n.google_drive_file_id && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <FileText size={12} />
                          <span className="truncate">{n.pdf_name || 'PDF adjunto'}</span>
                          {n.pdf_size && <span>({formatFileSize(n.pdf_size)})</span>}
                          {n.is_pdf_public ? <Globe size={10} className="text-green-500" /> : <Lock size={10} className="text-yellow-500" />}
                        </div>
                      )}

                      <div className="mt-auto pt-2 border-t border-border flex flex-wrap gap-1">
                        <button
                          onClick={() => setPreviewNews(n)}
                          className="p-1.5 rounded hover:bg-secondary text-muted-foreground"
                          title="Ver"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleEdit(n)}
                          className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        {n.status !== 'published' && (
                          <button
                            onClick={() => handleAction(n.id, 'publish')}
                            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                            title="Publicar"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        {n.status === 'published' && (
                          <button
                            onClick={() => handleAction(n.id, 'unpublish')}
                            className="p-1.5 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600"
                            title="Despublicar"
                          >
                            <EyeOff size={14} />
                          </button>
                        )}
                        {n.status !== 'archived' ? (
                          <button
                            onClick={() => handleAction(n.id, 'archive')}
                            className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600"
                            title="Archivar"
                          >
                            <Archive size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction(n.id, 'unarchive')}
                            className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                            title="Restaurar"
                          >
                            <ArchiveRestore size={14} />
                          </button>
                        )}
                        {n.google_drive_file_id && (
                          <button
                            onClick={() => handleAction(n.id, 'delete_pdf')}
                            className="p-1.5 rounded hover:bg-orange-100 dark:hover:bg-orange-900/30 text-orange-600"
                            title="Eliminar PDF"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleAction(n.id, 'delete')}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-2 rounded-lg border border-border disabled:opacity-50 hover:bg-secondary"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Pagina {page + 1} de {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-2 rounded-lg border border-border disabled:opacity-50 hover:bg-secondary"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Preview Modal */}
            {previewNews && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPreviewNews(null)}>
                <div className="bg-background border border-border rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold text-lg">{previewNews.titulo}</h3>
                    <button onClick={() => setPreviewNews(null)} className="p-1 rounded hover:bg-secondary"><X size={20} /></button>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[previewNews.status] || statusColors.draft}`}>
                        {previewNews.status === 'published' ? 'Publicada' : previewNews.status === 'archived' ? 'Archivada' : 'Borrador'}
                      </span>
                      <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full bg-secondary">{previewNews.categoria}</span>
                    </div>
                    {previewNews.summary && <p className="text-sm text-muted-foreground">{previewNews.summary}</p>}
                    {previewNews.descripcion && <p className="text-sm">{previewNews.descripcion}</p>}
                    <div className="text-xs text-muted-foreground">
                      Fecha: {formatDate(previewNews.fecha_publicacion)} | Autor: {previewNews.autor || 'N/A'}
                    </div>
                    {previewNews.google_drive_view_url && (
                      <div className="flex gap-2 pt-2">
                        <a
                          href={previewNews.google_drive_view_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90"
                        >
                          <ExternalLink size={14} /> Ver PDF
                        </a>
                        {previewNews.google_drive_download_url && (
                          <a
                            href={previewNews.google_drive_download_url}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm hover:bg-secondary/80"
                          >
                            <Download size={14} /> Descargar
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>
    </Page>
  )
}
