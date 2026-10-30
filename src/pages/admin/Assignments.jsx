import React, { useMemo, useState } from 'react'
import { Plus, ClipboardList, Trash2, Eye, CheckSquare, UploadCloud, FileDown, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Textarea, PageHeader, useToast, Tabs, EmptyState, IconButton, ConfirmDialog, ProgressBar } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { storageApi } from '../../lib/api/storage.js'
import { isDemoMode } from '../../lib/supabase.js'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, cx } from '../../lib/utils.js'

function SubmissionRow({ sub, grading, db, onGrade, toast }) {
  const [marks, setMarks] = useState(sub.marks ?? '')
  const [feedback, setFeedback] = useState(sub.feedback || '')
  const student = db.students.find((st) => st.id === sub.studentId)

  const handleDownloadSubmission = async () => {
    if (sub.storageKey) {
      try {
        const url = await storageApi.getSignedUrl('submissions', sub.storageKey, 3600)
        if (url) return window.open(url, '_blank')
      } catch (err) {
        toast.error(err.message || 'Failed to open submission')
        return
      }
    }
    toast.info(`Demo mode: preview simulated for ${sub.fileName || 'submission.pdf'}`)
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-white">{student?.name}</p>
        <Badge tone={sub.status === 'late' ? 'gold' : 'muted'}>{sub.status}</Badge>
        <span className="font-mono text-xs text-muted">{formatDate(sub.submittedAt)}</span>
        {sub.fileName && (
          <button
            type="button"
            onClick={handleDownloadSubmission}
            className="inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
            title="Download submitted file"
          >
            <FileDown className="h-3.5 w-3.5" />
            {sub.fileName}
          </button>
        )}
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

export default function Assignments() {
  const { db, insert, update, remove, audit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [grading, setGrading] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [attachmentFile, setAttachmentFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

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
    setAttachmentFile(null)
    setFileError('')
    setErrors({})
    setUploadProgress(0)
  }

  const batchesForCourse = edit ? db.batches.filter((b) => b.courseId === edit.courseId) : []

  const handleAttachmentChange = (e) => {
    const f = e.target.files?.[0]
    setFileError('')
    if (!f) return
    try {
      storageApi.validateFile(f)
      setAttachmentFile(f)
    } catch (err) {
      setFileError(err.message)
      setAttachmentFile(null)
    }
  }

  const handleDownloadAttachment = async (path) => {
    try {
      const url = await storageApi.getSignedUrl('materials', path, 3600)
      if (url) return window.open(url, '_blank')
    } catch (err) {
      toast.error(err.message || 'Failed to download attachment')
      return
    }
    toast.info(`Demo mode: sample download simulated for ${path.split('/').pop()}`)
  }

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
    if (Object.keys(errs).length || fileError) return

    setIsUploading(true)
    setUploadProgress(10)

    try {
      let finalAttachments = [...(edit.attachments || [])]

      if (attachmentFile) {
        const cleanName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `materials/${edit.courseId}/${Date.now()}-${cleanName}`
        const res = await storageApi.upload('materials', path, attachmentFile, setUploadProgress)
        finalAttachments = [res.path]

        if (res.isMock || isDemoMode) {
          toast.info('uploads work only with Supabase')
        }
      }

      const payload = {
        ...edit,
        attachments: finalAttachments,
        maxMarks: Number(edit.maxMarks),
        createdAt: edit.id ? edit.createdAt : new Date().toISOString(),
      }

      if (edit.id) {
        await update('assignments', edit.id, payload)
        await audit('assignment.updated', 'assignments', `Updated assignment "${edit.title}"`)
        toast.success('Assignment updated.')
      } else {
        await insert('assignments', payload)
        await audit('assignment.created', 'assignments', `Created assignment "${edit.title}"`)
        toast.success('Assignment published to the batch.')
      }
      setEdit(null)
      setAttachmentFile(null)
    } catch (err) {
      toast.error(err.message || 'Failed to save assignment')
    } finally {
      setIsUploading(false)
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
        {a.attachments && a.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {a.attachments.map((att, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleDownloadAttachment(att)}
                className="inline-flex items-center gap-1 font-mono text-[11px] text-brand hover:underline"
                title="Download attachment"
              >
                <FileText className="h-3 w-3" />
                {att.split('/').pop()}
              </button>
            ))}
          </div>
        )}
      </div>
    )},
    { key: 'batch', label: 'Batch', render: (a) => db.batches.find((b) => b.id === a.batchId)?.name || '—' },
    { key: 'dueDate', label: 'Due', sortable: true, render: (a) => (
      <span className={cx('font-mono text-xs', new Date(a.dueDate) < new Date() ? 'text-rose-400' : 'text-white/80')}>
        {formatDate(a.dueDate)}
      </span>
    )},
    { key: 'maxMarks', label: 'Marks', sortable: true, render: (a) => <span className="font-mono">{a.maxMarks}</span> },
    { key: 'submissions', label: 'Submissions', render: (a) => {
      const subs = subsFor(a)
      const total = db.batchStudents.filter((bs) => bs.batchId === a.batchId).length
      return <span className="font-mono">{subs.length}/{total}</span>
    }},
    { key: 'resultsPublished', label: 'Results', render: (a) => (
      <Badge tone={a.resultsPublished ? 'brand' : 'muted'}>{a.resultsPublished ? 'Published' : 'Draft results'}</Badge>
    )},
    { key: 'actions', label: '', render: (a) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Review submissions" onClick={() => setGrading(a)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Delete" className="hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => setDeleteTarget(a)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Assignments"
        subtitle="Manage student problem sets, worksheets and grading"
        actions={<Button icon={Plus} onClick={openNew}>New assignment</Button>}
      />

      <Card>
        <CardHeader
          title="All assignments"
          actions={
            <div className="flex items-center gap-3">
              <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-48 text-xs">
                <option value="all">All courses</option>
                {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'open', label: 'Open', count: counts.open },
                { value: 'closed', label: 'Closed', count: counts.closed },
              ]} />
            </div>
          }
        />
        <DataTable columns={columns} data={filtered} emptyMessage="No assignments found." />
      </Card>

      <Modal open={!!edit} onClose={() => !isUploading && setEdit(null)} title={edit?.id ? 'Edit assignment' : 'New assignment'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Title" required error={errors.title}>
              <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Problem Set 4 — Waves" />
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

            {/* Optional Attachment Box */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                Attachment file (optional)
              </label>
              <div className="rounded-xl border-2 border-dashed border-line bg-surface/60 p-4 text-center transition hover:border-brand/40">
                <UploadCloud className="mx-auto h-6 w-6 text-brand/80" />
                <p className="mt-1 text-xs font-medium text-white">
                  {attachmentFile ? attachmentFile.name : 'Upload optional worksheet or problem PDF'}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-muted">
                  PDF, DOCX, PPTX, ZIP (Max 50 MB)
                </p>
                <input
                  type="file"
                  id="adminAssignmentAttachment"
                  className="hidden"
                  accept=".pdf,.docx,.pptx,.zip,.png,.jpg,.jpeg,.webp"
                  onChange={handleAttachmentChange}
                />
                <div className="mt-2.5 flex justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isUploading}
                    onClick={() => document.getElementById('adminAssignmentAttachment')?.click()}
                  >
                    {attachmentFile ? 'Change attachment' : 'Choose file'}
                  </Button>
                  {attachmentFile && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAttachmentFile(null)}
                      className="text-muted hover:text-white"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {fileError && (
                <p className="flex items-center gap-1 font-mono text-xs text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {fileError}
                </p>
              )}
              {attachmentFile && !fileError && (
                <p className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB ready to upload
                </p>
              )}
            </div>

            {isUploading && (
              <div className="space-y-1 rounded-xl bg-surface/80 p-3">
                <div className="flex justify-between font-mono text-xs text-muted">
                  <span>Uploading attachment…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <ProgressBar value={uploadProgress} />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" disabled={isUploading} onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save} loading={isUploading}>
                {isUploading ? 'Saving…' : 'Save assignment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
                <SubmissionRow key={s.id} sub={s} grading={grading} db={db} onGrade={gradeSubmission} toast={toast} />
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
            await audit('assignment.deleted', 'assignments', `Deleted assignment "${deleteTarget.title}"`)
            toast.info('Assignment deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err.message || 'Failed to delete assignment')
          }
        }}
        title="Delete assignment?"
        message={`"${deleteTarget?.title}" and all student submissions will be deleted.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
