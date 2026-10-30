import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, Play, CheckCircle2, Trophy
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { Badge, Button } from '../../components/ui.jsx'

export default function Quizzes() {
  const { user } = useAuth()
  const { db } = useData()
  const navigate = useNavigate()
  const isDemo = isDemoMode

  // Student
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId || s.id === user?.id) ||
      (db.students || [])[0] || { id: user?.id || 'stu-1001', name: user?.fullName || 'Student' }
    )
  }, [db.students, user])

  // Student attempts
  const myAttempts = useMemo(() => {
    return (db.quizAttempts || []).filter(
      (qa) => qa.studentId === student?.id || qa.studentId === user?.id
    )
  }, [db.quizAttempts, student?.id, user?.id])

  // Quizzes list: real data in Supabase mode; fallback sample only in demo mode
  const quizzesList = useMemo(() => {
    const list = (db.quizzes || []).map((q) => {
      const attempt = myAttempts.find((a) => a.quizId === q.id)
      const course = (db.courses || []).find((c) => c.id === q.courseId)
      return {
        ...q,
        courseName: course ? course.title : (q.courseName || 'Course Quiz'),
        subjectName: course ? course.subjectName : (q.subjectName || 'General'),
        attempt: attempt || null,
        isCompleted: !!attempt,
      }
    })

    if (list.length > 0) return list
    if (isDemo) {
      return [
        {
          id: 'qz-01',
          title: 'Physics Mechanics Unit Test 1',
          courseName: 'Physics for JEE Advanced 2027',
          subjectName: 'Physics',
          timeLimitMin: 20,
          totalMarks: 50,
          questions: Array(5).fill({}),
          attempt: { score: 40, maxScore: 50 },
          isCompleted: true,
        },
        {
          id: 'qz-02',
          title: 'Chemical Bonding & Periodic Table Test',
          courseName: 'Chemistry for JEE & NEET 2027',
          subjectName: 'Chemistry',
          timeLimitMin: 30,
          totalMarks: 50,
          questions: Array(5).fill({}),
          attempt: null,
          isCompleted: false,
        },
      ]
    }
    return []
  }, [db.quizzes, db.courses, myAttempts, isDemo])

  // KPI calculations: computed strictly from real attempts without hardcoded fallback
  const stats = useMemo(() => {
    const completed = quizzesList.filter((q) => q.isCompleted)
    const avgScore =
      completed.length > 0
        ? Math.round(
            completed.reduce((acc, q) => {
              const max = q.attempt?.maxScore || q.totalMarks || 100
              const score = q.attempt?.score ?? 0
              return acc + (score / max) * 100
            }, 0) / completed.length
          )
        : null

    return {
      total: quizzesList.length,
      completedCount: completed.length,
      pendingCount: quizzesList.length - completed.length,
      avgScore,
    }
  }, [quizzesList])

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Tests & Unit Quizzes
        </h1>
        <p className="text-sm text-muted">
          Timed conceptual evaluations designed to test recall, numerical accuracy, and exam temperament.
        </p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-base glass p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="font-mono text-xs uppercase tracking-wider">Completed Tests</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="block font-mono text-3xl font-bold text-white">
            {stats.completedCount}
            <span className="text-sm font-normal text-muted"> / {stats.total}</span>
          </span>
        </div>

        <div className="card-base glass p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="font-mono text-xs uppercase tracking-wider">Average Score</span>
            <Trophy className="h-4 w-4 text-gold" />
          </div>
          <span className="block font-mono text-3xl font-bold text-gold">
            {stats.avgScore !== null ? `${stats.avgScore}%` : '0%'}
          </span>
        </div>

        <div className="card-base glass p-5 border border-white/10 space-y-1">
          <div className="flex items-center justify-between text-muted">
            <span className="font-mono text-xs uppercase tracking-wider">Pending Tests</span>
            <Clock className="h-4 w-4 text-brand" />
          </div>
          <span className="block font-mono text-3xl font-bold text-brand">
            {stats.pendingCount}
          </span>
        </div>
      </div>

      {/* Quizzes List */}
      <div className="space-y-4">
        <h3 className="font-heading text-lg font-semibold text-white">
          All Available Tests
        </h3>

        {quizzesList.length === 0 ? (
          <div className="card-base glass p-12 text-center space-y-2 border border-white/10">
            <p className="font-heading text-base font-medium text-white">No tests or unit quizzes available</p>
            <p className="text-xs text-muted">
              Quizzes scheduled for your batches and enrolled courses will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quizzesList.map((quiz) => (
              <div
                key={quiz.id}
                className="card-base glass p-6 space-y-4 border border-white/10 hover:border-brand/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="primary" className="font-mono text-[10px] uppercase">
                      {quiz.subjectName}
                    </Badge>
                    {quiz.isCompleted ? (
                      <Badge variant="success" className="font-mono text-xs">
                        Score: {quiz.attempt?.score ?? 0} / {quiz.totalMarks}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="font-mono text-xs">
                        Available
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-heading text-lg font-bold text-white">
                      {quiz.title}
                    </h4>
                    <p className="text-xs text-muted">
                      {quiz.courseName}
                    </p>
                  </div>

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-gold" />
                      <span>{quiz.timeLimitMin || 20} mins</span>
                    </span>
                    <span>{quiz.questions?.length || 5} questions</span>
                    <span className="text-white">{quiz.totalMarks} total marks</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                  <Button
                    variant={quiz.isCompleted ? 'ghost' : 'primary'}
                    className="w-full gap-2 shadow-glow"
                    onClick={() => navigate(`/student/quizzes/${quiz.id}`)}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{quiz.isCompleted ? 'Retake test' : 'Start test now'}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
