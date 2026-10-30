import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Clock, ArrowLeft, ArrowRight, CheckCircle2, XCircle,
  AlertCircle, Check, RotateCcw, Trophy, Lock
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { startQuiz, submitQuiz } from '../../lib/api/assessments.js'
import { Badge, Button, ConfirmDialog, useToast } from '../../components/ui.jsx'
import { cx } from '../../lib/utils.js'

export default function QuizAttempt() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, mode } = useAuth()
  const { db, insert, reload } = useData()
  const toast = useToast()
  const isDemo = mode === 'demo' || isDemoMode()

  // Student profile from auth
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId) ||
      (user?.profileId ? { id: user.profileId } : null) ||
      (user?.id ? { id: user.id } : null)
    )
  }, [db.students, user])

  // Load quiz directly from the store by :id
  const quiz = useMemo(() => {
    return (db.quizzes || []).find((q) => q.id === id) || null
  }, [db.quizzes, id])

  // Look up course for enrollment checking
  const course = useMemo(() => {
    if (!quiz) return null
    return (db.courses || []).find((c) => c.id === quiz.courseId) || null
  }, [db.courses, quiz])

  // Check enrollment in the quiz's course
  const isEnrolledInCourse = useMemo(() => {
    if (!student?.id || !quiz) return false
    return (db.enrollments || []).some(
      (e) =>
        e.studentId === student.id &&
        e.courseId === quiz.courseId &&
        (e.status === 'active' || !e.status)
    )
  }, [db.enrollments, student, quiz])

  // Check previous attempts and max attempts
  const previousAttempts = useMemo(() => {
    if (!quiz || !student?.id) return []
    return (db.quizAttempts || []).filter(
      (qa) => qa.quizId === quiz.id && qa.studentId === student.id
    )
  }, [db.quizAttempts, quiz, student])

  const maxAttempts = quiz?.maxAttempts || 2
  const attemptsUsed = previousAttempts.length
  const hasAttemptsRemaining = attemptsUsed < maxAttempts

  // Server-side session state for Supabase mode
  const [attemptId, setAttemptId] = useState(null)
  const [serverQuestions, setServerQuestions] = useState(null)
  const [serverResult, setServerResult] = useState(null)
  const [initLoading, setInitLoading] = useState(false)
  const [initError, setInitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Current question index
  const [currentIdx, setCurrentIdx] = useState(0)

  // User answers map { [questionIdx]: selectedOptionIdx }
  const [answers, setAnswers] = useState({})

  // Time limit from the quiz record or server session (in seconds)
  const totalSeconds = (quiz?.timeLimitMin || 20) * 60
  const [secondsRemaining, setSecondsRemaining] = useState(totalSeconds)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // In Supabase mode, initialize quiz on the server via startQuiz RPC
  useEffect(() => {
    if (isDemo || !id || isSubmitted) return
    let active = true

    async function initSession() {
      setInitLoading(true)
      setInitError(null)
      try {
        const data = await startQuiz(id)
        if (!active) return
        if (data) {
          setAttemptId(data.attemptId)
          if (data.questions && data.questions.length > 0) {
            setServerQuestions(data.questions)
          }
          if (data.startedAt && data.timeLimitMin) {
            const elapsed = Math.max(0, Math.floor((Date.now() - new Date(data.startedAt).getTime()) / 1000))
            const limitSec = data.timeLimitMin * 60
            const rem = Math.max(0, limitSec - elapsed)
            setSecondsRemaining(rem)
          }
        }
      } catch (err) {
        if (!active) return
        setInitError(err.message || 'Failed to start quiz session')
      } finally {
        if (active) setInitLoading(false)
      }
    }

    initSession()
    return () => { active = false }
  }, [isDemo, id, isSubmitted])

  // Resolved questions list:
  // In Supabase mode, server questions never contain correct answers/correctIndex.
  // In demo mode, fallback to quiz questions.
  const questions = useMemo(() => {
    if (!isDemo && serverQuestions && serverQuestions.length > 0) {
      return serverQuestions
    }
    return quiz?.questions || []
  }, [isDemo, serverQuestions, quiz])

  // Update timer in demo mode if quiz loads with custom duration
  useEffect(() => {
    if (isDemo && quiz?.timeLimitMin && !isSubmitted) {
      setSecondsRemaining(quiz.timeLimitMin * 60)
    }
  }, [isDemo, quiz?.timeLimitMin, isSubmitted])

  // Format MM:SS
  const timerFormatted = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60)
    const secs = secondsRemaining % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [secondsRemaining])

  const isLowTime = secondsRemaining < 120 && secondsRemaining > 0

  const handleSelectOption = (optIdx) => {
    if (isSubmitted || isSubmitting) return
    setAnswers((prev) => ({
      ...prev,
      [currentIdx]: optIdx,
    }))
  }

  const handleClearSelection = () => {
    if (isSubmitted || isSubmitting) return
    setAnswers((prev) => {
      const copy = { ...prev }
      delete copy[currentIdx]
      return copy
    })
  }

  // Client-side scoring for DEMO MODE only.
  // In Supabase mode, scores are computed solely on the server.
  const demoResults = useMemo(() => {
    if (!isDemo) return null
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
  }, [isDemo, questions, answers])

  // Unified results displayed after submit
  const displayResults = useMemo(() => {
    if (!isDemo && serverResult) {
      return {
        earnedMarks: serverResult.score ?? 0,
        totalMarks: serverResult.total ?? 0,
        correctCount: serverResult.correctCount ?? 0,
        totalQuestions: serverResult.totalQuestions || questions.length,
        percentage: serverResult.percentage ?? 0,
        passed: serverResult.passed ?? false,
        late: !!serverResult.late,
        resultsPublished: !!serverResult.resultsPublished,
        correctAnswers: serverResult.correctAnswers || null,
      }
    }
    return {
      earnedMarks: demoResults?.earnedMarks ?? 0,
      totalMarks: demoResults?.totalMarks ?? 0,
      correctCount: demoResults?.correctCount ?? 0,
      totalQuestions: demoResults?.totalQuestions ?? questions.length,
      percentage: demoResults?.percentage ?? 0,
      passed: demoResults?.passed ?? false,
      late: false,
      resultsPublished: true,
      correctAnswers: null,
    }
  }, [isDemo, serverResult, demoResults, questions.length])

  // Submit quiz: calls submitQuiz RPC in Supabase mode
  const handleSubmitQuiz = useCallback(async () => {
    if (isSubmitted || isSubmitting) return

    if (!isDemo) {
      if (!attemptId) {
        toast.error('Quiz attempt session missing. Please refresh and try again.')
        return
      }
      setIsSubmitting(true)
      try {
        const result = await submitQuiz(attemptId, answers)
        setServerResult(result)
        setIsSubmitted(true)
        if (result?.late) {
          toast.warning('Quiz submitted past the allowed time window (marked late).')
        } else {
          toast.success('Quiz submitted and scored on the server!')
        }
        reload?.()
      } catch (err) {
        toast.error(err.message || 'Failed to submit quiz attempt')
      } finally {
        setIsSubmitting(false)
      }
    } else {
      // Demo mode client scoring
      if (insert && quiz && student?.id) {
        try {
          await insert('quizAttempts', {
            quizId: quiz.id,
            studentId: student.id,
            score: demoResults.earnedMarks,
            maxScore: demoResults.totalMarks,
            status: 'completed',
            published: true,
            attemptedAt: new Date().toISOString(),
          })
          setIsSubmitted(true)
        } catch (err) {
          toast.error(err.message || 'Failed to submit quiz attempt')
        }
      } else {
        setIsSubmitted(true)
      }
    }
  }, [isSubmitted, isSubmitting, isDemo, attemptId, answers, reload, insert, quiz, student, demoResults, toast])

  // Countdown timer: decrement every second
  useEffect(() => {
    if (isSubmitted || initLoading || (isDemo && (!quiz || !isEnrolledInCourse || !hasAttemptsRemaining))) return
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isSubmitted, initLoading, isDemo, quiz, isEnrolledInCourse, hasAttemptsRemaining])

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (secondsRemaining === 0 && !isSubmitted && !initLoading && !initError) {
      handleSubmitQuiz()
    }
  }, [secondsRemaining, isSubmitted, initLoading, initError, handleSubmitQuiz])

  const currentQ = questions[currentIdx] || {}
  const answeredCount = Object.keys(answers).length

  // Retake quiz
  const handleRetake = async () => {
    setAnswers({})
    setCurrentIdx(0)
    setServerResult(null)
    setIsSubmitted(false)

    if (!isDemo && id) {
      setInitLoading(true)
      setInitError(null)
      try {
        const data = await startQuiz(id)
        if (data) {
          setAttemptId(data.attemptId)
          if (data.questions && data.questions.length > 0) {
            setServerQuestions(data.questions)
          }
          if (data.startedAt && data.timeLimitMin) {
            setSecondsRemaining(data.timeLimitMin * 60)
          }
        }
      } catch (err) {
        setInitError(err.message || 'Cannot retake quiz')
        toast.error(err.message || 'Cannot retake quiz')
      } finally {
        setInitLoading(false)
      }
    } else {
      setSecondsRemaining((quiz?.timeLimitMin || 20) * 60)
    }
  }

  // Loading state in Supabase mode
  if (initLoading && !isSubmitted) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-12 text-center space-y-4">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        <h2 className="font-heading text-lg font-medium text-white">Starting secure quiz session…</h2>
        <p className="text-xs text-muted">Initializing server timer and loading sanitized question set.</p>
      </div>
    )
  }

  // Server initialization error
  if (initError && !isSubmitted) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gold">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">Cannot Start Quiz</h2>
        <p className="text-sm text-muted">{initError}</p>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/student/quizzes')}>
            Back to Quizzes
          </Button>
        </div>
      </div>
    )
  }

  // 1. Check if quiz exists
  if (!quiz && isDemo) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-muted">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">Quiz Not Found</h2>
        <p className="text-sm text-muted">
          The requested quiz ({id}) does not exist or has been removed.
        </p>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/student/quizzes')}>
            Back to Quizzes
          </Button>
        </div>
      </div>
    )
  }

  // 2. Check if student is enrolled in the quiz's course
  if (isDemo && !isEnrolledInCourse) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-brand">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">Enrollment Required</h2>
        <p className="text-sm text-muted">
          You must be enrolled in{' '}
          <span className="font-medium text-white">{course?.title || 'the corresponding course'}</span>{' '}
          to attempt this quiz.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/student/quizzes')}>
            Back to Quizzes
          </Button>
          {course && (
            <Button variant="primary" asChild className="shadow-glow">
              <Link to={`/courses/${course.id}`}>View course details</Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  // 3. Check if max attempts reached
  if (isDemo && !hasAttemptsRemaining && !isSubmitted) {
    const bestScore = previousAttempts.reduce((max, a) => Math.max(max, a.score), 0)
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gold">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">Maximum Attempts Reached</h2>
        <p className="text-sm text-muted">
          You have completed all <span className="font-mono font-bold text-white">{maxAttempts}</span> allowed
          attempt(s) for this quiz.
        </p>
        {previousAttempts.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-surface/60 p-4 font-mono text-xs text-muted">
            <span>Best Score: </span>
            <span className="font-bold text-gold text-sm">{bestScore}</span>
            <span> / {quiz?.totalMarks || 100} marks</span>
          </div>
        )}
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/student/quizzes')}>
            Back to Quizzes
          </Button>
        </div>
      </div>
    )
  }

  // 4. Check if questions exist
  if (questions.length === 0) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <h2 className="font-heading text-2xl font-bold text-white">No Questions Available</h2>
        <p className="text-sm text-muted">
          There are no questions configured for this quiz yet.
        </p>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/student/quizzes')}>
            Back to Quizzes
          </Button>
        </div>
      </div>
    )
  }

  const quizTitle = quiz?.title || 'Quiz Evaluation'

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
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-sm sm:text-base font-semibold text-white truncate max-w-xs sm:max-w-md">
              {quizTitle}
            </h1>
            <Badge variant="default" className="font-mono text-[10px] hidden md:inline-flex">
              Attempt {attemptsUsed + 1}/{maxAttempts}
            </Badge>
          </div>
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
              disabled={isSubmitting}
              onClick={handleSubmitQuiz}
              className="hidden sm:inline-flex"
            >
              {isSubmitting ? 'Submitting…' : 'Submit test'}
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
                disabled={answers[currentIdx] === undefined || isSubmitting}
                className="text-xs font-mono uppercase tracking-wider text-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Clear choice
              </button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentIdx === 0 || isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                    onClick={handleSubmitQuiz}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isSubmitting ? 'Submitting…' : 'Submit quiz'}</span>
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
              <div className="flex items-center justify-center gap-2">
                <Badge variant={displayResults.passed ? 'success' : 'warning'} className="font-mono text-xs uppercase tracking-wider">
                  {displayResults.passed ? 'Test Passed' : 'Needs Revision'}
                </Badge>
                {displayResults.late && (
                  <Badge variant="danger" className="font-mono text-xs uppercase tracking-wider">
                    Submitted Late
                  </Badge>
                )}
              </div>

              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                {displayResults.passed ? 'Outstanding Performance!' : 'Test Completed'}
              </h2>
              <p className="text-sm text-muted max-w-md mx-auto">
                {displayResults.passed
                  ? 'You demonstrated strong conceptual mastery. Keep up the high standard!'
                  : 'Review the question analysis below and consult your course notes to reinforce weak spots.'}
              </p>
            </div>

            {/* Score Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto pt-2">
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Score</span>
                <span className="font-mono text-2xl font-bold text-gold">
                  {displayResults.earnedMarks}/{displayResults.totalMarks}
                </span>
              </div>
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Percentage</span>
                <span className="font-mono text-2xl font-bold text-white">
                  {displayResults.percentage}%
                </span>
              </div>
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Correct</span>
                <span className="font-mono text-2xl font-bold text-emerald-400">
                  {displayResults.correctCount}/{displayResults.totalQuestions}
                </span>
              </div>
              <div className="card-base bg-surface/80 p-4 border border-white/5">
                <span className="block font-mono text-xs uppercase tracking-wider text-muted">Time Spent</span>
                <span className="font-mono text-2xl font-bold text-brand">
                  {Math.max(0, Math.floor((totalSeconds - secondsRemaining) / 60))}m
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
              {attemptsUsed + 1 < maxAttempts ? (
                <Button variant="ghost" onClick={handleRetake} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  <span>Retake quiz ({maxAttempts - (attemptsUsed + 1)} attempts left)</span>
                </Button>
              ) : (
                <Badge variant="default" className="font-mono text-xs">
                  Maximum attempts reached ({maxAttempts}/{maxAttempts})
                </Badge>
              )}
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
                const optionLetters = ['A', 'B', 'C', 'D', 'E']

                // In demo mode: q.correctIndex is present
                // In Supabase mode: correct answers are only known if results are published
                const hasServerAnswer = displayResults.resultsPublished && displayResults.correctAnswers && displayResults.correctAnswers[idx] !== undefined
                const correctOpt = isDemo
                  ? q.correctIndex
                  : hasServerAnswer
                  ? displayResults.correctAnswers[idx]
                  : null
                const isKnown = correctOpt !== null && correctOpt !== undefined
                const isCorrect = isKnown && userChoice !== undefined ? userChoice === correctOpt : null

                return (
                  <div
                    key={q.id || idx}
                    className="card-base bg-surface/60 p-4 border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCorrect === true ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        ) : isCorrect === false ? (
                          <XCircle className="h-5 w-5 text-red-400" />
                        ) : (
                          <Check className="h-5 w-5 text-muted" />
                        )}
                        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                          Question {idx + 1}
                        </span>
                      </div>
                      {isCorrect !== null && (
                        <Badge variant={isCorrect ? 'success' : 'danger'} className="font-mono text-xs">
                          {isCorrect ? `+${q.marks || 10} marks` : '0 marks'}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-white font-medium">{q.text}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg border border-white/5 bg-void/50">
                        <span className="text-muted block font-mono text-[10px] uppercase">Your Answer</span>
                        <span className={cx('font-medium', isCorrect === true ? 'text-emerald-400' : isCorrect === false ? 'text-red-400' : 'text-white')}>
                          {userChoice !== undefined && q.options?.[userChoice] !== undefined
                            ? `${optionLetters[userChoice]}. ${q.options[userChoice]}`
                            : 'Not attempted'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg border border-white/5 bg-void/50">
                        <span className="text-muted block font-mono text-[10px] uppercase">Correct Answer</span>
                        <span className={cx('font-medium', isKnown ? 'text-emerald-400' : 'text-muted')}>
                          {isKnown && q.options?.[correctOpt] !== undefined
                            ? `${optionLetters[correctOpt]}. ${q.options[correctOpt]}`
                            : 'Available once results are published'}
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
      <ConfirmDialog
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        onConfirm={() => {
          setShowExitConfirm(false)
          navigate('/student/quizzes')
        }}
        title="Exit test?"
        message="You have unanswered questions. If you exit now, your current progress in this attempt will be lost."
        confirmLabel="Exit anyway"
        cancelLabel="Resume test"
        danger
      />
    </div>
  )
}
