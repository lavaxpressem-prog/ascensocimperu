import React, { useState, useEffect } from 'react'
import { Page, PageHeader, PageTitle, PageDescription, PageBody, Card, Button, toast } from '@blinkdotnew/ui'
import { FolderOpen, Upload, Trash2, FileText, Image } from 'lucide-react'
import { getUploadedFiles, createUploadedFile, deleteUploadedFile, logAdminAction, supabase } from '../../lib/supabase'

export function AdminFilesPage() {
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [folderFilter, setFolderFilter] = useState('all')

  const fetchFiles = async () => {
    setLoading(true)
    try { const data = await getUploadedFiles(); setFiles(data) }
    catch { toast.error('Error al cargar archivos') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchFiles() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `admin-files/${folderFilter === 'all' ? 'general' : folderFilter}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('noticias-pdf').upload(path, file)
      if (error) throw error
      const { data: urlData } = supabase.storage.from('noticias-pdf').getPublicUrl(path)
      await createUploadedFile({ file_name: file.name, file_path: urlData.publicUrl, file_type: file.type, file_size: file.size, folder: folderFilter === 'all' ? 'general' : folderFilter, is_public: true })
      await logAdminAction('upload_file', 'file', undefined, { file_name: file.name })
      toast.success('Archivo subido')
      fetchFiles()
    } catch (err: any) { toast.error(err?.message || 'Error al subir') }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminar archivo ${name}?`)) return
    try { await deleteUploadedFile(id); await logAdminAction('delete_file', 'file', id); toast.success('Eliminado'); fetchFiles() }
    catch (err: any) { toast.error(err?.message || 'Error') }
  }

  const folders = [...new Set(files.map(f => f.folder))]
  const filtered = folderFilter === 'all' ? files : files.filter(f => f.folder === folderFilter)
  const formatSize = (bytes: number | null) => { if (!bytes) return 'N/A'; if (bytes < 1024) return bytes + ' B'; if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / 1048576).toFixed(1) + ' MB' }

  return (
    <Page>
      <PageHeader>
        <div className="flex items-center gap-3">
          <FolderOpen size={24} className="text-primary" />
          <div>
            <PageTitle>Gestion de Archivos</PageTitle>
            <PageDescription>Subir, organizar y eliminar archivos PDF e imagenes</PageDescription>
          </div>
        </div>
      </PageHeader>
      <PageBody className="p-4 md:p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" /></div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${uploading ? 'bg-muted text-muted-foreground' : 'bg-primary hover:bg-primary/90 text-white'}`}>
                <Upload size={16} />{uploading ? 'Subiendo...' : 'Subir Archivo'}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
              <select value={folderFilter} onChange={e => setFolderFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-border bg-background text-foreground">
                <option value="all">Todas las carpetas</option>
                {folders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[500px]">
                <thead><tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Archivo</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Tamano</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Carpeta</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Fecha</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Acciones</th>
                </tr></thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          {f.file_type?.includes('pdf') ? <FileText size={16} className="text-red-500" /> : <Image size={16} className="text-blue-500" />}
                          <span className="text-sm text-foreground truncate max-w-[200px]">{f.file_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">{f.file_type}</td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">{formatSize(f.file_size)}</td>
                      <td className="py-3 px-2"><span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{f.folder}</span></td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString('es-PE')}</td>
                      <td className="py-3 px-2"><div className="flex gap-1 justify-end">
                        <a href={f.file_path} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"><FileText size={14} /></a>
                        <button onClick={() => handleDelete(f.id, f.file_name)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"><Trash2 size={14} /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No hay archivos</p>}
          </>
        )}
      </PageBody>
    </Page>
  )
}
