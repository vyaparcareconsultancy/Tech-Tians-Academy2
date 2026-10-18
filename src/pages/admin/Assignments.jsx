import React, { useMemo, useState } from 'react'

function SubmissionRow({ sub, grading, db, onGrade }) {
  const [marks, setMarks] = useState(sub.marks ?? '')
  const [feedback, setFeedback] = useState(sub.feedback || '')
  const student = db.students.find((st) => st.id === sub.studentId)
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-white">{student?.name}</p>
        <Badge tone={sub.status === 'late' ? 'gold' : 'muted'}>{sub.status}</Badge>
        <span className="font-mono text-xs text-muted">{formatDate(sub.submittedAt)} · {sub.fileName}</span>
        {sub.published && <Badge tone="brand">visible</Badge>}
      </div>
      <div className="mt-2.5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted">Marks / <span className="font-mono">{grading.maxMarks}</span></label>
          <Input type="number" min="0" max={grading.maxMarks} value={marks} onChange={(e) => setMarks(e.target.value)} className="w-24" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-muted">Feedback</label>
          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comment for the student…" />
        </div>
        <Button size="sm" disabled={marks === '' || marks == null} onClick={() => onGrade(sub.id, marks, feedback)}>Save grade</Button>
      </div>
    </div>
  )
}
import { Plus, ClipboardList, Trash2, Eye, CheckSquare } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Textarea, PageHeader, useToast, Tabs, EmptyState, IconButton, ConfirmDialog } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, cx } from '../../lib/utils.js'

export default function Assignments() {
  const { db, insert, update, remove, audit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [grading, setGrading] = useState(null) // assignment
  const [deleteTarget, setDeleteTarget] = useState(null)

  const counts = useMemo(() => ({
    all: db.assignments.length,
    open: db.assignments.filter((a) => new Date(a.dueDate) > new Date()).length,
    closed: db.assignments.filter((a) => new Date(a.dueDate) <= new Date()).length,
  }), [db])

  const filtered = useMemo(() => db.assignments.filter((a) => {
    if (courseFilter !== 'all' && a.courseId !== courseFilter) return false
    if (tab === 'open' && new Date(a.dueDate) <= new Date()) return false
    if (tab === 'closed' && new Date(a.dueDate) > new Date()) return false
    return true
  }), [db, tab, courseFilter])

  const subsFor = (a) => db.submissions.filter((s) => s.assignmentId === a.id)

  const openNew = () => {
    const first = db.courses[0]
    setEdit({
      title: '', courseId: first?.id || '', batchId: '', teacherId: first?.teacherId || '',
      instructions: '', dueDate: '', maxMarks: 25, attachments: [], status: 'published', resultsPublished: false,
    })
    setErrors({})
  }

  const batchesForCourse = edit ? db.batches.filter((b) => b.courseId === edit.courseId) : []

  const save = () => {
    const errs = validateFields(edit, {
      title: [rules.required('Title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
      batchId: [rules.required('Batch')],
      instructions: [rules.required('Instructions')],
      dueDate: [rules.required('Due date')],
      maxMarks: [rules.required('Max marks'), rules.number('Max marks')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = { ...edit, maxMarks: Number(edit.maxMarks), createdAt: edit.id ? edit.createdAt : new Date().toISOString() }
    if (edit.id) {
      update('assignments', edit.id, payload)
      audit('assignment.updated', 'assignments', `Updated assignment "${edit.title}"`)
      toast.success('Assignment updated.')
    } else {
      insert('assignments', payload)
      audit('assignment.created', 'assignments', `Created assignment "${edit.title}"`)
      toast.success('Assignment published to the batch.')
    }
    setEdit(null)
  }

  const gradeSubmission = (subId, marks, feedback) => {
    update('submissions', subId, { marks: Number(marks), feedback, graded: true, published: grading.resultsPublished })
  }

  const toggleResults = () => {
    const next = !grading.resultsPublished
    update('assignments', grading.id, { resultsPublished: next })
    db.submissions.filter((s) => s.assignmentId === grading.id).forEach((s) => {
      if (s.graded) update('submissions', s.id, { published: next })
    })
    audit(next ? 'assignment.results_published' : 'assignment.results_hidden', 'assignments', `"${grading.title}" results ${next ? 'published' : 'hidden'}`)
    toast.success(`Results ${next ? 'published' : 'hidden'} for students.`)
    setGrading((g) => ({ ...g, resultsPublished: next }))
  }

  const columns = [
    { key: 'title', label: 'Assignment', sortable: true, render: (a) => (
      <div>
        <p className="font-medium text-white">{a.title}</p>
        <p className="text-xs text-muted">{db.courses.find((c) => c.id === a.courseId)?.title}</p>
      </div>
    )},
    { key: 'batch', label: 'Batch', render: (a) => <span className="text-muted">{db.batches.find((b) => b.id === a.batchId)?.name || '—'}</span> },
    { key: 'teacher', label: 'Teacher', render: (a) => <span className="text-muted">{db.teachers.find((t) => t.id === a.teacherId)?.name || '—'}</span> },
    { key: 'dueDate', label: 'Due', sortable: true, render: (a) => (
      <span className={cx('font-mono text-xs', new Date(a.dueDate) < new Date() ? 'text-red-400' : 'text-white/80')}>{formatDate(a.dueDate)}</span>
    )},
    { key: 'maxMarks', label: 'Marks', sortable: true, render: (a) => <span className="font-mono text-sm">{a.maxMarks}</span> },
    { key: 'submissions', label: 'Submissions', render: (a) => {
      const subs = subsFor(a)
      const total = db.batchStudents.filter((bs) => bs.batchId === a.batchId).length
      return <span className="font-mono text-sm">{subs.length}/{total}</span>
    }},
    { key: 'resultsPublished', label: 'Results', render: (a) => <Badge tone={a.resultsPublished ? 'brand' : 'muted'}>{a.resultsPublished ? 'Published' : 'Not published'}</Badge> },
    { key: 'actions', label: '', render: (a) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Review submissions" onClick={() => setGrading(a)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Edit" onClick={() => { setEdit({ ...a }); setErrors({}) }}><ClipboardList className="h-4 w-4" /></IconButton>
        <IconButton title="Delete" className="hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget(a)}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Create tasks, review submissions and publish results" actions={
        <Button icon={Plus} onClick={openNew}>New assignment</Button>
      } />

      <Card>
        <CardHeader title="All assignments" actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-56">
              <option value="all">All courses</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'open', label: 'Open', count: counts.open },
              { value: 'closed', label: 'Closed', count: counts.closed },
            ]} />
          </div>
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No assignments found." />
      </Card>

      {/* Create / edit */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit assignment' : 'New assignment'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Title" required error={errors.title}>
              <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Physics Problem Set 4 — Waves" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course" required error={errors.courseId}>
                <Select value={edit.courseId} invalid={!!errors.courseId} onChange={(e) => setEdit({ ...edit, courseId: e.target.value, batchId: '' })}>
                  {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </Select>
              </Field>
              <Field label="Batch" required error={errors.batchId}>
                <Select value={edit.batchId} invalid={!!errors.batchId} onChange={(e) => setEdit({ ...edit, batchId: e.target.value })}>
                  <option value="">Select batch</option>
                  {batchesForCourse.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Instructions" required error={errors.instructions}>
              <Textarea rows={3} value={edit.instructions} invalid={!!errors.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Due date" required error={errors.dueDate}>
                <Input type="datetime-local" value={edit.dueDate ? edit.dueDate.slice(0, 16) : ''} invalid={!!errors.dueDate} onChange={(e) => setEdit({ ...edit, dueDate: new Date(e.target.value).toISOString() })} />
              </Field>
              <Field label="Max marks" required error={errors.maxMarks}>
                <Input type="number" min="1" value={edit.maxMarks} invalid={!!errors.maxMarks} onChange={(e) => setEdit({ ...edit, maxMarks: e.target.value })} />
              </Field>
            </div>
            <Field label="Attachment file name (optional)" hint="In production, files upload via signed storage URLs — never through the database">
              <Input value={(edit.attachments || []).join(', ')} onChange={(e) => setEdit({ ...edit, attachments: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [] })} placeholder="worksheet.pdf" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save}>Save assignment</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Grading drawer-ish modal */}
      <Modal open={!!grading} onClose={() => setGrading(null)} title={`Submissions — ${grading?.title}`} subtitle={<span className="font-mono">{subsFor(grading || {}).length} received</span>} wide>
        {grading && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <Badge tone={grading.resultsPublished ? 'brand' : 'muted'}>
                Results {grading.resultsPublished ? 'visible to students' : 'not yet published'}
              </Badge>
              <Button size="sm" variant="primary" icon={CheckSquare} onClick={toggleResults}>
                {grading.resultsPublished ? 'Hide results' : 'Publish results'}
              </Button>
            </div>
            <div className="space-y-3">
              {subsFor(grading).length === 0 && <EmptyState icon={ClipboardList} title="No submissions yet" message="Students see this assignment in their batch feed." />}
              {subsFor(grading).map((s) => (
                <SubmissionRow key={s.id} sub={s} grading={grading} db={db} onGrade={gradeSubmission} />
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          remove('assignments', deleteTarget.id)
          db.submissions.filter((s) => s.assignmentId === deleteTarget.id).forEach((s) => remove('submissions', s.id))
          audit('assignment.deleted', 'assignments', `Deleted assignment "${deleteTarget.title}"`)
          toast.info('Assignment deleted.')
          setDeleteTarget(null)
        }}
        title="Delete assignment?"
        message={`"${deleteTarget?.title}" and its submissions will be removed. This action is audited.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
