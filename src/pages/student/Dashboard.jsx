import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Video, Clock, ArrowRight, Play, CheckCircle2, Sparkles, ClipboardCheck
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { Badge, Button } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'

function ProgressRing({ radius = 54, stroke = 8, progress = 0 }) {
  const normalizedRadius = radius - stroke * 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F7931A" />
            <stop offset="100%" stopColor="#FFD600" />
          </linearGradient>
        </defs>
        <circle
          stroke="rgba(255, 255, 255, 0.1)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="url(#ringGradient)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute text-center leading-tight">
        <span className="font-mono text-xl font-bold text-white">{progress}%</span>
        <span className="block font-mono text-[9px] uppercase tracking-wider text-muted">Complete</span>
      </div>
    </div>
  )
}

function LiveCountdown({ targetDate }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!targetDate) return 0
    return Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
  })

  useEffect(() => {
    if (!targetDate) {
      setSecondsLeft(0)
      return
    }
    const calc = () => Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000))
    setSecondsLeft(calc())
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (!targetDate) {
    return <span className="font-mono text-sm text-muted">Schedule to be announced</span>
  }

  if (secondsLeft <= 0) {
    return (
      <span className="font-mono text-lg sm:text-xl font-bold text-emerald-400">
        Live or Starting Now
      </span>
    )
  }

  const h = String(Math.floor(secondsLeft / 3600)).padStart(2, '0')
  const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0')
  const s = String(secondsLeft % 60).padStart(2, '0')

  return (
    <span className="font-mono text-2xl sm:text-3xl font-bold text-gold tracking-wider">
      {h}h {m}m {s}s
    </span>
  )
}

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { db } = useData()

  // Resolve student record
  const currentStudentId = user?.id
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.id === user?.profileId || s.userId === user?.id || s.id === user?.id) ||
      (isDemoMode ? db.students?.[0] : null) || {
        name: user?.name || 'Student',
        grade: 'Enrolled Scholar',
      }
    )
  }, [db.students, user])

  const targetStudentId = student?.id || currentStudentId

  // Enrolled courses with calculated progress
  const enrolledCourses = useMemo(() => {
    const myEnrollments = (db.enrollments || []).filter(
      (e) => e.studentId === targetStudentId || e.studentId === currentStudentId
    )
    const courseIds = new Set(myEnrollments.map((e) => e.courseId))
    const courses = (db.courses || []).filter((c) => courseIds.has(c.id))

    return courses.map((course) => {
      const courseLessons = (db.lessons || []).filter(
        (l) => l.courseId === course.id && (l.status ? l.status === 'published' : true)
      )
      const totalLessons = courseLessons.length
      const lessonIds = new Set(courseLessons.map((l) => l.id))
      const completedLessons = (db.lessonProgress || []).filter(
        (lp) =>
          (lp.studentId === targetStudentId || lp.studentId === currentStudentId) &&
          lessonIds.has(lp.lessonId) &&
          (lp.completed === true || lp.status === 'completed' || lp.pct === 100)
      ).length
      const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
      return {
        ...course,
        totalLessons,
        completedLessons,
        progress,
      }
    })
  }, [db.enrollments, db.courses, db.lessons, db.lessonProgress, targetStudentId, currentStudentId])

  const activeCourse = enrolledCourses[0] || null

  // Upcoming live class for student's batches / courses
  const upcomingLiveClass = useMemo(() => {
    const myBatchIds = new Set(
      (db.batchStudents || [])
        .filter((bs) => bs.studentId === targetStudentId || bs.studentId === currentStudentId)
        .map((bs) => bs.batchId)
    )
    const myCourseIds = new Set(enrolledCourses.map((c) => c.id))

    const classes = (db.liveClasses || []).filter((l) => {
      const matches =
        (l.batchId && myBatchIds.has(l.batchId)) ||
        (l.courseId && myCourseIds.has(l.courseId)) ||
        (isDemoMode && myBatchIds.size === 0 && myCourseIds.size === 0)
      if (!matches) return false
      return l.status === 'live' || l.status === 'upcoming' || (l.scheduledAt && new Date(l.scheduledAt) > new Date())
    })

    return classes.sort((a, b) => new Date(a.scheduledAt || 0) - new Date(b.scheduledAt || 0))[0] || null
  }, [db.liveClasses, db.batchStudents, enrolledCourses, targetStudentId, currentStudentId])

  // Recent results computed from quiz_attempts and graded assignment_submissions
  const recentResults = useMemo(() => {
    const results = []

    // 1. Quiz attempts
    const myAttempts = (db.quizAttempts || []).filter(
      (qa) => qa.studentId === targetStudentId || qa.studentId === currentStudentId
    )
    myAttempts.forEach((qa) => {
      const quiz = (db.quizzes || []).find((q) => q.id === qa.quizId)
      const maxScore = qa.maxScore || quiz?.totalMarks || 100
      const score = qa.score ?? 0
      const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
      results.push({
        id: `qa-${qa.id}`,
        title: quiz?.title || 'Quiz Assessment',
        type: 'Quiz',
        score: `${score}/${maxScore}`,
        percent: `${percent}%`,
        date: formatDate(qa.attemptedAt || qa.createdAt),
        timestamp: new Date(qa.attemptedAt || qa.createdAt || 0).getTime(),
        status: percent >= 50 ? 'Passed' : 'Needs Review',
      })
    })

    // 2. Graded assignment submissions
    const mySubmissions = (db.submissions || []).filter(
      (s) =>
        (s.studentId === targetStudentId || s.studentId === currentStudentId) &&
        s.marks !== null &&
        s.marks !== undefined
    )
    mySubmissions.forEach((sub) => {
      const asg = (db.assignments || []).find((a) => a.id === sub.assignmentId)
      const maxMarks = asg?.maxMarks || 50
      const marks = sub.marks ?? 0
      const percent = maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : 0
      results.push({
        id: `sub-${sub.id}`,
        title: asg?.title || 'Assignment Evaluation',
        type: 'Assignment',
        score: `${marks}/${maxMarks}`,
        percent: `${percent}%`,
        date: formatDate(sub.submittedAt || sub.createdAt),
        timestamp: new Date(sub.submittedAt || sub.createdAt || 0).getTime(),
        status: 'Graded',
      })
    })

    return results.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)
  }, [db.quizAttempts, db.quizzes, db.submissions, db.assignments, targetStudentId, currentStudentId])

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------ */}
      {/* Greeting Header                                              */}
      {/* ------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-0.5 font-mono text-[11px] uppercase tracking-wider text-brand">
            <Sparkles className="h-3 w-3" />
            <span>Student Dashboard</span>
          </div>
          <h1 className="mt-2 font-heading text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Welcome back, <span className="text-gradient">{student.name}</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            Track your cohort syllabus progress, upcoming interactive sessions, and assignment milestones.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => navigate('/courses')}
          className="shrink-0"
        >
          <BookOpen className="h-4 w-4" /> Browse Catalog
        </Button>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Top Row: Continue Learning Card + Upcoming Live Class Card   */}
      {/* ------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Continue Learning Large Card */}
        <div className="lg:col-span-7 card-base glass relative overflow-hidden p-6 sm:p-8 shadow-card-soft">
          <div className="glow-blob -top-12 -left-12 h-64 w-64 bg-brand/20 blur-[100px]" />

          {activeCourse ? (
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold">
                  Continue Learning
                </span>
                <Badge tone="gold">{activeCourse.category || 'Course'}</Badge>
              </div>

              <div className="my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-bold text-white line-clamp-1">
                    {activeCourse.title}
                  </h2>
                  <p className="font-mono text-xs text-muted">
                    {activeCourse.completedLessons} of {activeCourse.totalLessons} lessons completed
                  </p>
                  <p className="text-xs text-muted/80">
                    Status: <span className="font-mono text-white font-semibold">{activeCourse.progress >= 100 ? 'Course completed' : `${activeCourse.progress}% achieved`}</span>
                  </p>
                </div>

                <ProgressRing radius={52} stroke={7} progress={activeCourse.progress} />
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/student/learn/${activeCourse.id}`)}
                  className="shadow-glow"
                >
                  <Play className="h-4 w-4 fill-white" /> Resume Curriculum
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center text-center py-8 space-y-3">
              <BookOpen className="h-10 w-10 text-muted" />
              <h3 className="font-heading text-base font-semibold text-white">No active course enrollments</h3>
              <p className="text-xs text-muted max-w-sm">
                Explore our comprehensive academy catalog and enroll in your first batch to start tracking learning progress.
              </p>
              <Button variant="primary" size="sm" onClick={() => navigate('/courses')} className="shadow-glow">
                Explore Courses
              </Button>
            </div>
          )}
        </div>

        {/* Upcoming Live Class Card */}
        <div className="lg:col-span-5 card-base glass relative overflow-hidden p-6 sm:p-8 shadow-card-soft flex flex-col justify-between">
          <div className="glow-blob -bottom-10 -right-10 h-64 w-64 bg-gold/15 blur-[110px]" />

          {upcomingLiveClass ? (
            <>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted">
                    Next Live Cohort
                  </span>
                  <Badge tone={upcomingLiveClass.status === 'live' ? 'rose' : 'brand'} live={upcomingLiveClass.status === 'live'}>
                    {upcomingLiveClass.status === 'live' ? 'Live Now' : 'Upcoming Session'}
                  </Badge>
                </div>

                <div>
                  <h3 className="font-heading text-xl font-bold text-white line-clamp-2">
                    {upcomingLiveClass.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-brand font-medium">
                    {upcomingLiveClass.durationMin ? `${upcomingLiveClass.durationMin} mins duration` : 'Interactive live class'}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1">
                    Starts in (Live Countdown)
                  </p>
                  <LiveCountdown targetDate={upcomingLiveClass.scheduledAt} />
                </div>
              </div>

              <div className="relative z-10 pt-6">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate('/student/live-classes')}
                  className="w-full justify-center shadow-glow"
                >
                  <Video className="h-4 w-4" /> Open Live Classes
                </Button>
              </div>
            </>
          ) : (
            <div className="relative z-10 flex flex-col items-center justify-center text-center py-8 space-y-3 my-auto">
              <Video className="h-10 w-10 text-muted" />
              <h3 className="font-heading text-base font-semibold text-white">No live classes scheduled</h3>
              <p className="text-xs text-muted max-w-xs">
                Upcoming live interactive lectures from your teachers will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ */}
      {/* My Courses Grid                                              */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">
              My <span className="text-gradient">Enrolled Courses</span>
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Access your lecture archives, problem sheets, and tests.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/student/courses')}
            className="font-mono text-xs text-brand"
          >
            View all courses <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((course) => (
              <div
                key={course.id}
                className="card-base group flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow/20"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="brand">{course.category || 'General'}</Badge>
                    <span className="font-mono text-xs text-muted">{course.level || 'All levels'}</span>
                  </div>

                  <h3 className="mt-3 font-heading text-lg font-bold text-white line-clamp-1 group-hover:text-brand transition-colors">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {course.description || 'Comprehensive video lectures and curriculum.'}
                  </p>

                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-muted">
                        {course.completedLessons} of {course.totalLessons} lessons
                      </span>
                      <span className="font-bold text-gold">{course.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-all duration-500"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="font-mono text-xs text-muted flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-brand" /> {course.durationHours || 0} hrs
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/student/learn/${course.id}`)}
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-base glass p-10 text-center space-y-3 border border-white/10">
            <BookOpen className="h-8 w-8 text-muted mx-auto" />
            <p className="font-heading text-sm font-semibold text-white">No enrolled courses yet</p>
            <p className="text-xs text-muted max-w-xs mx-auto">
              Once you enroll in a course, it will appear here with dynamic progress tracking.
            </p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------ */}
      {/* Recent Results Row                                           */}
      {/* ------------------------------------------------------------ */}
      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-white">
            Recent Assessment <span className="text-gradient">Results</span>
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Evaluation scores and graded submissions.
          </p>
        </div>

        {recentResults.length > 0 ? (
          <div className="card-base divide-y divide-white/5 shadow-card-soft overflow-hidden">
            {recentResults.map((item) => (
              <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-white/5 transition">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand mt-0.5">
                    <CheckCircle2 className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-semibold text-white">
                      {item.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-3 font-mono text-xs text-muted">
                      <span className="text-brand font-medium">{item.type}</span>
                      <span>•</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:text-right pl-12 sm:pl-0">
                  <div>
                    <p className="font-mono text-base font-bold text-gold">
                      {item.score} ({item.percent})
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                      {item.status}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card-base glass p-10 text-center space-y-3 border border-white/10">
            <ClipboardCheck className="h-8 w-8 text-muted mx-auto" />
            <p className="font-heading text-sm font-semibold text-white">No assessment results yet</p>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Your scores will appear here automatically when you complete tests or teachers grade your assignments.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
