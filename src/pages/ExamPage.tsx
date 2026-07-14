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
import { getQuestionsBatch, type Question } from '../lib/supabase'

export function ExamPage() {
  const [mockQuestions, setMockQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [isExamStarted, setIsExamStarted] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState(3600) // 60 minutes
  const [isPaused, setIsPaused] = useState(false)
  const [isFinished, setIsFinished] = useState(false)

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

  const handleStart = () => {
    setIsExamStarted(true)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setTimeLeft(3600)
    setIsFinished(false)
    toast.success('Simulacro iniciado')
  }

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isFinished) return
    setSelectedOptions(prev => ({ ...prev, [questionId]: optionId }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < mockQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleFinish = () => {
    setIsFinished(true)
    toast.success('Examen finalizado')
  }

  const calculateScore = () => {
    let correct = 0
    mockQuestions.forEach(q => {
      if (selectedOptions[q.id] === q.correctOption) {
        correct++
      }
    })
    return {
      correct,
      total: mockQuestions.length,
      percentage: Math.round((correct / mockQuestions.length) * 100)
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

  const currentQuestion = mockQuestions[currentQuestionIndex]
  const stats = calculateScore()

  return (
    <Page>
      <PageHeader>
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="w-fit">{currentQuestion.topic}</Badge>
          <PageTitle className="text-xl">Pregunta {currentQuestionIndex + 1} de {mockQuestions.length}</PageTitle>
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
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setIsExamStarted(false)}>
                Volver al Inicio
              </Button>
              <Button className="flex-1" onClick={handleStart}>
                <RotateCcw size={18} className="mr-2" /> Reintentar
              </Button>
            </div>
          </Card>
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
                        ${isSelected ? 'bg-primary text-white' : 'bg-white text-primary border'}
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
                disabled={currentQuestionIndex === mockQuestions.length - 1}
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
