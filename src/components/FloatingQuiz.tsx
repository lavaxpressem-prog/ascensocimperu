import { useState, useEffect, useCallback } from 'react'
import { getRandomQuestions, type Question } from '../lib/supabase'
import { Brain, CheckCircle2, XCircle, Sparkles, Trophy, X } from 'lucide-react'

const STORAGE_KEY = 'ascensocim_recent_quiz_ids'
const QUESTIONS_PER_SESSION = 2
const MAX_RECENT_IDS = 20

function getRecentIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveRecentIds(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-MAX_RECENT_IDS))) } catch {}
}

const PASTEL = {
  lavender: '#E8D5F5',
  lavenderLight: '#F3ECFB',
  blue: '#D0E8F7',
  blueLight: '#EBF5FC',
  mint: '#D4F0DB',
  mintLight: '#EDF8EF',
  pink: '#F8D7DE',
  pinkLight: '#FDF0F2',
  peach: '#FBE5D0',
  peachLight: '#FDF3EA',
  yellow: '#FBF3CD',
  yellowLight: '#FDF9E8',
}

const OPTION_COLORS = [
  { bg: PASTEL.lavenderLight, border: PASTEL.lavender, hover: PASTEL.lavender, text: '#6B21A8' },
  { bg: PASTEL.blueLight, border: PASTEL.blue, hover: PASTEL.blue, text: '#1E40AF' },
  { bg: PASTEL.mintLight, border: PASTEL.mint, hover: PASTEL.mint, text: '#166534' },
  { bg: PASTEL.peachLight, border: PASTEL.peach, hover: PASTEL.peach, text: '#9A3412' },
]

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export function FloatingQuiz() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [score, setScore] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  const loadQuestions = useCallback(async () => {
    setIsLoading(true)
    try {
      const recentIds = getRecentIds()
      let attempts = 0
      let picked: Question[] = []

      while (attempts < 5) {
        const all = await getRandomQuestions(QUESTIONS_PER_SESSION + 10)
        picked = all.filter(q => !recentIds.includes(q.id)).slice(0, QUESTIONS_PER_SESSION)
        if (picked.length >= QUESTIONS_PER_SESSION) break
        attempts++
      }

      if (picked.length < QUESTIONS_PER_SESSION) {
        const all = await getRandomQuestions(QUESTIONS_PER_SESSION)
        picked = all.slice(0, QUESTIONS_PER_SESSION)
      }

      setQuestions(picked)
      saveRecentIds([...recentIds, ...picked.map(q => q.id)])
    } catch {
      const fallback = await getRandomQuestions(QUESTIONS_PER_SESSION)
      setQuestions(fallback)
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const shouldShow = localStorage.getItem('quizShowAfterLogin') === 'true'
    if (!shouldShow) return

    localStorage.removeItem('quizShowAfterLogin')
    loadQuestions().then(() => {
      setIsVisible(true)
    })
  }, [loadQuestions])

  const handleSelect = (idx: number) => {
    if (isAnswered) return
    setSelectedIdx(idx)
    setIsAnswered(true)
    const q = questions[currentIdx]
    const isCorrect = q.options[idx]?.id === q.correctOption
    if (isCorrect) setScore(s => s + 1)
  }

  const handleNext = () => {
    if (currentIdx < QUESTIONS_PER_SESSION - 1) {
      setCurrentIdx(i => i + 1)
      setSelectedIdx(null)
      setIsAnswered(false)
    } else {
      setShowSummary(true)
    }
  }

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => setIsVisible(false), 300)
  }

  const handleRestart = () => {
    setCurrentIdx(0)
    setSelectedIdx(null)
    setIsAnswered(false)
    setScore(0)
    setShowSummary(false)
    setIsClosing(true)
    setTimeout(async () => {
      setIsClosing(false)
      setIsVisible(false)
      await loadQuestions()
      setCurrentIdx(0)
      setSelectedIdx(null)
      setIsAnswered(false)
      setScore(0)
      setShowSummary(false)
      setIsVisible(true)
    }, 350)
  }

  if (!isVisible || questions.length === 0) return null

  const q = questions[currentIdx]
  const isCorrect = selectedIdx !== null && q.options[selectedIdx]?.id === q.correctOption

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ transition: 'opacity 0.3s', opacity: isClosing ? 0 : 1 }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      <div
        className="relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #FDF2F8 0%, #F0F4FF 30%, #ECFDF5 60%, #FFFBEB 100%)',
          animation: isClosing ? 'quizSlideOut 0.3s ease-in forwards' : 'quizSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          maxHeight: '90vh',
        }}
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center mb-4 animate-pulse">
              <Brain size={32} className="text-purple-500" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Preparando tus preguntas...</p>
          </div>
        ) : showSummary ? (
          <SummaryView score={score} total={QUESTIONS_PER_SESSION} onClose={handleClose} onRestart={handleRestart} />
        ) : (
          <QuestionView
            question={q}
            currentIdx={currentIdx}
            total={QUESTIONS_PER_SESSION}
            selectedIdx={selectedIdx}
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            onSelect={handleSelect}
            onNext={handleNext}
            onClose={handleClose}
          />
        )}
      </div>

      <style>{`
        @keyframes quizSlideIn {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes quizSlideOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.9) translateY(20px); }
        }
        @keyframes quizPop {
          0% { transform: scale(0.8); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function QuestionView({
  question, currentIdx, total, selectedIdx, isAnswered, isCorrect, onSelect, onNext, onClose,
}: {
  question: Question
  currentIdx: number
  total: number
  selectedIdx: number | null
  isAnswered: boolean
  isCorrect: boolean
  onSelect: (idx: number) => void
  onNext: () => void
  onClose: () => void
}) {
  const options = question.options

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-md">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Reto Rapido</p>
            <p className="text-xs text-gray-400">Pregunta {currentIdx + 1} de {total}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/60 hover:bg-white/80 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors shadow-sm">
          <X size={16} />
        </button>
      </div>

      <div className="px-5 pb-2">
        <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${((currentIdx + 1) / total) * 100}%`,
              background: 'linear-gradient(90deg, #C084FC, #60A5FA, #34D399)',
            }}
          />
        </div>
      </div>

      <div className="px-5 py-4">
        <div
          className="rounded-2xl p-4 mb-4 shadow-sm"
          style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}
        >
          <p className="text-sm font-semibold text-gray-800 leading-relaxed">{question.text}</p>
        </div>

        <div className="space-y-2.5">
          {options.map((opt, idx) => {
            const color = OPTION_COLORS[idx % OPTION_COLORS.length]
            const isSelected = selectedIdx === idx
            const isCorrectOption = opt.id === question.correctOption

            let borderColor = color.border
            let bgColor = color.bg
            let textColor = color.text
            let icon: React.ReactNode = null

            if (isAnswered) {
              if (isCorrectOption) {
                borderColor = '#86EFAC'
                bgColor = '#DCFCE7'
                textColor = '#166534'
                icon = <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
              } else if (isSelected && !isCorrectOption) {
                borderColor = '#FCA5A5'
                bgColor = '#FEE2E2'
                textColor = '#991B1B'
                icon = <XCircle size={18} className="text-red-400 flex-shrink-0" />
              }
            }

            return (
              <button
                key={opt.id}
                onClick={() => onSelect(idx)}
                disabled={isAnswered}
                className="w-full flex items-center gap-3 rounded-xl p-3 text-left transition-all duration-200"
                style={{
                  background: bgColor,
                  border: `2px solid ${borderColor}`,
                  color: textColor,
                  opacity: isAnswered && !isCorrectOption && !isSelected ? 0.5 : 1,
                  transform: isSelected && isAnswered ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected ? `0 4px 14px ${borderColor}40` : 'none',
                  cursor: isAnswered ? 'default' : 'pointer',
                  animation: isAnswered && isCorrectOption ? 'quizPop 0.3s ease' : undefined,
                }}
              >
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{
                    background: isAnswered && isCorrectOption ? '#BBF7D0' : isAnswered && isSelected && !isCorrectOption ? '#FECACA' : 'rgba(255,255,255,0.7)',
                    color: isAnswered && isCorrectOption ? '#166534' : isAnswered && isSelected && !isCorrectOption ? '#991B1B' : color.text,
                  }}
                >
                  {LETTERS[idx]}
                </span>
                <span className="text-sm flex-1 leading-snug">{opt.text}</span>
                {icon}
              </button>
            )
          })}
        </div>
      </div>

      {isAnswered && (
        <div className="px-5 pb-5" style={{ animation: 'quizPop 0.3s ease' }}>
          <div
            className="rounded-xl p-3 mb-4 flex items-center gap-3"
            style={{
              background: isCorrect ? '#DCFCE7' : '#FEE2E2',
              border: `1px solid ${isCorrect ? '#86EFAC' : '#FCA5A5'}`,
            }}
          >
            {isCorrect ? (
              <>
                <Sparkles size={18} className="text-green-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-700">¡Correcto! Muy bien</span>
              </>
            ) : (
              <>
                <XCircle size={18} className="text-red-400 flex-shrink-0" />
                <span className="text-sm font-semibold text-red-700">
                  Incorrecto. La respuesta correcta es: {LETTERS[question.indiceCorrecto]}. {question.respuestaCorrecta}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onNext}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #A78BFA, #60A5FA)' }}
          >
            {currentIdx < total - 1 ? 'Siguiente' : 'Ver Resultados ✨'}
          </button>
        </div>
      )}
    </>
  )
}

function SummaryView({ score, total, onClose, onRestart }: { score: number; total: number; onClose: () => void; onRestart: () => void }) {
  const percentage = (score / total) * 100
  const isPerfect = score === total
  const isGood = score >= total / 2

  return (
    <div className="px-6 py-8 text-center">
      <div
        className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center shadow-lg"
        style={{
          background: isPerfect
            ? 'linear-gradient(135deg, #86EFAC, #34D399)'
            : isGood
            ? 'linear-gradient(135deg, #93C5FD, #60A5FA)'
            : 'linear-gradient(135deg, #FCA5A5, #F87171)',
          animation: 'quizPop 0.5s ease',
        }}
      >
        <Trophy size={36} className="text-white" />
      </div>

      <h3 className="text-xl font-bold text-gray-800 mb-2">
        {isPerfect ? '¡Excelente!' : isGood ? '¡Buen trabajo!' : 'Sigue practicando'}
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {isPerfect
          ? 'Respondiste todas las preguntas correctamente'
          : isGood
          ? 'Tuviste un buen desempeño en este reto'
          : 'La práctica hace al maestro, ¡no te rindas!'}
      </p>

      <div
        className="inline-flex items-center gap-3 rounded-2xl px-6 py-4 mb-6 shadow-md"
        style={{
          background: isPerfect
            ? 'linear-gradient(135deg, #DCFCE7, #D4F0DB)'
            : isGood
            ? 'linear-gradient(135deg, #DBEAFE, #D0E8F7)'
            : 'linear-gradient(135deg, #FEE2E2, #F8D7DE)',
        }}
      >
        <span className="text-3xl font-bold" style={{ color: isPerfect ? '#166534' : isGood ? '#1E40AF' : '#991B1B' }}>
          {score}/{total}
        </span>
        <span className="text-sm text-gray-500 text-left leading-tight">
          {score === total ? 'preguntas\ncorrectas' : `${score} de ${total}\ncorrectas`}
        </span>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onRestart}
          className="flex-1 py-3 rounded-xl text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #A78BFA, #60A5FA)' }}
        >
          Otro Reto 🔄
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white/70 text-gray-600 shadow-md border border-gray-200/50 transition-all duration-200 hover:bg-white hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
