import React, { useMemo, useState } from 'react'
import { CheckCheck, X, Save, CalendarCheck } from 'lucide-react'
import { Button, Card, CardHeader, Select, PageHeader, useToast, EmptyState, Input } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { cx } from '../../lib/utils.js'

export default function Attendance() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, update, audit } = useData()
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

  const save = async () => {
    try {
      const ops = Object.entries(effective).map(async ([studentId, status]) => {
        const existingRecord = db.attendance.find((a) => a.batchId === batchId && a.date === date && a.studentId === studentId)
        if (existingRecord) {
          return update('attendance', existingRecord.id, { status })
        } else {
          return insert('attendance', { batchId, studentId, date, status })
        }
      })
      await Promise.all(ops)
      await audit('attendance.marked', 'attendance', `Marked attendance for ${batchId} on ${date}`)
      toast.success(`Attendance saved for ${students.length} students.`)
      setMarks({})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance')
    }
  }

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
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted">Batch</label>
            <Select value={batchId} onChange={(e) => { setBatchId(e.target.value); setMarks({}) }}>
              {activeBatches.length === 0 && <option value="">No active batches</option>}
              {activeBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
          <div className="w-48">
            <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted">Date</label>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setMarks({}) }} />
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="secondary" icon={CheckCheck} onClick={() => markAll('present')}>All present</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => markAll('absent')}>All absent</Button>
            <Button size="sm" icon={Save} onClick={save} disabled={students.length === 0}>Save attendance</Button>
          </div>
        </div>
        {saved && <p className="px-5 pb-3 font-mono text-xs text-emerald-400">Saved ✓</p>}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Mark attendance" subtitle={batchId ? `${db.batches.find((b) => b.id === batchId)?.name} · ${date}` : 'Select a batch'} />
          {students.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No students" message="Select an active batch to mark attendance." />
          ) : (
            <ul className="divide-y divide-line">
              {students.map((s) => {
                const status = effective[s.id] || 'present'
                return (
                  <li key={s.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-line/10">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-xs font-semibold text-brand">
                      {s.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{s.name}</p>
                      <p className="font-mono text-xs text-muted">{s.studentId}</p>
                    </div>
                    {/* Pill toggle (gold present, muted absent) */}
                    <div className="inline-flex rounded-full border border-line bg-void/60 p-0.5">
                      <button
                        type="button"
                        onClick={() => setMarks({ ...marks, [s.id]: 'present' })}
                        className={cx(
                          'rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition',
                          status === 'present'
                            ? 'bg-gold text-black shadow-glow-gold'
                            : 'text-muted hover:text-white'
                        )}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarks({ ...marks, [s.id]: 'absent' })}
                        className={cx(
                          'rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition',
                          status === 'absent'
                            ? 'bg-line text-muted border border-white/10'
                            : 'text-muted/60 hover:text-muted'
                        )}
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
          <CardHeader title="14-day summary" subtitle="Orange heat grid indicates past attendance" />
          {summary.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No data" />
          ) : (
            <ul className="divide-y divide-line">
              {summary.map(({ student, total, present, pct }) => (
                <li key={student.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-line/10">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{student.name}</p>
                    <p className="font-mono text-xs text-muted">{present}/{total} days present</p>
                  </div>
                  {/* Small heat grid in orange intensities */}
                  <div className="flex items-center gap-1" title="14-day ledger">
                    {days.map((d) => {
                      const rec = db.attendance.find((a) => a.batchId === batchId && a.studentId === student.id && a.date === d)
                      let color = 'bg-line/40 border border-white/5'
                      if (rec?.status === 'present') color = 'bg-brand border border-brand/50 shadow-glow/20'
                      else if (rec?.status === 'absent') color = 'bg-brand-deep/30 border border-brand-deep/40'
                      return (
                        <span
                          key={d}
                          title={`${d}: ${rec ? rec.status : 'No record'}`}
                          className={cx('h-4 w-2.5 rounded-sm transition', color)}
                        />
                      )
                    })}
                  </div>
                  <span className="w-12 text-right font-mono text-xs font-semibold text-white">
                    {pct == null ? '—' : `${pct}%`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
