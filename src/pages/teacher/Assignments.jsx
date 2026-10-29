import React, { useMemo, useState } from 'react'
import { Plus, Eye, ClipboardList, CheckSquare, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Textarea, PageHeader, useToast, Tabs, EmptyState, IconButton, ConfirmDialog } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, cx } from '../../lib/utils.js'

function SubmissionRow({ sub, grading, db, onGrade }) {
  const [marks, setMarks] = React.useState(sub.marks ?? '')
  const [feedback, setFeedback] = React.useState(sub.feedback || '')
  const student = db.students.find((st) => st.id === sub.studentId)
  return (
    <div className="rounded-xl border border-line bg-surface/60 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-white">{student?.name}</p>
        <Badge tone={sub.status === 'late' ? 'amber' : 'muted'}>{sub.status}</Badge>
        <span className="font-mono text-xs text-muted">{formatDate(sub.submittedAt)} · {sub.fileName}</span>
        {sub.published && <Badge tone="green">visible</Badge>}
      </div>
      <div className="mt-2.5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted">Marks / {grading.maxMarks}</label>
          <Input type="number" min="0" max={grading.maxMarks} value={marks} onChange={(e) => setMarks(e.target.value)} className="w-24" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block font-mono text-xs uppercase tracking-wider text-muted">Feedback</label>
          <Input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comment for the student…" />
        </div>
        <Button size="sm" disabled={marks === '' || marks == null} onClick={() => onGrade(sub.id, marks, feedback)}>Save grade</Button>
      </div>
    </div>
  )
}

export default function TeacherAssignments() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, update, remove, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)
  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId)

  const mine = db.assignments.filter((a) => a.teacherId === teacherId || (myCourseIds.includes(a.courseId) && myBatches.some((b) => b.id === a.batchId)))

  const [tab, setTab] = useState('all')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [grading, setGrading] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const counts = useMemo(() => ({
    all: mine.length,
    open: mine.filter((a) => new Date(a.dueDate) > new Date()).length,
    closed: mine.filter((a) => new Date(a.dueDate) <= new Date()).length,
  }), [mine])

  const filtered = mine.filter((a) => {
    if (tab === 'open' && new Date(a.dueDate) <= new Date()) return false
    if (tab === 'closed' && new Date(a.dueDate) > new Date()) return false
    return true
  })

  const openNew = () => {
    const first = myCourseIds[0] ? db.courses.find((c) => c.id === myCourseIds[0]) : null
    setEdit({
      title: '', courseId: first?.id || '', batchId: '', teacherId,
      instructions: '', dueDate: '', maxMarks: 25, attachments: [], status: 'published', resultsPublished: false,
    })
    setErrors({})
  }

  const batchesForCourse = edit ? myBatches.filter((b) => b.courseId === edit.courseId) : []

  const save = async () => {
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
    try {
      await insert('assignments', { ...edit, maxMarks: Number(edit.maxMarks), createdAt: new Date().toISOString() })
      await audit('assignment.created', 'assignments', `Created assignment "${edit.title}"`)
      toast.success('Assignment published to the batch.')
      setEdit(null)
    } catch (err) {
      toast.error(err.message || 'Failed to publish assignment')
    }
  }

  const gradeSubmission = async (subId, marks, feedback) => {
    try {
      await update('submissions', subId, { marks: Number(marks), feedback, graded: true, published: grading.resultsPublished })
      toast.success('Grade saved.')
    } catch (err) {
      toast.error(err.message || 'Failed to save grade')
    }
  }

  const toggleResults = async () => {
    const next = !grading.resultsPublished
    try {
      await update('assignments', grading.id, { resultsPublished: next })
      const subUpdates = db.submissions
        .filter((s) => s.assignmentId === grading.id && s.graded)
        .map((s) => update('submissions', s.id, { published: next }))
      await Promise.all(subUpdates)
      await audit(next ? 'assignment.results_published' : 'assignment.results_hidden', 'assignments', `"${grading.title}" results ${next ? 'published' : 'hidden'}`)
      toast.success(`Results ${next ? 'published' : 'hidden'}.`)
      setGrading((g) => ({ ...g, resultsPublished: next }))
    } catch (err) {
      toast.error(err.message || 'Failed to update results')
    }
  }

  const columns = [
    { key: 'title', label: 'Assignment', sortable: true, render: (a) => (
      <div>
        <p className="font-medium text-white">{a.title}</p>
        <p className="font-mono text-xs text-muted">{db.courses.find((c) => c.id === a.courseId)?.title}</p>
      </div>
    )},
    { key: 'batch', label: 'Batch', render: (a) => db.batches.find((b) => b.id === a.batchId)?.name || '—' },
    { key: 'dueDate', label: 'Due', sortable: true, render: (a) => (
      <span className={cx('font-mono text-xs', new Date(a.dueDate) < new Date() ? 'text-rose-400' : 'text-white/80')}>{formatDate(a.dueDate)}</span>
    )},
    { key: 'maxMarks', label: 'Marks', sortable: true, render: (a) => <span className="font-mono">{a.maxMarks}</span> },
    { key: 'submissions', label: 'Submissions', render: (a) => {
      const subs = db.submissions.filter((s) => s.assignmentId === a.id)
      const total = db.batchStudents.filter((bs) => bs.batchId === a.batchId).length
      return <span className="font-mono">{subs.length}/{total}</span>
    }},
    { key: 'resultsPublished', label: 'Results', render: (a) => <Badge tone={a.resultsPublished ? 'green' : 'muted'}>{a.resultsPublished ? 'Published' : 'Draft results'}</Badge> },
    { key: 'actions', label: '', render: (a) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Review submissions" onClick={() => setGrading(a)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Delete" className="hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => setDeleteTarget(a)}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Assignments" subtitle="Create tasks and grade submissions" actions={
        <Button icon={Plus} onClick={openNew}>New assignment</Button>
      } />

      <Card>
        <CardHeader title="Your assignments" actions={
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'closed', label: 'Closed', count: counts.closed },
          ]} />
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No assignments found." />
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="New assignment">
        {edit && (
          <div className="space-y-4">
            <Field label="Title" required error={errors.title}>
              <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Problem Set 4 — Waves" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Course" required error={errors.courseId}>
                <Select value={edit.courseId} invalid={!!errors.courseId} onChange={(e) => setEdit({ ...edit, courseId: e.target.value, batchId: '' })}>
                  {db.courses.filter((c) => myCourseIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
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
            <Field label="Attachment file name (optional)">
              <Input value={(edit.attachments || []).join(', ')} onChange={(e) => setEdit({ ...edit, attachments: e.target.value ? e.target.value.split(',').map((s) => s.trim()) : [] })} placeholder="worksheet.pdf" />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save} icon={Plus}>Publish assignment</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!grading} onClose={() => setGrading(null)} title={`Submissions — ${grading?.title}`} subtitle={`${db.submissions.filter((s) => s.assignmentId === grading?.id).length} received`} wide>
        {grading && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <Badge tone={grading.resultsPublished ? 'green' : 'muted'}>Results {grading.resultsPublished ? 'visible' : 'hidden'}</Badge>
              <Button size="sm" variant="primary" icon={CheckSquare} onClick={toggleResults}>
                {grading.resultsPublished ? 'Hide results' : 'Publish results'}
              </Button>
            </div>
            <div className="space-y-3">
              {db.submissions.filter((s) => s.assignmentId === grading.id).length === 0 && (
                <EmptyState icon={ClipboardList} title="No submissions yet" />
              )}
              {db.submissions.filter((s) => s.assignmentId === grading.id).map((s) => (
                <SubmissionRow key={s.id} sub={s} grading={grading} db={db} onGrade={gradeSubmission} />
              ))}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            const subRemovals = db.submissions.filter((s) => s.assignmentId === deleteTarget.id).map((s) => remove('submissions', s.id))
            await Promise.all(subRemovals)
            await remove('assignments', deleteTarget.id)
            await audit('assignment.deleted', 'assignments', `Deleted "${deleteTarget.title}"`)
            toast.info('Assignment deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err.message || 'Failed to delete assignment')
          }
        }}
        title="Delete assignment?"
        message={`"${deleteTarget?.title}" and its submissions will be removed.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
