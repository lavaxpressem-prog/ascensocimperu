import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireAdmin, getServiceClient } from './auth'
import { uploadPdfToDrive, generatePdfFileName, getMaxPdfSizeBytes } from './google-drive'
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

  let uploadedFileId: string | null = null

  try {
    const { fields, files } = await parseMultipartForm(req as unknown as IncomingMessage)

    const pdfFile = files.pdf?.[0]
    if (!pdfFile) {
      return res.status(400).json({ error: 'No se ha proporcionado un archivo PDF' })
    }

    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title
    const summary = Array.isArray(fields.summary) ? fields.summary[0] : fields.summary
    const content = Array.isArray(fields.content) ? fields.content[0] : fields.content
    const category = Array.isArray(fields.category) ? fields.category[0] : fields.category
    const status = Array.isArray(fields.status) ? fields.status[0] : fields.status
    const isPdfPublic = Array.isArray(fields.is_pdf_public) ? fields.is_pdf_public[0] === 'true' : fields.is_pdf_public === 'true'

    if (!title?.trim()) {
      return res.status(400).json({ error: 'El título es requerido' })
    }

    if (!summary?.trim()) {
      return res.status(400).json({ error: 'El resumen es requerido' })
    }

    const fileBuffer = fs.readFileSync(pdfFile.filepath)
    const pdfName = generatePdfFileName(pdfFile.originalFilename || 'noticia.pdf')
    const mimeType = pdfFile.mimetype || 'application/pdf'

    // Upload to Google Drive
    const driveResult = await uploadPdfToDrive(fileBuffer, pdfName, mimeType)
    uploadedFileId = driveResult.fileId

    // Insert news record in Supabase
    const serviceClient = getServiceClient()
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
      published_at: status === 'published' ? new Date().toISOString() : null,
      is_pdf_public: isPdfPublic,
      summary: summary.trim(),
      google_drive_file_id: driveResult.fileId,
      google_drive_view_url: driveResult.viewUrl,
      google_drive_download_url: driveResult.downloadUrl,
      pdf_name: pdfFile.originalFilename || 'noticia.pdf',
      pdf_mime_type: mimeType,
      pdf_size: pdfFile.size,
    }

    const { data: newsResult, error: newsError } = await serviceClient
      .from('noticias')
      .insert(newsData)
      .select('id')
      .single()

    if (newsError) {
      console.error('[upload-pdf] News insert error, cleaning up Drive file:', newsError)
      try {
        const { deleteFileFromDrive } = await import('./google-drive')
        await deleteFileFromDrive(driveResult.fileId)
      } catch (cleanupErr) {
        console.error('[upload-pdf] Cleanup failed:', cleanupErr)
      }
      return res.status(500).json({ error: 'Error al guardar la noticia' })
    }

    // Cleanup temp file
    fs.unlinkSync(pdfFile.filepath)

    return res.status(200).json({
      message: 'Noticia creada correctamente con PDF',
      newsId: newsResult.id,
      pdfUrl: driveResult.viewUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno del servidor'
    console.error('[upload-pdf] Unexpected error:', message)

    // Cleanup uploaded file on error
    if (uploadedFileId) {
      try {
        const { deleteFileFromDrive } = await import('./google-drive')
        await deleteFileFromDrive(uploadedFileId)
      } catch (cleanupErr) {
        console.error('[upload-pdf] Cleanup failed:', cleanupErr)
      }
    }

    return res.status(500).json({ error: 'Error al subir el PDF. Inténtalo nuevamente.' })
  }
}
