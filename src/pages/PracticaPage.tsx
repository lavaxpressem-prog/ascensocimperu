import React, { useState, useEffect } from 'react'
import { 
  Page, 
  PageHeader, 
  PageTitle,
  PageDescription,
  PageBody, 
  Card, 
  CardContent,
  Button,
  Badge,
  toast
} from '@blinkdotnew/ui'
import { 
  BookOpen, 
  Play, 
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw
} from 'lucide-react'
import { getTopicsWithCount, getQuestionsByMateria, shuffleArray, recordStudySession, updateStudySession, recordQuestionResponse, type TopicWithCount, type Question } from '../lib/supabase'

export function PracticaPage() {
  const [topics, setTopics] = useState<TopicWithCount[]>([])
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [selectedMateriaId, setSelectedMateriaId] = useState<number | null>(null)
  const [topicQuestions, setTopicQuestions] = useState<Question[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [isPracticing, setIsPracticing] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string>>({})
  const [isFinished, setIsFinished] = useState(false)
  const [score, setScore] = useState(0)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [studySessionId, setStudySessionId] = useState<string | null>(null)
  const [sessionStartedAt, setSessionStartedAt] = useState<Date | null>(null)

  useEffect(() => {
    getTopicsWithCount().then(t => {
      setTopics(t)
      setLoadingTopics(false)
    })
  }, [])

  const currentQuestion = topicQuestions[currentQuestionIndex]

  const handleSelectTopic = async (topic: TopicWithCount) => {
    setSelectedTopic(topic.nombre)
    setSelectedMateriaId(topic.id)
    setIsPracticing(true)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setIsFinished(false)
    setScore(0)
    setLoadingQuestions(true)

    const now = new Date()
    setSessionStartedAt(now)
    const sessionId = await recordStudySession({
      activity_type: 'practica',
      started_at: now.toISOString(),
    })
    setStudySessionId(sessionId)

    getQuestionsByMateria(topic.id).then(qs => {
      setTopicQuestions(shuffleArray(qs))
      setLoadingQuestions(false)
    })
  }

  const handleSelectOption = (optionId: string) => {
    if (currentQuestion) {
      setSelectedOptions(prev => ({
        ...prev,
        [currentQuestion.id]: optionId
      }))
    }
  }

  const handleNext = () => {
    if (currentQuestionIndex < topicQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleFinishPractice = async () => {
    let correct = 0
    const wrong: Question[] = []
    
    for (const q of topicQuestions) {
      const isCorrect = selectedOptions[q.id] === q.correctOption && !!q.correctOption
      if (isCorrect) {
        correct++
      } else {
        wrong.push(q)
      }

      if (selectedOptions[q.id]) {
        await recordQuestionResponse({
          question_identifier: String(q.id),
          selected_option: selectedOptions[q.id],
          is_correct: isCorrect,
        })
      }
    }

    const percentage = topicQuestions.length > 0 
      ? Math.round((correct / topicQuestions.length) * 100) 
      : 0
    setScore(percentage)
    setWrongQuestions(wrong)
    setIsFinished(true)

    if (studySessionId && sessionStartedAt) {
      const durationSeconds = Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000)
      await updateStudySession(studySessionId, {
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
        questions_attempted: topicQuestions.length,
        questions_correct: correct,
      })
    }

    toast.success('Práctica finalizada')
  }

  const handleStartReview = () => {
    if (wrongQuestions.length === 0) return
    setTopicQuestions(wrongQuestions)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setIsFinished(false)
    setScore(0)
    setIsReviewMode(true)
    setIsPracticing(true)
    toast.success(`Repasando ${wrongQuestions.length} pregunta(s) fallada(s)`)
  }

  const handleBackToTopics = () => {
    setSelectedTopic(null)
    setSelectedMateriaId(null)
    setTopicQuestions([])
    setIsPracticing(false)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setIsFinished(false)
    setIsReviewMode(false)
    setWrongQuestions([])
    setStudySessionId(null)
    setSessionStartedAt(null)
  }

  const totalQuestions = topics.reduce((sum, t) => sum + t.count, 0)

  // Mostrar resultados
  if (isPracticing && isFinished && selectedTopic) {
    const correct = topicQuestions.filter(
      q => selectedOptions[q.id] === q.correctOption
    ).length

    return (
      <Page>
        <PageHeader>
          <PageTitle>Resultados de Práctica</PageTitle>
          <PageDescription>Tema: {selectedTopic}</PageDescription>
        </PageHeader>
        <PageBody>
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400">{score}%</div>
                  <div className="text-lg text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">{correct}</span> de <span className="font-semibold">{topicQuestions.length}</span> respuestas correctas
                  </div>
                  <div className="flex gap-2 justify-center">
                    {score >= 80 && <Badge className="bg-green-500">¡Excelente!</Badge>}
                    {score >= 60 && score < 80 && <Badge className="bg-blue-500">¡Muy bien!</Badge>}
                    {score >= 40 && score < 60 && <Badge className="bg-yellow-500">Bien, sigue practicando</Badge>}
                    {score < 40 && <Badge className="bg-red-500">Necesitas más práctica</Badge>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {topicQuestions.map((q, idx) => {
                const userAnswer = selectedOptions[q.id]
                const isCorrect = userAnswer === q.correctOption && q.correctOption
                const userAnswerText = userAnswer ? q.options.find(o => o.id === userAnswer)?.text : null
                const correctAnswerText = q.correctOption ? q.options.find(o => o.id === q.correctOption)?.text : null
                return (
                  <Card key={q.id} className={isCorrect ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50'}>
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-sm mb-2">Pregunta {idx + 1}: {q.text}</p>
                            <p className="text-sm">
                              <span className="font-semibold">Tu respuesta:</span> {userAnswer ? `${userAnswer.toUpperCase()} - ${userAnswerText}` : 'No respondida'}
                            </p>
                            {q.correctOption && (
                              <p className="text-sm">
                                <span className="font-semibold">Correcta:</span> {q.correctOption.toUpperCase()} - {correctAnswerText}
                              </p>
                            )}
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

            {wrongQuestions.length > 0 ? (
              <div className="space-y-3">
                <Button 
                  onClick={handleStartReview} 
                  className="w-full gap-2 bg-orange-600 hover:bg-orange-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  Repasar {wrongQuestions.length} pregunta(s) fallada(s)
                </Button>
                <Button onClick={handleBackToTopics} variant="outline" className="w-full">
                  Volver a Temas
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-700 dark:text-green-300 font-semibold">
                    ¡Sin errores, buen trabajo!
                  </p>
                </div>
                <Button onClick={handleBackToTopics} className="w-full">
                  Volver a Temas
                </Button>
              </div>
            )}
          </div>
        </PageBody>
      </Page>
    )
  }

  // Mostrar práctica
  if (isPracticing && loadingQuestions) {
    return (
      <Page>
        <PageHeader>
          <PageTitle>{selectedTopic}</PageTitle>
          <PageDescription>Cargando preguntas...</PageDescription>
        </PageHeader>
        <PageBody>
          <Card>
            <CardContent className="p-8 flex items-center justify-center">
              <p className="text-muted-foreground">Cargando preguntas del tema...</p>
            </CardContent>
          </Card>
        </PageBody>
      </Page>
    )
  }

  if (isPracticing && currentQuestion && selectedTopic) {
    return (
      <Page>
        <PageHeader>
          <div className="flex items-center gap-2">
            {isReviewMode && (
              <Badge variant="outline" className="border-orange-500 text-orange-600 dark:text-orange-400">
                <RotateCcw className="w-3 h-3 mr-1" />
                Repaso
              </Badge>
            )}
            <PageTitle>{selectedTopic}</PageTitle>
          </div>
          {isReviewMode && (
            <PageDescription>
              Preguntas falladas
            </PageDescription>
          )}
        </PageHeader>
        <PageBody>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pregunta {currentQuestionIndex + 1} de {topicQuestions.length}
              </p>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleFinishPractice}
              >
                Finalizar práctica
              </Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-6">{currentQuestion.text}</h2>
                <div className="space-y-3">
                  {currentQuestion.options.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`
                        flex items-center gap-4 p-5 rounded-xl text-left transition-all border-2
                        ${selectedOptions[currentQuestion.id] === option.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-transparent bg-secondary hover:border-primary/20 hover:bg-secondary/80'
                        }
                      `}
                    >
                      <div className={`
                        h-8 w-8 rounded-lg flex items-center justify-center font-bold
                        ${selectedOptions[currentQuestion.id] === option.id
                          ? 'bg-primary text-white'
                          : 'bg-card text-primary border border-border dark:bg-secondary dark:text-primary'
                        }
                      `}>
                        {option.id.toUpperCase()}
                      </div>
                      <span className="flex-1 font-medium">{option.id.toUpperCase()}. {option.text}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                onClick={handlePrevious} 
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                ← Anterior
              </Button>
              <div className="flex-1" />
              {currentQuestionIndex === topicQuestions.length - 1 ? (
                <Button onClick={handleFinishPractice} className="bg-green-600 hover:bg-green-700">
                  Terminar Práctica
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Siguiente →
                </Button>
              )}
            </div>
          </div>
        </PageBody>
      </Page>
    )
  }

  // Mostrar lista de temas
  return (
    <Page>
      <PageHeader>
        <PageTitle>📚 Práctica por Temas</PageTitle>
        <PageDescription>
          {loadingTopics
            ? 'Cargando temas...'
            : `Selecciona un tema para practicar preguntas específicas. Total: ${totalQuestions} preguntas`
          }
        </PageDescription>
      </PageHeader>
      <PageBody>
        {loadingTopics ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 bg-muted rounded" />
                      <div className="w-20 h-5 bg-muted rounded" />
                    </div>
                    <div className="w-3/4 h-5 bg-muted rounded" />
                    <div className="w-full h-9 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {topics.map(topic => (
              <Card 
                key={topic.id} 
                className="hover:shadow-lg transition cursor-pointer"
                onClick={() => handleSelectTopic(topic)}
              >
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <BookOpen className="w-8 h-8 text-indigo-600" />
                      <Badge variant="secondary">{topic.count} preguntas</Badge>
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2">{topic.nombre}</h3>
                    <Button 
                      onClick={() => handleSelectTopic(topic)}
                      className="w-full gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Practicar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loadingTopics && topics.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No hay temas disponibles</p>
          </div>
        )}
      </PageBody>
    </Page>
  )
}
