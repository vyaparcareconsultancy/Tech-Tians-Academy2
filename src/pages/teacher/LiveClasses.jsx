import React, { useMemo, useState } from 'react'
import { Plus, Video, Ban, CalendarClock } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, Tabs, EmptyState, ConfirmDialog, IconButton } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDateTime, daysFromNow } from '../../lib/utils.js'

export default function TeacherLiveClasses() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, update, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId || myCourseIds.includes(b.courseId))

  const [tab, setTab] = useState('upcoming')
  const [scheduling, setScheduling] = useState(null)
  const [errors, setErrors] = useState({})
  const [cancelTarget, setCancelTarget] = useState(null)

  const mine = db.liveClasses.filter((l) => l.teacherId === teacherId)
  const filtered = mine.filter((l) => l.status === tab)

  const openSchedule = (existing) => {
    setScheduling(existing
      ? { ...existing, mode: 'reschedule', date: existing.scheduledAt.slice(0, 10), time: existing.scheduledAt.slice(11, 16) }
      : { mode: 'create', title: '', courseId: myCourseIds[0] || '', batchId: '', date: daysFromNow(1).slice(0, 10), time: '17:00', durationMin: 60, meetingUrl: '' }
    )
    setErrors({})
  }

  const batchesForCourse = scheduling ? myBatches.filter((b) => b.courseId === scheduling.courseId) : []

  const save = () => {
    const errs = validateFields(scheduling, {
      title: [rules.required('Class title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
      batchId: [rules.required('Batch')],
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
      teacherId, scheduledAt, durationMin: Number(scheduling.durationMin), meetingUrl: scheduling.meetingUrl,
    }
    if (scheduling.mode === 'create') {
      insert('liveClasses', { ...payload, status: 'upcoming', createdBy: user.id, createdAt: new Date().toISOString() })
      audit('live_class.scheduled', 'live_classes', `Scheduled "${scheduling.title}"`)
      toast.success('Live class scheduled.')
    } else {
      update('liveClasses', scheduling.id, { ...payload })
      audit('live_class.rescheduled', 'live_classes', `Rescheduled "${scheduling.title}"`)
      toast.success('Class rescheduled.')
    }
    setScheduling(null)
  }

  const cancel = () => {
    update('liveClasses', cancelTarget.id, { status: 'cancelled' })
    audit('live_class.cancelled', 'live_classes', `Cancelled "${cancelTarget.title}"`)
    toast.info('Class cancelled. Students were notified (simulated).')
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
      <PageHeader title="Live Classes" subtitle="Schedule sessions for your batches" actions={
        <Button icon={Plus} onClick={() => openSchedule()}>Schedule class</Button>
      } />

      <Card>
        <CardHeader title="Your schedule" actions={
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'upcoming', label: 'Upcoming', count: mine.filter((l) => l.status === 'upcoming').length },
            { value: 'live', label: 'Live now', count: mine.filter((l) => l.status === 'live').length },
            { value: 'completed', label: 'Completed', count: mine.filter((l) => l.status === 'completed').length },
            { value: 'cancelled', label: 'Cancelled', count: mine.filter((l) => l.status === 'cancelled').length },
          ]} />
        } />
        {filtered.length === 0 ? (
          <EmptyState icon={Video} title={`No ${tab} classes`} message="Schedule a class to populate this list." />
        ) : (
          <DataTable columns={columns} data={filtered} emptyMessage="No classes in this view." />
        )}
      </Card>

      <Modal open={!!scheduling} onClose={() => setScheduling(null)} title={scheduling?.mode === 'create' ? 'Schedule live class' : 'Reschedule class'}>
        {scheduling && (
          <div className="space-y-4">
            <Field label="Class title" required error={errors.title}>
              <Input value={scheduling.title} invalid={!!errors.title} onChange={(e) => setScheduling({ ...scheduling, title: e.target.value })} placeholder="e.g. Unit Test Review" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course" required error={errors.courseId}>
                <Select value={scheduling.courseId} invalid={!!errors.courseId} onChange={(e) => setScheduling({ ...scheduling, courseId: e.target.value, batchId: '' })}>
                  {db.courses.filter((c) => myCourseIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </Field>
              <Field label="Batch" required error={errors.batchId}>
                <Select value={scheduling.batchId} invalid={!!errors.batchId} onChange={(e) => setScheduling({ ...scheduling, batchId: e.target.value })}>
                  <option value="">Select batch</option>
                  {batchesForCourse.filter((b) => b.status !== 'completed').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
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
            <Field label="Meeting URL" required error={errors.meetingUrl} hint="Externally hosted meeting links only">
              <Input value={scheduling.meetingUrl} invalid={!!errors.meetingUrl} onChange={(e) => setScheduling({ ...scheduling, meetingUrl: e.target.value })} placeholder="https://meet.example.com/…" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setScheduling(null)}>Cancel</Button>
              <Button onClick={save}>{scheduling.mode === 'create' ? 'Schedule class' : 'Save changes'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={cancel}
        title="Cancel this class?"
        message={`"${cancelTarget?.title}" will be marked cancelled and students notified.`}
        confirmLabel="Cancel class"
        danger
      />
    </div>
  )
}
