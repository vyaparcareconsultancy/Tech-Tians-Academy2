import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Send, Plus, Lock } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Textarea, PageHeader, useToast, ConfirmDialog } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatINR } from '../../lib/utils.js'

export default function MyCourses() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, update, audit } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const teacherId = teacherIdForUser(user.id)
  const teacher = db.teachers.find((t) => t.id === teacherId)
  const policies = db.policies

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myCourses = db.courses.filter((c) => myCourseIds.includes(c.id))

  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null)
  const [submitTarget, setSubmitTarget] = useState(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return myCourses.filter((c) => !query || c.title.toLowerCase().includes(query))
  }, [myCourses, q])

  const statsFor = (c) => {
    const enrs = db.enrollments.filter((e) => e.courseId === c.id)
    const avg = enrs.length ? Math.round(enrs.reduce((s, e) => s + (e.progressPct || 0), 0) / enrs.length) : 0
    return {
      students: enrs.length,
      avg,
      sections: db.sections.filter((s) => s.courseId === c.id).length,
      lessons: db.lessons.filter((l) => l.courseId === c.id).length,
    }
  }

  const canCreate = policies.teachersCanCreateCourses

  const openNew = () => {
    setEdit({ title: '', description: '', category: 'Foundation', subjectId: db.subjects[0]?.id, price: 2999, durationHours: 40, level: 'Beginner', status: 'draft', teacherId, coverIndex: 2 })
    setErrors({})
  }

  const save = () => {
    const errs = validateFields(edit, {
      title: [rules.required('Title'), rules.minLen(4)],
      description: [rules.required('Description')],
      price: [rules.required('Price'), rules.number('Price')],
      durationHours: [rules.required('Duration'), rules.number('Duration')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const subject = db.subjects.find((s) => s.id === edit.subjectId)
    const payload = { ...edit, slug: edit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), subjectName: subject?.name, teacherId }
    if (edit.id) {
      update('courses', edit.id, payload)
      audit('course.updated', 'courses', `Updated course "${edit.title}"`)
      toast.success('Course updated.')
    } else {
      // New teacher courses enter the admin approval queue
      insert('courses', { ...payload, status: 'pending_approval', createdAt: new Date().toISOString() })
      audit('course.submitted', 'courses', `Submitted new course "${edit.title}" for admin approval`)
      toast.success('Course submitted for admin approval.')
    }
    setEdit(null)
  }

  const submitForApproval = () => {
    update('courses', submitTarget.id, { status: 'pending_approval' })
    audit('course.submitted', 'courses', `"${submitTarget.title}" submitted for admin approval`)
    toast.success('Submitted for admin approval.')
    setSubmitTarget(null)
  }

  const statusTone = { published: 'green', draft: 'amber', archived: 'slate', pending_approval: 'blue' }

  const columns = [
    { key: 'title', label: 'Course', sortable: true, render: (c) => {
      const cover = db.covers[c.coverIndex] || db.covers[0]
      return (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base" style={{ background: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}>{cover.emoji}</span>
          <div>
            <p className="font-medium text-slate-900">{c.title}</p>
            <p className="text-xs text-slate-500">{c.subjectName} · {c.level}</p>
          </div>
        </div>
      )
    }},
    { key: 'students', label: 'Students', sortable: true, render: (c) => statsFor(c).students },
    { key: 'avgProgress', label: 'Avg progress', render: (c) => {
      const { avg } = statsFor(c)
      return <div className="flex w-28 items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${avg}%` }} /></div><span className="text-xs text-slate-500">{avg}%</span></div>
    }},
    { key: 'price', label: 'Price', sortable: true, render: (c) => formatINR(c.price) },
    { key: 'status', label: 'Status', sortable: true, render: (c) => <Badge tone={statusTone[c.status] || 'slate'}>{c.status.replace('_', ' ')}</Badge> },
    { key: 'actions', label: '', render: (c) => (
      <div className="flex justify-end gap-1">
        <IconBtn title="Preview" onClick={() => setPreview(c)}><Eye className="h-4 w-4" /></IconBtn>
        <IconBtn title="Open in Course Builder" onClick={() => navigate(`/teacher/course-builder?course=${c.id}`)}><Pencil className="h-4 w-4" /></IconBtn>
        {c.status === 'draft' && (
          <IconBtn title="Submit for admin approval" onClick={() => setSubmitTarget(c)}><Send className="h-4 w-4 text-emerald-600" /></IconBtn>
        )}
      </div>
    )},
  ]

  const previewCourse = preview && db.courses.find((c) => c.id === preview.id)

  return (
    <div>
      <PageHeader title="My Courses" subtitle={`${myCourses.length} courses assigned to ${teacher?.name || 'you'}`} actions={
        canCreate ? (
          <Button icon={Plus} onClick={openNew}>New course</Button>
        ) : (
          <Button icon={Lock} disabled title="Disabled by admin policy">New course (disabled by policy)</Button>
        )
      } />

      {!canCreate && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Admin policy currently disables teacher course creation. Contact your administrator to request a new course.
        </div>
      )}

      <Card>
        <CardHeader title="Assigned courses" subtitle="You only see courses the admin assigned to you" actions={
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title…" className="w-56" />
        } />
        <DataTable columns={columns} data={filtered} emptyMessage="No courses assigned yet." />
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit course' : 'Submit new course'} subtitle={edit?.id ? '' : 'New courses require admin approval before publishing'} wide>
        {edit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title} className="sm:col-span-2">
              <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            </Field>
            <Field label="Category">
              <Select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                {['JEE', 'NEET', 'Foundation', 'Board', 'Olympiad', 'UPSC'].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Subject">
              <Select value={edit.subjectId} onChange={(e) => setEdit({ ...edit, subjectId: e.target.value })}>
                {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label="Price (₹)" required error={errors.price}>
              <Input type="number" min="0" value={edit.price} invalid={!!errors.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} />
            </Field>
            <Field label="Duration (hours)" required error={errors.durationHours}>
              <Input type="number" min="1" value={edit.durationHours} invalid={!!errors.durationHours} onChange={(e) => setEdit({ ...edit, durationHours: e.target.value })} />
            </Field>
            <Field label="Level">
              <Select value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>
                {['Beginner', 'Intermediate', 'Advanced'].map((l) => <option key={l}>{l}</option>)}
              </Select>
            </Field>
            <Field label="Description" required error={errors.description} className="sm:col-span-2">
              <Textarea rows={3} value={edit.description} invalid={!!errors.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save} icon={edit.id ? undefined : Send}>{edit.id ? 'Save changes' : 'Submit for approval'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!preview} onClose={() => setPreview(null)} title={previewCourse?.title} subtitle={previewCourse?.subjectName} wide>
        {previewCourse && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{previewCourse.description}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="navy">{previewCourse.level}</Badge>
              <Badge tone="indigo">{formatINR(previewCourse.price)}</Badge>
              <Badge tone="slate">{previewCourse.durationHours} hours</Badge>
              <Badge tone={statusTone[previewCourse.status] || 'slate'}>{previewCourse.status.replace('_', ' ')}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Sections</h4>
              <div className="mt-2 space-y-2">
                {db.sections.filter((s) => s.courseId === previewCourse.id).map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-200 px-3 py-2">
                    <p className="text-sm font-medium text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-500">{db.lessons.filter((l) => l.sectionId === s.id).length} lessons</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        onConfirm={submitForApproval}
        title="Submit for admin approval?"
        message={`"${submitTarget?.title}" will be reviewed by an administrator before it is published.`}
        confirmLabel="Submit"
      />
    </div>
  )
}

function IconBtn({ className, ...rest }) {
  return (
    <button className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 ${className || ''}`} {...rest} />
  )
}
