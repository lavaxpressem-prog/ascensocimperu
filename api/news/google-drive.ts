import { google } from 'googleapis'
import type { drive_v3 } from 'googleapis'

const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')
const GOOGLE_DRIVE_NEWS_FOLDER_ID = process.env.GOOGLE_DRIVE_NEWS_FOLDER_ID
const MAX_NEWS_PDF_SIZE_MB = parseInt(process.env.MAX_NEWS_PDF_SIZE_MB || '20', 10)

let cachedDrive: drive_v3.Drive | null = null

export function getDriveService(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive

  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Google Drive credentials not configured')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  cachedDrive = google.drive({ version: 'v3', auth })
  return cachedDrive
}

export function getNewsFolderId(): string {
  if (!GOOGLE_DRIVE_NEWS_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_NEWS_FOLDER_ID not configured')
  }
  return GOOGLE_DRIVE_NEWS_FOLDER_ID
}

export function getMaxPdfSizeBytes(): number {
  return MAX_NEWS_PDF_SIZE_MB * 1024 * 1024
}

export async function uploadPdfToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; viewUrl: string; downloadUrl: string }> {
  const drive = getDriveService()
  const folderId = getNewsFolderId()

  const fileMetadata: drive_v3.Schema$File = {
    name: fileName,
    parents: [folderId],
  }

  const media = {
    mimeType,
    body: Buffer.from(fileBuffer),
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, webViewLink, webContentLink',
  })

  const fileId = response.data.id!
  const viewUrl = response.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
  const downloadUrl = response.data.webContentLink || `https://drive.google.com/uc?export=download&id=${fileId}`

  return { fileId, viewUrl, downloadUrl }
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveService()
  await drive.files.delete({ fileId })
}

export async function replacePdfOnDrive(
  oldFileId: string | null,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ fileId: string; viewUrl: string; downloadUrl: string }> {
  const result = await uploadPdfToDrive(fileBuffer, fileName, mimeType)

  if (oldFileId) {
    try {
      await deleteFileFromDrive(oldFileId)
    } catch (err) {
      console.error('[replacePdf] Failed to delete old file:', err)
    }
  }

  return result
}

export function generatePdfFileName(originalName: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const uuid = crypto.randomUUID().split('-')[0]
  return `noticia-${timestamp}-${uuid}.pdf`
}

export { MAX_NEWS_PDF_SIZE_MB }
