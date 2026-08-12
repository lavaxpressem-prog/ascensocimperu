import React, { useEffect } from 'react'
import { X, FileText } from 'lucide-react'

interface PdfViewerModalProps {
  pdfUrl: string
  title: string
  onClose: () => void
}

export function PdfViewerModal({ pdfUrl, title, onClose }: PdfViewerModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-[#12161F] border border-gray-700/30 rounded-xl w-full h-full max-w-[95vw] max-h-[95vh] sm:max-w-[90vw] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-700/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-yellow-500" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm sm:text-base leading-snug line-clamp-1">{title}</h3>
              <p className="text-[11px] sm:text-xs text-gray-500">Visor de documento PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Cerrar visor"
          >
            <X size={20} />
          </button>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 min-h-0">
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0 bg-white"
            title={`PDF - ${title}`}
          />
        </div>
      </div>
    </div>
  )
}
