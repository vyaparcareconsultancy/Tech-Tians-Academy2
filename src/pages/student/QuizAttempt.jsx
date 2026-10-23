import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock, ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  AlertCircle, Check, RotateCcw, Trophy
} from 'lucide-react'
import { useData } from '../../lib/store.jsx'
import { Badge, Button } from '../../components/ui.jsx'
import { cx } from '../../lib/utils.js'

export default function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db } = useData()

  // Find quiz or fallback
  const quiz = useMemo(() => {
    return (db.quizzes || []).find((q) => q.id === id) || (db.quizzes || [])[0] || {
      id: 'qz-demo',
      title: 'Physics Mechanics Unit Test',
      timeLimitMin: 20,
      totalMarks: 50,
      questions: [
        {
          id: 'q-1',
          text: 'A particle moves along a circular path of radius r with constant speed v. What is the magnitude of its average acceleration over half a revolution?',
          options: [
            '2v² / (πr)',
            'v² / r',
            '4v² / (πr)',
            'Zero',
          ],
          correctIndex: 0,
          marks: 10,
        },
        {
          id: 'q-2',
          text: 'Which of the following physical quantities is conserved in both elastic and inelastic collisions in an isolated system?',
          options: [
            'Kinetic energy only',
            'Linear momentum only',
            'Both kinetic energy and linear momentum',
            'Mechanical energy',
          ],
          correctIndex: 1,
          marks: 10,
        },
        {
          id: 'q-3',
          text: 'The escape velocity from the surface of Earth depends on:',
          options: [
            'Mass of the projectile only',
            'Mass and radius of the Earth',
            'Angle of projection with horizontal',
            'Atmospheric density',
          ],
          correctIndex: 1,
          marks: 10,
        },
        {
          id: 'q-4',
          text: 'In simple harmonic motion, the acceleration of the particle is directly proportional to:',
          options: [
            'Velocity and in the same direction',
            'Displacement and in the same direction',
            'Displacement and directed opposite to displacement',
            'Square of displacement',
          ],
          correctIndex: 2,
          marks: 10,
        },
        {
          id: 'q-5',
          text: 'Work done by a centripetal force acting on a particle moving uniformly in a circle for one complete cycle is:',
          options: [
            '2πr × F',
            'Zero',
            'πr × F',
            'F / (2πr)',
          ],
          correctIndex: 1,
          marks: 10,
        },
      ],
    }
  }, [db.quizzes, id])

  const questions = useMemo(() => quiz.questions || [], [quiz])

  // Current question index
  const [currentIdx, setCurrentIdx] = useState(0)

  // User answers map { [questionIdx]: selectedOptionIdx }
  const [answers, setAnswers] = useState({})

  // Timer in seconds
  const totalSeconds = (quiz.timeLimitMin || 20) * 60
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // Countdown timer
  useEffect(() => {
    if (isSubmitted) return
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsSubmitted(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isSubmitted])

  // Format MM:SS
  const timerFormatted = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60)
    const secs = secondsRemaining % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [secondsRemaining])

  const isLowTime = secondsRemaining < 120 && secondsRemaining > 0

  const handleSelectOption = (optIdx) => {
    if (isSubmitted) return
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIdx,
    }))
  }

  const handleClearSelection = () => {
    if (isSubmitted) return
    setAnswers((prev) => {
      const copy = { ...prev }
      delete copy[currentIdx]
      return copy
    })
  }

  // Calculate score on submit
  const results = useMemo(() => {
    let earnedMarks = 0
    let totalMarks = 0
    let correctCount = 0

    questions.forEach((q, idx) => {
      const qMarks = q.marks || 10
      totalMarks += qMarks
      if (answers[idx] === q.correctIndex) {
        earnedMarks += qMarks
        correctCount++
      }
    })

    const percentage = totalMarks > 0 ? Math.round((earnedMarks / totalMarks) * 100) : 0
    const passed = percentage >= 50

    return {
      earnedMarks,
      totalMarks,
      correctCount,
      totalQuestions: questions.length,
      percentage,
      passed,
    }
  }, [questions, answers])

  const currentQ = questions[currentIdx] || {}
  const answeredCount = Object.keys(answers).length

  // Retake quiz
  const handleRetake = () => {
    setAnswers({})
    setCurrentIdx(0)
    setSecondsRemaining(totalSeconds)
    setIsSubmitted(false)
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar with Timer and Navigation */}
      <div className="card-base glass sticky top-16 z-20 flex flex-wrap items-center justify-between gap-4 p-4 border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (isSubmitted || answeredCount === 0) {
                navigate('/student/quizzes')
              } else {
                setShowExitConfirm(true)
              }
            }}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-muted hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit test</span>
          </button>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <h1 className="font-heading text-sm sm:text-base font-semibold text-white truncate max-w-xs sm:max-w-md">
            {quiz.title}
          </h1>
        </div>

        {/* Timer in mono at the top */}
        <div className="flex items-center gap-4">
          <div
            className={cx(
              'flex items-center gap-2 rounded-xl border px-3.5 py-1.5 font-mono text-sm tracking-wider transition-colors',
              isLowTime
                ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
                : 'border-white/10 bg-surface/60 text-gold'
            )}
          >
            <Clock className={cx('h-4 w-4', isLowTime ? 'text-red-400' : 'text-gold')} />
            <span className="font-bold">{timerFormatted}</span>
          </div>

          {!isSubmitted && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSubmitted(true)}
              className="hidden sm:inline-flex"
            >
              Submit test
            </Button>
          )}
        </div>
      </div>

      {/* Progress Dots Bar */}
      <div className="card-base glass p-4">
        <div className="flex items-center justify-between gap-3 text-xs font-mono text-muted mb-3">
          <span>Question {currentIdx + 1} of {questions.length}</span>
          <span>{answeredCount} of {questions.length} Answered</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIdx
            const isAnswered = answers[idx] !== undefined
            return (
              <button
                key={q.id || idx}
                onClick={() => setCurrentIdx(idx)}
                className={cx(
                  'h-8 w-8 sm:h-9 sm:w-9 rounded-lg font-mono text-xs font-medium transition-all duration-150 flex items-center justify-center border',
                  isCurrent
                    ? 'border-brand bg-brand text-void font-bold shadow-glow ring-2 ring-brand/40 scale-105'
                    : isAnswered
                    ? 'border-brand/40 bg-brand/15 text-brand hover:border-brand'
                    : 'border-white/10 bg-surface text-muted hover:border-white/20 hover:text-white'
                )}
                title={`Question ${idx + 1}`}
              >
                {isAnswered && !isCurrent ? (
                  <Check className="h-4 w-4 stroke-[2.5]" />
                ) : (
                  idx + 1
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      {!isSubmitted ? (
        <div className="grid grid-cols-1 gap-6">
          {/* Question Card */}
          <div className="card-base glass p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold">
                Question {currentIdx + 1}
              </span>
              <Badge variant="warning" className="font-mono text-xs">
                +{currentQ.marks || 10} marks
              </Badge>
            </div>

            <h2 className="font-heading text-lg sm:text-xl font-medium text-white leading-relaxed">
              {currentQ.text}
            </h2>

            {/* Options as large selectable glass tiles */}
            <div className="space-y-3 pt-2">
              {(currentQ.options || []).map((optionText, optIdx) => {
                const isSelected = answers[currentIdx] === optIdx
                const optionLetters = ['A', 'B', 'C', 'D', 'E']
                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    className={cx(
                      'group relative flex items-center gap-4 p-4 sm:p-5 rounded-xl border cursor-pointer transition-all duration-200 select-none',
                      isSelected
                        ? 'border-brand bg-brand/10 shadow-[0_0_24px_rgba(247,147,26,0.18)] ring-1 ring-brand/40'
                        : 'border-white/10 bg-surface/60 hover:border-white/25 hover:bg-white/5'
                    )}
                  >
                    {/* Option letter badge */}
                    <div
                      className={cx(
                        'flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors border',
                        isSelected
                          ? 'border-brand bg-brand text-void'
                          : 'border-white/10 bg-white/5 text-muted group-hover:border-white/20 group-hover:text-white'
                      )}
                    >
                      {optionLetters[optIdx]}
                    </div>

                    {/* Option text */}
                    <span className="flex-1 text-sm sm:text-base font-normal text-white">
                      {optionText}
                    </span>

                    {/* Radio indicator */}
                    <div
                      className={cx(
                        'h-5 w-5 shrink-0 rounded-full border flex items-center justify-center transition-all',
                        isSelected
                          ? 'border-brand bg-brand text-void'
                          : 'border-white/20 bg-void'
                      )}
                    >
                      {isSelected && <div className="h-2 w-2 rounded-full bg-void" />}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6">
              <button
                type="button"
                onClick={handleClearSelection}
                disabled={answers[currentIdx] === undefined}
                className="text-xs font-mono uppercase tracking-wider text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Clear choice
              </button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                {currentIdx < questions.length - 1 ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                    className="gap-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsSubmitted(true)}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Submit quiz</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="space-y-6">
          <div className="card-base glass p-6 sm:p-10 text-center space-y-6 border-2 border-gold/40 shadow-glow-gold/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-gold text-void shadow-glow">
              <Trophy className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <Badge variant={results.passed ? 'success' : 'warning'} className="font-mono text-xs uppercase tracking-wider">
                {results.passed ? 'Test Passed' : 'Needs Revision'}
              </Badge>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                {results.passed ? 'Outstanding Performance!' : 'Test Completed'}
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto">
                {results.passed
                  ? 'You demonstrated strong conceptual mastery. Keep up the high standard!'
                  : 'Review the question analysis below and consult your course notes to reinforce weak spots.'}
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Score</span>
                <span className="font-mono text-2xl font-bold text-gold">
                  {results.earnedMarks}/{results.totalMarks}
                </span>
              </div>
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Percentage</span>
                <span className="font-mono text-2xl font-bold text-white">
                  {results.percentage}%
                </span>
              </div>
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Correct</span>
                <span className="font-mono text-2xl font-bold text-emerald-400">
                  {results.correctCount}/{results.totalQuestions}
                </span>
              </div>
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Time Spent</span>
                <span className="font-mono text-2xl font-bold text-brand">
                  {Math.floor((totalSeconds - secondsRemaining) / 60)}m
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              <Button variant="ghost" onClick={handleRetake} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                <span>Retake quiz</span>
              </Button>
              <Button variant="primary" asChild>
                <Link to="/student/quizzes">Back to all quizzes</Link>
              </Button>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className="card-base glass p-6 space-y-4">
            <h3 className="font-heading text-base font-semibold text-white">
              Question-by-Question Review
            </h3>
            <div className="space-y-4">
              {questions.map((q, idx) => {
                const userChoice = answers[idx]
                const isCorrect = userChoice === q.correctIndex
                const optionLetters = ['A', 'B', 'C', 'D', 'E']

                return (
                  <div
                    key={q.id || idx}
                    className="card-base bg-surface/60 p-4 border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-400" />
                        )}
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                          Question {idx + 1}
                        </span>
                      </div>
                      <Badge variant={isCorrect ? 'success' : 'danger'} className="font-mono text-xs">
                        {isCorrect ? `+${q.marks || 10} marks` : '0 marks'}
                      </Badge>
                    </div>

                    <p className="text-sm text-white font-medium">{q.text}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg border border-white/5 bg-void/50">
                        <span className="text-muted block font-mono text-[10px] uppercase">Your Answer</span>
                        <span className={cx('font-medium', isCorrect ? 'text-emerald-400' : 'text-red-400')}>
                          {userChoice !== undefined
                            ? `${optionLetters[userChoice]}. ${q.options[userChoice]}`
                            : 'Not attempted'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-white/5 bg-void/50">
                        <span className="text-muted block font-mono text-[10px] uppercase">Correct Answer</span>
                        <span className="font-medium text-emerald-400">
                          {optionLetters[q.correctIndex]}. {q.options[q.correctIndex]}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm p-4">
          <div className="card-base glass max-w-sm w-full p-6 space-y-4 border border-white/10 shadow-2xl">
            <div className="flex items-center gap-3 text-gold">
              <AlertCircle className="h-6 w-6" />
              <h3 className="font-heading text-base font-semibold text-white">Exit test?</h3>
            </div>
            <p className="text-sm text-muted">
              You have unanswered questions. If you exit now, your current progress in this attempt will be lost.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowExitConfirm(false)}>
                Resume test
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setShowExitConfirm(false)
                  navigate('/student/quizzes')
                }}
              >
                Exit anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
