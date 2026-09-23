export interface WebViewUtterance {
  text: string
  lang: string
  rate: number
  pitch: number
  volume: number
  voice: SpeechSynthesisVoice | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event?: unknown) => void) | null
}

export type AnyUtterance = SpeechSynthesisUtterance | WebViewUtterance

export interface SpeechEngine {
  speak(utterance: AnyUtterance): void
  cancel(): void
  pause(): void
  resume(): void
  getVoices(): SpeechSynthesisVoice[]
}

const TTS_ENDPOINT = 'https://translate.google.com/translate_tts'
const MAX_CHUNK_LENGTH = 180

export function supportsNativeSpeech(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    !!window.speechSynthesis &&
    'SpeechSynthesisUtterance' in window
  )
}

type VoidHandler = () => void
type ErrorHandler = (event?: unknown) => void

function callStart(utterance: AnyUtterance): void {
  const handler = (utterance as { onstart?: VoidHandler | null }).onstart
  if (handler) handler()
}

function callEnd(utterance: AnyUtterance): void {
  const handler = (utterance as { onend?: VoidHandler | null }).onend
  if (handler) handler()
}

function callError(utterance: AnyUtterance, event?: unknown): void {
  const handler = (utterance as { onerror?: ErrorHandler | null }).onerror
  if (handler) handler(event)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function buildTtsUrl(client: string, text: string, lang: string): string {
  const params = new URLSearchParams({
    ie: 'UTF-8',
    client,
    tl: lang,
    q: text,
  })
  return `${TTS_ENDPOINT}?${params.toString()}`
}

function chunkText(text: string, maxLength: number): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  if (cleaned.length <= maxLength) return [cleaned]

  const chunks: string[] = []
  let buffer = ''
  const sentences = cleaned.split(/(?<=[.!?])\s+|\n+/)

  for (const rawSentence of sentences) {
    let sentence = rawSentence.trim()
    if (!sentence) continue

    while (sentence.length > maxLength) {
      let cut = sentence.lastIndexOf(' ', maxLength)
      if (cut <= 0) cut = maxLength
      const piece = sentence.slice(0, cut).trim()
      if (piece) chunks.push(piece)
      sentence = sentence.slice(cut).trim()
    }

    if (!sentence) continue

    if (buffer.length === 0 || (buffer + ' ' + sentence).length <= maxLength) {
      buffer = buffer ? buffer + ' ' + sentence : sentence
    } else {
      chunks.push(buffer)
      buffer = sentence
    }
  }

  if (buffer) chunks.push(buffer)
  return chunks
}

function makeWebViewUtterance(text: string): WebViewUtterance {
  return {
    text,
    lang: 'es-ES',
    rate: 0.9,
    pitch: 1,
    volume: 1,
    voice: null,
    onstart: null,
    onend: null,
    onerror: null,
  }
}

export function createUtterance(text: string): AnyUtterance {
  if (supportsNativeSpeech()) return new SpeechSynthesisUtterance(text)
  return makeWebViewUtterance(text)
}

class WebViewSpeechSynthesis implements SpeechEngine {
  private audio: HTMLAudioElement | null = null
  private utterance: AnyUtterance | null = null
  private chunks: string[] = []
  private chunkIndex = 0
  private variantIndex = 0
  private errorCount = 0
  private startFired = false
  private pausedAt = 0
  private finishTimer: number | undefined
  private sessionId = 0

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio()
      audio.preload = 'auto'
      audio.style.display = 'none'
      document.body.appendChild(audio)
      this.audio = audio
    }
    return this.audio
  }

  speak(utterance: AnyUtterance): void {
    this.cancel()
    this.utterance = utterance
    const text = (utterance.text ?? '').trim()

    if (text.length <= 2) {
      callStart(utterance)
      this.finishTimer = window.setTimeout(() => {
        callEnd(utterance)
      }, 80)
      return
    }

    this.chunks = chunkText(text, MAX_CHUNK_LENGTH)
    this.chunkIndex = 0
    this.errorCount = 0
    this.startFired = false
    this.playChunk()
  }

  private playChunk(): void {
    const utterance = this.utterance
    if (!utterance) return
    if (this.chunks.length === 0 || this.chunkIndex >= this.chunks.length) {
      this.onAllDone()
      return
    }

    const session = this.sessionId
    const audio = this.getAudio()
    const chunk = this.chunks[this.chunkIndex]
    const lang = (utterance.lang || 'es-ES').split('-')[0] || 'es'
    const rate = clamp(typeof utterance.rate === 'number' ? utterance.rate : 0.9, 0.5, 2)
    const variants = [buildTtsUrl('tw-ob', chunk, lang), buildTtsUrl('gtx', chunk, lang)]

    this.variantIndex = 0
    this.pausedAt = 0

    const retryOrFail = (err?: unknown) => {
      if (session !== this.sessionId) return
      if (this.variantIndex < variants.length - 1) {
        this.variantIndex += 1
        audio.src = variants[this.variantIndex]
        audio.currentTime = 0
        this.pausedAt = 0
        const playPromise = audio.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {})
        }
        return
      }
      this.errorCount += 1
      if (this.errorCount >= this.chunks.length) {
        callError(utterance, err)
        this.finish()
      } else {
        this.chunkIndex += 1
        this.playChunk()
      }
    }

    audio.onerror = () => retryOrFail(new Error(`TTS de respaldo no disponible (fragmento ${this.chunkIndex})`))

    audio.onended = () => {
      if (session !== this.sessionId) return
      this.chunkIndex += 1
      this.playChunk()
    }

    if (!this.startFired) {
      this.startFired = true
      callStart(utterance)
    }

    audio.playbackRate = rate
    audio.src = variants[0]
    audio.currentTime = 0

    const playPromise = audio.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch((err: unknown) => {
        console.warn('[AudioWebView] No se pudo iniciar la reproducción:', err)
        retryOrFail(err)
      })
    }
  }

  private onAllDone(): void {
    const utterance = this.utterance
    this.finish()
    if (utterance) callEnd(utterance)
  }

  private finish(): void {
    this.utterance = null
    this.chunks = []
    this.chunkIndex = 0
    this.errorCount = 0
    this.startFired = false
    this.pausedAt = 0
  }

  pause(): void {
    const audio = this.audio
    if (audio && !audio.paused) {
      this.pausedAt = audio.currentTime
      audio.pause()
    }
  }

  resume(): void {
    const audio = this.audio
    if (!audio || !this.utterance) return
    if (this.pausedAt > 0) audio.currentTime = this.pausedAt
    this.pausedAt = 0
    const playPromise = audio.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }

  cancel(): void {
    this.sessionId += 1
    if (this.finishTimer !== undefined) {
      window.clearTimeout(this.finishTimer)
      this.finishTimer = undefined
    }
    this.finish()
    if (this.audio) {
      const audio = this.audio
      audio.onerror = null
      audio.onended = null
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      if (audio.parentNode) audio.parentNode.removeChild(audio)
      this.audio = null
    }
    this.pausedAt = 0
  }

  getVoices(): SpeechSynthesisVoice[] {
    return []
  }
}

let fallbackEngine: WebViewSpeechSynthesis | null = null

export function getSpeechSynth(): SpeechEngine | null {
  if (typeof window === 'undefined') return null
  if (supportsNativeSpeech()) return window.speechSynthesis
  if (!fallbackEngine) fallbackEngine = new WebViewSpeechSynthesis()
  return fallbackEngine
}