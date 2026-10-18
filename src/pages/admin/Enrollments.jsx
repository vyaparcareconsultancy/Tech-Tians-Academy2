import React, { useMemo, useState } from 'react'
import { Plus, UserCheck, X } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Modal, Select, PageHeader, useToast, EmptyState, IconButton, SearchInput, ConfirmDialog } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, formatINR, uid } from '../../lib/utils.js'
import { Avatar } from '../../components/ui.jsx'

export default function Enrollments() {
  const { db, insert, update, audit } = useData()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [courseFilter, setCourseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ studentId: '', courseId: '', batchId: '', source: 'direct' })
  const [errors, setErrors] = useState({})
  const [dropTarget, setDropTarget] = useState(null)

  const batchesForCourse = form.courseId ? db.batches.filter((b) => b.courseId === form.courseId) : []

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return db.enrollments.filter((e) => {
      const st = db.students.find((s) => s.id === e.studentId)
      const c = db.courses.find((x) => x.id === e.courseId)
      if (query && ![st?.name, st?.email, c?.title].filter(Boolean).join(' ').toLowerCase().includes(query)) return false
      if (courseFilter !== 'all' && e.courseId !== courseFilter) return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      return true
    })
  }, [db, q, courseFilter, statusFilter])

  const save = () => {
    const errs = validateFields(form, { studentId: [rules.required('Student')], courseId: [rules.required('Course')] })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const course = db.courses.find((c) => c.id === form.courseId)
    insert('enrollments', {
      studentId: form.studentId,
      courseId: form.courseId,
      batchId: form.batchId || null,
      enrolledAt: new Date().toISOString(),
      status: 'active',
      source: form.source,
      amountPaid: course?.price || 0,
      progressPct: 0,
    })
    if (form.batchId) {
      insert('batchStudents', { batchId: form.batchId, studentId: form.studentId, enrolledAt: new Date().toISOString(), status: 'active' })
    }
    const stName = db.students.find((s) => s.id === form.studentId)?.name
    audit('enrollment.created', 'enrollments', `Enrolled ${stName} in ${course?.title}`)
    toast.success(`Enrollment created for ${stName}.`)
    setAdding(false)
    setForm({ studentId: '', courseId: '', batchId: '', source: 'direct' })
  }

  const drop = () => {
    update('enrollments', dropTarget.id, { status: 'dropped' })
    audit('enrollment.dropped', 'enrollments', `Enrollment ${dropTarget.id} marked dropped`)
    toast.info('Enrollment dropped.')
    setDropTarget(null)
  }

  const columns = [
    { key: 'student', label: 'Student', sortable: true, render: (e) => {
      const s = db.students.find((x) => x.id === e.studentId)
      return s ? (
        <div className="flex items-center gap-2">
          <Avatar name={s.name} className="h-7 w-7 text-[10px]" />
          <div>
            <p className="font-medium text-slate-900">{s.name}</p>
            <p className="text-xs text-slate-500">{s.studentId}</p>
          </div>
        </div>
      ) : '—'
    }},
    { key: 'course', label: 'Course', sortable: true, render: (e) => db.courses.find((c) => c.id === e.courseId)?.title || '—' },
    { key: 'batch', label: 'Batch', render: (e) => e.batchId ? db.batches.find((b) => b.id === e.batchId)?.name : <span className="text-xs text-slate-400">Direct</span> },
    { key: 'enrolledAt', label: 'Enrolled', sortable: true, render: (e) => formatDate(e.enrolledAt) },
    { key: 'source', label: 'Source', render: (e) => <Badge tone={e.source === 'coupon' ? 'purple' : 'slate'}>{e.source}</Badge> },
    { key: 'amountPaid', label: 'Amount', sortable: true, render: (e) => formatINR(e.amountPaid) },
    { key: 'progressPct', label: 'Progress', sortable: true, render: (e) => `${e.progressPct || 0}%` },
    { key: 'status', label: 'Status', sortable: true, render: (e) => (
      <Badge tone={e.status === 'active' ? 'green' : e.status === 'completed' ? 'blue' : 'amber'}>{e.status}</Badge>
    )},
    { key: 'actions', label: '', render: (e) => (
      <div className="flex justify-end gap-1">
        {e.status === 'active' && (
          <IconButton title="Drop enrollment" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setDropTarget(e)}><X className="h-4 w-4" /></IconButton>
        )}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Enrollments" subtitle="Link students to courses and batches" actions={
        <Button icon={Plus} onClick={() => setAdding(true)}>Add enrollment</Button>
      } />

      <Card>
        <CardHeader title="All enrollments" subtitle="Direct and batch-based" actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Student or course…" className="w-56" />
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-52">
              <option value="all">All courses</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </Select>
          </div>
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No enrollments match the filters." />
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add enrollment" subtitle="Creates a batch membership when a batch is chosen">
        <div className="space-y-4">
          <Field label="Student" required error={errors.studentId}>
            <Select value={form.studentId} invalid={!!errors.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>
              <option value="">Select student</option>
              {db.students.filter((s) => s.status === 'active').map((s) => <option key={s.id} value={s.id}>{s.name} — {s.studentId}</option>)}
            </Select>
          </Field>
          <Field label="Course" required error={errors.courseId}>
            <Select value={form.courseId} invalid={!!errors.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value, batchId: '' })}>
              <option value="">Select course</option>
              {db.courses.filter((c) => c.status === 'published').map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <Field label="Batch (optional)">
            <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
              <option value="">No batch (direct)</option>
              {batchesForCourse.filter((b) => b.status === 'active').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
          <Field label="Source">
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="direct">Direct</option>
              <option value="coupon">Coupon</option>
              <option value="admin">Admin grant</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={save} icon={UserCheck}>Enroll student</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!dropTarget}
        onClose={() => setDropTarget(null)}
        onConfirm={drop}
        title="Drop enrollment?"
        message={`The student loses access to this course. Their progress history is retained.`}
        confirmLabel="Drop enrollment"
        danger
      />
    </div>
  )
}
