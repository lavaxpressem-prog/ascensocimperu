import React, { useState, useEffect } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle,
  PageDescription,
  PageActions, 
  PageBody, 
  Button, 
  Card, 
  CardContent,
  Badge,
  toast
} from '@blinkdotnew/ui'
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Pause, 
  RotateCcw,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Target
} from 'lucide-react'
import { getQuestionsBatch, shuffleArray, recordStudySession, updateStudySession, recordExamResult, recordQuestionResponse, type Question } from '../lib/supabase'

export function ExamPage() {
  const [mockQuestions, setMockQuestions] = useState<Question[]>([])
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(3600) // 60 minutes
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null)
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [isReviewMode, setIsReviewMode] = useState(false)

  useEffect(() => {
    console.log('[ExamPage] Loading questions from Supabase...')
    getQuestionsBatch().then(qs => {
      console.log('[ExamPage] Questions loaded:', qs.length)
      setMockQuestions(qs)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let timer: any
    if (isExamStarted && !isPaused && timeLeft > 0 && !isFinished) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      handleFinish()
    }
    return () => clearInterval(timer)
  }, [isExamStarted, isPaused, timeLeft, isFinished])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = async () => {
    setIsExamStarted(true)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setTimeLeft(3600)
    setIsFinished(false)
    setStudySessionId(null)
    setSessionStartedAt(null)
    setWrongQuestions([])
    setIsReviewMode(false)
    setExamQuestions(shuffleArray(mockQuestions))

    const now = new Date()
    setSessionStartedAt(now)
    const sessionId = await recordStudySession({
      activity_type: 'simulador',
      started_at: now.toISOString(),
    })
    setStudySessionId(sessionId)

    toast.success('Simulacro iniciado')
  }

  const handleStartReview = () => {
    if (wrongQuestions.length === 0) return
    setExamQuestions(wrongQuestions)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setTimeLeft(3600)
    setIsFinished(false)
    setIsExamStarted(true)
    setIsReviewMode(true)
    toast.success(`Repasando ${wrongQuestions.length} pregunta(s) fallada(s)`)
  }

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isFinished) return
    setSelectedOptions(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleFinish = async () => {
    setIsFinished(true)

    const wrong: Question[] = []
    examQuestions.forEach(q => {
      if (selectedOptions[q.id] !== q.correctOption) {
        wrong.push(q)
      }
    })
    setWrongQuestions(wrong)

    const correct = examQuestions.filter(q => selectedOptions[q.id] === q.correctOption).length
    const total = examQuestions.length
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0

    await recordExamResult({
      exam_type: 'simulador',
      total_questions: total,
      correct_answers: correct,
      score_percentage: percentage,
      time_spent_seconds: sessionStartedAt ? Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000) : 0,
    })

    for (const q of examQuestions) {
      if (selectedOptions[q.id]) {
        await recordQuestionResponse({
          question_identifier: String(q.id),
          selected_option: selectedOptions[q.id],
          is_correct: selectedOptions[q.id] === q.correctOption,
        })
      }
    }

    if (studySessionId && sessionStartedAt) {
      const durationSeconds = Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000)
      await updateStudySession(studySessionId, {
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        questions_attempted: total,
        questions_correct: correct,
      })
    }

    toast.success('Examen finalizado')
  }

  const calculateScore = () => {
    let correct = 0
    examQuestions.forEach(q => {
      if (selectedOptions[q.id] === q.correctOption) {
        correct++
      }
    })
    return {
      correct,
      total: examQuestions.length,
      percentage: Math.round((correct / examQuestions.length) * 100)
    }
  }

  if (loading || mockQuestions.length === 0) {
    return (
      <Page>
        <PageHeader>
          <PageTitle className="font-serif">Banco de Preguntas</PageTitle>
          <PageDescription>Simulacro de examen real con tiempo limitado</PageDescription>
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

  if (!isExamStarted) {
    return (
      <Page>
        <PageHeader>
          <PageTitle className="font-serif">Banco de Preguntas</PageTitle>
          <PageDescription>Simulacro de examen real con tiempo limitado</PageDescription>
        </PageHeader>
        <PageBody className="flex flex-col items-center justify-center py-12">
          <Card className="max-w-md w-full text-center p-8 space-y-6">
            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <Play size={40} className="ml-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">¿Listo para el simulacro?</h3>
              <p className="text-muted-foreground">
                Este simulacro consta de {mockQuestions.length} preguntas y tienes 60 minutos para completarlo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-muted-foreground">Preguntas</div>
                <div className="font-bold text-lg">{mockQuestions.length}</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-muted-foreground">Tiempo</div>
                <div className="font-bold text-lg">60:00</div>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={handleStart}>
              Comenzar Examen
            </Button>
          </Card>
        </PageBody>
      </Page>
    )
  }

  const currentQuestion = examQuestions[currentQuestionIndex]
  const stats = calculateScore()

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          {isReviewMode && (
            <Badge variant="outline" className="w-fit border-orange-500 text-orange-600 dark:text-orange-400">
              <RotateCcw className="w-3 h-3 mr-1" />
              Modo Repaso
            </Badge>
          )}
          <Badge variant="outline" className="w-fit">{currentQuestion.topic}</Badge>
          <PageTitle className="text-xl">Pregunta {currentQuestionIndex + 1} de {examQuestions.length}</PageTitle>
        </div>
        <PageActions className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg font-mono font-bold">
            <Clock size={18} className={timeLeft < 300 ? 'text-destructive animate-pulse' : 'text-primary'} />
            {formatTime(timeLeft)}
          </div>
          <Button variant="outline" size="icon" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </Button>
          {!isFinished && (
            <Button variant="default" onClick={handleFinish}>
              Finalizar
            </Button>
          )}
        </PageActions>
      </PageHeader>
      
      <PageBody className="max-w-3xl mx-auto space-y-8 py-8">
        {isFinished ? (
          <div className="space-y-6">
            <Card className="text-center p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-3xl font-bold font-serif">Resultados del Examen</h3>
                <p className="text-muted-foreground">Resumen de tu desempeño</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-6 bg-secondary rounded-xl space-y-1">
                  <div className="text-green-600 flex justify-center"><CheckCircle2 size={32} /></div>
                  <div className="text-2xl font-bold">{stats.correct}</div>
                  <div className="text-xs uppercase text-muted-foreground">Correctas</div>
                </div>
                <div className="p-6 bg-secondary rounded-xl space-y-1">
                  <div className="text-destructive flex justify-center"><XCircle size={32} /></div>
                  <div className="text-2xl font-bold">{stats.total - stats.correct}</div>
                  <div className="text-xs uppercase text-muted-foreground">Incorrectas</div>
                </div>
                <div className="p-6 bg-primary text-white rounded-xl space-y-1">
                  <div className="flex justify-center"><Target size={32} /></div>
                  <div className="text-2xl font-bold">{stats.percentage}%</div>
                  <div className="text-xs uppercase text-white/70">Puntaje</div>
                </div>
              </div>
            </Card>

            <div className="grid gap-4">
              {examQuestions.map((q, idx) => {
                const userAnswer = selectedOptions[q.id]
                const isCorrect = userAnswer === q.correctOption
                return (
                  <Card key={q.id} className={isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50'}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm mb-2">Pregunta {idx + 1}: {q.text}</p>
                            <p className="text-sm">
                              <span className="font-semibold">Tu respuesta:</span> {userAnswer ? userAnswer.toUpperCase() : 'No respondida'}
                            </p>
                            <p className="text-sm">
                              <span className="font-semibold">Correcta:</span> {q.correctOption.toUpperCase()}
                            </p>
                          </div>
                          {isCorrect ? (
                            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsExamStarted(false)}>
                Volver al Inicio
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                <RotateCcw size={18} className="mr-2" /> Reintentar
              </Button>
            </div>

            {wrongQuestions.length > 0 && (
              <Button 
                onClick={handleStartReview} 
                className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <RotateCcw className="w-4 h-4" />
                Repasar {wrongQuestions.length} pregunta(s) fallada(s)
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-6">
              <div className="text-xl font-medium leading-relaxed">
                {currentQuestion.text}
              </div>
              
              <div className="grid gap-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOptions[String(currentQuestion.id)] === option.id
                  return (
                    <button
                      key={option.id}
                      className={`
                        flex items-center gap-4 p-5 rounded-xl text-left transition-all border-2
                        ${isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-transparent bg-secondary hover:border-primary/20 hover:bg-secondary/80'
                        }
                      `}
                      onClick={() => handleOptionSelect(String(currentQuestion.id), option.id)}
                    >
                      <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center font-bold
                        ${isSelected ? 'bg-primary text-white' : 'bg-card text-primary border border-border dark:bg-secondary dark:text-primary'}
                      `}>
                        {option.id.toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium">{option.text}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-8 border-t">
              <Button 
                variant="outline" 
                onClick={handlePrev} 
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft size={20} className="mr-2" /> Anterior
              </Button>
              
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" title="Reproducir audio">
                  <Volume2 size={20} className="text-primary" />
                </Button>
              </div>

              <Button 
                onClick={handleNext} 
                disabled={currentQuestionIndex === examQuestions.length - 1}
              >
                Siguiente <ChevronRight size={20} className="ml-2" />
              </Button>
            </div>
          </>
        )}
      </PageBody>
    </Page>
  )
}
