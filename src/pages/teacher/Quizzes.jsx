import React, { useMemo, useState } from 'react'
import { Plus, Trash2, Eye, Timer } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, Tabs, IconButton, ConfirmDialog } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDateTime, cx } from '../../lib/utils.js'

const blankQuestion = () => ({
  id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  text: '', options: ['', '', '', ''], correctIndex: 0, marks: 10,
})

export default function TeacherQuizzes() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, remove, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)
  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId || myCourseIds.includes(b.courseId))

  const mine = db.quizzes.filter((qz) => qz.teacherId === teacherId || (myCourseIds.includes(qz.courseId) && myBatches.some((b) => b.id === qz.batchId)))

  const [tab, setTab] = useState('all')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [viewing, setViewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const counts = useMemo(() => ({
    all: mine.length,
    published: mine.filter((q) => q.status === 'published').length,
    draft: mine.filter((q) => q.status === 'draft').length,
  }), [mine])

  const filtered = mine.filter((qz) => {
    if (tab !== 'all' && qz.status !== tab) return false
    return true
  })

  const openNew = () => {
    const firstCourse = db.courses.find((c) => myCourseIds.includes(c.id))
    setEdit({
      title: '', courseId: firstCourse?.id || '', batchId: '', teacherId,
      timeLimitMin: 20, status: 'draft', resultsPublished: false,
      questions: [blankQuestion(), blankQuestion()],
    })
    setErrors({})
  }

  const batchesForCourse = edit ? myBatches.filter((b) => b.courseId === edit.courseId) : []

  const setQuestion = (idx, patch) => setEdit((e) => ({
    ...e, questions: e.questions.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
  }))

  const save = async () => {
    const errs = validateFields(edit, {
      title: [rules.required('Title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
      batchId: [rules.required('Batch')],
      timeLimitMin: [rules.required('Time limit'), rules.number('Time limit')],
    })
    edit.questions.forEach((q, i) => {
      if (!q.text.trim()) errs[`q${i}`] = `Question ${i + 1} needs text`
      if (q.options.some((o) => !o.trim())) errs[`q${i}`] = `Question ${i + 1}: all four options required`
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    try {
      await insert('quizzes', {
        ...edit,
        timeLimitMin: Number(edit.timeLimitMin),
        totalMarks: edit.questions.reduce((s, q) => s + Number(q.marks || 0), 0),
        createdAt: new Date().toISOString(),
      })
      await audit('quiz.created', 'quizzes', `Created quiz "${edit.title}"`)
      toast.success('Quiz created.')
      setEdit(null)
    } catch (err) {
      toast.error(err.message || 'Failed to create quiz')
    }
  }

  const attemptsFor = (qz) => db.quizAttempts.filter((a) => a.quizId === qz.id)

  const columns = [
    { key: 'title', label: 'Quiz', sortable: true, render: (qz) => (
      <div>
        <p className="font-medium text-white">{qz.title}</p>
        <p className="font-mono text-xs text-muted">{db.courses.find((c) => c.id === qz.courseId)?.title}</p>
      </div>
    )},
    { key: 'questions', label: 'Questions', render: (qz) => <span className="font-mono">{qz.questions.length}</span> },
    { key: 'totalMarks', label: 'Marks', sortable: true, render: (qz) => <span className="font-mono">{qz.totalMarks}</span> },
    { key: 'timeLimitMin', label: 'Time limit', render: (qz) => (
      <span className="inline-flex items-center gap-1 font-mono text-xs"><Timer className="h-3.5 w-3.5 text-brand" />{qz.timeLimitMin} min</span>
    )},
    { key: 'attempts', label: 'Attempts', render: (qz) => <span className="font-mono">{attemptsFor(qz).length}</span> },
    { key: 'avg', label: 'Avg score', render: (qz) => {
      const att = attemptsFor(qz)
      if (!att.length) return <span className="font-mono text-xs text-muted">—</span>
      return <span className="font-mono">{Math.round(att.reduce((s, a) => s + a.score, 0) / att.length)}/{qz.totalMarks}</span>
    }},
    { key: 'status', label: 'Status', sortable: true, render: (qz) => <Badge tone={qz.status === 'published' ? 'green' : 'amber'}>{qz.status}</Badge> },
    { key: 'actions', label: '', render: (qz) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View attempts" onClick={() => setViewing(qz)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Delete" className="hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => setDeleteTarget(qz)}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  const view = viewing && db.quizzes.find((q) => q.id === viewing.id)

  return (
    <div>
      <PageHeader title="Tests & Quizzes" subtitle="Multiple-choice assessments for your courses" actions={
        <Button icon={Plus} onClick={openNew}>New quiz</Button>
      } />

      <Card>
        <CardHeader title="Your quizzes" actions={
          <Tabs value={tab} onChange={setTab} tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'published', label: 'Published', count: counts.published },
            { value: 'draft', label: 'Drafts', count: counts.draft },
          ]} />
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No quizzes yet." />
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title="New quiz" subtitle="Build multiple-choice questions" wide>
        {edit && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Title" required error={errors.title} className="sm:col-span-2">
                <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Unit Test 3" />
              </Field>
              <Field label="Time limit (min)" required error={errors.timeLimitMin}>
                <Input type="number" min="5" value={edit.timeLimitMin} invalid={!!errors.timeLimitMin} onChange={(e) => setEdit({ ...edit, timeLimitMin: e.target.value })} />
              </Field>
            </div>
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
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Questions</p>
                <Button size="sm" variant="secondary" icon={Plus} onClick={() => setEdit({ ...edit, questions: [...edit.questions, blankQuestion()] })}>Add question</Button>
              </div>
              <div className="space-y-3">
                {edit.questions.map((q, qi) => (
                  <div key={q.id} className="rounded-xl border border-line bg-surface/60 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <Field label={`Question ${qi + 1}`} required error={errors[`q${qi}`]} className="flex-1">
                        <Input value={q.text} invalid={!!errors[`q${qi}`]} onChange={(e) => setQuestion(qi, { text: e.target.value })} placeholder="Question text…" />
                      </Field>
                      <IconButton title="Remove question" className="mt-5 hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => setEdit({ ...edit, questions: edit.questions.filter((_, i) => i !== qi) })}>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className={cx('flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 transition', q.correctIndex === oi ? 'border-brand/50 bg-brand/10 shadow-glow/10' : 'border-line bg-void/40 hover:border-line')}>
                          <input type="radio" name={`correct-${q.id}`} checked={q.correctIndex === oi} onChange={() => setQuestion(qi, { correctIndex: oi })} className="h-3.5 w-3.5 accent-[#F7931A]" />
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

      <Modal open={!!view} onClose={() => setViewing(null)} title={`Attempts — ${view?.title}`} subtitle="Student performance per attempt" wide>
        <DataTable
          pageSize={10}
          columns={[
            { key: 'student', label: 'Student', render: (a) => <span className="font-medium text-white">{db.students.find((s) => s.id === a.studentId)?.name}</span> },
            { key: 'attemptedAt', label: 'Attempted', sortable: true, render: (a) => <span className="font-mono text-xs">{formatDateTime(a.attemptedAt)}</span> },
            { key: 'score', label: 'Score', sortable: true, render: (a) => <span className="font-mono">{a.score} / {a.maxScore}</span> },
            { key: 'pct', label: '%', render: (a) => <span className="font-mono text-brand font-semibold">{Math.round((a.score / a.maxScore) * 100)}%</span> },
            { key: 'published', label: 'Visible', render: (a) => <Badge tone={a.published ? 'green' : 'muted'}>{a.published ? 'Yes' : 'Hidden'}</Badge> },
          ]}
          data={view ? attemptsFor(view).sort((a, b) => b.score - a.score) : []}
          emptyMessage="No attempts yet."
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            const removals = attemptsFor(deleteTarget).map((a) => remove('quizAttempts', a.id))
            await Promise.all(removals)
            await remove('quizzes', deleteTarget.id)
            await audit('quiz.deleted', 'quizzes', `Deleted "${deleteTarget.title}"`)
            toast.info('Quiz deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err.message || 'Failed to delete quiz')
          }
        }}
        title="Delete quiz?"
        message={`"${deleteTarget?.title}" and all attempts will be removed.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
