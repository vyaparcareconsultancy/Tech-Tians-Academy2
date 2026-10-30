import React, { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Play, Pause, CheckCircle2, ChevronLeft, ChevronRight,
  Download, FileText, ArrowLeft, Volume2, Maximize,
  Save, Trash2, Clock, Sparkles, Lock
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { Badge, Button, useToast } from '../../components/ui.jsx'
import { cx } from '../../lib/utils.js'

export default function CoursePlayer() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { db, insert, update } = useData()
  const [savingProgress, setSavingProgress] = useState(false)
  const toast = useToast()

  // Student profile from auth
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId) ||
      (user?.profileId ? { id: user.profileId } : null) ||
      (user?.id ? { id: user.id } : null)
    )
  }, [db.students, user])

  // Find course strictly by id or slug
  const course = useMemo(() => {
    return (db.courses || []).find((c) => c.id === courseId || c.slug === courseId) || null
  }, [db.courses, courseId])

  // Check enrollment
  const hasActiveEnrollment = useMemo(() => {
    if (!student?.id || !course) return false
    return (db.enrollments || []).some(
      (e) =>
        e.studentId === student.id &&
        (e.courseId === course.id || e.courseId === courseId) &&
        (e.status === 'active' || !e.status)
    )
  }, [db.enrollments, student, course, courseId])

  const isPublished = course?.status === 'published'

  // Sections and lessons (block lessons of unpublished courses)
  const sections = useMemo(() => {
    if (!course || !isPublished) return []
    return (db.sections || [])
      .filter((s) => s.courseId === course.id)
      .sort((a, b) => a.order - b.order)
  }, [db.sections, course, isPublished])

  const lessons = useMemo(() => {
    if (!course || !isPublished) return []
    return (db.lessons || [])
      .filter((l) => l.courseId === course.id && (l.status === 'published' || !l.status))
      .sort((a, b) => a.order - b.order)
  }, [db.lessons, course, isPublished])

  // Active lesson
  const [activeLessonId, setActiveLessonId] = useState(() => lessons[0]?.id || '')

  const activeLesson = useMemo(() => {
    return lessons.find((l) => l.id === activeLessonId) || lessons[0] || {}
  }, [lessons, activeLessonId])

  // Completed lessons come from the saved lesson_progress rows of this student,
  // so progress survives page changes and refreshes.
  const myProgressRows = useMemo(() => {
    if (!student?.id || !course) return []
    return (db.lessonProgress || []).filter(
      (lp) => lp.studentId === student.id && (lp.courseId === course.id || lessons.some((l) => l.id === lp.lessonId))
    )
  }, [db.lessonProgress, student, course, lessons])

  const completedLessonIds = useMemo(() => {
    const lessonIds = new Set(lessons.map((l) => l.id))
    return new Set(
      myProgressRows
        .filter((lp) => lessonIds.has(lp.lessonId) && (lp.status === 'completed' || lp.pct === 100 || lp.completed === true))
        .map((lp) => lp.lessonId)
    )
  }, [myProgressRows, lessons])

  // Tabs: overview, materials, notes
  const [activeTab, setActiveTab] = useState('overview')

  // Notes state
  const [currentNote, setCurrentNote] = useState('')
  const [savedNotes, setSavedNotes] = useState([])

  // Player controls state
  const [isPlaying, setIsPlaying] = useState(false)

  const toggleComplete = async (lessonId) => {
    if (!student?.id || !course || savingProgress) return
    const markDone = !completedLessonIds.has(lessonId)
    const patch = markDone
      ? { status: 'completed', pct: 100, completedAt: new Date().toISOString() }
      : { status: 'in_progress', pct: 0, completedAt: null }
    const existing = myProgressRows.find((lp) => lp.lessonId === lessonId)
    setSavingProgress(true)
    try {
      if (existing) {
        await update('lessonProgress', existing.id, patch)
      } else {
        await insert('lessonProgress', { studentId: student.id, lessonId, courseId: course.id, ...patch })
      }
      if (markDone && !isLast) goNext()
    } catch (err) {
      console.error('Failed to save lesson progress:', err)
      toast.error(`Could not save progress: ${err.message || err}`)
    } finally {
      setSavingProgress(false)
    }
  }

  const activeIndex = lessons.findIndex((l) => l.id === activeLesson.id)
  const isFirst = activeIndex <= 0
  const isLast = activeIndex >= lessons.length - 1

  const goNext = () => {
    if (!isLast) setActiveLessonId(lessons[activeIndex + 1].id)
  }

  const goPrev = () => {
    if (!isFirst) setActiveLessonId(lessons[activeIndex - 1].id)
  }

  const handleSaveNote = (e) => {
    e.preventDefault()
    if (!currentNote.trim()) return
    setSavedNotes((prev) => [
      { id: Date.now().toString(), timestamp: '15:30', text: currentNote.trim() },
      ...prev,
    ])
    setCurrentNote('')
  }

  const handleDeleteNote = (id) => {
    setSavedNotes((prev) => prev.filter((n) => n.id !== id))
  }

  if (!course) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <h2 className="font-heading text-2xl font-bold text-white">Course Not Found</h2>
        <p className="mt-2 text-sm text-muted">The requested course could not be found.</p>
        <Button variant="primary" onClick={() => navigate('/student/courses')} className="mt-4">
          Back to My Courses
        </Button>
      </div>
    )
  }

  if (!isPublished) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-gold">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">Course Unavailable</h2>
        <p className="text-sm text-muted">
          This course is not published yet or has been archived. Lessons cannot be accessed at this time.
        </p>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/student/courses')}>
            Back to My Courses
          </Button>
        </div>
      </div>
    )
  }

  if (!hasActiveEnrollment) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-brand">
          <Lock className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">You are not enrolled in this course</h2>
        <p className="text-sm text-muted">
          Enroll in {course.title} to access the video lectures, lesson notes, and study materials.
        </p>
        <div className="pt-2">
          <Button variant="primary" asChild className="shadow-glow">
            <Link to={`/courses/${courseId}`}>View course</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="card-base glass mx-auto my-12 max-w-lg p-8 text-center space-y-4">
        <h2 className="font-heading text-2xl font-bold text-white">No Lessons Available</h2>
        <p className="text-sm text-muted">There are no published lessons available in this course yet.</p>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/student/courses')}>
            Back to My Courses
          </Button>
        </div>
      </div>
    )
  }

  const completedCount = completedLessonIds.size
  const progressPercent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
  const isCurrentCompleted = completedLessonIds.has(activeLesson.id)

  return (
    <div className="space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/student/courses"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-surface text-muted transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="brand">{course.category}</Badge>
              <span className="font-mono text-xs text-muted">
                {completedCount}/{lessons.length} Lessons Completed
              </span>
            </div>
            <h1 className="mt-1 font-heading text-xl font-bold text-white line-clamp-1">
              {course.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          <span>Overall Course Progress:</span>
          <span className="font-bold text-gold">{progressPercent}%</span>
        </div>
      </div>

      {/* Main Classroom Layout: Left Sidebar Timeline + Main Video Player Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Curriculum Sidebar (Ledger Timeline) */}
        <div className="lg:col-span-4 card-base p-5 shadow-card-soft max-h-[820px] overflow-y-auto space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-heading text-base font-bold text-white">
              Course Syllabus
            </h2>
            <span className="font-mono text-[11px] text-muted">
              {sections.length} Units
            </span>
          </div>

          {/* Ledger timeline container */}
          <div className="space-y-6">
            {sections.map((section, sIdx) => {
              const secLessons = lessons.filter((l) => l.sectionId === section.id)
              return (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 font-mono text-[10px] font-bold text-brand">
                      {sIdx + 1}
                    </span>
                    <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
                      {section.title}
                    </h3>
                  </div>

                  {/* Vertical line with lessons */}
                  <div className="border-l-2 border-brand/20 ml-2.5 pl-4 space-y-2">
                    {secLessons.map((l) => {
                      const isActive = l.id === activeLesson.id
                      const isDone = completedLessonIds.has(l.id)
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => setActiveLessonId(l.id)}
                          className={cx(
                            'group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition-all duration-200',
                            isActive
                              ? 'bg-brand/15 border border-brand/40 text-white shadow-glow/10'
                              : 'hover:bg-white/5 text-muted hover:text-white'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {/* Completed checkmark in gold */}
                            {isDone ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
                            ) : isActive ? (
                              <Play className="h-3.5 w-3.5 shrink-0 text-brand fill-brand" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-white/20 shrink-0" />
                            )}
                            <span className="truncate text-xs font-medium">
                              {l.title}
                            </span>
                          </div>

                          <span className="font-mono text-[10px] text-muted/70 shrink-0">
                            {l.durationMin}m
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Main Video Player Area */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Video Area with Orange-Glow Frame */}
          <div className="relative rounded-2xl border-2 border-brand/60 shadow-glow overflow-hidden bg-black aspect-video flex flex-col justify-between p-4 sm:p-6 group">
            {/* Ambient specular highlight */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />

            {/* Video Top Bar Overlay */}
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-brand font-semibold">
                  Unit Lesson
                </span>
                <h3 className="font-heading text-sm sm:text-base font-bold text-white drop-shadow">
                  {activeLesson.title || 'Lecture Video'}
                </h3>
              </div>
              <Badge tone="gold">1080p HD</Badge>
            </div>

            {/* Center Play Button Overlay */}
            <div className="relative z-10 flex items-center justify-center my-auto">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-r from-brand-deep to-brand text-white shadow-glow-lg transition-transform duration-300 hover:scale-110 active:scale-95"
                aria-label={isPlaying ? 'Pause video' : 'Play video'}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8 fill-white" />
                ) : (
                  <Play className="h-8 w-8 fill-white ml-1" />
                )}
              </button>
            </div>

            {/* Bottom Controls Bar */}
            <div className="relative z-10 space-y-2">
              {/* Scrub line */}
              <div className="h-1.5 w-full rounded-full bg-white/20 cursor-pointer overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand to-gold w-1/3" />
              </div>

              <div className="flex items-center justify-between text-xs text-white">
                <div className="flex items-center gap-3 font-mono">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="hover:text-brand transition"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </button>
                  <Volume2 className="h-4 w-4 text-muted hover:text-white cursor-pointer" />
                  <span className="text-[11px] text-muted">14:22 / {activeLesson.durationMin || 42}:00</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-muted hidden sm:inline">Speed: 1.0x</span>
                  <Maximize className="h-4 w-4 text-muted hover:text-white cursor-pointer" />
                </div>
              </div>
            </div>
          </div>

          {/* Player Action Buttons: Prev, Mark Complete, Next */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 card-base p-4">
            <Button
              variant="outline"
              size="md"
              onClick={goPrev}
              disabled={isFirst}
              className="w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4" /> Previous Lesson
            </Button>

            {/* "Mark complete" primary button */}
            <Button
              variant={isCurrentCompleted ? 'outline' : 'primary'}
              size="md"
              onClick={() => toggleComplete(activeLesson.id)}
              disabled={savingProgress}
              className={cx('w-full sm:w-auto', !isCurrentCompleted && 'shadow-glow')}
            >
              <CheckCircle2 className={cx('h-4 w-4', isCurrentCompleted ? 'text-gold' : 'text-white')} />
              {isCurrentCompleted ? 'Completed (Click to undo)' : 'Mark Complete'}
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={goNext}
              disabled={isLast}
              className="w-full sm:w-auto"
            >
              Next Lesson <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs: Overview / Materials / Notes */}
          <div className="card-base p-6 shadow-card-soft">
            <div className="flex items-center gap-8 border-b border-white/10 pb-4 font-mono text-xs uppercase tracking-wider">
              {['overview', 'materials', 'notes'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cx(
                    'relative pb-1 transition-colors',
                    activeTab === tab
                      ? 'text-brand font-semibold'
                      : 'text-muted hover:text-white'
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-[-17px] left-0 right-0 h-0.5 bg-brand shadow-glow" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div className="pt-6 space-y-4">
                <h4 className="font-heading text-lg font-bold text-white">
                  {activeLesson.title}
                </h4>
                <p className="text-sm leading-relaxed text-muted">
                  This session breaks down essential derivation steps, problem formulations, and common pitfalls. Complete all assigned exercises and refer to the materials tab for formula cheat sheets.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-brand" />
                    <span className="font-mono text-xs text-muted">Duration: {activeLesson.durationMin || 35} Minutes</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-gold" />
                    <span className="font-mono text-xs text-muted">Format: Interactive Video Lecture</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Materials */}
            {activeTab === 'materials' && (
              <div className="pt-6 space-y-3">
                <p className="font-mono text-xs text-muted mb-4">
                  Download supplementary notes and problem sheets for this unit:
                </p>

                {[
                  { name: `${activeLesson.title || 'Unit Notes'} — Lecture Slides (PDF)`, size: '4.2 MB' },
                  { name: 'Weekly Practice Sheet #1 with Answer Key (PDF)', size: '1.8 MB' },
                  { name: 'Essential Formula Handout & Quick Reference', size: '850 KB' },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-surface/50 hover:bg-white/5 transition"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-brand" />
                      <div>
                        <p className="text-xs font-semibold text-white">{item.name}</p>
                        <p className="font-mono text-[10px] text-muted">{item.size}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="font-mono text-xs text-brand">
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab: Notes */}
            {activeTab === 'notes' && (
              <div className="pt-6 space-y-6">
                <form onSubmit={handleSaveNote} className="space-y-3">
                  <label htmlFor="student-note" className="font-mono text-xs text-muted block">
                    Personal Scratchpad for this lecture:
                  </label>
                  <textarea
                    id="student-note"
                    rows={3}
                    placeholder="Take notes while watching the lecture…"
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/50 p-3.5 text-xs text-white placeholder-muted/50 focus:border-brand focus:outline-none transition"
                  />
                  <div className="flex justify-end">
                    <Button type="submit" variant="primary" size="sm">
                      <Save className="h-3.5 w-3.5" /> Save Note
                    </Button>
                  </div>
                </form>

                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h5 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
                    Saved Notes ({savedNotes.length})
                  </h5>
                  {savedNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start justify-between p-3 rounded-xl border border-white/5 bg-white/5 text-xs text-muted gap-3"
                    >
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] text-brand">[{note.timestamp}]</span>
                        <p className="text-white/90">{note.text}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-muted hover:text-rose-400 transition p-1"
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
