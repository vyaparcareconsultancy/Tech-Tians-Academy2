import React, { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Eye, Lock } from 'lucide-react'
import { Card, CardHeader, Avatar, ProgressBar, Select, PageHeader, SearchInput, IconButton } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { timeAgo } from '../../lib/utils.js'

export default function MyStudents() {
  const { user } = useAuth()
  const { db, teacherIdForUser } = useData()
  const [params] = useSearchParams()
  const teacherId = teacherIdForUser(user.id)
  const [q, setQ] = useState(params.get('q') || '')
  const [courseFilter, setCourseFilter] = useState('all')
  const [viewStudent, setViewStudent] = useState(null)

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myBatches = db.batches.filter((b) => db.teacherCourses.some((tc) => tc.teacherId === teacherId && tc.courseId === b.courseId) || b.teacherId === teacherId)

  const myStudents = useMemo(() => {
    const ids = new Set()
    db.enrollments.filter((e) => myCourseIds.includes(e.courseId)).forEach((e) => ids.add(e.studentId))
    db.batchStudents.filter((bs) => myBatches.some((b) => b.id === bs.batchId)).forEach((bs) => ids.add(bs.studentId))
    return db.students.filter((s) => ids.has(s.id))
  }, [db, myCourseIds, myBatches])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return myStudents.filter((s) => {
      if (query && ![s.name, s.email, s.studentId].join(' ').toLowerCase().includes(query)) return false
      if (courseFilter !== 'all' && !db.enrollments.some((e) => e.studentId === s.id && e.courseId === courseFilter)) return false
      return true
    })
  }, [myStudents, db, q, courseFilter])

  const statsFor = (s) => {
    const enrs = db.enrollments.filter((e) => e.studentId === s.id && myCourseIds.includes(e.courseId))
    const avg = enrs.length ? Math.round(enrs.reduce((sum, e) => sum + (e.progressPct || 0), 0) / enrs.length) : 0
    const attempts = db.quizAttempts.filter((a) => a.studentId === s.id && db.quizzes.some((qz) => qz.id === a.quizId && myCourseIds.includes(qz.courseId)))
    const quizAvg = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / attempts.length) : null
    return { enrs, avg, quizAvg }
  }

  const columns = [
    { key: 'name', label: 'Student', sortable: true, render: (s) => (
      <div className="flex items-center gap-3">
        <Avatar name={s.name} />
        <div>
          <p className="font-medium text-slate-900">{s.name}</p>
          <p className="text-xs text-slate-500">{s.studentId}</p>
        </div>
      </div>
    )},
    { key: 'grade', label: 'Class', sortable: true },
    { key: 'courses', label: 'My courses', render: (s) => <span>{statsFor(s).enrs.length}</span> },
    { key: 'progress', label: 'Avg progress', render: (s) => {
      const { avg } = statsFor(s)
      return avg ? <div className="flex w-28 items-center gap-2"><ProgressBar value={avg} className="w-16" /><span className="text-xs text-slate-500">{avg}%</span></div> : <span className="text-xs text-slate-400">—</span>
    }},
    { key: 'quizAvg', label: 'Quiz avg', sortable: true, render: (s) => statsFor(s).quizAvg != null ? `${statsFor(s).quizAvg}%` : <span className="text-xs text-slate-400">—</span> },
    { key: 'lastActiveAt', label: 'Last active', sortable: true, render: (s) => timeAgo(s.lastActiveAt) },
    { key: 'actions', label: '', render: (s) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View progress" onClick={() => setViewStudent(s)}><Eye className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  const drawer = viewStudent && db.students.find((s) => s.id === viewStudent.id)
  const drawerStats = drawer ? statsFor(drawer) : null

  return (
    <div>
      <PageHeader title="My Students" subtitle="Only students in your assigned courses and batches" />

      <Card>
        <CardHeader title={`Students (${filtered.length})`} actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search name, email or ID…" className="w-56" />
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-56">
              <option value="all">All my courses</option>
              {db.courses.filter((c) => myCourseIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </div>
        } />
        <DataTable columns={columns} data={filtered} onRowClick={(s) => setViewStudent(s)} emptyMessage="No students match the filters." />
      </Card>

      {/* Permitted info drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-navy-950/40" onClick={() => setViewStudent(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-pop">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={drawer.name} className="h-11 w-11" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{drawer.name}</h2>
                  <p className="text-sm text-slate-500">{drawer.studentId} · {drawer.grade}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <h3 className="text-sm font-semibold text-slate-900">Progress in my courses</h3>
              <div className="mt-3 space-y-3">
                {drawerStats.enrs.length === 0 && <p className="text-sm text-slate-400">Not enrolled in any of your courses.</p>}
                {drawerStats.enrs.map((e) => {
                  const c = db.courses.find((x) => x.id === e.courseId)
                  return (
                    <div key={e.id} className="rounded-lg border border-slate-200 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800">{c?.title}</p>
                        <span className="text-xs text-slate-500">{e.progressPct || 0}%</span>
                      </div>
                      <ProgressBar value={e.progressPct || 0} className="mt-2" />
                      <p className="mt-2 text-xs text-slate-400">
                        {db.lessonProgress.filter((lp) => lp.studentId === drawer.id && lp.courseId === c.id && lp.status === 'completed').length} lessons completed
                      </p>
                    </div>
                  )
                })}
              </div>
              {drawerStats.quizAvg != null && (
                <div className="mt-4 rounded-lg bg-navy-50 p-3.5">
                  <p className="text-xs font-medium text-slate-500">Average quiz score in your courses</p>
                  <p className="mt-1 text-xl font-semibold text-navy-800">{drawerStats.quizAvg}%</p>
                </div>
              )}
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Contact details, payment records and activity outside your courses are restricted to the student's own account and platform administrators.
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
