import React, { useMemo, useState } from 'react'
import { Plus, CalendarClock, Ban, Video } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, Tabs, EmptyState, ConfirmDialog, IconButton } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDateTime, daysFromNow } from '../../lib/utils.js'

export default function LiveClasses() {
  const { db, insert, update, audit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('upcoming')
  const [scheduling, setScheduling] = useState(null) // { mode: 'create'|'reschedule', ... }
  const [errors, setErrors] = useState({})
  const [cancelTarget, setCancelTarget] = useState(null)

  const counts = useMemo(() => ({
    upcoming: db.liveClasses.filter((l) => l.status === 'upcoming').length,
    live: db.liveClasses.filter((l) => l.status === 'live').length,
    completed: db.liveClasses.filter((l) => l.status === 'completed').length,
    cancelled: db.liveClasses.filter((l) => l.status === 'cancelled').length,
  }), [db])

  const filtered = db.liveClasses.filter((l) => l.status === tab)

  const openSchedule = (existing) => {
    setScheduling(existing
      ? { ...existing, mode: 'reschedule', date: existing.scheduledAt.slice(0, 10), time: existing.scheduledAt.slice(11, 16) }
      : { mode: 'create', title: '', courseId: db.courses[0]?.id || '', batchId: '', teacherId: '', date: daysFromNow(1).slice(0, 10), time: '17:00', durationMin: 60, meetingUrl: '' }
    )
    setErrors({})
  }

  const batchesForCourse = scheduling ? db.batches.filter((b) => b.courseId === scheduling.courseId) : []
  const teachersForCourse = scheduling ? db.teachers.filter((t) =>
    t.status === 'active' && db.teacherCourses.some((tc) => tc.teacherId === t.id && tc.courseId === scheduling.courseId)) : []

  const save = () => {
    const errs = validateFields(scheduling, {
      title: [rules.required('Class title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
      batchId: [rules.required('Batch')],
      teacherId: [rules.required('Teacher')],
      date: [rules.required('Date')],
      time: [rules.required('Time')],
      durationMin: [rules.required('Duration'), rules.number('Duration')],
      meetingUrl: [rules.required('Meeting URL'), rules.url('Meeting URL')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const scheduledAt = new Date(`${scheduling.date}T${scheduling.time}:00`).toISOString()
    const payload = {
      title: scheduling.title, courseId: scheduling.courseId, batchId: scheduling.batchId,
      teacherId: scheduling.teacherId, scheduledAt, durationMin: Number(scheduling.durationMin),
      meetingUrl: scheduling.meetingUrl,
    }
    if (scheduling.mode === 'create') {
      insert('liveClasses', { ...payload, status: 'upcoming', createdBy: 'adm-001', createdAt: new Date().toISOString() })
      audit('live_class.scheduled', 'live_classes', `Scheduled "${scheduling.title}"`)
      toast.success('Live class scheduled.')
    } else {
      update('liveClasses', scheduling.id, { ...payload })
      audit('live_class.rescheduled', 'live_classes', `Rescheduled "${scheduling.title}" to ${formatDateTime(scheduledAt)}`)
      toast.success('Class rescheduled.')
    }
    setScheduling(null)
  }

  const cancel = () => {
    update('liveClasses', cancelTarget.id, { status: 'cancelled' })
    audit('live_class.cancelled', 'live_classes', `Cancelled "${cancelTarget.title}"`)
    toast.info(`Class "${cancelTarget.title}" cancelled. Students were notified (simulated).`)
    setCancelTarget(null)
  }

  const toneFor = { upcoming: 'blue', live: 'red', completed: 'slate', cancelled: 'amber' }

  const columns = [
    { key: 'title', label: 'Class', sortable: true, render: (l) => (
      <div>
        <p className="font-medium text-slate-900">{l.title}</p>
        <p className="text-xs text-slate-500">{db.batches.find((b) => b.id === l.batchId)?.name}</p>
      </div>
    )},
    { key: 'course', label: 'Course', render: (l) => db.courses.find((c) => c.id === l.courseId)?.title || '—' },
    { key: 'teacher', label: 'Teacher', render: (l) => db.teachers.find((t) => t.id === l.teacherId)?.name || '—' },
    { key: 'scheduledAt', label: 'Scheduled', sortable: true, render: (l) => formatDateTime(l.scheduledAt) },
    { key: 'durationMin', label: 'Duration', render: (l) => `${l.durationMin} min` },
    { key: 'status', label: 'Status', sortable: true, render: (l) => <Badge tone={toneFor[l.status]}>{l.status === 'live' ? '● Live now' : l.status}</Badge> },
    { key: 'actions', label: '', render: (l) => (
      <div className="flex justify-end gap-1">
        {(l.status === 'upcoming' || l.status === 'live') && (
          <>
            <IconButton title="Reschedule" onClick={() => openSchedule(l)}><CalendarClock className="h-4 w-4" /></IconButton>
            <IconButton title="Cancel class" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setCancelTarget(l)}><Ban className="h-4 w-4" /></IconButton>
          </>
        )}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Live Classes" subtitle="Schedule and manage live sessions" actions={
        <Button icon={Plus} onClick={() => openSchedule()}>Schedule class</Button>
      } />

      <Card>
        <CardHeader title="Class schedule" subtitle="Meeting links are external (e.g. Zoom / Google Meet)" actions={
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
            { value: 'live', label: 'Live now', count: counts.live },
            { value: 'completed', label: 'Completed', count: counts.completed },
            { value: 'cancelled', label: 'Cancelled', count: counts.cancelled },
          ]} />
        } />
        {filtered.length === 0 ? (
          <EmptyState icon={Video} title={`No ${tab} classes`} message="Schedule a class to populate this list." />
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage="No classes in this view." />
        )}
      </Card>

      {/* Schedule / reschedule */}
      <Modal open={!!scheduling} onClose={() => setScheduling(null)} title={scheduling?.mode === 'create' ? 'Schedule live class' : 'Reschedule class'} subtitle="Only assigned teachers and active batches are selectable">
        {scheduling && (
          <div className="space-y-4">
            <Field label="Class title" required error={errors.title}>
              <Input value={scheduling.title} invalid={!!errors.title} onChange={(e) => setScheduling({ ...scheduling, title: e.target.value })} placeholder="e.g. Wave Optics — Problem Solving Marathon" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course" required error={errors.courseId}>
                <Select value={scheduling.courseId} invalid={!!errors.courseId} onChange={(e) => setScheduling({ ...scheduling, courseId: e.target.value, batchId: '', teacherId: '' })}>
                  {db.courses.filter((c) => c.status === 'published').map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </Field>
              <Field label="Batch" required error={errors.batchId}>
                <Select value={scheduling.batchId} invalid={!!errors.batchId} onChange={(e) => setScheduling({ ...scheduling, batchId: e.target.value })}>
                  <option value="">Select batch</option>
                  {batchesForCourse.filter((b) => b.status !== 'completed').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Teacher" required error={errors.teacherId} hint="Only teachers assigned to the selected course">
              <Select value={scheduling.teacherId} invalid={!!errors.teacherId} onChange={(e) => setScheduling({ ...scheduling, teacherId: e.target.value })}>
                <option value="">Select teacher</option>
                {teachersForCourse.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Date" required error={errors.date}>
                <Input type="date" value={scheduling.date} invalid={!!errors.date} onChange={(e) => setScheduling({ ...scheduling, date: e.target.value })} />
              </Field>
              <Field label="Time" required error={errors.time}>
                <Input type="time" value={scheduling.time} invalid={!!errors.time} onChange={(e) => setScheduling({ ...scheduling, time: e.target.value })} />
              </Field>
              <Field label="Duration (min)" required error={errors.durationMin}>
                <Input type="number" min="15" step="15" value={scheduling.durationMin} invalid={!!errors.durationMin} onChange={(e) => setScheduling({ ...scheduling, durationMin: e.target.value })} />
              </Field>
            </div>
            <Field label="Meeting URL" required error={errors.meetingUrl} hint="Hosted externally — no video files are stored on this platform">
              <Input value={scheduling.meetingUrl} invalid={!!errors.meetingUrl} onChange={(e) => setScheduling({ ...scheduling, meetingUrl: e.target.value })} placeholder="https://meet.example.com/…" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setScheduling(null)}>Cancel</Button>
              <Button onClick={save} icon={scheduling.mode === 'create' ? Plus : CalendarClock}>
                {scheduling.mode === 'create' ? 'Schedule class' : 'Save changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancel}
        title="Cancel this class?"
        message={`"${cancelTarget?.title}" will be marked as cancelled and students will be notified. The original slot is released.`}
        confirmLabel="Cancel class"
        danger
      />
    </div>
  )
}
