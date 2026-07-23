import React, { useState, useEffect } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle,
  PageDescription,
  PageBody, 
  Button, 
  Card, 
  CardContent,
  Badge,
  toast
} from '@blinkdotnew/ui'
import { 
  CheckCircle2, 
  XCircle, 
  Play, 
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ClipboardCheck,
  AlertTriangle
} from 'lucide-react'
import { getQuestionsBatch, shuffleArray, recordStudySession, updateStudySession, recordQuestionResponse, type Question } from '../lib/supabase'

export function PracticaPreguntasPage() {
  const [allQuestions, setAllQuestions] = useState<Question[]>([])
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [isStarted, setIsStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    getQuestionsBatch().then(qs => {
      setAllQuestions(qs)
      setLoading(false)
    })
  }, [])

  const currentQuestion = practiceQuestions[currentQuestionIndex]

  const handleStart = async () => {
    const shuffled = shuffleArray(allQuestions)
    setPracticeQuestions(shuffled)
    setCurrentQuestionIndex(0)
    setSelectedOption(null)
    setIsAnswered(false)
    setIsFinished(false)
    setScore(0)
    setIsStarted(true)

    const now = new Date()
    setSessionStartedAt(now)
    const sessionId = await recordStudySession({
      activity_type: 'practica_preguntas',
      started_at: now.toISOString(),
    })
    setStudySessionId(sessionId)

    toast.success('Práctica iniciada')
  }

  const handleOptionSelect = (optionId: string) => {
    if (isAnswered) return
    setSelectedOption(optionId)
    setIsAnswered(true)

    const isCorrect = optionId === currentQuestion.correctOption
    if (isCorrect) {
      setScore(prev => prev + 1)
    }

    recordQuestionResponse({
      question_identifier: String(currentQuestion.id),
      selected_option: optionId,
      is_correct: isCorrect,
    })
  }

  const handleNext = async () => {
    if (currentQuestionIndex < practiceQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setSelectedOption(null)
      setIsAnswered(false)
    } else {
      setIsFinished(true)

      const correct = selectedOption === currentQuestion.correctOption ? score : score
      const total = practiceQuestions.length
      const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

      if (studySessionId && sessionStartedAt) {
        const durationSeconds = Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000)
        await updateStudySession(studySessionId, {
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
          questions_attempted: total,
          questions_correct: correct,
        })
      }

      toast.success('Práctica finalizada')
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      setSelectedOption(null)
      setIsAnswered(false)
    }
  }

  const handleFinish = async () => {
    setShowConfirmModal(false)
    setIsFinished(true)

    const total = practiceQuestions.length
    const questionsAttempted = currentQuestionIndex + (isAnswered ? 1 : 0)

    if (studySessionId && sessionStartedAt) {
      const durationSeconds = Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000)
      await updateStudySession(studySessionId, {
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        questions_attempted: questionsAttempted,
        questions_correct: score,
      })
    }

    toast.success('Práctica finalizada')
  }

  if (loading || allQuestions.length === 0) {
    return (
      <Page>
        <PageHeader>
          <PageTitle className="font-serif">Práctica de Preguntas</PageTitle>
          <PageDescription>Practica con retroalimentación inmediata</PageDescription>
        </PageHeader>
        <PageBody className="flex flex-col items-center justify-center py-12">
          <Card className="max-w-md w-full text-center p-8 space-y-6">
            <p className="text-muted-foreground">
              {loading ? 'Cargando preguntas...' : 'No hay preguntas disponibles'}
            </p>
          </Card>
        </PageBody>
      </Page>
    )
  }

  if (!isStarted) {
    return (
      <Page>
        <PageHeader>
          <PageTitle className="font-serif">Práctica de Preguntas</PageTitle>
          <PageDescription>Practica con retroalimentación inmediata</PageDescription>
        </PageHeader>
        <PageBody className="flex flex-col items-center justify-center py-12">
          <Card className="max-w-md w-full text-center p-8 space-y-6">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <ClipboardCheck size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Practica tus conocimientos</h3>
              <p className="text-muted-foreground">
                Responde {allQuestions.length} preguntas con retroalimentación inmediata. 
                Al seleccionar una respuesta, sabrás al instante si es correcta o incorrecta.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-muted-foreground">Preguntas</div>
                <div className="font-bold text-lg">{allQuestions.length}</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-muted-foreground">Modo</div>
                <div className="font-bold text-lg">Libre</div>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={handleStart}>
              <Play size={18} className="mr-2" /> Comenzar Práctica
            </Button>
          </Card>
        </PageBody>
      </Page>
    )
  }

  if (isFinished) {
    const total = practiceQuestions.length
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0

    return (
      <Page>
        <PageHeader>
          <PageTitle className="font-serif">Práctica de Preguntas</PageTitle>
          <PageDescription>Práctica con retroalimentación inmediata</PageDescription>
        </PageHeader>
        <PageBody className="max-w-3xl mx-auto space-y-8 py-8">
          <div className="space-y-6">
            <Card className="text-center p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold font-serif">Resultados de la Práctica</h3>
                <p className="text-muted-foreground">Resumen de tu desempeño</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-6 bg-secondary rounded-xl space-y-1">
                  <div className="text-green-600 flex justify-center"><CheckCircle2 size={32} /></div>
                  <div className="text-2xl font-bold">{score}</div>
                  <div className="text-xs uppercase text-muted-foreground">Correctas</div>
                </div>
                <div className="p-6 bg-secondary rounded-xl space-y-1">
                  <div className="text-destructive flex justify-center"><XCircle size={32} /></div>
                  <div className="text-2xl font-bold">{total - score}</div>
                  <div className="text-xs uppercase text-muted-foreground">Incorrectas</div>
                </div>
                <div className="p-6 bg-primary text-white rounded-xl space-y-1">
                  <div className="flex justify-center"><ClipboardCheck size={32} /></div>
                  <div className="text-2xl font-bold">{percentage}%</div>
                  <div className="text-xs uppercase text-white/70">Puntaje</div>
                </div>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsStarted(false)}>
                Volver al Inicio
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                <RotateCcw size={18} className="mr-2" /> Practicar de Nuevo
              </Button>
            </div>
          </div>
        </PageBody>
      </Page>
    )
  }

  const isCorrect = selectedOption === currentQuestion.correctOption

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">{currentQuestion.topic}</Badge>
          <PageTitle className="text-xl">Pregunta {currentQuestionIndex + 1} de {practiceQuestions.length}</PageTitle>
        </div>
      </PageHeader>
      
      <PageBody className="max-w-3xl mx-auto space-y-8 py-8">
        <div className="space-y-6">
          <div className="text-xl font-medium leading-relaxed">
            {currentQuestion.text}
          </div>
          
          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOption === option.id
              const isCorrectOption = option.id === currentQuestion.correctOption
              
              let borderColor = 'border-transparent'
              let bgColor = 'bg-secondary'
              let letterBg = 'bg-card text-primary border border-border dark:bg-secondary dark:text-primary'
              
              if (isAnswered) {
                if (isCorrectOption) {
                  borderColor = 'border-green-500'
                  bgColor = 'bg-green-50 dark:bg-green-950/30'
                  letterBg = 'bg-green-500 text-white'
                } else if (isSelected && !isCorrectOption) {
                  borderColor = 'border-destructive'
                  bgColor = 'bg-destructive/5'
                  letterBg = 'bg-destructive text-white'
                } else {
                  bgColor = 'bg-secondary/50 opacity-50'
                }
              } else if (isSelected) {
                borderColor = 'border-primary'
                bgColor = 'bg-primary/5 shadow-sm'
                letterBg = 'bg-primary text-white'
              }

              return (
                <button
                  key={option.id}
                  className={`
                    flex items-center gap-4 p-5 rounded-xl text-left transition-all border-2
                    ${borderColor} ${bgColor}
                    ${!isAnswered ? 'hover:border-primary/20 hover:bg-secondary/80 cursor-pointer' : 'cursor-default'}
                  `}
                  onClick={() => handleOptionSelect(option.id)}
                  disabled={isAnswered}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${letterBg}`}>
                    {option.id.toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium">{option.text}</span>
                </button>
              )
            })}
          </div>
        </div>

        {isAnswered && (
          <Card className={`border-l-4 ${isCorrect ? 'border-l-green-500 bg-green-50 dark:bg-green-950/30' : 'border-l-destructive bg-destructive/5'}`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                {isCorrect ? (
                  <CheckCircle2 size={22} className="text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <XCircle size={22} className="text-destructive mt-0.5 shrink-0" />
                )}
                <div>
                  <p className={`font-semibold ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                    {isCorrect ? '¡Respuesta correcta!' : 'Respuesta incorrecta'}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-muted-foreground mt-1">
                      La respuesta correcta es: <span className="font-semibold">{currentQuestion.correctOption.toUpperCase()}</span> - {currentQuestion.respuestaCorrecta}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handlePrev} 
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft size={20} className="mr-2" /> Anterior
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmModal(true)}
            >
              <AlertTriangle size={20} className="mr-2" /> Finalizar
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            {score} de {currentQuestionIndex + (isAnswered ? 1 : 0)} correctas
          </div>

          {isAnswered && (
            <Button onClick={handleNext}>
              {currentQuestionIndex === practiceQuestions.length - 1 ? 'Finalizar' : 'Siguiente'}
              <ChevronRight size={20} className="ml-2" />
            </Button>
          )}
        </div>
      </PageBody>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-card border border-border rounded-xl p-6 shadow-xl max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold">Finalizar Práctica</h3>
            </div>
            <p className="text-muted-foreground">
              ¿Estás seguro de que deseas finalizar la práctica? 
              Se guardará tu progreso actual ({score} de {currentQuestionIndex + (isAnswered ? 1 : 0)} correctas).
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFinish}>
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  )
}
