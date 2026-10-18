import React, { useMemo, useState } from 'react'
import { Plus, Trash2, Eye, ClipboardCheck, Timer } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, Tabs, IconButton, ConfirmDialog } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDateTime, cx } from '../../lib/utils.js'

const blankQuestion = () => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  marks: 10,
})

export default function Quizzes() {
  const { db, insert, update, remove, audit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [viewing, setViewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [publishTarget, setPublishTarget] = useState(null)

  const counts = useMemo(() => ({
    all: db.quizzes.length,
    published: db.quizzes.filter((q) => q.status === 'published').length,
    draft: db.quizzes.filter((q) => q.status === 'draft').length,
  }), [db])

  const filtered = useMemo(() => db.quizzes.filter((qz) => {
    if (courseFilter !== 'all' && qz.courseId !== courseFilter) return false
    if (tab !== 'all' && qz.status !== tab) return false
    return true
  }), [db, tab, courseFilter])

  const openNew = () => {
    const first = db.courses[0]
    setEdit({
      title: '', courseId: first?.id || '', batchId: '', teacherId: first?.teacherId || '',
      timeLimitMin: 20, status: 'draft', resultsPublished: false,
      questions: [blankQuestion(), blankQuestion()],
    })
    setErrors({})
  }

  const batchesForCourse = edit ? db.batches.filter((b) => b.courseId === edit.courseId) : []

  const setQuestion = (idx, patch) => setEdit((e) => ({
    ...e,
    questions: e.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
  }))

  const save = () => {
    const errs = validateFields(edit, {
      title: [rules.required('Title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
      batchId: [rules.required('Batch')],
      timeLimitMin: [rules.required('Time limit'), rules.number('Time limit')],
    })
    edit.questions.forEach((q, i) => {
      if (!q.text.trim()) errs[`q${i}`] = `Question ${i + 1} needs text`
      if (q.options.some((o) => !o.trim())) errs[`q${i}`] = `Question ${i + 1}: all four options are required`
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const totalMarks = edit.questions.reduce((s, q) => s + Number(q.marks || 0), 0)
    const payload = {
      ...edit,
      timeLimitMin: Number(edit.timeLimitMin),
      totalMarks,
      createdAt: edit.id ? edit.createdAt : new Date().toISOString(),
    }
    if (edit.id) {
      update('quizzes', edit.id, payload)
      audit('quiz.updated', 'quizzes', `Updated quiz "${edit.title}"`)
      toast.success('Quiz updated.')
    } else {
      insert('quizzes', payload)
      audit('quiz.created', 'quizzes', `Created quiz "${edit.title}"`)
      toast.success('Quiz created.')
    }
    setEdit(null)
  }

  const attemptsFor = (qz) => db.quizAttempts.filter((a) => a.quizId === qz.id)

  const columns = [
    { key: 'title', label: 'Quiz', sortable: true, render: (qz) => (
      <div>
        <p className="font-medium text-slate-900">{qz.title}</p>
        <p className="text-xs text-slate-500">{db.courses.find((c) => c.id === qz.courseId)?.title}</p>
      </div>
    )},
    { key: 'questions', label: 'Questions', render: (qz) => qz.questions.length },
    { key: 'totalMarks', label: 'Total marks', sortable: true, render: (qz) => qz.totalMarks },
    { key: 'timeLimitMin', label: 'Time limit', render: (qz) => (
      <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5 text-slate-400" />{qz.timeLimitMin} min</span>
    )},
    { key: 'attempts', label: 'Attempts', render: (qz) => attemptsFor(qz).length },
    { key: 'avg', label: 'Avg score', render: (qz) => {
      const att = attemptsFor(qz)
      if (!att.length) return <span className="text-xs text-slate-400">—</span>
      const avg = Math.round(att.reduce((s, a) => s + a.score, 0) / att.length)
      return <span>{avg}/{qz.totalMarks}</span>
    }},
    { key: 'status', label: 'Status', sortable: true, render: (qz) => <Badge tone={qz.status === 'published' ? 'green' : 'amber'}>{qz.status}</Badge> },
    { key: 'actions', label: '', render: (qz) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View attempts" onClick={() => setViewing(qz)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Edit" onClick={() => { setEdit({ ...qz, questions: qz.questions.map((q) => ({ ...q, options: [...q.options] })) }); setErrors({}) }}><ClipboardCheck className="h-4 w-4" /></IconButton>
        <IconButton title={qz.resultsPublished ? 'Hide results' : 'Publish results'} onClick={() => setPublishTarget(qz)}>
          {qz.resultsPublished ? <Trash2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </IconButton>
        <IconButton title="Delete" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleteTarget(qz)}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  const view = viewing && db.quizzes.find((q) => q.id === viewing.id)

  return (
    <div>
      <PageHeader title="Tests & Quizzes" subtitle="Multiple-choice assessments with marks and time limits" actions={
        <Button icon={Plus} onClick={openNew}>New quiz</Button>
      } />

      <Card>
        <CardHeader title="Quiz library" subtitle={`${counts.published} published · ${counts.draft} drafts`} actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-56">
              <option value="all">All courses</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Tabs value={tab} onChange={setTab} tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'published', label: 'Published', count: counts.published },
              { value: 'draft', label: 'Drafts', count: counts.draft },
            ]} />
          </div>
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No quizzes found." />
      </Card>

      {/* Create / edit */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit quiz' : 'New quiz'} subtitle="Build multiple-choice questions" wide>
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Title" required error={errors.title} className="sm:col-span-2">
                <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Physics Unit Test 3" />
              </Field>
              <Field label="Time limit (min)" required error={errors.timeLimitMin}>
                <Input type="number" min="5" value={edit.timeLimitMin} invalid={!!errors.timeLimitMin} onChange={(e) => setEdit({ ...edit, timeLimitMin: e.target.value })} />
              </Field>
            </div>
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

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Questions</p>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => setEdit({ ...edit, questions: [...edit.questions, blankQuestion()] })}>
                  Add question
                </Button>
              </div>
              <div className="space-y-3">
                {edit.questions.map((q, qi) => (
                  <div key={q.id} className="rounded-lg border border-slate-200 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <Field label={`Question ${qi + 1}`} required error={errors[`q${qi}`]} className="flex-1">
                        <Input value={q.text} invalid={!!errors[`q${qi}`]} onChange={(e) => setQuestion(qi, { text: e.target.value })} placeholder="Question text…" />
                      </Field>
                      <IconButton title="Remove question" className="mt-5 hover:bg-rose-50 hover:text-rose-600" onClick={() => setEdit({ ...edit, questions: edit.questions.filter((_, i) => i !== qi) })}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className={cx('flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5', q.correctIndex === oi ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200')}>
                          <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === oi} onChange={() => setQuestion(qi, { correctIndex: oi })} className="h-3.5 w-3.5 border-slate-300 text-emerald-600" />
                          <Input value={opt} onChange={(e) => {
                            const options = [...q.options]
                            options[oi] = e.target.value
                            setQuestion(qi, { options })
                          }} placeholder={`Option ${'ABCD'[oi]}`} />
                        </label>
                      ))}
                    </div>
                    <div className="mt-2 w-32">
                      <Field label="Marks">
                        <Input type="number" min="1" value={q.marks} onChange={(e) => setQuestion(qi, { marks: Number(e.target.value) })} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Field label="Status">
              <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save}>Save quiz</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Attempts */}
      <Modal open={!!view} onClose={() => setViewing(null)} title={`Attempts — ${view?.title}`} subtitle="Student performance per attempt" wide>
        <DataTable
          pageSize={10}
          columns={[
            { key: 'student', label: 'Student', render: (a) => {
              const s = db.students.find((st) => st.id === a.studentId)
              return <span className="font-medium text-slate-800">{s?.name}</span>
            }},
            { key: 'attemptedAt', label: 'Attempted', sortable: true, render: (a) => formatDateTime(a.attemptedAt) },
            { key: 'score', label: 'Score', sortable: true, render: (a) => `${a.score} / ${a.maxScore}` },
            { key: 'pct', label: '%', render: (a) => `${Math.round((a.score / a.maxScore) * 100)}%` },
            { key: 'published', label: 'Visible', render: (a) => <Badge tone={a.published ? 'green' : 'slate'}>{a.published ? 'Yes' : 'Hidden'}</Badge> },
          ]}
          data={view ? attemptsFor(view).sort((a, b) => b.score - a.score) : []}
          emptyMessage="No attempts yet."
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          attemptsFor(deleteTarget).forEach((a) => remove('quizAttempts', a.id))
          remove('quizzes', deleteTarget.id)
          audit('quiz.deleted', 'quizzes', `Deleted quiz "${deleteTarget.title}"`)
          toast.info('Quiz deleted.')
          setDeleteTarget(null)
        }}
        title="Delete quiz?"
        message={`"${deleteTarget?.title}" and all its attempts will be removed. This action is audited.`}
        confirmLabel="Delete"
        danger
      />

      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={() => {
          update('quizzes', publishTarget.id, { resultsPublished: !publishTarget.resultsPublished })
          toast.success(`Results ${publishTarget.resultsPublished ? 'hidden' : 'published'}.`)
          setPublishTarget(null)
        }}
        title={publishTarget?.resultsPublished ? 'Hide results?' : 'Publish results?'}
        message={publishTarget?.resultsPublished
          ? 'Students will no longer see their scores for this quiz.'
          : 'Students can now view their scores for this quiz.'}
        confirmLabel="Confirm"
      />
    </div>
  )
}
