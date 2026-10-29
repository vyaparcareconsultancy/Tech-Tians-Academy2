import React, { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, BookOpen, Layers, UserCheck, IndianRupee, Clock, Video,
  ArrowUpRight, CheckCircle2, XCircle, CalendarDays, TrendingUp, AlertTriangle,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useData } from '../../lib/store.jsx'
import { reportsApi } from '../../lib/api/reports.js'
import { formatINR, formatDate, formatDateTime, monthKey, monthLabel, cx, timeAgo } from '../../lib/utils.js'
import { Card, CardHeader, StatCard, Badge, Avatar, Button, EmptyState, ProgressBar, useToast } from '../../components/ui.jsx'
import { chartColors, chartAxis, chartGrid, chartTooltip, ChartGradientDefs } from '../../lib/chartTheme.js'

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
  const { db, audit, update, isDemo } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [reportData, setReportData] = useState(null)

  useEffect(() => {
    if (isDemo) return
    let active = true
    async function loadReports() {
      try {
        const [kpis, monthly, perf] = await Promise.all([
          reportsApi.getAdminDashboardKpis(),
          reportsApi.getMonthlyMetrics(8),
          reportsApi.getCoursePerformance(),
        ])
        if (!active) return
        setReportData({ kpis, monthly, perf })
      } catch (err) {
        console.error('Failed to load dashboard KPIs:', err)
      }
    }
    loadReports()
    return () => { active = false }
  }, [isDemo, db])

  const stats = useMemo(() => {
    if (reportData?.kpis) {
      const growth = (reportData.monthly || []).map((m) => ({
        m: m.monthLabel,
        enrollments: Number(m.enrollments) || 0,
      }))
      const revenue = (reportData.monthly || []).map((m) => ({
        m: m.monthLabel,
        revenue: Number(m.revenue) || 0,
      }))
      const upcoming = db.liveClasses.filter((l) => l.status === 'upcoming' || l.status === 'live')
      const pendingTeachers = db.teachers.filter((t) => t.status === 'pending')
      return {
        totalStudents: Number(reportData.kpis.totalStudents) || 0,
        totalTeachers: Number(reportData.kpis.totalTeachers) || 0,
        totalCourses: Number(reportData.kpis.totalCourses) || 0,
        activeBatches: Number(reportData.kpis.activeBatches) || 0,
        totalEnrollments: Number(reportData.kpis.totalEnrollments) || 0,
        totalRevenue: Number(reportData.kpis.totalRevenue) || 0,
        pendingCount: Number(reportData.kpis.pendingCount) || 0,
        upcomingCount: Number(reportData.kpis.upcomingCount) || 0,
        growth,
        revenue,
        revDelta: Number(reportData.kpis.revDelta) || 0,
        pendingTeachers,
        upcoming,
      }
    }

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
  }, [db, reportData])

  const recentStudents = [...db.students].sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt)).slice(0, 6)
  const recentPayments = [...db.orders].filter((o) => o.status === 'paid').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6)
  const upcomingClasses = [...stats.upcoming].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5)

  const coursePerformance = useMemo(() => {
    if (reportData?.perf?.length) {
      return reportData.perf.slice(0, 6).map((p) => {
        const c = db.courses.find((x) => x.id === p.courseId) || { id: p.courseId, title: p.title, coverIndex: 0 }
        return {
          course: c,
          enrollments: Number(p.enrollmentsCount) || 0,
          revenue: Number(p.totalRevenue) || 0,
          avgProgress: Number(p.avgProgress) || 0,
        }
      })
    }
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
  }, [db, reportData])

  const approveTeacher = async (t) => {
    try {
      await update('teachers', t.id, { status: 'active', approvedAt: new Date().toISOString() })
      await audit('teacher.approved', 'teachers', `Approved teacher application of ${t.name}`)
      toast.success(`Approved teacher application of ${t.name}`)
    } catch (err) {
      toast.error(err.message || 'Failed to approve teacher')
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white sm:text-3xl">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-muted">Overview of academy performance · updated just now</p>
        </div>
        <Badge tone={isDemo ? 'gold' : 'brand'} live={isDemo} className="px-3 py-1">
          {isDemo ? 'Sample data — demo mode' : 'Live database mode'}
        </Badge>
      </div>

      {/* KPI cards separated by spacing */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents} tone="brand" delta="+3 this week" />
        <StatCard icon={GraduationCap} label="Total Teachers" value={stats.totalTeachers} tone="brand" delta={`${stats.pendingCount} pending approval`} />
        <StatCard icon={BookOpen} label="Total Courses" value={stats.totalCourses} tone="gold" delta={`${db.courses.filter((c) => c.status === 'published').length} published`} />
        <StatCard icon={Layers} label="Active Batches" value={stats.activeBatches} tone="brand" delta={`${db.batches.length} total`} />
        <StatCard icon={UserCheck} label="Total Enrollments" value={stats.totalEnrollments} tone="gold" delta="+8% MoM" />
        <StatCard icon={IndianRupee} label="Revenue (verified)" value={formatINR(stats.totalRevenue)} tone="gold" delta={`${stats.revDelta >= 0 ? '+' : ''}${stats.revDelta}% vs last month`} deltaUp={stats.revDelta >= 0} />
        <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingCount} tone="rose" delta={stats.pendingCount ? 'Needs review' : 'All clear'} deltaUp={stats.pendingCount === 0} />
        <StatCard icon={Video} label="Upcoming Live Classes" value={stats.upcomingCount} tone="brand" delta="Next 14 days" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Enrollment growth" subtitle="New orders per month (last 8 months)" actions={<Badge tone="brand">Monthly</Badge>} />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.growth} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <ChartGradientDefs id="enrFill" from={chartColors.brand} to={chartColors.brandDeep} />
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="m" {...chartAxis} />
                <YAxis {...chartAxis} allowDecimals={false} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="enrollments" stroke={chartColors.brand} strokeWidth={2.5} fill="url(#enrFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Revenue" subtitle="Verified payments per month" actions={<Badge tone="gold">₹ INR</Badge>} />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenue} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="m" {...chartAxis} interval={1} />
                <YAxis {...chartAxis} width={44} tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)} />
                <Tooltip {...chartTooltip} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Bar dataKey="revenue" fill={chartColors.brand} radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Middle row: registrations + payments + approvals */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Recent registrations"
            subtitle="Newest student accounts"
            actions={
              <Link to="/admin/students" className="inline-flex items-center font-mono text-xs font-semibold text-brand transition hover:underline">
                View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-white/5">
            {recentStudents.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-white/5">
                <Avatar name={s.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.name}</p>
                  <p className="truncate font-mono text-xs text-muted">{s.studentId} · {s.grade}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs text-muted">{formatDate(s.enrolledAt)}</p>
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
            actions={
              <Link to="/admin/payments" className="inline-flex items-center font-mono text-xs font-semibold text-brand transition hover:underline">
                View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            }
          />
          <ul className="divide-y divide-white/5">
            {recentPayments.map((o) => {
              const st = db.students.find((s) => s.id === o.studentId)
              const c = db.courses.find((c) => c.id === o.courseId)
              return (
                <li key={o.id} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-white/5">
                  <Avatar name={st?.name || '?'} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{st?.name}</p>
                    <p className="truncate text-xs text-muted">{c?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-white">{formatINR(o.amount)}</p>
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
            <ul className="divide-y divide-white/5">
              {stats.pendingTeachers.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-white/5">
                  <Avatar name={t.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{t.name}</p>
                    <p className="truncate font-mono text-xs text-muted">{t.subject} · {timeAgo(t.appliedAt)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="primary" onClick={() => { approveTeacher(t); navigate('/admin/teachers') }}>
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
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Upcoming classes"
            subtitle="Scheduled live sessions"
            actions={
              <Link to="/admin/live-classes" className="inline-flex items-center font-mono text-xs font-semibold text-brand transition hover:underline">
                Manage <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            }
          />
          {upcomingClasses.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No classes scheduled" message="Schedule a live class to see it here." />
          ) : (
            <ul className="divide-y divide-white/5">
              {upcomingClasses.map((lc) => {
                const batch = db.batches.find((b) => b.id === lc.batchId)
                const teacher = db.teachers.find((t) => t.id === lc.teacherId)
                return (
                  <li key={lc.id} className="flex items-center gap-3 px-6 py-3.5 transition hover:bg-white/5">
                    <span className={cx(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                      lc.status === 'live'
                        ? 'border-rose-500/40 bg-rose-500/15 text-rose-400'
                        : 'border-brand/40 bg-brand/15 text-brand shadow-glow/10'
                    )}>
                      <Video className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{lc.title}</p>
                      <p className="truncate text-xs text-muted">
                        {batch?.name} · {teacher?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-muted">{formatDateTime(lc.scheduledAt)}</p>
                      <Badge tone={lc.status === 'live' ? 'red' : 'brand'} live={lc.status === 'live'}>
                        {lc.status === 'live' ? 'Live now' : 'Upcoming'}
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Course performance" subtitle="Top courses by verified revenue" />
          <ul className="divide-y divide-white/5">
            {coursePerformance.map(({ course, enrollments, revenue, avgProgress }) => (
              <li key={course.id} className="px-6 py-3.5 transition hover:bg-white/5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">{course.title}</p>
                  <p className="shrink-0 font-mono text-sm font-semibold text-white">{formatINR(revenue)}</p>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <ProgressBar value={avgProgress} className="flex-1" />
                  <p className="shrink-0 font-mono text-xs text-muted">{avgProgress}%</p>
                </div>
                <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-muted">
                  <TrendingUp className="h-3 w-3 text-brand" /> {enrollments} enrollments
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Security footer disclaimer */}
      <p className="flex items-center gap-2 font-mono text-xs text-muted">
        <AlertTriangle className="h-3.5 w-3.5 text-gold" />
        Revenue figures reflect verified payment records only. Unverified gateway callbacks are excluded.
      </p>
    </div>
  )
}
