import React, { useMemo, useState } from 'react'
import { CheckCheck, X, Save, CalendarCheck } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Select, PageHeader, useToast, EmptyState, Input, ProgressBar } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { uid, cx } from '../../lib/utils.js'

export default function Attendance() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId || myCourseIds.includes(b.courseId))
  const activeBatches = myBatches.filter((b) => b.status === 'active')

  const [batchId, setBatchId] = useState(activeBatches[0]?.id || '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [marks, setMarks] = useState({})
  const [saved, setSaved] = useState(false)

  const students = useMemo(() => {
    const ids = db.batchStudents.filter((bs) => bs.batchId === batchId).map((bs) => bs.studentId)
    return db.students.filter((s) => ids.includes(s.id))
  }, [db, batchId])

  const existing = useMemo(() => {
    const map = {}
    db.attendance.filter((a) => a.batchId === batchId && a.date === date).forEach((a) => { map[a.studentId] = a.status })
    return map
  }, [db, batchId, date])

  const effective = { ...existing, ...marks }

  const markAll = (status) => {
    const next = {}
    students.forEach((s) => { next[s.id] = status })
    setMarks(next)
  }

  const save = () => {
    Object.entries(effective).forEach(([studentId, status]) => {
      const existingRecord = db.attendance.find((a) => a.batchId === batchId && a.date === date && a.studentId === studentId)
      if (existingRecord) {
        // reuse update via store
        updateAttendance(existingRecord, status)
      } else {
        insert('attendance', { batchId, studentId, date, status })
      }
    })
    audit('attendance.marked', 'attendance', `Marked attendance for ${batchId} on ${date}`)
    toast.success(`Attendance saved for ${students.length} students.`)
    setMarks({})
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const { update } = useData()
  const updateAttendance = (record, status) => update('attendance', record.id, { status })

  // summary over the last 14 days
  const days = useMemo(() => {
    const arr = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      arr.push(d.toISOString().slice(0, 10))
    }
    return arr
  }, [])

  const summary = students.map((s) => {
    const records = db.attendance.filter((a) => a.batchId === batchId && a.studentId === s.id && days.includes(a.date))
    const present = records.filter((r) => r.status === 'present').length
    return { student: s, total: records.length, present, pct: records.length ? Math.round((present / records.length) * 100) : null }
  })

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Mark daily attendance for your batches" />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3 px-5 py-4">
          <div className="w-64">
            <label className="label-base">Batch</label>
            <Select value={batchId} onChange={(e) => { setBatchId(e.target.value); setMarks({}) }}>
              {activeBatches.length === 0 && <option value="">No active batches</option>}
              {activeBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="w-48">
            <label className="label-base">Date</label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setMarks({}) }} />
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => markAll('present')}>All present</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => markAll('absent')}>All absent</Button>
            <Button size="sm" icon={Save} onClick={save} disabled={students.length === 0}>Save attendance</Button>
          </div>
        </div>
        {saved && <p className="px-5 pb-3 text-xs text-emerald-600">Saved ✓</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Mark attendance" subtitle={batchId ? `${db.batches.find((b) => b.id === batchId)?.name} · ${date}` : 'Select a batch'} />
          {students.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No students" message="Select an active batch to mark attendance." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {students.map((s) => {
                const status = effective[s.id] || 'present'
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
                      {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.studentId}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setMarks({ ...marks, [s.id]: 'present' })}
                        className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', status === 'present' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => setMarks({ ...marks, [s.id]: 'absent' })}
                        className={cx('rounded-lg px-3 py-1.5 text-sm font-medium transition', status === 'absent' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}
                      >
                        Absent
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="14-day summary" subtitle="Attendance percentage per student" />
          {summary.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No data" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.map(({ student, total, present, pct }) => (
                <li key={student.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">{present}/{total} days present</p>
                  </div>
                  <div className="flex w-32 items-center gap-2">
                    <ProgressBar value={pct ?? 0} tone={pct == null ? 'slate' : pct >= 75 ? 'emerald' : pct >= 50 ? 'amber' : 'rose'} className="flex-1" />
                    <span className="w-10 text-right text-xs text-slate-500">{pct == null ? '—' : `${pct}%`}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
