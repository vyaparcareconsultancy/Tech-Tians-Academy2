import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen, Video, Clock, ArrowRight, Play, CheckCircle2, Sparkles
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { Badge, Button } from '../../components/ui.jsx'

function ProgressRing({ radius = 54, stroke = 8, progress = 68 }) {
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

function LiveCountdown() {
  const [secondsLeft, setSecondsLeft] = useState(2 * 3600 + 45 * 60 + 18)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.id === user?.profileId || s.userId === user?.id) ||
      db.students?.[0] || {
        name: user?.name || 'Rohan Verma',
        grade: 'Class 12',
      }
    )
  }, [db.students, user])

  // Enrolled courses for this student
  const enrolledCourses = useMemo(() => {
    const enrollments = (db.enrollments || []).filter(
      (e) => e.studentId === student.id || student.id === 'stu-1001'
    )
    const courseIds = new Set(enrollments.map((e) => e.courseId))
    const courses = (db.courses || []).filter((c) => courseIds.has(c.id))
    // Fallback if none matched
    return courses.length > 0 ? courses : (db.courses || []).slice(0, 3)
  }, [db.enrollments, db.courses, student.id])

  const activeCourse = enrolledCourses[0] || (db.courses || [])[0]

  // Upcoming live class
  const upcomingLiveClass = useMemo(() => {
    return (
      (db.liveClasses || []).find((l) => l.status === 'scheduled') ||
      db.liveClasses?.[0] || {
        title: 'Wave Optics: Huygens Principle & Interference',
        subject: 'Physics',
        teacherName: 'Dr. Meera Rao',
        time: 'Today, 6:30 PM',
      }
    )
  }, [db.liveClasses])

  // Recent results mock
  const recentResults = [
    { title: 'Kinematics & Projectile Motion Unit Quiz', type: 'Quiz', score: '19/20', percent: '95%', date: '2 days ago', status: 'Passed' },
    { title: 'Thermodynamics Weekly Problem Sheet #3', type: 'Assignment', score: '48/50', percent: '96%', date: '4 days ago', status: 'Graded' },
    { title: 'Atomic Structure & Bohr Model Quiz', type: 'Quiz', score: '18/20', percent: '90%', date: '1 week ago', status: 'Passed' },
  ]

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
        {activeCourse && (
          <div className="lg:col-span-7 card-base glass relative overflow-hidden p-6 sm:p-8 shadow-card-soft">
            <div className="glow-blob -top-12 -left-12 h-64 w-64 bg-brand/20 blur-[100px]" />

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold">
                  Continue Learning
                </span>
                <Badge tone="gold">{activeCourse.category}</Badge>
              </div>

              <div className="my-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-bold text-white line-clamp-1">
                    {activeCourse.title}
                  </h2>
                  <p className="font-mono text-xs text-muted">
                    Unit 1: Core Principles • Lesson 4: Problem Solving
                  </p>
                  <p className="text-xs text-muted/80">
                    Remaining duration: <span className="font-mono text-white font-semibold">28 mins</span>
                  </p>
                </div>

                {/* Circular Progress Ring in orange/gold */}
                <ProgressRing radius={52} stroke={7} progress={68} />
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => navigate(`/student/learn/${activeCourse.id}`)}
                  className="shadow-glow"
                >
                  <Play className="h-4 w-4 fill-white" /> Resume Lecture
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Live Class Card */}
        <div className="lg:col-span-5 card-base glass relative overflow-hidden p-6 sm:p-8 shadow-card-soft flex flex-col justify-between">
          <div className="glow-blob -bottom-10 -right-10 h-64 w-64 bg-gold/15 blur-[110px]" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-muted">
                Next Live Cohort
              </span>
              <Badge tone="brand" live>
                Live Session
              </Badge>
            </div>

            <div>
              <h3 className="font-heading text-xl font-bold text-white line-clamp-2">
                {upcomingLiveClass.title}
              </h3>
              <p className="mt-1 font-mono text-xs text-brand font-medium">
                {upcomingLiveClass.subject || 'Physics'} • {upcomingLiveClass.teacherName || 'Faculty Instructor'}
              </p>
            </div>

            <div className="border-t border-white/10 pt-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted mb-1">
                Starts in (Live Countdown)
              </p>
              <LiveCountdown />
            </div>
          </div>

          <div className="relative z-10 pt-6">
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/student/live-classes')}
              className="w-full justify-center"
            >
              <Video className="h-4 w-4 text-brand" /> Join Live Classroom
            </Button>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledCourses.map((course, idx) => {
            const completionPercent = [68, 42, 85, 20][idx % 4]
            return (
              <div
                key={course.id}
                className="card-base group flex flex-col justify-between p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow/20"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="brand">{course.category}</Badge>
                    <span className="font-mono text-xs text-muted">{course.level}</span>
                  </div>

                  <h3 className="mt-3 font-heading text-lg font-bold text-white line-clamp-1 group-hover:text-brand transition-colors">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {course.description}
                  </p>

                  {/* Progress bar in orange/gold gradient */}
                  <div className="mt-5 space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-muted">Progress</span>
                      <span className="font-bold text-gold">{completionPercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-all duration-500"
                        style={{ width: `${completionPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="font-mono text-xs text-muted flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-brand" /> {course.durationHours} hrs
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
            )
          })}
        </div>
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

        <div className="card-base divide-y divide-white/5 shadow-card-soft overflow-hidden">
          {recentResults.map((item) => (
            <div key={item.title} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3 hover:bg-white/5 transition">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand mt-0.5">
                  <CheckCircle2 className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-semibold text-white">
                    {item.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-3 font-mono text-xs text-muted">
                    <span>{item.type}</span>
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
      </div>
    </div>
  )
}
