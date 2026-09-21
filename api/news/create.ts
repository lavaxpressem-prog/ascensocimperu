import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin, getServiceClient } from './auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await requireAdmin(req, res)
  if (!user) return

  try {
    const { title, summary, content, category, status, published_at, is_pdf_public } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título es requerido' })
    }

    if (!summary || !summary.trim()) {
      return res.status(400).json({ error: 'El resumen es requerido' })
    }

    const serviceClient = getServiceClient()

    // Insert news record first
    const newsData: Record<string, unknown> = {
      titulo: title.trim(),
      descripcion: content?.trim() || '',
      categoria: category || 'Noticia',
      fuente: 'Admin',
      estado: 'Vigente',
      fecha_publicacion: new Date().toISOString().split('T')[0],
      uploaded_by: user.id,
      is_published: status === 'published',
      status: status || 'draft',
      published_at: status === 'published' ? (published_at || new Date().toISOString()) : null,
      is_pdf_public: is_pdf_public || false,
      summary: summary.trim(),
    }

    const { data: newsResult, error: newsError } = await serviceClient
      .from('noticias')
      .insert(newsData)
      .select('id')
      .single()

    if (newsError) {
      console.error('[news/create] News insert error:', newsError.message, newsError.code, newsError.details)
      return res.status(500).json({ error: 'Error al crear la noticia', detail: newsError.message })
    }

    return res.status(200).json({
      message: 'Noticia creada correctamente',
      newsId: newsResult.id,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    console.error('[news/create] Unexpected error:', message, err instanceof Error ? err.stack : '')
    return res.status(500).json({ error: 'Error interno del servidor', detail: message })
  }
}
