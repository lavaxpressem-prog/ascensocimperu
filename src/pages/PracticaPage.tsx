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
  XCircle
} from 'lucide-react'
import { getTopicsWithCount, getQuestionsByMateria, type TopicWithCount, type Question } from '../lib/supabase'

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

  useEffect(() => {
    getTopicsWithCount().then(t => {
      setTopics(t)
      setLoadingTopics(false)
    })
  }, [])

  const currentQuestion = topicQuestions[currentQuestionIndex]

  const handleSelectTopic = (topic: TopicWithCount) => {
    setSelectedTopic(topic.nombre)
    setSelectedMateriaId(topic.id)
    setIsPracticing(true)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setIsFinished(false)
    setScore(0)
    setLoadingQuestions(true)
    getQuestionsByMateria(topic.id).then(qs => {
      setTopicQuestions(qs)
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

  const handleFinishPractice = () => {
    let correct = 0
    topicQuestions.forEach(q => {
      if (selectedOptions[q.id] === q.correctOption && q.correctOption) {
        correct++
      }
    })
    const percentage = topicQuestions.length > 0 
      ? Math.round((correct / topicQuestions.length) * 100) 
      : 0
    setScore(percentage)
    setIsFinished(true)
    toast.success('Práctica finalizada')
  }

  const handleBackToTopics = () => {
    setSelectedTopic(null)
    setSelectedMateriaId(null)
    setTopicQuestions([])
    setIsPracticing(false)
    setCurrentQuestionIndex(0)
    setSelectedOptions({})
    setIsFinished(false)
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
                            {q.correctOption && (
                              <p className="text-sm">
                                <span className="font-semibold">Correcta:</span> {q.correctOption.toUpperCase()}
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

            <Button onClick={handleBackToTopics} className="w-full">
              Volver a Temas
            </Button>
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
          <PageTitle>{selectedTopic}</PageTitle>
          <PageDescription>
            Pregunta {currentQuestionIndex + 1} de {topicQuestions.length}
          </PageDescription>
        </PageHeader>
        <PageBody>
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-6">{currentQuestion.text}</h2>
                <div className="space-y-3">
                  {currentQuestion.options.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full p-4 text-left rounded-lg border-2 transition ${
                        selectedOptions[currentQuestion.id] === option.id
                          ? 'border-indigo-600 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/50'
                          : 'border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedOptions[currentQuestion.id] === option.id
                            ? 'border-indigo-600 bg-indigo-600 dark:border-indigo-400 dark:bg-indigo-400'
                            : 'border-muted-foreground/50'
                        }`}>
                          {selectedOptions[currentQuestion.id] === option.id && (
                            <span className="text-white text-sm font-bold">✓</span>
                          )}
                        </div>
                        <span className="text-foreground">{option.id.toUpperCase()}. {option.text}</span>
                      </div>
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
