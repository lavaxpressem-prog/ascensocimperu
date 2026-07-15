import React, { useState, useRef, useEffect } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle, 
  PageDescription, 
  PageBody, 
  Card, 
  CardContent,
  Badge,
  Button
} from '@blinkdotnew/ui'
import { 
  Play, Pause, RotateCcw, BookOpen, SkipForward, SkipBack, Volume2
} from 'lucide-react'
import { getQuestionsBatch, type Question } from '../lib/supabase'

function cleanTextForSpeech(text: string): string {
  let cleaned = text
  cleaned = cleaned.replace(/\*\*|[*_#~`]/g, '')
  cleaned = cleaned.replace(/\[(?:TITULO\s+I+|CAPITULO\s+I+|CAP\.\s*\d+|ART\.\s*\d+|NUM\.\s*\d+)[^\]]*\]/gi, '')
  cleaned = cleaned.replace(/\[([^\]]+)\]/g, '$1')
  cleaned = cleaned.replace(/\bART\.?\s*/gi, 'Artículo ')
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim()
  return cleaned
}

export function AudioPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [speed, setSpeed] = useState(0.9)
  const [readAnswers, setReadAnswers] = useState(true)
  const [loopMode, setLoopMode] = useState(true)
  const [autoPlay, setAutoPlay] = useState(true)

  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    console.log('[AudioPage] Loading questions from Supabase...')
    getQuestionsBatch().then(qs => {
      console.log('[AudioPage] Questions loaded:', qs.length)
      setQuestions(qs)
      setLoading(false)
    })
  }, [])

  const currentQuestion = questions[currentIndex]
  const isCorrect = selectedOption === currentQuestion?.correctOption && selectedOption !== ''

  const handleStop = () => {
    if (!synth) return
    synth.cancel()
    setIsPlaying(false)
    setIsPaused(false)
  }

  const handleNext = () => {
    setSelectedOption('')
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (loopMode) {
      setCurrentIndex(0)
    }
    handleStop()
  }

  const handlePrevious = () => {
    setSelectedOption('')
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
    handleStop()
  }

  const handleResume = () => {
    if (!synth) return
    synth.resume()
    setIsPlaying(true)
    setIsPaused(false)
  }

  const speakQuestion = () => {
    if (!synth || !currentQuestion) return

    if (isPlaying) {
      synth.cancel()
      setIsPlaying(false)
      setIsPaused(false)
      return
    }

    synth.cancel()

    const parts: string[] = []
    parts.push(currentQuestion.text)

    currentQuestion.options.forEach((opt) => {
      parts.push(`Alternativa ${opt.id.toUpperCase()}: ${opt.text}`)
    })

    if (readAnswers) {
      const letters = ['A', 'B', 'C', 'D', 'E']
      const letter = letters[currentQuestion.indiceCorrecto] ?? String(currentQuestion.indiceCorrecto)
      parts.push(`La respuesta correcta es la alternativa ${letter}.`)
      parts.push(currentQuestion.respuestaCorrecta)
    }

    const fullText = cleanTextForSpeech(parts.join(' '))
    const utterance = new SpeechSynthesisUtterance(fullText)
    utterance.lang = 'es-ES'
    utterance.rate = speed
    utterance.pitch = 1
    utterance.volume = 1

    utterance.onstart = () => {
      setIsPlaying(true)
      setIsPaused(false)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setIsPaused(false)
      if (autoPlay) {
        setTimeout(() => {
          handleNext()
        }, 500)
      }
    }

    utterance.onerror = () => {
      setIsPlaying(false)
      setIsPaused(false)
    }

    utteranceRef.current = utterance
    synth.speak(utterance)
  }

  useEffect(() => {
    if (autoPlay && !isPlaying && !isPaused && questions.length > 0) {
      const timer = setTimeout(() => {
        speakQuestion()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, autoPlay])

  useEffect(() => {
    return () => {
      if (synth) synth.cancel()
    }
  }, [])

  if (loading || questions.length === 0) {
    return (
      <Page>
        <PageHeader>
          <PageTitle className="font-serif">Audio Preguntas</PageTitle>
          <PageDescription>Escucha y aprende automáticamente</PageDescription>
        </PageHeader>
        <PageBody className="max-w-3xl mx-auto space-y-8 py-8">
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <p className="text-muted-foreground">
                {loading ? 'Cargando preguntas...' : 'No hay preguntas disponibles'}
              </p>
            </CardContent>
          </Card>
        </PageBody>
      </Page>
    )
  }

  return (
    <Page>
      <PageHeader>
        <PageTitle className="font-serif">Audio Preguntas</PageTitle>
        <PageDescription>Escucha y aprende automáticamente</PageDescription>
      </PageHeader>

      <PageBody className="max-w-3xl mx-auto space-y-8 py-8">
        <Card>
          <CardContent className="p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <Badge variant="outline">{currentQuestion.topic}</Badge>
                <p className="text-sm text-muted-foreground">
                  Pregunta {currentIndex + 1} de {questions.length}
                </p>
                <h3 className="text-lg font-medium leading-relaxed">
                  {currentQuestion.text}
                </h3>
                {currentQuestion.ubicacion && (
                  <p className="text-xs text-muted-foreground italic mt-2">
                    📍 {currentQuestion.ubicacion}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 bg-primary/5 p-6 rounded-xl border border-primary/20">
              <Button
                size="lg"
                className="rounded-full h-14 w-14 flex-shrink-0"
                onClick={speakQuestion}
              >
                {isPlaying && !isPaused ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </Button>
              <div className="flex-1">
                <p className="font-semibold text-primary">
                  {isPlaying && !isPaused ? '🔊 Reproduciendo...' : '🎧 Haz clic para escuchar'}
                </p>
                <p className="text-sm text-muted-foreground">Sintetización de audio en español</p>
              </div>
              {isPaused && (
                <Button variant="outline" size="sm" onClick={handleResume}>
                  Reanudar
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleStop}
                disabled={!isPlaying && !isPaused}
              >
                <RotateCcw size={18} />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                >
                  <SkipBack size={16} className="mr-2" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                >
                  Siguiente
                  <SkipForward size={16} className="ml-2" />
                </Button>
                <Button
                  variant={loopMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setLoopMode(!loopMode)}
                >
                  Loop: {loopMode ? 'ON' : 'OFF'}
                </Button>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={readAnswers}
                    onChange={(e) => setReadAnswers(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Leer respuesta correcta
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-4 h-4"
                  />
                  Reproducción automática
                </label>
                <label className="flex items-center gap-2 text-sm">
                  Velocidad:
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="px-2 py-1 rounded border border-input text-xs"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={0.9}>0.9x</option>
                    <option value={1}>1x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2x</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm">Selecciona la respuesta:</p>
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOption === option.id
                  return (
                    <button
                      key={option.id}
                      className={`
                        flex items-center gap-4 p-4 rounded-lg text-left transition-all border-2
                        ${isSelected 
                          ? isCorrect
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                            : 'border-destructive bg-destructive/5'
                          : 'border-transparent bg-secondary hover:border-primary/20'
                        }
                      `}
                      onClick={() => setSelectedOption(option.id)}
                    >
                      <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0
                        ${isSelected 
                          ? isCorrect
                            ? 'bg-green-500 text-white'
                            : 'bg-destructive text-white'
                          : 'bg-white dark:bg-slate-700 text-primary border'
                        }
                      `}>
                        {option.id.toUpperCase()}
                      </div>
                      <span className="font-medium">{option.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {selectedOption && (
              <div className={`p-4 rounded-lg border-l-4 ${
                isCorrect 
                  ? 'bg-green-50 dark:bg-green-950/30 border-green-500'
                  : 'bg-destructive/5 border-destructive'
              }`}>
                <p className="font-semibold mb-2">
                  {isCorrect ? '✓ ¡Correcto!' : '✗ Respuesta incorrecta'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-secondary/50">
          <CardContent className="p-6 flex items-start gap-4">
            <BookOpen size={24} className="text-primary flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold mb-1">Nota importante</p>
              <p className="text-sm text-muted-foreground">
                El audio utiliza síntesis de voz del navegador. Asegúrate de que el volumen esté activado.
              </p>
            </div>
          </CardContent>
        </Card>
      </PageBody>
    </Page>
  )
}
