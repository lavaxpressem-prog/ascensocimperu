import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin, getServiceClient } from './auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await requireAdmin(req, res)
  if (!user) return

  try {
    const { newsId, title, summary, content, category, status, is_pdf_public, sort_order } = req.body

    if (!newsId) {
      return res.status(400).json({ error: 'Se requiere el ID de la noticia' })
    }

    const serviceClient = getServiceClient()

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.titulo = title.trim()
    if (summary !== undefined) updates.summary = summary.trim()
    if (content !== undefined) updates.descripcion = content.trim()
    if (category !== undefined) updates.categoria = category
    if (is_pdf_public !== undefined) updates.is_pdf_public = is_pdf_public
    if (sort_order !== undefined) updates.sort_order = sort_order

    if (status !== undefined) {
      updates.status = status
      updates.is_published = status === 'published'
      if (status === 'published') {
        updates.published_at = new Date().toISOString()
      }
    }

    const { error } = await serviceClient
      .from('noticias')
      .update(updates)
      .eq('id', newsId)

    if (error) {
      console.error('[update] Supabase update error:', error)
      return res.status(500).json({ error: 'Error al actualizar la noticia' })
    }

    return res.status(200).json({ message: 'Noticia actualizada correctamente' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    console.error('[update] Unexpected error:', message)
    return res.status(500).json({ error: 'Error interno del servidor' })
  }
}
