import React, { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Hash, Layers, Video, MonitorPlay,
  ClipboardList, ClipboardCheck, UserCheck, CreditCard, Ticket, Megaphone, BarChart3,
  Settings, LogOut, Bell, Menu, X, Blocks, FolderOpen, CalendarCheck,
  TrendingUp, CircleUser, ChevronDown, School,
} from 'lucide-react'
import { cx } from '../lib/utils.js'
import { isDemoMode } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { useData } from '../lib/store.jsx'
import { Avatar, Badge, DemoBanner, SearchInput } from './ui.jsx'

export function Logo({ dark = true }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-deep to-brand shadow-glow ring-1 ring-white/20">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 3 22 8 12 13 2 8Z" fill="#FFFFFF" />
          <path d="M6 10.6V15.5c0 1.8 2.7 3.2 6 3.2s6-1.4 6-3.2v-4.9l-6 2.7z" fill="rgba(255,255,255,0.85)" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className={cx('font-heading text-base font-bold tracking-tight', dark ? 'text-white' : 'text-slate-100')}>Tech Tians</p>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-brand">Academy</p>
      </div>
    </div>
  )
}

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/subjects', label: 'Subjects', icon: Hash },
  { to: '/admin/batches', label: 'Batches', icon: Layers },
  { to: '/admin/live-classes', label: 'Live Classes', icon: Video },
  { to: '/admin/lectures', label: 'Recorded Lectures', icon: MonitorPlay },
  { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/admin/quizzes', label: 'Tests & Quizzes', icon: ClipboardCheck },
  { to: '/admin/enrollments', label: 'Enrollments', icon: UserCheck },
  { to: '/admin/payments', label: 'Payments & Orders', icon: CreditCard },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const TEACHER_NAV = [
  { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/teacher/courses', label: 'My Courses', icon: BookOpen },
  { to: '/teacher/course-builder', label: 'Course Builder', icon: Blocks },
  { to: '/teacher/students', label: 'My Students', icon: Users },
  { to: '/teacher/batches', label: 'My Batches', icon: Layers },
  { to: '/teacher/live-classes', label: 'Live Classes', icon: Video },
  { to: '/teacher/lectures', label: 'Recorded Lectures', icon: MonitorPlay },
  { to: '/teacher/materials', label: 'Study Materials', icon: FolderOpen },
  { to: '/teacher/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/teacher/quizzes', label: 'Tests & Quizzes', icon: ClipboardCheck },
  { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/teacher/progress', label: 'Student Progress', icon: TrendingUp },
  { to: '/teacher/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/teacher/profile', label: 'My Profile', icon: CircleUser },
]

function DropdownCloser({ onClose, children }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      {children}
    </>
  )
}

function TopbarSearch() {
  const { db } = useData()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.role === 'admin'
  const [q, setQ] = useState('')
  const [focus, setFocus] = useState(false)
  const query = q.trim().toLowerCase()

  const results = useMemo(() => {
    if (query.length < 2) return null
    return {
      students: db.students.filter((s) => [s.name, s.email, s.studentId].join(' ').toLowerCase().includes(query)).slice(0, 4),
      teachers: isAdmin ? db.teachers.filter((t) => [t.name, t.email, t.subject].join(' ').toLowerCase().includes(query)).slice(0, 3) : [],
      courses: db.courses.filter((c) => [c.title, c.category].join(' ').toLowerCase().includes(query)).slice(0, 3),
    }
  }, [query, db, isAdmin])

  const go = (path) => {
    navigate(path)
    setQ('')
    setFocus(false)
  }

  return (
    <div className="relative w-full max-w-md">
      <SearchInput
        value={q}
        onChange={setQ}
        onFocus={() => setFocus(true)}
        onBlur={() => setTimeout(() => setFocus(false), 150)}
        placeholder="Search students, teachers, courses…"
      />
      {focus && results && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-card-soft backdrop-blur-xl">
          {results.students.length === 0 && results.teachers.length === 0 && results.courses.length === 0 && (
            <p className="px-4 py-3 text-xs text-muted">No matches for “{q}”.</p>
          )}
          {results.students.length > 0 && (
            <div className="py-1.5">
              <p className="px-4 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Students</p>
              {results.students.map((s) => (
                <button
                  key={s.id}
                  onMouseDown={() => go(`${isAdmin ? '/admin/students' : '/teacher/students'}?q=${encodeURIComponent(s.name)}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5"
                >
                  <Avatar name={s.name} className="h-7 w-7 text-[10px]" />
                  <span className="truncate font-medium text-slate-200">{s.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{s.studentId}</span>
                </button>
              ))}
            </div>
          )}
          {results.teachers.length > 0 && (
            <div className="border-t border-white/10 py-1.5">
              <p className="px-4 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Teachers</p>
              {results.teachers.map((t) => (
                <button
                  key={t.id}
                  onMouseDown={() => go(`/admin/teachers?q=${encodeURIComponent(t.name)}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5"
                >
                  <Avatar name={t.name} className="h-7 w-7 text-[10px]" />
                  <span className="truncate font-medium text-slate-200">{t.name}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{t.subject}</span>
                </button>
              ))}
            </div>
          )}
          {results.courses.length > 0 && (
            <div className="border-t border-white/10 py-1.5">
              <p className="px-4 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Courses</p>
              {results.courses.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={() => go(`${isAdmin ? '/admin/courses' : '/teacher/courses'}?q=${encodeURIComponent(c.title)}`)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm">{db.covers[c.coverIndex]?.emoji}</span>
                  <span className="truncate font-medium text-slate-200">{c.title}</span>
                  <span className="ml-auto font-mono text-xs text-muted">{c.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationsBell() {
  const { db, markNotificationRead, markAllNotificationsRead } = useData()
  const [open, setOpen] = useState(false)
  const unread = db.notifications.filter((n) => !n.read).length
  const toneIcon = { approval: GraduationCap, class: Video, payment: CreditCard, enrollment: UserCheck, submission: ClipboardList, system: Bell }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-muted transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand shadow-glow" />
          </span>
        )}
      </button>
      {open && (
        <DropdownCloser onClose={() => setOpen(false)}>
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-card-soft backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="font-heading text-sm font-semibold text-white">Notifications</p>
              <button
                onClick={() => { markAllNotificationsRead(); setOpen(false) }}
                className="font-mono text-xs font-medium text-brand hover:underline"
              >
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {db.notifications.map((n) => {
                const Icon = toneIcon[n.type] || Bell
                return (
                  <button
                    key={n.id}
                    onClick={() => { markNotificationRead(n.id) }}
                    className={cx(
                      'flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5',
                      !n.read && 'bg-brand/5'
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand/40 bg-brand/15 text-brand shadow-glow/20">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-white">{n.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{n.body}</span>
                      {!n.read && <Badge tone="brand" live className="mt-1.5">New</Badge>}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </DropdownCloser>
      )}
    </div>
  )
}

function ProfileMenu({ role }) {
  const { user, logout } = useAuth()
  const { db } = useData()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const teacherProfile = role === 'teacher' ? db.teachers.find((t) => t.userId === user?.id) : null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full px-2 py-1.5 transition hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Avatar name={user?.name || 'User'} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-white">{user?.name}</span>
          <span className="block font-mono text-[11px] capitalize text-muted">{user?.role}{teacherProfile ? ` · ${teacherProfile.subject}` : ''}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <DropdownCloser onClose={() => setOpen(false)}>
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-card-soft backdrop-blur-xl">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="font-heading text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate font-mono text-xs text-muted">{user?.email}</p>
              <div className="mt-2"><Badge tone="brand">{role} account</Badge></div>
            </div>
            <div className="py-1">
              {role === 'admin' ? (
                <button
                  onClick={() => { setOpen(false); navigate('/admin/settings') }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <Settings className="h-4 w-4 text-brand" /> Settings
                </button>
              ) : (
                <button
                  onClick={() => { setOpen(false); navigate('/teacher/profile') }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-slate-300 transition hover:bg-white/5 hover:text-white"
                >
                  <CircleUser className="h-4 w-4 text-brand" /> My Profile
                </button>
              )}
              <button
                onClick={logout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
        </DropdownCloser>
      )}
    </div>
  )
}

function Sidebar({ nav, onNavigate }) {
  return (
    <div className="flex h-full flex-col bg-surface/80 backdrop-blur-xl">
      <div className="px-6 pb-6 pt-6">
        <Logo dark />
      </div>
      <p className="px-6 pb-2.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Menu</p>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 pb-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 font-mono text-xs font-medium uppercase tracking-wider transition-all duration-200',
                isActive
                  ? 'bg-brand/10 text-brand shadow-glow/10'
                  : 'text-muted hover:bg-white/5 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-brand shadow-glow" />}
                <item.icon className={cx('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-brand' : 'text-muted group-hover:text-white')} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-6 py-4">
        <div className="flex items-center gap-2 text-muted">
          <School className="h-4 w-4 text-brand" />
          <p className="font-heading text-xs font-semibold text-white">Tech Tians Academy</p>
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted/70">v1.0 · Staff Portal</p>
      </div>
    </div>
  )
}

function Shell({ nav, title, role }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const drawerRef = useRef(null)

  // Esc closes mobile drawer
  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  // Focus trap for mobile drawer
  useEffect(() => {
    if (!mobileOpen) return
    const drawer = drawerRef.current
    if (!drawer) return
    const focusables = drawer.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    first?.focus()
    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    window.addEventListener('keydown', handleTab)
    return () => window.removeEventListener('keydown', handleTab)
  }, [mobileOpen])

  return (
    <div className="relative flex h-screen overflow-hidden bg-void text-white">
      {/* Background grid + ambient orange glow blob */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />
      <div className="glow-blob fixed -left-36 -top-36 h-[500px] w-[500px]" />

      {/* Desktop sidebar */}
      <aside className="relative z-20 hidden w-64 shrink-0 border-r border-white/10 lg:block">
        <Sidebar nav={nav} />
      </aside>

      {/* Mobile drawer with backdrop blur and focus trap */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-surface/95 shadow-card-soft backdrop-blur-xl"
          >
            <div className="absolute right-3.5 top-4 z-20">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-white/10 bg-white/5 p-1.5 text-muted transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Sidebar nav={nav} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content column */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {isDemoMode && <DemoBanner />}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-white/10 bg-surface/75 px-4 backdrop-blur-xl sm:px-6">
          <button
            className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
            onClick={() => setMobileOpen(true)}
            title="Open menu"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="hidden font-heading text-base font-semibold text-white md:block">{title}</h1>
          <div className="ml-auto flex w-full items-center gap-3 sm:w-auto">
            <TopbarSearch />
            <NotificationsBell />
            <ProfileMenu role={role} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export function AdminLayout() {
  return <Shell nav={ADMIN_NAV} title="Admin Panel" role="admin" />
}

export function TeacherLayout() {
  return <Shell nav={TEACHER_NAV} title="Teacher Panel" role="teacher" />
}
