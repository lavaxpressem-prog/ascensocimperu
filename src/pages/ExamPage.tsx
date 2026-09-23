import React, { useState, useEffect, useRef } from 'react'
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
  RefreshCw,
  ArrowLeft
} from 'lucide-react'
import { getRandomQuestionsBatch, shuffleArray, recordStudySession, updateStudySession, recordExamResult, recordQuestionResponses, type Question } from '../lib/supabase'

type ResultsView = 'summary' | 'correct' | 'incorrect'

export function ExamPage() {
  const [mockQuestions, setMockQuestions] = useState<Question[]>([])
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(3600) // 60 minutes
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null)
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [correctQuestions, setCorrectQuestions] = useState<Question[]>([])
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [resultsView, setResultsView] = useState<ResultsView>('summary')
  const mountedRef = useRef(true)
  const finishingRef = useRef(false)

  const loadQuestions = async () => {
    setLoading(true)
    setLoadError(null)
    console.log('[ExamPage] Mounting - loading 100 random questions...')

    try {
      const qs = await getRandomQuestionsBatch(100)
      if (!mountedRef.current) return

      if (qs.length === 0) {
        setLoadError('No se pudieron cargar las preguntas. Verifica tu conexion e intenta de nuevo.')
        setLoading(false)
        return
      }

      console.log(`[ExamPage] Loaded ${qs.length} unique questions (IDs: ${qs.map(q => q.id).join(', ')})`)
      setMockQuestions(qs)
      setLoading(false)
    } catch (err) {
      if (!mountedRef.current) return
      console.error('[ExamPage] Error loading questions:', err)
      setLoadError('Error al cargar las preguntas. Intenta de nuevo.')
      setLoading(false)
    }
  }

  useEffect(() => {
    mountedRef.current = true
    loadQuestions()
    return () => { mountedRef.current = false }
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
    finishingRef.current = false
    setStudySessionId(null)
    setSessionStartedAt(null)
    setWrongQuestions([])
    setIsReviewMode(false)
    setResultsView('summary')
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
    if (finishingRef.current) return
    finishingRef.current = true
    setIsFinished(true)

    const wrong: Question[] = []
    const correctQs: Question[] = []
    examQuestions.forEach(q => {
      if (selectedOptions[q.id] !== q.correctOption) {
        wrong.push(q)
      } else {
        correctQs.push(q)
      }
    })
    setWrongQuestions(wrong)
    setCorrectQuestions(correctQs)

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

    const responses = examQuestions
      .filter(q => selectedOptions[q.id])
      .map(q => ({
        question_identifier: String(q.id),
        selected_option: selectedOptions[q.id],
        is_correct: selectedOptions[q.id] === q.correctOption,
      }))
    await recordQuestionResponses(responses)

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
            {loadError ? (
              <>
                <p className="text-destructive font-medium">{loadError}</p>
                <Button onClick={loadQuestions} variant="outline">
                  <RefreshCw size={16} className="mr-2" /> Reintentar
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Cargando 100 preguntas aleatorias...</p>
              </div>
            )}
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
                Este simulacro consta de 100 preguntas seleccionadas aleatoriamente y tienes 60 minutos para completarlo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-muted-foreground">Preguntas</div>
                <div className="font-bold text-lg">100</div>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <div className="text-muted-foreground">Tiempo</div>
                <div className="font-bold text-lg">60:00</div>
              </div>
            </div>
            <Button size="lg" className="w-full" onClick={handleStart}>
              Comenzar Examen
            </Button>
            <Button size="sm" variant="ghost" className="w-full" onClick={loadQuestions}>
              <RefreshCw size={14} className="mr-2" /> Obtener otras 100 preguntas
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
            {/* Results summary view */}
            {resultsView === 'summary' && (
              <>
                <Card className="text-center p-8 space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold font-serif">Resultado del Examen</h3>
                    <p className="text-muted-foreground">Resumen de tu desempeño</p>
                  </div>
                  <div className="flex flex-col items-center gap-2 py-4">
                    <div className="text-5xl font-bold font-serif text-primary">{stats.correct}</div>
                    <div className="text-lg text-muted-foreground">de {stats.total} preguntas</div>
                    <div className="text-4xl font-bold text-primary">{stats.percentage}%</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setResultsView('correct')}
                      className="p-6 bg-green-50 dark:bg-green-950/50 rounded-xl space-y-2 border-2 border-transparent hover:border-green-300 dark:hover:border-green-700 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 size={24} />
                        <span className="text-sm font-semibold uppercase">Correctas</span>
                      </div>
                      <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.correct}</div>
                    </button>
                    <button
                      onClick={() => setResultsView('incorrect')}
                      className="p-6 bg-red-50 dark:bg-red-950/50 rounded-xl space-y-2 border-2 border-transparent hover:border-red-300 dark:hover:border-red-700 transition-all cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle size={24} />
                        <span className="text-sm font-semibold uppercase">Incorrectas</span>
                      </div>
                      <div className="text-3xl font-bold text-red-700 dark:text-red-400">{stats.total - stats.correct}</div>
                    </button>
                  </div>
                </Card>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => { setIsExamStarted(false); setResultsView('summary'); loadQuestions() }}>
                    Volver al Inicio
                  </Button>
                  <Button className="flex-1" onClick={handleStart}>
                    <RotateCcw size={18} className="mr-2" /> Reintentar
                  </Button>
                </div>
              </>
            )}

            {/* Questions detail view */}
            {(resultsView === 'correct' || resultsView === 'incorrect') && (
              <>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setResultsView('summary')}
                  >
                    <ArrowLeft size={18} />
                  </Button>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold font-serif">
                      {resultsView === 'correct' ? 'Preguntas Correctas' : 'Preguntas Incorrectas'}
                    </h3>
                    <p className="text-muted-foreground">
                      {resultsView === 'correct'
                        ? `${correctQuestions.length} pregunta(s) respondida(s) correctamente`
                        : `${wrongQuestions.length} pregunta(s) respondida(s) incorrectamente`}
                    </p>
                  </div>
                </div>

                {(resultsView === 'correct' ? correctQuestions : wrongQuestions).length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="space-y-3">
                      {resultsView === 'correct' ? (
                        <CheckCircle2 size={48} className="mx-auto text-green-500" />
                      ) : (
                        <XCircle size={48} className="mx-auto text-red-500" />
                      )}
                      <p className="text-lg text-muted-foreground">
                        {resultsView === 'correct'
                          ? 'No respondiste ninguna pregunta correctamente.'
                          : '¡Excelente! No tuviste preguntas incorrectas.'}
                      </p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {(resultsView === 'correct' ? correctQuestions : wrongQuestions).map((q) => {
                      const userOption = selectedOptions[q.id]
                      const isCorrect = userOption === q.correctOption
                      const qIndex = examQuestions.findIndex(eq => eq.id === q.id)

                      return (
                        <Card
                          key={q.id}
                          className={
                            isCorrect
                              ? 'border-green-200 dark:border-green-800'
                              : 'border-red-200 dark:border-red-800'
                          }
                        >
                          <CardContent className="pt-6 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold text-lg">
                                Pregunta {qIndex + 1}
                              </h4>
                              {isCorrect ? (
                                <Badge className="bg-green-600 flex-shrink-0">Correcta</Badge>
                              ) : (
                                <Badge variant="destructive" className="flex-shrink-0">Incorrecta</Badge>
                              )}
                            </div>

                            <p className="text-base leading-relaxed">{q.text}</p>

                            <div className="grid gap-2">
                              {q.options.map((opt) => {
                                const isUserSelected = userOption === opt.id
                                const isThisCorrect = q.correctOption === opt.id
                                let borderClass = 'border-transparent bg-secondary'
                                let letterBg = 'bg-card text-primary border border-border dark:bg-secondary dark:text-primary'

                                if (isThisCorrect) {
                                  borderClass = 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-950/50'
                                  letterBg = 'bg-green-600 text-white'
                                } else if (isUserSelected && !isThisCorrect) {
                                  borderClass = 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/50'
                                  letterBg = 'bg-red-600 text-white'
                                }

                                return (
                                  <div
                                    key={opt.id}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 ${borderClass}`}
                                  >
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold ${letterBg}`}>
                                      {opt.id.toUpperCase()}
                                    </div>
                                    <span className="flex-1 font-medium">{opt.text}</span>
                                    {isThisCorrect && (
                                      <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                                    )}
                                    {isUserSelected && !isThisCorrect && (
                                      <XCircle size={20} className="text-red-600 flex-shrink-0" />
                                    )}
                                  </div>
                                )
                              })}
                            </div>

                            <div className="pt-2 border-t space-y-1 text-sm">
                              <p>
                                <span className="font-semibold text-green-700 dark:text-green-400">Respuesta correcta: </span>
                                <span className="font-medium">{q.correctOption.toUpperCase()}. {q.options.find(o => o.id === q.correctOption)?.text}</span>
                              </p>
                              <p>
                                <span className={`font-semibold ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                  Tu respuesta:{' '}
                                </span>
                                <span className="font-medium">
                                  {userOption ? `${userOption.toUpperCase()}. ${q.options.find(o => o.id === userOption)?.text}` : 'Sin respuesta'}
                                </span>
                              </p>
                              {isCorrect ? (
                                <p className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1 pt-1">
                                  <CheckCircle2 size={14} /> Correcta
                                </p>
                              ) : (
                                <p className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1 pt-1">
                                  <XCircle size={14} /> Incorrecta
                                </p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setResultsView('summary')}>
                    <ArrowLeft size={18} className="mr-2" /> Volver al Resultado
                  </Button>
                  {wrongQuestions.length > 0 && (
                    <Button className="flex-1" onClick={handleStart}>
                      <RotateCcw size={18} className="mr-2" /> Reintentar
                    </Button>
                  )}
                </div>
              </>
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
