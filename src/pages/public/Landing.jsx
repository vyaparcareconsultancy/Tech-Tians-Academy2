import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Video, MonitorPlay, ClipboardCheck, ClipboardList, Award,
  TrendingUp, Headphones, Smartphone, Clock, Star, Check,
  ChevronDown, ArrowRight, Sparkles, BookOpen, Layers, CheckCircle2
} from 'lucide-react'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { Button, Badge } from '../../components/ui.jsx'
import { cx } from '../../lib/utils.js'

function AnimatedHeroOrb() {
  return (
    <div className="relative flex items-center justify-center h-72 w-72 sm:h-96 sm:w-96">
      {/* Outer spinning ring */}
      <div className="absolute h-72 w-72 sm:h-96 sm:w-96 rounded-full border border-dashed border-brand/40 animate-spin-slow" />
      {/* Inner reverse spinning ring */}
      <div
        className="absolute h-56 w-56 sm:h-80 sm:w-80 rounded-full border border-gold/40 animate-spin-reverse"
        style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
      />
      {/* Center glowing orb sphere */}
      <div className="relative h-40 w-40 sm:h-52 sm:w-52 rounded-full bg-gradient-to-tr from-brand-deep via-brand to-gold shadow-glow-lg animate-float">
        {/* Specular shine */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { db } = useData()
  const [openFaq, setOpenFaq] = useState(0)

  // Dynamic metrics from data store
  const publishedCourses = (db.courses || []).filter((c) => c.status === 'published')
  const totalStudents = db.students ? db.students.length : 26
  const totalLiveClasses = db.liveClasses ? db.liveClasses.length : 12
  const totalBatches = db.batches ? db.batches.length : 9

  const sampleLabel = isDemoMode ? 'Sample' : 'Live'

  // Features list
  const features = [
    {
      icon: Video,
      title: 'Live Classes',
      description: 'Interactive real-time audio and video sessions with whiteboard problem solving, active polling, and chat.',
    },
    {
      icon: MonitorPlay,
      title: 'Recorded Lectures',
      description: 'High-definition video archive with searchable transcripts, chapter bookmarks, and variable playback speeds.',
    },
    {
      icon: ClipboardCheck,
      title: 'Quizzes & Tests',
      description: 'Timed sectional assessments with instant automated evaluation, score breakdowns, and class percentile ranks.',
    },
    {
      icon: ClipboardList,
      title: 'Assignments',
      description: 'Weekly problem sheets with graded submissions, customized teacher feedback rubrics, and model answer keys.',
    },
    {
      icon: Award,
      title: 'Certificates',
      description: 'Verifiable course completion certificates honoring milestone academic achievements and technical competencies.',
    },
    {
      icon: TrendingUp,
      title: 'Progress Tracking',
      description: 'Comprehensive analytics dashboards tracking attendance trends, unit mastery percentages, and topic weak spots.',
    },
    {
      icon: Headphones,
      title: 'Doubt Support',
      description: 'Direct access to verified educators and dedicated batch discussion threads for rapid doubt resolution.',
    },
    {
      icon: Smartphone,
      title: 'Mobile Friendly',
      description: 'Full-featured mobile learning experience optimized for smartphones and tablets on any modern web browser.',
    },
  ]

  // How it works steps
  const steps = [
    {
      step: '01',
      title: 'Choose course',
      description: 'Explore our specialized curriculums spanning JEE, NEET, Foundation, and Science Olympiad tracks.',
    },
    {
      step: '02',
      title: 'Enroll and pay',
      description: 'Instant enrollment with transparent tuition and zero friction. Gain immediate access to all syllabus materials.',
    },
    {
      step: '03',
      title: 'Learn live + recorded',
      description: 'Participate in scheduled interactive sessions, review recorded archives on-demand, and practice weekly problem sets.',
    },
    {
      step: '04',
      title: 'Get certified',
      description: 'Complete all unit milestones, pass the final comprehensive assessment, and receive your verified certificate.',
    },
  ]

  // Pricing plans
  const plans = [
    {
      name: 'Foundation Tier',
      tagline: 'Self-paced essential access',
      price: '₹1,999',
      period: '/ month',
      highlighted: false,
      features: [
        'Access to all recorded lecture archives',
        'Standard unit quizzes & practice tests',
        'Downloadable lecture notes & slides',
        'Community discussion board access',
        'Mobile web access on all devices',
      ],
      cta: 'Choose Foundation',
    },
    {
      name: 'Pro Cohort',
      tagline: 'Complete live interactive program',
      price: '₹4,999',
      period: '/ month',
      badge: 'Most Popular',
      highlighted: true,
      features: [
        'All Foundation features included',
        'Daily interactive live lecture sessions',
        'Direct teacher doubt clearing sessions',
        'Weekly graded assignments with rubrics',
        'Official course completion certificate',
        'Comprehensive performance analytics',
      ],
      cta: 'Join Pro Cohort',
    },
    {
      name: 'Master Mentorship',
      tagline: 'Intensive 1-on-1 guidance',
      price: '₹8,999',
      period: '/ month',
      highlighted: false,
      features: [
        'All Pro Cohort features included',
        'Bi-weekly 1-on-1 mentor strategy calls',
        'Personalized doubt resolution priority',
        'Full-length mock exam series with ranking',
        'Custom study schedule & weak-spot review',
      ],
      cta: 'Apply for Mentorship',
    },
  ]

  // FAQ Items
  const faqs = [
    {
      q: 'How do live classes work on Tech Tians Academy?',
      a: 'Live classes take place in our integrated virtual classroom. Instructors stream high-definition video, present digital whiteboards, solve problems live, and interact with students through audio and real-time chat.',
    },
    {
      q: 'What happens if I miss a scheduled live class?',
      a: 'Every live class is automatically recorded and uploaded to the course library within 2 hours. You can revisit lectures anytime, replay difficult concepts, and bookmark specific timestamps.',
    },
    {
      q: 'How is student doubt resolution handled?',
      a: 'Students can ask questions live during class, post queries in the dedicated batch discussion forum, or attend scheduled weekly doubt-clearing sessions led by subject-matter teachers.',
    },
    {
      q: 'Are certificates provided upon course completion?',
      a: 'Yes. Students who successfully complete the required lectures, submit assignments, and attain passing scores on quizzes receive a verified digital certificate of completion.',
    },
    {
      q: 'Can I access course materials on a mobile phone or tablet?',
      a: 'Absolutely. Tech Tians Academy is fully responsive and optimized for mobile devices, enabling you to watch lectures, attempt quizzes, and review notes anywhere without installing a heavy native app.',
    },
    {
      q: 'What is the refund or batch change policy?',
      a: 'We offer a 7-day satisfaction window from the date of enrollment. If you find the batch pace or schedule unsuitable, our support team can assist you in transferring to another batch or processing a refund.',
    },
  ]

  return (
    <div className="w-full">
      {/* ------------------------------------------------------------ */}
      {/* SECTION 1: HERO (bg-void, py-24)                             */}
      {/* ------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-void py-24 lg:py-32">
        {/* Background grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-40" />

        {/* Ambient glow blobs */}
        <div className="glow-blob -top-24 left-1/4 h-96 w-96 bg-brand/20 blur-[140px]" />
        <div className="glow-blob top-1/3 -right-24 h-96 w-96 bg-gold/15 blur-[150px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Content */}
            <div className="lg:col-span-7">
              {/* Badge with ping dot */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1.5 font-mono text-xs uppercase tracking-widest text-brand shadow-glow/10">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                </span>
                <span>New batches open • Academic Year 2026-27</span>
              </div>

              {/* Headline */}
              <h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-7xl leading-[1.1]">
                Master STEM Curriculums with <span className="text-gradient">Precision.</span>
              </h1>

              {/* Subtext */}
              <p className="mt-6 max-w-2xl text-base sm:text-xl leading-relaxed text-muted">
                The high-performance learning platform for ambitious students. Interactive live cohorts, structured video archives, unit assessments, and direct teacher guidance.
              </p>

              {/* Two CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => {
                    const el = document.querySelector('#courses')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                    else navigate('/login')
                  }}
                  className="shadow-glow"
                >
                  Explore Courses <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    const el = document.querySelector('#how-it-works')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  How It Works
                </Button>
              </div>

              {/* Micro Trust Indicators */}
              <div className="mt-10 flex flex-wrap items-center gap-6 font-mono text-xs text-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold" />
                  <span>Interactive Live Lectures</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold" />
                  <span>Recorded Lecture Archives</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-gold" />
                  <span>Verifiable Certifications</span>
                </div>
              </div>
            </div>

            {/* Right Graphic: Animated Orb with spinning rings + 3 Bouncing Stat Cards */}
            <div className="relative flex items-center justify-center lg:col-span-5">
              <div className="relative">
                <AnimatedHeroOrb />

                {/* Bouncing Glass Stat Card 1: Students */}
                <div
                  className="glass absolute -left-4 sm:-left-8 top-4 flex items-center gap-3 rounded-2xl p-3.5 shadow-card-soft animate-bounce"
                  style={{ animationDuration: '4.2s' }}
                >
                  <span className="flex h-3 w-3 rounded-full bg-gold shadow-glow-gold" />
                  <div className="text-left">
                    <p className="font-mono text-sm sm:text-base font-bold text-white">
                      {(totalStudents * 95).toLocaleString()}+
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Students ({sampleLabel})
                    </p>
                  </div>
                </div>

                {/* Bouncing Glass Stat Card 2: Courses */}
                <div
                  className="glass absolute -right-4 sm:-right-8 top-28 flex items-center gap-3 rounded-2xl p-3.5 shadow-card-soft animate-bounce"
                  style={{ animationDuration: '4.8s', animationDelay: '1.2s' }}
                >
                  <span className="flex h-3 w-3 rounded-full bg-brand shadow-glow" />
                  <div className="text-left">
                    <p className="font-mono text-sm sm:text-base font-bold text-white">
                      {publishedCourses.length || 10}+ Courses
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Active Now ({sampleLabel})
                    </p>
                  </div>
                </div>

                {/* Bouncing Glass Stat Card 3: Live Classes */}
                <div
                  className="glass absolute -bottom-6 left-6 sm:left-12 flex items-center gap-3 rounded-2xl p-3.5 shadow-card-soft animate-bounce"
                  style={{ animationDuration: '5.4s', animationDelay: '0.6s' }}
                >
                  <span className="flex h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="text-left">
                    <p className="font-mono text-sm sm:text-base font-bold text-white">
                      {totalLiveClasses || 16} Live Classes
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      Weekly Sessions ({sampleLabel})
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 2: STATS TICKER STRIP (bg-surface, py-20, border-y)  */}
      {/* ------------------------------------------------------------ */}
      <section className="border-y border-white/10 bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center md:text-left">
              <p className="font-mono text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {(totalStudents * 95).toLocaleString()}+
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
                Active Students Enrolled
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="font-mono text-3xl font-bold text-brand sm:text-4xl lg:text-5xl">
                94.8%
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
                Course Completion Rate
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="font-mono text-3xl font-bold text-gold sm:text-4xl lg:text-5xl">
                1,200+
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
                Live Class Hours Taught
              </p>
            </div>
            <div className="text-center md:text-left">
              <p className="font-mono text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {totalBatches || 9} Active
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-muted">
                Specialized Cohort Batches
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 3: FEATURES GRID (bg-void, py-24)                    */}
      {/* ------------------------------------------------------------ */}
      <section className="bg-void py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Core Capabilities</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Engineered for Modern <span className="text-gradient">Academics</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
              Everything students and educators need to deliver deep comprehension, consistent engagement, and measurable exam results.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="card-base group relative overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow/20"
                >
                  {/* Watermark background icon revealing on hover */}
                  <Icon
                    className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 text-white/5 opacity-20 transition-all duration-300 group-hover:scale-110 group-hover:text-brand/10 group-hover:opacity-100"
                    aria-hidden="true"
                  />

                  {/* Icon holographic node */}
                  <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand transition-all duration-300 group-hover:border-brand group-hover:shadow-glow">
                    <Icon className="h-6 w-6" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="relative z-10 mt-5 font-heading text-lg font-semibold text-white">
                    {feature.title}
                  </h3>
                  <p className="relative z-10 mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 4: HOW IT WORKS (bg-surface, py-24)                  */}
      {/* ------------------------------------------------------------ */}
      <section id="how-it-works" className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <Layers className="h-3.5 w-3.5" />
              <span>Learning Protocol</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              How Tech Tians <span className="text-gradient">Works</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
              A systematic four-phase journey designed to take you from foundational understanding to verifiable subject mastery.
            </p>
          </div>

          {/* Vertical blockchain-style timeline */}
          <div className="relative mx-auto mt-20 max-w-4xl">
            {/* Orange gradient connecting line */}
            <div
              className="absolute left-6 top-8 bottom-8 w-0.5 -translate-x-1/2 bg-gradient-to-b from-brand via-gold to-brand-deep md:left-1/2"
              aria-hidden="true"
            />

            <div className="space-y-12">
              {steps.map((item, idx) => {
                const isEven = idx % 2 === 0
                return (
                  <div
                    key={item.step}
                    className="relative flex flex-col items-start gap-6 md:flex-row md:items-center"
                  >
                    {/* Left side on desktop (for even items) */}
                    <div className={cx('w-full md:w-1/2 pl-16 md:pl-0', isEven ? 'md:pr-12 md:text-right' : 'md:order-2 md:pl-12 md:text-left')}>
                      <div className="group relative glass rounded-2xl p-6 transition-all duration-300 hover:border-brand/50 hover:shadow-glow/20">
                        {/* Decorative corner accents */}
                        <div className="pointer-events-none absolute left-0 top-0 h-3 w-3 rounded-tl-sm border-l-2 border-t-2 border-brand" />
                        <div className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 rounded-br-sm border-b-2 border-r-2 border-brand" />

                        <div className={cx('flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-brand', isEven ? 'md:justify-end' : 'md:justify-start')}>
                          <span>Step {item.step}</span>
                        </div>
                        <h3 className="mt-2 font-heading text-xl font-bold text-white">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Timeline Node in Center */}
                    <div className="absolute left-6 top-6 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-2 border-brand bg-void font-mono text-sm font-bold text-gold shadow-glow md:left-1/2 md:top-auto">
                      {item.step}
                    </div>

                    {/* Empty placeholder on the opposite side to balance desktop row */}
                    <div className={cx('hidden md:block md:w-1/2', isEven ? 'md:order-2' : 'md:order-1')} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 5: FEATURED COURSES (bg-void, py-24)                 */}
      {/* ------------------------------------------------------------ */}
      <section id="courses" className="bg-void py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Academic Curriculums</span>
              </div>
              <h2 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
                Featured <span className="text-gradient">Courses</span>
              </h2>
              <p className="mt-2 text-base text-muted">
                Explore comprehensive programs structured for rigorous academic standards.
              </p>
            </div>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/login')}
              className="shrink-0"
            >
              Browse All Courses
            </Button>
          </div>

          {/* Courses Grid */}
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {publishedCourses.slice(0, 6).map((course) => (
              <div
                key={course.id}
                className="card-base group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow/20"
              >
                {/* Cover Banner with Gradient & Subject Emoji */}
                <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-surface to-void border-b border-white/10">
                  <div className="glow-blob -top-10 left-1/2 h-32 w-32 -translate-x-1/2 bg-brand/30 blur-[80px]" />
                  <span className="text-6xl filter drop-shadow-md transition-transform duration-300 group-hover:scale-110">
                    {course.category === 'JEE' ? '⚛️' : course.category === 'NEET' ? '🧬' : course.category === 'Foundation' ? '📐' : '💻'}
                  </span>
                  {/* Category Pill */}
                  <div className="absolute right-3.5 top-3.5">
                    <Badge tone="brand">{course.category}</Badge>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="gold">{course.subjectName}</Badge>
                    <span className="font-mono text-xs text-muted">{course.level}</span>
                  </div>

                  <h3 className="mt-3 font-heading text-lg font-bold text-white line-clamp-1 group-hover:text-brand transition-colors">
                    {course.title}
                  </h3>

                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                    {course.description}
                  </p>

                  <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted border-t border-white/10 pt-4">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-brand" />
                      {course.durationHours} hrs
                    </span>
                    <span className="flex items-center gap-1.5 text-gold font-semibold">
                      <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                      {course.rating || '4.9'}
                    </span>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Tuition</p>
                      <p className="font-mono text-xl font-bold text-white">
                        ₹{course.price.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/login')}
                    >
                      Enroll <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 6: PRICING / PLANS (bg-surface, py-24)               */}
      {/* ------------------------------------------------------------ */}
      <section id="pricing" className="bg-surface py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Investment Plans</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Transparent Cohort <span className="text-gradient">Pricing</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-muted sm:text-lg">
              Predictable, flat tuition with no hidden fees. Choose the format that aligns best with your academic targets.
            </p>
          </div>

          {/* 3 Tiers Grid: middle one scale-105 highlighted on desktop */}
          <div className="mt-16 grid grid-cols-1 items-center gap-8 md:grid-cols-3">
            {plans.map((plan) => {
              const isHighlight = plan.highlighted
              return (
                <div
                  key={plan.name}
                  className={cx(
                    'relative rounded-2xl p-8 transition-all duration-300',
                    isHighlight
                      ? 'border-2 border-brand bg-void shadow-glow/30 md:scale-105 z-10'
                      : 'border border-white/10 bg-void/50 opacity-85 hover:opacity-100 hover:border-white/20'
                  )}
                >
                  {isHighlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-brand-deep to-brand px-3.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white shadow-glow">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <h3 className="font-heading text-xl font-bold text-white">{plan.name}</h3>
                  <p className="mt-1 text-xs text-muted">{plan.tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-bold text-white">{plan.price}</span>
                    <span className="font-mono text-xs text-muted">{plan.period}</span>
                  </div>

                  <div className="mt-8 space-y-3.5 border-t border-white/10 pt-6">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-start gap-3 text-xs text-muted">
                        <Check className="h-4 w-4 shrink-0 text-brand mt-0.5" />
                        <span className="text-white/90">{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Button
                      variant={isHighlight ? 'primary' : 'outline'}
                      size="md"
                      onClick={() => navigate('/login')}
                      className="w-full justify-center"
                    >
                      {plan.cta}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 7: FAQ ACCORDION (bg-void, py-24)                     */}
      {/* ------------------------------------------------------------ */}
      <section id="faq" className="bg-void py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <span>Frequently Asked Questions</span>
            </div>
            <h2 className="mt-4 font-heading text-3xl font-bold text-white sm:text-4xl">
              Answers & <span className="text-gradient">Information</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted">
              Everything you need to know about our teaching format, batch schedules, and student support.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-white/10 bg-surface/70 transition-colors hover:border-white/20"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-2xl"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <span className="font-heading text-base font-semibold text-white sm:text-lg pr-4">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={cx(
                        'h-5 w-5 shrink-0 text-muted transition-transform duration-300',
                        isOpen && 'rotate-180 text-brand'
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={`faq-answer-${index}`}
                      className="px-6 pb-6 text-sm leading-relaxed text-muted border-t border-white/5 pt-4"
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* SECTION 8: FINAL CTA BAND WITH GLOW (bg-surface, py-24)      */}
      {/* ------------------------------------------------------------ */}
      <section className="relative overflow-hidden bg-surface py-24">
        {/* Glow blob centered */}
        <div className="glow-blob left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 bg-brand/25 blur-[140px]" />

        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3.5 py-1 font-mono text-xs uppercase tracking-wider text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Accelerate Your Academic Growth</span>
          </div>

          <h2 className="mt-6 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-6xl">
            Ready to Begin Your <span className="text-gradient">Journey?</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base sm:text-lg leading-relaxed text-muted">
            Join thousands of ambitious students mastering complex STEM subjects with personalized mentorship and high-precision curriculums.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/login')}
              className="shadow-glow"
            >
              Get Started Now <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.querySelector('#courses')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Explore All Batches
            </Button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 font-mono text-xs text-muted">
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-gold" />
              Instant Access to Lecture Archives
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-gold" />
              Real-time Live Doubt Sessions
            </span>
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-gold" />
              7-Day Batch Transfer Guarantee
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
