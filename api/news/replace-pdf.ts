import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin, getServiceClient } from './auth'
import { replacePdfOnDrive, generatePdfFileName, getMaxPdfSizeBytes } from './google-drive'
import formidable from 'formidable'
import type { IncomingMessage } from 'http'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

function parseMultipartForm(req: IncomingMessage): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: getMaxPdfSizeBytes(),
      filter: ({ mimetype }) => mimetype === 'application/pdf',
    })

    form.parse(req, (err, fields, files) => {
      if (err) reject(err)
      else resolve({ fields, files })
    })
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = await requireAdmin(req, res)
  if (!user) return

  let newFileId: string | null = null

  try {
    const { fields, files } = await parseMultipartForm(req as unknown as IncomingMessage)

    const pdfFile = files.pdf?.[0]
    if (!pdfFile) {
      return res.status(400).json({ error: 'No se ha proporcionado un archivo PDF' })
    }

    const newsId = Array.isArray(fields.news_id) ? fields.news_id[0] : fields.news_id
    if (!newsId) {
      return res.status(400).json({ error: 'Se requiere el ID de la noticia' })
    }

    const serviceClient = getServiceClient()

    // Get existing news
    const { data: existing, error: fetchError } = await serviceClient
      .from('noticias')
      .select('id, google_drive_file_id')
      .eq('id', newsId)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Noticia no encontrada' })
    }

    const fileBuffer = fs.readFileSync(pdfFile.filepath)
    const pdfName = generatePdfFileName(pdfFile.originalFilename || 'noticia.pdf')
    const mimeType = pdfFile.mimetype || 'application/pdf'

    // Replace on Google Drive (uploads new, deletes old)
    const driveResult = await replacePdfOnDrive(
      existing.google_drive_file_id,
      fileBuffer,
      pdfName,
      mimeType
    )
    newFileId = driveResult.fileId

    // Update Supabase record
    const { error: updateError } = await serviceClient
      .from('noticias')
      .update({
        google_drive_file_id: driveResult.fileId,
        google_drive_view_url: driveResult.viewUrl,
        google_drive_download_url: driveResult.downloadUrl,
        pdf_name: pdfFile.originalFilename || 'noticia.pdf',
        pdf_mime_type: mimeType,
        pdf_size: pdfFile.size,
      })
      .eq('id', newsId)

    if (updateError) {
      console.error('[replace-pdf] Supabase update error:', updateError)
      return res.status(500).json({ error: 'Error al actualizar la noticia' })
    }

    // Cleanup temp file
    fs.unlinkSync(pdfFile.filepath)

    return res.status(200).json({
      message: 'PDF reemplazado correctamente',
      pdfUrl: driveResult.viewUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    console.error('[replace-pdf] Unexpected error:', message)

    if (newFileId) {
      try {
        const { deleteFileFromDrive } = await import('./google-drive')
        await deleteFileFromDrive(newFileId)
      } catch (cleanupErr) {
        console.error('[replace-pdf] Cleanup failed:', cleanupErr)
      }
    }

    return res.status(500).json({ error: 'Error al reemplazar el PDF. Inténtalo nuevamente.' })
  }
}
