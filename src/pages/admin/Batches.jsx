import React, { useMemo, useState } from 'react'
import { Plus, Eye, Pencil, Users, CalendarDays, DoorOpen } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, IconButton, EmptyState, SearchInput, Tabs } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, daysFromNow, cx } from '../../lib/utils.js'

export default function Batches() {
  const { db, insert, update, audit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [viewBatch, setViewBatch] = useState(null)

  const counts = useMemo(() => ({
    all: db.batches.length,
    active: db.batches.filter((b) => b.status === 'active').length,
    upcoming: db.batches.filter((b) => b.status === 'upcoming').length,
    completed: db.batches.filter((b) => b.status === 'completed').length,
  }), [db])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return db.batches.filter((b) => {
      const course = db.courses.find((c) => c.id === b.courseId)
      if (query && ![b.name, course?.title, b.schedule].join(' ').toLowerCase().includes(query)) return false
      if (tab !== 'all' && b.status !== tab) return false
      return true
    })
  }, [db, q, tab])

  const enrolledCount = (batchId) => db.batchStudents.filter((bs) => bs.batchId === batchId).length

  const openNew = () => {
    setEdit({
      name: '', courseId: db.courses[0]?.id || '', teacherId: '',
      startDate: daysFromNow(7).slice(0, 10), endDate: daysFromNow(375).slice(0, 10),
      capacity: 40, schedule: 'Mon–Sat, 5:00 PM', status: 'upcoming', fee: 0,
    })
    setErrors({})
  }

  const save = () => {
    const errs = validateFields(edit, {
      name: [rules.required('Batch name'), rules.minLen(3)],
      courseId: [rules.required('Course')],
      startDate: [rules.required('Start date')],
      endDate: [rules.required('End date')],
      capacity: [rules.required('Capacity'), rules.number('Capacity')],
    })
    if (edit.startDate && edit.endDate && edit.endDate < edit.startDate) errs.endDate = 'End date must be after start date'
    setErrors(errs)
    if (Object.keys(errs).length) return
    const course = db.courses.find((c) => c.id === edit.courseId)
    const payload = { ...edit, fee: course?.price || 0, teacherId: edit.teacherId || course?.teacherId }
    if (edit.id) {
      update('batches', edit.id, payload)
      audit('batch.updated', 'batches', `Updated batch ${edit.name}`)
      toast.success(`Batch ${edit.name} updated.`)
    } else {
      insert('batches', payload)
      audit('batch.created', 'batches', `Created batch ${edit.name}`)
      toast.success(`Batch ${edit.name} created.`)
    }
    setEdit(null)
  }

  const setStatus = (batch, status) => {
    update('batches', batch.id, { status })
    audit('batch.status_changed', 'batches', `Batch ${batch.name} → ${status}`)
    toast.success(`Batch ${batch.name} is now ${status}.`)
  }

  const columns = [
    { key: 'name', label: 'Batch', sortable: true, render: (b) => (
      <div>
        <p className="font-medium text-slate-900">{b.name}</p>
        <p className="text-xs text-slate-500">{b.schedule}</p>
      </div>
    )},
    { key: 'course', label: 'Course', render: (b) => db.courses.find((c) => c.id === b.courseId)?.title || '—' },
    { key: 'teacher', label: 'Teacher', render: (b) => db.teachers.find((t) => t.id === b.teacherId)?.name || '—' },
    { key: 'dates', label: 'Duration', render: (b) => `${formatDate(b.startDate)} → ${formatDate(b.endDate)}` },
    { key: 'fill', label: 'Capacity', render: (b) => {
      const n = enrolledCount(b.id)
      const pct = Math.round((n / b.capacity) * 100)
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
            <div className={cx('h-full rounded-full', pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-slate-500">{n}/{b.capacity}</span>
        </div>
      )
    }},
    { key: 'status', label: 'Status', sortable: true, render: (b) => (
      <Badge tone={b.status === 'active' ? 'green' : b.status === 'upcoming' ? 'blue' : 'slate'}>{b.status}</Badge>
    )},
    { key: 'actions', label: '', render: (b) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View students" onClick={() => setViewBatch(b)}><Users className="h-4 w-4" /></IconButton>
        <IconButton title="Edit" onClick={() => { setEdit({ ...b }); setErrors({}) }}><Pencil className="h-4 w-4" /></IconButton>
        {b.status !== 'completed' && (
          <IconButton title="Mark completed" onClick={() => setStatus(b, 'completed')}><DoorOpen className="h-4 w-4" /></IconButton>
        )}
        {b.status === 'upcoming' && (
          <IconButton title="Activate now" onClick={() => setStatus(b, 'active')}><CalendarDays className="h-4 w-4" /></IconButton>
        )}
      </div>
    )},
  ]

  const view = viewBatch && db.batches.find((b) => b.id === viewBatch.id)
  const viewStudents = view ? db.batchStudents.filter((bs) => bs.batchId === view.id).map((bs) => ({ bs, student: db.students.find((s) => s.id === bs.studentId) })).filter((x) => x.student) : []

  return (
    <div>
      <PageHeader title="Batches" subtitle="Group students into cohorts per course" actions={
        <Button icon={Plus} onClick={openNew}>New batch</Button>
      } />

      <Card>
        <CardHeader title="All batches" subtitle="Capacity, schedule and lifecycle" actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search batches…" className="w-56" />
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'active', label: 'Active', count: counts.active },
              { value: 'upcoming', label: 'Upcoming', count: counts.upcoming },
              { value: 'completed', label: 'Completed', count: counts.completed },
            ]} />
          </div>
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No batches match the filters." />
      </Card>

      {/* Students in batch */}
      <Modal open={!!view} onClose={() => setViewBatch(null)} title={`Students — ${view?.name}`} subtitle={`${viewStudents.length} enrolled`} wide>
        <DataTable
          pageSize={10}
          columns={[
            { key: 'name', label: 'Student', render: ({ student }) => (
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-700">{student.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>
                <span className="font-medium text-slate-800">{student.name}</span>
              </div>
            )},
            { key: 'studentId', label: 'ID', render: ({ student }) => student.studentId },
            { key: 'grade', label: 'Class', render: ({ student }) => student.grade },
            { key: 'status', label: 'Status', render: ({ student }) => <Badge tone={student.status === 'active' ? 'green' : 'red'}>{student.status}</Badge> },
            { key: 'enrolledAt', label: 'Enrolled', render: ({ bs }) => formatDate(bs.enrolledAt) },
          ]}
          data={viewStudents}
          emptyMessage="No students enrolled yet."
        />
      </Modal>

      {/* Create / edit */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit batch' : 'Create batch'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Batch name" required error={errors.name}>
              <Input value={edit.name} invalid={!!errors.name} onChange={(e) => setEdit({ ...edit, name: e.target.value.toUpperCase() })} placeholder="e.g. JEE-PHY-2027-C1" />
            </Field>
            <Field label="Course" required error={errors.courseId}>
              <Select value={edit.courseId} invalid={!!errors.courseId} onChange={(e) => {
                const c = db.courses.find((x) => x.id === e.target.value)
                setEdit({ ...edit, courseId: e.target.value, teacherId: c?.teacherId || '', fee: c?.price || 0 })
              }}>
                {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
            <Field label="Class teacher" hint="Defaults to the course's primary teacher">
              <Select value={edit.teacherId} onChange={(e) => setEdit({ ...edit, teacherId: e.target.value })}>
                <option value="">— Default (course teacher) —</option>
                {db.teachers.filter((t) => t.status === 'active').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start date" required error={errors.startDate}>
                <Input type="date" value={edit.startDate} invalid={!!errors.startDate} onChange={(e) => setEdit({ ...edit, startDate: e.target.value })} />
              </Field>
              <Field label="End date" required error={errors.endDate}>
                <Input type="date" value={edit.endDate} invalid={!!errors.endDate} onChange={(e) => setEdit({ ...edit, endDate: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Capacity" required error={errors.capacity}>
                <Input type="number" min="1" value={edit.capacity} invalid={!!errors.capacity} onChange={(e) => setEdit({ ...edit, capacity: e.target.value })} />
              </Field>
              <Field label="Schedule">
                <Input value={edit.schedule} onChange={(e) => setEdit({ ...edit, schedule: e.target.value })} />
              </Field>
            </div>
            <Field label="Status">
              <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save}>Save batch</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
