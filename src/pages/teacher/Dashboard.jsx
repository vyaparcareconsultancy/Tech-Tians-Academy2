import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Users, Layers, Video, ClipboardList,
  CalendarDays, Activity, Clock,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { Card, CardHeader, StatCard, Badge, Avatar, EmptyState } from '../../components/ui.jsx'
import { formatDateTime, timeAgo, cx } from '../../lib/utils.js'
import { chartColors, chartAxis, chartGrid, chartTooltip, ChartGradientDefs } from '../../lib/chartTheme.js'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const { db, teacherIdForUser } = useData()
  const teacherId = teacherIdForUser(user.id)
  const teacher = db.teachers.find((t) => t.id === teacherId)
  const myCourses = db.courses.filter((c) => db.teacherCourses.some((tc) => tc.teacherId === teacherId && tc.courseId === c.id))
  const myCourseIds = myCourses.map((c) => c.id)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId)

  const myStudents = useMemo(() => {
    const ids = new Set(db.enrollments.filter((e) => myCourseIds.includes(e.courseId)).map((e) => e.studentId))
    return db.students.filter((s) => ids.has(s.id))
  }, [db, myCourseIds])

  const myClasses = db.liveClasses.filter((l) => l.teacherId === teacherId)
  const upcoming = myClasses.filter((l) => l.status === 'upcoming' || l.status === 'live').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const pendingSubs = db.submissions.filter((s) => {
    const a = db.assignments.find((x) => x.id === s.assignmentId)
    return a && myCourseIds.includes(a.courseId) && !s.graded
  })
  const pendingQuizAttempts = db.quizAttempts.filter((a) => {
    const qz = db.quizzes.find((x) => x.id === a.quizId)
    return qz && myCourseIds.includes(qz.courseId)
  })

  const enrollmentSeries = useMemo(() => {
    return myCourses.map((c) => ({
      name: c.title.length > 18 ? c.title.slice(0, 18) + '…' : c.title,
      students: db.enrollments.filter((e) => e.courseId === c.id).length,
    }))
  }, [db, myCourses])

  const performanceSeries = useMemo(() => myCourses.map((c) => {
    const enrs = db.enrollments.filter((e) => e.courseId === c.id)
    const avg = enrs.length ? Math.round(enrs.reduce((s, e) => s + (e.progressPct || 0), 0) / enrs.length) : 0
    return { name: c.title.length > 18 ? c.title.slice(0, 18) + '…' : c.title, progress: avg }
  }), [db, myCourses])

  const recentSubmissions = [...db.submissions]
    .filter((s) => db.assignments.some((a) => a.id === s.assignmentId && myCourseIds.includes(a.courseId)))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .slice(0, 6)

  const recentActivity = db.auditLogs.filter((l) => l.actorId === user.id || l.actorName.includes(teacher?.name?.split(' ')[1] || 'Meera')).slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Teacher Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">Welcome back, {teacher?.name?.split(' ')[0]} · scoped to your assigned courses</p>
        </div>
        <Badge tone="amber" className="px-2.5 py-1">Sample data — demo mode</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={BookOpen} label="Assigned courses" value={myCourses.length} tone="brand" />
        <StatCard icon={Users} label="Enrolled students" value={myStudents.length} tone="gold" />
        <StatCard icon={Layers} label="Active batches" value={myBatches.filter((b) => b.status === 'active').length} tone="brand" />
        <StatCard icon={Video} label="Upcoming classes" value={upcoming.length} tone="gold" delta={upcoming[0] ? `Next: ${formatDateTime(upcoming[0].scheduledAt)}` : undefined} />
        <StatCard icon={ClipboardList} label="To review" value={pendingSubs.length} tone="brand" delta={`${pendingQuizAttempts.length} quiz attempts`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Student enrollment" subtitle="Per assigned course" />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollmentSeries} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <ChartGradientDefs id="tEnr" from={chartColors.brand} to={chartColors.brandDeep} />
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="name" {...chartAxis} />
                <YAxis {...chartAxis} allowDecimals={false} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="students" stroke={chartColors.brand} strokeWidth={2.5} fill="url(#tEnr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Course performance" subtitle="Average student progress" />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceSeries} margin={{ top: 6, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="name" {...chartAxis} />
                <YAxis {...chartAxis} unit="%" width={40} />
                <Tooltip {...chartTooltip} formatter={(v) => [`${v}%`, 'Avg progress']} />
                <Bar dataKey="progress" fill={chartColors.brand} radius={[6, 6, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title="Upcoming classes" subtitle="Your schedule" actions={<Link to="/teacher/live-classes" className="font-mono text-xs text-brand hover:text-gold hover:underline">Manage</Link>} />
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No classes scheduled" />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 5).map((lc) => (
                <li key={lc.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-line/20">
                  <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', lc.status === 'live' ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-glow/20' : 'border-brand/30 bg-brand/10 text-brand')}>
                    <Video className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{lc.title}</p>
                    <p className="truncate text-xs text-muted">{db.batches.find((b) => b.id === lc.batchId)?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs text-muted">{formatDateTime(lc.scheduledAt)}</p>
                    <Badge tone={lc.status === 'live' ? 'red' : 'blue'}>{lc.status === 'live' ? 'Live' : 'Upcoming'}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent submissions" subtitle="Assignment work to review" actions={<Link to="/teacher/assignments" className="font-mono text-xs text-brand hover:text-gold hover:underline">Review</Link>} />
          {recentSubmissions.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Nothing to review" message="Submissions appear here when students turn in work." />
          ) : (
            <ul className="divide-y divide-line">
              {recentSubmissions.map((s) => {
                const st = db.students.find((x) => x.id === s.studentId)
                const a = db.assignments.find((x) => x.id === s.assignmentId)
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-line/20">
                    <Avatar name={st?.name || '?'} className="h-8 w-8 text-[11px]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{st?.name}</p>
                      <p className="truncate text-xs text-muted">{a?.title}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-muted">{timeAgo(s.submittedAt)}</p>
                      {s.graded ? <Badge tone="green">Graded</Badge> : <Badge tone="amber">To grade</Badge>}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" subtitle="Your actions" actions={<Activity className="h-4 w-4 text-muted" />} />
          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No recent activity" message="Your teaching actions will appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {recentActivity.map((log) => (
                <li key={log.id} className="px-5 py-3 transition hover:bg-line/20">
                  <p className="text-sm text-white/90">{log.details}</p>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-muted"><Clock className="h-3 w-3 text-brand" />{timeAgo(log.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

    </div>
  )
}
