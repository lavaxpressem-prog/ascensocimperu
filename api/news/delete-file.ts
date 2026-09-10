import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin, getServiceClient } from './auth'
import { deleteFileFromDrive } from './google-drive'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await requireAdmin(req, res)
  if (!user) return

  try {
    const { newsId, action } = req.body

    if (!newsId) {
      return res.status(400).json({ error: 'Se requiere el ID de la noticia' })
    }

    const serviceClient = getServiceClient()

    const { data: news, error: fetchError } = await serviceClient
      .from('noticias')
      .select('id, google_drive_file_id, status')
      .eq('id', newsId)
      .single()

    if (fetchError || !news) {
      return res.status(404).json({ error: 'Noticia no encontrada' })
    }

    if (action === 'delete') {
      // Delete from Google Drive if exists
      if (news.google_drive_file_id) {
        try {
          await deleteFileFromDrive(news.google_drive_file_id)
        } catch (driveErr) {
          console.error('[delete-file] Drive deletion failed:', driveErr)
        }
      }

      // Delete from Supabase
      const { error: deleteError } = await serviceClient
        .from('noticias')
        .delete()
        .eq('id', newsId)

      if (deleteError) {
        console.error('[delete-file] Supabase deletion error:', deleteError)
        return res.status(500).json({ error: 'Error al eliminar la noticia' })
      }

      return res.status(200).json({ message: 'Noticia eliminada correctamente' })
    }

    if (action === 'archive') {
      const { error: updateError } = await serviceClient
        .from('noticias')
        .update({ status: 'archived', is_published: false })
        .eq('id', newsId)

      if (updateError) {
        return res.status(500).json({ error: 'Error al archivar la noticia' })
      }

      return res.status(200).json({ message: 'Noticia archivada correctamente' })
    }

    if (action === 'unarchive') {
      const { error: updateError } = await serviceClient
        .from('noticias')
        .update({ status: 'draft' })
        .eq('id', newsId)

      if (updateError) {
        return res.status(500).json({ error: 'Error al restaurar la noticia' })
      }

      return res.status(200).json({ message: 'Noticia restaurada correctamente' })
    }

    if (action === 'publish') {
      const { error: updateError } = await serviceClient
        .from('noticias')
        .update({
          status: 'published',
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', newsId)

      if (updateError) {
        return res.status(500).json({ error: 'Error al publicar la noticia' })
      }

      return res.status(200).json({ message: 'Noticia publicada correctamente' })
    }

    if (action === 'unpublish') {
      const { error: updateError } = await serviceClient
        .from('noticias')
        .update({
          status: 'draft',
          is_published: false,
        })
        .eq('id', newsId)

      if (updateError) {
        return res.status(500).json({ error: 'Error al despublicar la noticia' })
      }

      return res.status(200).json({ message: 'Noticia despublicada correctamente' })
    }

    if (action === 'delete_pdf') {
      if (news.google_drive_file_id) {
        try {
          await deleteFileFromDrive(news.google_drive_file_id)
        } catch (driveErr) {
          console.error('[delete-file] Drive PDF deletion failed:', driveErr)
        }
      }

      const { error: updateError } = await serviceClient
        .from('noticias')
        .update({
          google_drive_file_id: null,
          google_drive_view_url: null,
          google_drive_download_url: null,
          pdf_name: null,
          pdf_mime_type: null,
          pdf_size: null,
        })
        .eq('id', newsId)

      if (updateError) {
        return res.status(500).json({ error: 'Error al eliminar el PDF' })
      }

      return res.status(200).json({ message: 'PDF eliminado correctamente' })
    }

    return res.status(400).json({ error: 'Acción no válida' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    console.error('[delete-file] Unexpected error:', message)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
