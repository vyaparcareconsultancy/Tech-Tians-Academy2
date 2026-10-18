import React, { useMemo, useState } from 'react'
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

export function Logo({ dark }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 ring-1 ring-white/10">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
          <path d="M12 4 22 8.5 12 13 2 8.5Z" fill="#6366F1" />
          <path d="M6 10.6V15c0 1.6 2.7 2.9 6 2.9s6-1.3 6-2.9v-4.4l-6 2.3z" fill="#fff" />
        </svg>
      </span>
      <div className="leading-tight">
        <p className={cx('text-[15px] font-semibold', dark ? 'text-white' : 'text-navy-900')}>Tech Tians</p>
        <p className={cx('text-[10px] font-semibold uppercase tracking-[0.18em]', dark ? 'text-indigo-300' : 'text-indigo-600')}>Academy</p>
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
      <SearchInput value={q} onChange={setQ} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder="Search students, teachers, courses…" />
      {focus && results && (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
          {results.students.length === 0 && results.teachers.length === 0 && results.courses.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-500">No matches for “{q}”.</p>
          )}
          {results.students.length > 0 && (
            <div className="py-1">
              <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Students</p>
              {results.students.map((s) => (
                <button key={s.id} onMouseDown={() => go(`${isAdmin ? '/admin/students' : '/teacher/students'}?q=${encodeURIComponent(s.name)}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-navy-50">
                  <Avatar name={s.name} className="h-7 w-7 text-[10px]" />
                  <span className="truncate font-medium text-slate-800">{s.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{s.studentId}</span>
                </button>
              ))}
            </div>
          )}
          {results.teachers.length > 0 && (
            <div className="border-t border-slate-100 py-1">
              <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Teachers</p>
              {results.teachers.map((t) => (
                <button key={t.id} onMouseDown={() => go(`/admin/teachers?q=${encodeURIComponent(t.name)}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-navy-50">
                  <Avatar name={t.name} className="h-7 w-7 text-[10px]" />
                  <span className="truncate font-medium text-slate-800">{t.name}</span>
                  <span className="ml-auto text-xs text-slate-400">{t.subject}</span>
                </button>
              ))}
            </div>
          )}
          {results.courses.length > 0 && (
            <div className="border-t border-slate-100 py-1">
              <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Courses</p>
              {results.courses.map((c) => (
                <button key={c.id} onMouseDown={() => go(`${isAdmin ? '/admin/courses' : '/teacher/courses'}?q=${encodeURIComponent(c.title)}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-navy-50">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-100 text-sm">{db.covers[c.coverIndex]?.emoji}</span>
                  <span className="truncate font-medium text-slate-800">{c.title}</span>
                  <span className="ml-auto text-xs text-slate-400">{c.category}</span>
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
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" title="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <DropdownCloser onClose={() => setOpen(false)}>
          <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <button onClick={() => { markAllNotificationsRead(); setOpen(false) }} className="text-xs font-medium text-indigo-600 hover:underline">
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
                    className={cx('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-navy-50/60', !n.read && 'bg-indigo-50/50')}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-navy-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{n.title}</span>
                      <span className="block text-xs text-slate-500">{n.body}</span>
                      {!n.read && <Badge tone="indigo" className="mt-1">New</Badge>}
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
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-100">
        <Avatar name={user?.name || 'User'} />
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium text-slate-800">{user?.name}</span>
          <span className="block text-xs capitalize text-slate-500">{user?.role}{teacherProfile ? ` · ${teacherProfile.subject}` : ''}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {open && (
        <DropdownCloser onClose={() => setOpen(false)}>
          <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <div className="mt-1.5"><Badge tone="navy">{role} account</Badge></div>
            </div>
            <div className="py-1">
              {role === 'admin' ? (
                <button onClick={() => { setOpen(false); navigate('/admin/settings') }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="h-4 w-4 text-slate-400" /> Settings
                </button>
              ) : (
                <button onClick={() => { setOpen(false); navigate('/teacher/profile') }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <CircleUser className="h-4 w-4 text-slate-400" /> My Profile
                </button>
              )}
              <button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50">
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
    <div className="flex h-full flex-col bg-navy-950">
      <div className="px-5 pb-5 pt-5">
        <Logo dark />
      </div>
      <p className="px-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Menu</p>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-indigo-500" />}
                <item.icon className={cx('h-4.5 w-4.5 h-[18px] w-[18px]', isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300')} />
                <span className="truncate">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-slate-500">
          <School className="h-4 w-4" />
          <p className="text-xs">Tech Tians Academy</p>
        </div>
        <p className="mt-1 text-[11px] text-slate-600">v1.0 · Staff Portal</p>
      </div>
    </div>
  )
}

function Shell({ nav, title, role }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 lg:block">
        <Sidebar nav={nav} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-pop">
            <button onClick={() => setMobileOpen(false)} className="absolute -right-10 top-4 rounded-lg bg-white/10 p-1.5 text-white"><X className="h-5 w-5" /></button>
            <Sidebar nav={nav} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {isDemoMode && <DemoBanner />}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
          <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(true)} title="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="hidden text-base font-semibold text-slate-900 md:block">{title}</h1>
          <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
            <TopbarSearch />
            <NotificationsBell />
            <ProfileMenu role={role} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto max-w-[1400px]">
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
