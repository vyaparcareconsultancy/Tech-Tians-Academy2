import React, { useMemo, useState } from 'react'
import { X, TrendingUp, Lock } from 'lucide-react'
import { Avatar, Badge, Card, CardHeader, IconButton, PageHeader, ProgressBar, SearchInput, Select } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { timeAgo } from '../../lib/utils.js'

export default function StudentProgress() {
  const { user } = useAuth()
  const { db, teacherIdForUser } = useData()
  const teacherId = teacherIdForUser(user.id)
  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId)

  const [q, setQ] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [viewStudent, setViewStudent] = useState(null)

  const myStudents = useMemo(() => {
    const ids = new Set()
    db.enrollments.filter((e) => myCourseIds.includes(e.courseId)).forEach((e) => ids.add(e.studentId))
    db.batchStudents.filter((bs) => myBatches.some((b) => b.id === bs.batchId)).forEach((bs) => ids.add(bs.studentId))
    return db.students.filter((s) => ids.has(s.id))
  }, [db, myCourseIds, myBatches])

  const filtered = myStudents.filter((s) => {
    const query = q.trim().toLowerCase()
    if (query && ![s.name, s.email, s.studentId].join(' ').toLowerCase().includes(query)) return false
    if (courseFilter !== 'all' && !db.enrollments.some((e) => e.studentId === s.id && e.courseId === courseFilter)) return false
    return true
  })

  const statsFor = (s) => {
    const enrs = db.enrollments.filter((e) => e.studentId === s.id && myCourseIds.includes(e.courseId))
    const avg = enrs.length ? Math.round(enrs.reduce((sum, e) => sum + (e.progressPct || 0), 0) / enrs.length) : 0
    const attempts = db.quizAttempts.filter((a) => a.studentId === s.id && db.quizzes.some((qz) => qz.id === a.quizId && myCourseIds.includes(qz.courseId)))
    const quizAvg = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / attempts.length) : null
    const attRecords = db.attendance.filter((a) => a.studentId === s.id && myBatches.some((b) => b.id === a.batchId))
    const attPct = attRecords.length ? Math.round((attRecords.filter((a) => a.status === 'present').length / attRecords.length) * 100) : null
    return { enrs, avg, quizAvg, attPct }
  }

  const columns = [
    { key: 'name', label: 'Student', sortable: true, render: (s) => (
      <div className="flex items-center gap-3">
        <Avatar name={s.name} />
        <div>
          <p className="font-medium text-white">{s.name}</p>
          <p className="font-mono text-xs text-muted">{s.studentId}</p>
        </div>
      </div>
    )},
    { key: 'grade', label: 'Class', render: (s) => <span className="font-mono text-xs">{s.grade}</span> },
    { key: 'progress', label: 'Avg progress', sortable: true, render: (s) => {
      const { avg } = statsFor(s)
      return (
        <div className="flex w-32 items-center gap-2">
          <ProgressBar value={avg} tone="brand" className="w-20" />
          <span className="font-mono text-xs text-muted">{avg}%</span>
        </div>
      )
    }},
    { key: 'quizAvg', label: 'Quiz avg', sortable: true, render: (s) => statsFor(s).quizAvg != null ? <span className="font-mono">{statsFor(s).quizAvg}%</span> : <span className="font-mono text-xs text-muted">—</span> },
    { key: 'attPct', label: 'Attendance', sortable: true, render: (s) => statsFor(s).attPct != null ? <span className="font-mono">{statsFor(s).attPct}%</span> : <span className="font-mono text-xs text-muted">—</span> },
    { key: 'lastActiveAt', label: 'Last active', sortable: true, render: (s) => <span className="font-mono text-xs text-muted">{timeAgo(s.lastActiveAt)}</span> },
    { key: 'actions', label: '', render: (s) => (
      <div className="flex justify-end"><IconButton title="View detail" onClick={() => setViewStudent(s)}><TrendingUp className="h-4 w-4" /></IconButton></div>
    )},
  ]

  const drawer = viewStudent && db.students.find((s) => s.id === viewStudent.id)
  const drawerStats = drawer ? statsFor(drawer) : null

  return (
    <div>
      <PageHeader title="Student Progress" subtitle="Performance across your courses" />

      <Card>
        <CardHeader title={`Students (${filtered.length})`} actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search students…" className="w-52" />
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-56">
              <option value="all">All my courses</option>
              {db.courses.filter((c) => myCourseIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
        } />
        <DataTable columns={columns} data={filtered} onRowClick={(s) => setViewStudent(s)} emptyMessage="No students match the filters." />
      </Card>

      {drawer && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewStudent(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-surface/95 backdrop-blur-xl shadow-glow/10">
            <div className="flex items-start justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={drawer.name} className="h-11 w-11" />
                <div>
                  <h2 className="font-heading text-lg font-semibold text-white">{drawer.name}</h2>
                  <p className="font-mono text-xs text-muted">{drawer.studentId} · {drawer.grade}</p>
                </div>
              </div>
              <IconButton onClick={() => setViewStudent(null)}><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <h3 className="text-sm font-semibold text-white">Progress in your courses</h3>
              <div className="mt-3 space-y-3">
                {drawerStats.enrs.length === 0 && <p className="text-sm text-muted">No enrollments in your courses.</p>}
                {drawerStats.enrs.map((e) => {
                  const c = db.courses.find((x) => x.id === e.courseId)
                  const done = db.lessonProgress.filter((lp) => lp.studentId === drawer.id && lp.courseId === c.id && lp.status === 'completed').length
                  const total = db.lessons.filter((l) => l.courseId === c.id).length
                  return (
                    <div key={e.id} className="rounded-xl border border-line bg-surface/60 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-white">{c?.title}</p>
                        <span className="font-mono text-xs text-brand">{e.progressPct || 0}%</span>
                      </div>
                      <ProgressBar value={e.progressPct || 0} tone="brand" className="mt-2" />
                      <p className="mt-2 font-mono text-xs text-muted">{done}/{total} lessons completed</p>
                      <ul className="mt-2 space-y-1">
                        {db.lessonProgress.filter((lp) => lp.studentId === drawer.id && lp.courseId === c.id).slice(0, 6).map((lp) => {
                          const lesson = db.lessons.find((l) => l.id === lp.lessonId)
                          return (
                            <li key={lp.id} className="flex items-center gap-2 text-xs text-muted">
                              <span className={`h-1.5 w-1.5 rounded-full ${lp.status === 'completed' ? 'bg-emerald-500' : 'bg-gold'}`} />
                              <span className="truncate">{lesson?.title}</span>
                              <Badge tone={lp.status === 'completed' ? 'green' : 'amber'} className="ml-auto">{lp.status.replace('_', ' ')}</Badge>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-void/50 p-3 text-xs text-muted">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                Only learning progress within your courses is visible. Payments, personal contact data and other teachers' records are restricted.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
