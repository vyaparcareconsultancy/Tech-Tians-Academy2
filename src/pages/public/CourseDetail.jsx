import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Star, Check, Lock, ChevronDown,
  ArrowLeft, ArrowRight, Video, AlertCircle, Loader2
} from 'lucide-react'
import { useData } from '../../lib/store.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { Badge, Button, Avatar, useToast, Modal } from '../../components/ui.jsx'
import { cx, formatDate } from '../../lib/utils.js'
import { createOrder, enrollmentsApi } from '../../lib/api/index.js'
import { isDemoMode } from '../../lib/supabase.js'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true)
      return
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(true))
      existing.addEventListener('error', () => resolve(false))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function CourseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { db, insert, reload } = useData()
  const { user } = useAuth()
  const toast = useToast()

  // Find course
  const course = useMemo(() => {
    const found = (db.courses || []).find((c) => c.id === id || c.slug === id)
    if (!found) return null
    if (found.status !== 'published' && (!user || user.role === 'student')) {
      return null
    }
    return found
  }, [db.courses, id, user])

  // Teacher
  const teacher = useMemo(() => {
    if (!course) return null
    return (db.teachers || []).find((t) => t.id === course.teacherId)
  }, [db.teachers, course])

  // Batches
  const courseBatches = useMemo(() => {
    if (!course) return []
    return (db.batches || []).filter((b) => b.courseId === course.id)
  }, [db.batches, course])

  // Sections and lessons
  const sections = useMemo(() => {
    if (!course) return []
    return (db.sections || [])
      .filter((s) => s.courseId === course.id)
      .sort((a, b) => a.order - b.order)
  }, [db.sections, course])

  const lessonsBySection = useMemo(() => {
    if (!course) return {}
    const map = {}
    ;(db.lessons || [])
      .filter((l) => l.courseId === course.id)
      .forEach((l) => {
        if (!map[l.sectionId]) map[l.sectionId] = []
        map[l.sectionId].push(l)
      })
    // Sort lessons inside each section by order
    Object.keys(map).forEach((secId) => {
      map[secId].sort((a, b) => a.order - b.order)
    })
    return map
  }, [db.lessons, course])

  const totalLessonsCount = useMemo(() => {
    return Object.values(lessonsBySection).reduce((acc, list) => acc + list.length, 0)
  }, [lessonsBySection])

  // Enrolled students in this course
  const enrolledStudentsCount = useMemo(() => {
    if (!course) return 0
    const count = (db.enrollments || []).filter((e) => e.courseId === course.id).length
    return count
  }, [db.enrollments, course])

  // Accordion state (first section open by default)
  const [openSections, setOpenSections] = useState(() => {
    return sections[0] ? { [sections[0].id]: true } : {}
  })

  // Selected batch for checkout
  const [selectedBatchId, setSelectedBatchId] = useState(() => {
    return courseBatches[0]?.id || ''
  })

  const [couponCode, setCouponCode] = useState('')
  const [processing, setProcessing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const pollTimerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [])

  // Check if current user is enrolled in this course
  const isEnrolled = useMemo(() => {
    if (!user || !course) return false
    const studentId = user.profileId || (db.students?.find((s) => s.userId === user.id)?.id) || user.id
    return (db.enrollments || []).some(
      (e) => e.courseId === course.id && (e.studentId === studentId || e.studentId === user.id) && e.status !== 'dropped'
    )
  }, [user, course, db.enrollments, db.students])

  const pollEnrollment = (courseId) => {
    setConfirming(true)
    const startTime = Date.now()
    const maxDuration = 60000 // 60s
    const interval = 3000 // 3s

    const check = async () => {
      try {
        const studentId = user?.id
        const list = await enrollmentsApi.list((q) =>
          q.eq('student_id', studentId).eq('course_id', courseId).eq('status', 'active')
        )
        if (list && list.length > 0) {
          if (reload) await reload()
          setConfirming(false)
          setProcessing(false)
          toast.success('Enrollment confirmed! Welcome to the course.')
          navigate(`/student/learn/${courseId}`)
          return
        }
      } catch (err) {
        console.error('Polling error:', err)
      }

      if (Date.now() - startTime >= maxDuration) {
        setConfirming(false)
        setProcessing(false)
        toast.info('Payment is being confirmed, check My Courses in a minute')
        return
      }

      pollTimerRef.current = setTimeout(check, interval)
    }

    pollTimerRef.current = setTimeout(check, 1500)
  }

  const handleDemoEnrollment = async () => {
    setProcessing(true)
    try {
      const studentId = user.id || user.profileId || 'stu-1001'
      const finalPrice = Math.max(0, Number(course.price || 0))
      await insert('orders', {
        orderId: `ORD-${Date.now().toString().slice(-6)}`,
        studentId,
        courseId: course.id,
        batchId: selectedBatchId || null,
        amount: finalPrice,
        discount: 0,
        status: 'paid',
        couponCode: couponCode.trim() || null,
      })
      await insert('enrollments', {
        studentId,
        courseId: course.id,
        batchId: selectedBatchId || null,
        status: 'active',
        source: couponCode.trim() ? 'coupon' : 'direct',
        amountPaid: finalPrice,
      })
      if (selectedBatchId) {
        await insert('batchStudents', {
          batchId: selectedBatchId,
          studentId,
          status: 'active',
        })
      }
      setDemoModalOpen(false)
      toast.success('Demo payment successful! Welcome to the course.')
      navigate(`/student/learn/${course.id}`)
    } catch (err) {
      toast.error(err.message || 'Demo enrollment failed')
    } finally {
      setProcessing(false)
    }
  }

  const handleEnrollClick = async () => {
    if (!user) {
      navigate('/signup')
      return
    }
    if (isEnrolled) {
      navigate(`/student/learn/${course.id}`)
      return
    }
    if (user.role !== 'student') {
      toast.info('Staff accounts cannot purchase student courses')
      return
    }

    // Demo Mode simulation
    if (isDemoMode) {
      setDemoModalOpen(true)
      return
    }

    // Supabase Mode with Razorpay
    setProcessing(true)
    try {
      const result = await createOrder({
        courseId: course.id,
        batchId: selectedBatchId || null,
        couponCode: couponCode.trim() || null,
      })

      if (result.free) {
        pollEnrollment(course.id)
        return
      }

      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        toast.error('Unable to load payment gateway. Please check your connection.')
        setProcessing(false)
        return
      }

      const options = {
        key: result.key_id,
        amount: result.amount,
        currency: result.currency || 'INR',
        name: 'Tech Tians Academy',
        description: course.title,
        order_id: result.order_id,
        prefill: {
          name: user.name || user.fullName || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        theme: {
          color: '#6366f1',
        },
        handler: function () {
          pollEnrollment(course.id)
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled')
            setProcessing(false)
            setConfirming(false)
          },
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp) {
        toast.error(resp?.error?.description || resp?.error?.reason || 'Payment failed')
        setProcessing(false)
        setConfirming(false)
      })
      rzp.open()
    } catch (err) {
      toast.error(err.message || 'Failed to initiate order')
      setProcessing(false)
    }
  }

  const toggleSection = (secId) => {
    setOpenSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }))
  }

  // If not found
  if (!course) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 bg-void text-center">
        <div className="card-base glass max-w-md p-8 shadow-card-soft">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400" />
          <h1 className="mt-4 font-heading text-2xl font-bold text-white">Course Not Found</h1>
          <p className="mt-2 text-sm text-muted">
            The course you requested could not be located in our directory.
          </p>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/courses')}
            className="mt-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Courses
          </Button>
        </div>
      </div>
    )
  }

  // Split title to apply gradient to the last word
  const words = course.title.trim().split(' ')
  const mainWords = words.slice(0, -1).join(' ')
  const lastWord = words[words.length - 1]

  return (
    <div className="w-full bg-void min-h-screen pb-24">
      {/* ------------------------------------------------------------ */}
      {/* Course Header Banner                                         */}
      {/* ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-white/10 bg-surface/50 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="glow-blob -top-24 left-1/4 h-88 w-88 bg-brand/15 blur-[140px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 font-mono text-xs text-muted">
            <Link to="/courses" className="transition hover:text-white flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Courses
            </Link>
            <span>/</span>
            <span className="truncate text-white">{course.subjectName}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2.5">
            <Badge tone="brand">{course.category}</Badge>
            <Badge tone="gold">{course.subjectName}</Badge>
            <span className="rounded-full border border-white/10 bg-void/60 px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">
              {course.level} Level
            </span>
          </div>

          {/* Headline with gradient last word */}
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl leading-tight">
            {mainWords}{' '}
            <span className="text-gradient">{lastWord}</span>
          </h1>

          <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-muted">
            {course.description}
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Main Content Layout: Left details + Right sticky purchase    */}
      {/* ------------------------------------------------------------ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Left Column: Stats, Teacher, Timeline Curriculum, Batches */}
          <div className="lg:col-span-8 space-y-12">
            {/* Stats row in mono */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl border border-white/10 bg-surface/60 p-6 backdrop-blur-sm shadow-card-soft">
              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-white">
                  {totalLessonsCount}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Recorded Lessons
                </p>
              </div>

              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-brand">
                  {course.durationHours} hrs
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Total Duration
                </p>
              </div>

              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-gold">
                  {course.level}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Curriculum Level
                </p>
              </div>

              <div>
                <p className="font-mono text-2xl sm:text-3xl font-bold text-white">
                  {enrolledStudentsCount.toLocaleString()}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted">
                  Enrolled Students
                </p>
              </div>
            </div>

            {/* Teacher Card */}
            {teacher && (
              <div className="card-base group relative overflow-hidden p-6 sm:p-8 transition-all hover:border-brand/40">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                  <Avatar name={teacher.name} size="lg" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-heading text-xl font-bold text-white">
                        {teacher.name}
                      </h2>
                      <Badge tone="gold">{teacher.subject} Specialist</Badge>
                      {teacher.rating && (
                        <span className="flex items-center gap-1 font-mono text-xs text-gold">
                          <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                          {teacher.rating} Instructor Rating
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-mono text-xs text-brand font-medium">
                      {teacher.qualification}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {teacher.bio}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Curriculum Accordion Styled as Ledger Timeline */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-white">
                    Curriculum <span className="text-gradient">Timeline</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Structured modular progression. Complete each unit to advance through the syllabus.
                  </p>
                </div>
                <span className="font-mono text-xs text-muted">
                  {sections.length} Units • {totalLessonsCount} Lessons
                </span>
              </div>

              {/* Vertical ledger timeline */}
              <div className="relative pl-6 sm:pl-8 border-l-2 border-brand/30 space-y-6">
                {sections.map((sec, idx) => {
                  const secLessons = lessonsBySection[sec.id] || []
                  const isOpen = !!openSections[sec.id]

                  return (
                    <div key={sec.id} className="relative">
                      {/* Numbered node on timeline line */}
                      <div className="absolute -left-[35px] sm:-left-[43px] top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-brand bg-void font-mono text-xs font-bold text-gold shadow-glow">
                        0{idx + 1}
                      </div>

                      {/* Section Card / Accordion Header */}
                      <div className="card-base overflow-hidden transition-all duration-200">
                        <button
                          type="button"
                          onClick={() => toggleSection(sec.id)}
                          className="flex w-full items-center justify-between p-5 text-left transition hover:bg-white/5 focus:outline-none"
                          aria-expanded={isOpen}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs uppercase tracking-wider text-brand font-semibold">
                                Unit {idx + 1}
                              </span>
                              <span className="font-mono text-xs text-muted">• {secLessons.length} Lessons</span>
                            </div>
                            <h3 className="mt-1 font-heading text-base sm:text-lg font-bold text-white">
                              {sec.title}
                            </h3>
                          </div>
                          <ChevronDown
                            className={cx(
                              'h-5 w-5 text-muted transition-transform duration-300 shrink-0 ml-4',
                              isOpen && 'rotate-180 text-brand'
                            )}
                          />
                        </button>

                        {/* Lessons List inside Section */}
                        {isOpen && (
                          <div className="border-t border-white/5 bg-void/50 p-4 divide-y divide-white/5">
                            {secLessons.map((lesson, lIdx) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between py-3 px-2 rounded-lg transition hover:bg-white/5"
                              >
                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                  {/* Lesson lock indicator */}
                                  {idx === 0 && lIdx === 0 ? (
                                    <Video className="h-4 w-4 shrink-0 text-gold" />
                                  ) : (
                                    <Lock className="h-4 w-4 shrink-0 text-muted/60" />
                                  )}
                                  <span className="font-body text-sm text-white/90 truncate">
                                    {lesson.title}
                                  </span>
                                  {idx === 0 && lIdx === 0 && (
                                    <Badge tone="gold" className="shrink-0 text-[9px]">Preview</Badge>
                                  )}
                                </div>
                                <span className="font-mono text-xs text-muted shrink-0">
                                  {lesson.durationMin}m
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Batches Table */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-2xl font-bold text-white">
                    Available <span className="text-gradient">Batches</span>
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Choose from scheduled cohort timings led by live mentor faculty.
                  </p>
                </div>
              </div>

              {courseBatches.length === 0 ? (
                <div className="card-base p-6 text-center text-sm text-muted">
                  No active cohort batches found for this course. Admissions open on request.
                </div>
              ) : (
                <div className="card-base overflow-x-auto shadow-card-soft">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-surface/80 font-mono text-xs uppercase tracking-wider text-muted">
                        <th className="px-5 py-3.5">Batch Code</th>
                        <th className="px-5 py-3.5">Weekly Schedule</th>
                        <th className="px-5 py-3.5">Start Date</th>
                        <th className="px-5 py-3.5">Capacity</th>
                        <th className="px-5 py-3.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {courseBatches.map((b) => (
                        <tr
                          key={b.id}
                          className={cx(
                            'transition hover:bg-white/5',
                            selectedBatchId === b.id && 'bg-brand/5'
                          )}
                        >
                          <td className="px-5 py-4 font-mono font-semibold text-white">
                            {b.name}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-muted">
                            {b.schedule}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-muted">
                            {formatDate(b.startDate)}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-muted">
                            {b.capacity} Seats
                          </td>
                          <td className="px-5 py-4">
                            <Badge tone={b.status === 'active' ? 'green' : 'gold'}>
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Sticky Glass Purchase Card */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 glass rounded-2xl p-6 sm:p-8 border border-white/10 shadow-card-soft space-y-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-muted">
                  Full Course Tuition
                </span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-4xl font-bold text-white">
                    ₹{course.price ? course.price.toLocaleString() : 'Free'}
                  </span>
                  <span className="font-mono text-xs text-muted">/ one-time</span>
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  Includes lifetime access to archives and live batch participation.
                </p>
              </div>

              {/* Batch Select dropdown */}
              {courseBatches.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-5">
                  <label htmlFor="batch-select" className="font-mono text-xs uppercase tracking-wider text-muted block">
                    Select Cohort Batch
                  </label>
                  <select
                    id="batch-select"
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-xs text-white focus:border-brand focus:outline-none transition [&>option]:bg-surface [&>option]:text-white"
                  >
                    {courseBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.schedule})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Optional Coupon Code Input */}
              {!isEnrolled && (
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <label htmlFor="coupon-input" className="font-mono text-xs uppercase tracking-wider text-muted block">
                    Coupon Code (Optional)
                  </label>
                  <input
                    id="coupon-input"
                    type="text"
                    placeholder="Enter code (e.g. EARLYBIRD)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={processing || confirming}
                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-xs text-white uppercase placeholder:normal-case placeholder:text-muted/60 focus:border-brand focus:outline-none transition disabled:opacity-50"
                  />
                </div>
              )}

              {/* Confirming notification banner */}
              {confirming && (
                <div className="rounded-xl border border-brand/40 bg-brand/10 p-4 text-center space-y-2">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand" />
                  <p className="font-heading text-sm font-semibold text-white">Payment received, confirming...</p>
                  <p className="font-mono text-[11px] text-muted">Awaiting enrollment confirmation from the server</p>
                </div>
              )}

              {/* Enroll Now / Go to Course Button */}
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleEnrollClick}
                  disabled={processing || confirming}
                  className="w-full justify-center shadow-glow font-mono text-xs tracking-wider"
                >
                  {confirming ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Confirming...</span>
                  ) : processing ? (
                    <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Connecting...</span>
                  ) : isEnrolled ? (
                    <>Go to Classroom <ArrowRight className="h-4 w-4" /></>
                  ) : (
                    <>Enroll Now <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>
                <p className="mt-2 text-center font-mono text-[11px] text-muted">
                  {isEnrolled ? 'You are enrolled in this course' : isDemoMode ? 'Demo payment mode active' : 'Instant registration • Verified via Razorpay'}
                </p>
              </div>

              {/* What's Included List with Check Icons in Gold */}
              <div className="border-t border-white/10 pt-6 space-y-3">
                <p className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                  What's included in this course:
                </p>

                <div className="space-y-2.5">
                  {[
                    'Daily interactive live lectures & discussion',
                    'Full HD lecture video archive access',
                    'Downloadable chapter notes & formula sheets',
                    'Weekly graded assignments with rubrics',
                    'Unit quizzes with percentile rank analytics',
                    'Direct faculty doubt clearing sessions',
                    'Official verifiable course certificate',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-xs text-muted">
                      <Check className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                      <span className="text-white/90">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode Payment Modal */}
      <Modal
        open={demoModalOpen}
        onClose={() => !processing && setDemoModalOpen(false)}
        title="Demo Payment Gateway"
        subtitle="Simulated Checkout (Demo Mode)"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-gold flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider font-mono">Demo Mode</span>
            <span>Simulated Transaction</span>
          </div>

          <div className="rounded-xl border border-white/10 bg-surface/80 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-muted">
              <span>Course:</span>
              <span className="text-white font-medium">{course.title}</span>
            </div>
            {selectedBatchId && (
              <div className="flex justify-between text-muted">
                <span>Batch:</span>
                <span className="text-white font-medium">
                  {courseBatches.find((b) => b.id === selectedBatchId)?.name || 'Selected Cohort'}
                </span>
              </div>
            )}
            {couponCode && (
              <div className="flex justify-between text-muted">
                <span>Applied Coupon:</span>
                <span className="text-gold font-mono font-medium">{couponCode}</span>
              </div>
            )}
            <div className="flex justify-between text-muted pt-2 border-t border-white/5">
              <span>Payable Amount:</span>
              <span className="text-gold font-bold font-mono text-sm">
                ₹{course.price ? course.price.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed">
            This workspace is in Demo Mode without live Supabase credentials. Clicking "Complete Demo Payment" will simulate an instant verified payment and enroll your demo student account.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setDemoModalOpen(false)} disabled={processing}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDemoEnrollment} disabled={processing}>
              {processing ? 'Enrolling...' : 'Complete Demo Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
