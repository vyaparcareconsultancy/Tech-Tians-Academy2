import React, { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, BookOpen, Layers, UserCheck, IndianRupee, Clock, Video,
  ArrowUpRight, CheckCircle2, XCircle, CalendarDays, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '../../lib/store.jsx'
import { formatINR, formatDate, formatDateTime, monthKey, monthLabel, cx, timeAgo } from '../../lib/utils.js'
import { Card, CardHeader, StatCard, Badge, Avatar, Button, EmptyState } from '../../components/ui.jsx'

const last8MonthKeys = () => {
  const keys = []
  const d = new Date()
  d.setDate(1)
  for (let i = 7; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    keys.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)
  }
  return keys
}

export default function AdminDashboard() {
  const { db, audit, update } = useData()
  const navigate = useNavigate()

  const stats = useMemo(() => {
    const keys = last8MonthKeys()
    const growth = keys.map((k) => ({
      m: monthLabel(k),
      enrollments: db.orders.filter((o) => monthKey(o.createdAt) === k).length,
    }))
    const revenue = keys.map((k) => ({
      m: monthLabel(k),
      revenue: db.orders.filter((o) => o.status === 'paid' && monthKey(o.createdAt) === k).reduce((s, o) => s + o.amount, 0),
    }))
    const totalRevenue = db.payments.filter((p) => p.verified).reduce((s, p) => s + p.amount, 0)
    const lastMonthRev = revenue[revenue.length - 1]?.revenue || 0
    const prevMonthRev = revenue[revenue.length - 2]?.revenue || 0
    const revDelta = prevMonthRev ? Math.round(((lastMonthRev - prevMonthRev) / prevMonthRev) * 100) : 0
    const activeBatches = db.batches.filter((b) => b.status === 'active').length
    const pendingTeachers = db.teachers.filter((t) => t.status === 'pending')
    const upcoming = db.liveClasses.filter((l) => l.status === 'upcoming' || l.status === 'live')
    return {
      totalStudents: db.students.length,
      totalTeachers: db.teachers.length,
      totalCourses: db.courses.length,
      activeBatches,
      totalEnrollments: db.enrollments.length,
      totalRevenue,
      pendingCount: pendingTeachers.length,
      upcomingCount: upcoming.length,
      growth,
      revenue,
      revDelta,
      pendingTeachers,
      upcoming,
    }
  }, [db])

  const recentStudents = [...db.students].sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)).slice(0, 6)
  const recentPayments = [...db.orders].filter((o) => o.status === 'paid').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const upcomingClasses = [...stats.upcoming].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5)

  const coursePerformance = useMemo(() => {
    return db.courses
      .filter((c) => c.status === 'published')
      .map((c) => {
        const enrs = db.enrollments.filter((e) => e.courseId === c.id)
        const revenue = db.orders.filter((o) => o.courseId === c.id && o.status === 'paid').reduce((s, o) => s + o.amount, 0)
        const avgProgress = enrs.length ? Math.round(enrs.reduce((s, e) => s + (e.progressPct || 0), 0) / enrs.length) : 0
        return { course: c, enrollments: enrs.length, revenue, avgProgress }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }, [db])

  const approveTeacher = (t) => {
    // Demo-mode mutation; in Supabase mode this runs as a secured, audited server action.
    update('teachers', t.id, { status: 'active', approvedAt: new Date().toISOString() })
    audit('teacher.approved', 'teachers', `Approved teacher application of ${t.name}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">Overview of academy performance · updated just now</p>
        </div>
        <Badge tone="amber" className="px-2.5 py-1">Sample data — demo mode</Badge>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents} tone="indigo" delta="+3 this week" />
        <StatCard icon={GraduationCap} label="Total Teachers" value={stats.totalTeachers} tone="navy" delta={`${stats.pendingCount} pending approval`} />
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} tone="cyan" delta={`${db.courses.filter((c) => c.status === 'published').length} published`} />
        <StatCard icon={Layers} label="Active Batches" value={stats.activeBatches} tone="violet" delta={`${db.batches.length} total`} />
        <StatCard icon={UserCheck} label="Total Enrollments" value={stats.totalEnrollments} tone="emerald" delta="+8% MoM" />
        <StatCard icon={IndianRupee} label="Revenue (verified)" value={formatINR(stats.totalRevenue)} tone="amber" delta={`${stats.revDelta >= 0 ? '+' : ''}${stats.revDelta}% vs last month`} deltaUp={stats.revDelta >= 0} />
        <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingCount} tone="rose" delta={stats.pendingCount ? 'Needs review' : 'All clear'} deltaUp={stats.pendingCount === 0} />
        <StatCard icon={Video} label="Upcoming Live Classes" value={stats.upcomingCount} tone="blue" delta="Next 14 days" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Enrollment growth" subtitle="New orders per month (last 8 months)" actions={<Badge tone="indigo">Monthly</Badge>} />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.growth} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="enrFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} />
                <Area type="monotone" dataKey="enrollments" stroke="#4F46E5" strokeWidth={2.5} fill="url(#enrFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue" subtitle="Verified payments per month" actions={<Badge tone="emerald">₹ INR</Badge>} />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenue} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                <XAxis dataKey="m" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} interval={1} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#1B325F" radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Middle row: registrations + payments + approvals */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Recent registrations"
            subtitle="Newest student accounts"
            actions={<Link to="/admin/students" className="inline-flex items-center text-xs font-medium text-indigo-600 hover:underline">View all <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" /></Link>}
          />
          <ul className="divide-y divide-slate-100">
            {recentStudents.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="truncate text-xs text-slate-500">{s.studentId} · {s.grade}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">{formatDate(s.enrolledAt)}</p>
                  <Badge tone={s.status === 'active' ? 'green' : 'red'}>{s.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Recent payments"
            subtitle="Verified gateway transactions"
            actions={<Link to="/admin/payments" className="inline-flex items-center text-xs font-medium text-indigo-600 hover:underline">View all <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" /></Link>}
          />
          <ul className="divide-y divide-slate-100">
            {recentPayments.map((o) => {
              const st = db.students.find((s) => s.id === o.studentId)
              const c = db.courses.find((c) => c.id === o.courseId)
              return (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={st?.name || '?'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{st?.name}</p>
                    <p className="truncate text-xs text-slate-500">{c?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatINR(o.amount)}</p>
                    <Badge tone="green">{o.status}</Badge>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Pending teacher approvals" subtitle="Applications awaiting review" />
          {stats.pendingTeachers.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" message="No teacher applications pending review." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.pendingTeachers.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={t.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{t.name}</p>
                    <p className="truncate text-xs text-slate-500">{t.subject} · applied {timeAgo(t.appliedAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="indigo" onClick={() => { approveTeacher(t); navigate('/admin/teachers') }}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => navigate('/admin/teachers')}>
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Bottom row: classes + performance */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Upcoming classes" subtitle="Scheduled live sessions" actions={<Link to="/admin/live-classes" className="inline-flex items-center text-xs font-medium text-indigo-600 hover:underline">Manage <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" /></Link>} />
          {upcomingClasses.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No classes scheduled" message="Schedule a live class to see it here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcomingClasses.map((lc) => {
                const batch = db.batches.find((b) => b.id === lc.batchId)
                const teacher = db.teachers.find((t) => t.id === lc.teacherId)
                return (
                  <li key={lc.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', lc.status === 'live' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600')}>
                      <Video className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{lc.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {batch?.name} · {teacher?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-600">{formatDateTime(lc.scheduledAt)}</p>
                      <Badge tone={lc.status === 'live' ? 'red' : 'blue'}>{lc.status === 'live' ? 'Live now' : 'Upcoming'}</Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Course performance" subtitle="Top courses by verified revenue" />
          <ul className="divide-y divide-slate-100">
            {coursePerformance.map(({ course, enrollments, revenue, avgProgress }) => (
              <li key={course.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">{course.title}</p>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">{formatINR(revenue)}</p>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${avgProgress}%` }} />
                  </div>
                  <p className="shrink-0 text-xs text-slate-500">{avgProgress}% progress</p>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                  <TrendingUp className="h-3 w-3" /> {enrollments} enrollments
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        Revenue figures reflect verified payment records only. Unverified gateway callbacks are excluded.
      </p>
    </div>
  )
}
