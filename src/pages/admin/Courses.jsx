import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  SearchInput, Badge, Button, Card, CardHeader, Field, Input, Modal, Select,
  Textarea, PageHeader, useToast, IconButton, ConfirmDialog, Avatar,
} from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatINR, cx } from '../../lib/utils.js'
import { Eye, Pencil, X, Plus, Archive, Send, BookOpen, Clock } from 'lucide-react'

const STATUS_FLOW = {
  draft: ['publish', 'archive'],
  published: ['unpublish', 'archive'],
  archived: ['publish'],
}

export default function Courses() {
  const { db, insert, update, audit } = useData()
  const toast = useToast()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [edit, setEdit] = useState(null) // course being edited
  const [errors, setErrors] = useState({})
  const [preview, setPreview] = useState(null)
  const [action, setAction] = useState(null) // { course, next }

  useEffect(() => {
    const qp = params.get('q')
    if (qp != null) setQ(qp)
  }, [params])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return db.courses.filter((c) => {
      if (query && ![c.title, c.category, c.subjectName].join(' ').toLowerCase().includes(query)) return false
      if (category !== 'all' && c.category !== category) return false
      if (status !== 'all' && c.status !== status) return false
      return true
    })
  }, [db, q, category, status])

  const teacherName = (id) => db.teachers.find((t) => t.id === id)?.name || '—'

  const statsFor = (c) => {
    const enrs = db.enrollments.filter((e) => e.courseId === c.id)
    const avg = enrs.length ? Math.round(enrs.reduce((s, e) => s + (e.progressPct || 0), 0) / enrs.length) : 0
    return {
      sections: db.sections.filter((s) => s.courseId === c.id).length,
      lessons: db.lessons.filter((l) => l.courseId === c.id).length,
      enrollments: enrs.length,
      avgProgress: avg,
    }
  }

  const openNew = () => {
    setEdit({
      title: '', slug: '', description: '', category: 'Foundation', subjectId: db.subjects[0]?.id,
      price: 2999, durationHours: 40, level: 'Beginner', status: 'draft',
      teacherId: db.teachers.find((t) => t.status === 'active')?.id || '', coverIndex: 0,
    })
    setErrors({})
  }

  const save = () => {
    const errs = validateFields(edit, {
      title: [rules.required('Title'), rules.minLen(4)],
      description: [rules.required('Description'), rules.maxLen(500)],
      category: [rules.required('Category')],
      price: [rules.required('Price'), rules.number('Price')],
      durationHours: [rules.required('Duration'), rules.number('Duration')],
      teacherId: [rules.required('Teacher')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const subject = db.subjects.find((s) => s.id === edit.subjectId)
    const slug = (edit.slug || edit.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    if (edit.id) {
      update('courses', edit.id, { ...edit, slug, subjectName: subject?.name, subjectId: edit.subjectId })
      audit('course.updated', 'courses', `Updated course "${edit.title}"`)
      toast.success(`Course "${edit.title}" updated.`)
    } else {
      insert('courses', { ...edit, slug, subjectName: subject?.name, createdAt: new Date().toISOString(), publishedAt: edit.status === 'published' ? new Date().toISOString() : null })
      audit('course.created', 'courses', `Created course "${edit.title}"`)
      toast.success(`Course "${edit.title}" created.`)
    }
    setEdit(null)
  }

  const applyStatus = () => {
    const { course, next } = action
    update('courses', course.id, { status: next, publishedAt: next === 'published' ? new Date().toISOString() : course.publishedAt })
    audit(next === 'archived' ? 'course.archived' : 'course.published', 'courses', `"${course.title}" → ${next}`)
    toast.success(`Course "${course.title}" is now ${next}.`)
    setAction(null)
  }

  const columns = [
    { key: 'cover', label: '', render: (c) => {
      const cover = db.covers[c.coverIndex] || db.covers[0]
      return (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ background: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}>
          {cover.emoji}
        </span>
      )
    }},
    { key: 'title', label: 'Course', sortable: true, render: (c) => (
      <div>
        <p className="font-medium text-slate-900">{c.title}</p>
        <p className="text-xs text-slate-500">{c.subjectName} · {c.level}</p>
      </div>
    )},
    { key: 'teacher', label: 'Teacher', render: (c) => <span className="inline-flex items-center gap-2"><Avatar name={teacherName(c.teacherId)} className="h-6 w-6 text-[9px]" />{teacherName(c.teacherId)}</span> },
    { key: 'price', label: 'Price', sortable: true, render: (c) => formatINR(c.price) },
    { key: 'durationHours', label: 'Duration', sortable: true, render: (c) => `${c.durationHours}h` },
    { key: 'sections', label: 'Content', render: (c) => <span>{statsFor(c).sections} sections · {statsFor(c).lessons} lessons</span> },
    { key: 'enrollments', label: 'Students', sortable: true, render: (c) => statsFor(c).enrollments },
    { key: 'status', label: 'Status', sortable: true, render: (c) => (
      <Badge tone={c.status === 'published' ? 'green' : c.status === 'archived' ? 'slate' : 'amber'}>{c.status}</Badge>
    )},
    { key: 'actions', label: '', render: (c) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Preview" onClick={() => setPreview(c)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Edit" onClick={() => { setEdit({ ...c }); setErrors({}) }}><Pencil className="h-4 w-4" /></IconButton>
        {STATUS_FLOW[c.status]?.includes('publish') && (
          <IconButton title="Publish" onClick={() => setAction({ course: c, next: 'published' })}><Send className="h-4 w-4 text-emerald-600" /></IconButton>
        )}
        {STATUS_FLOW[c.status]?.includes('unpublish') && (
          <IconButton title="Unpublish" onClick={() => setAction({ course: c, next: 'draft' })}><X className="h-4 w-4 text-amber-600" /></IconButton>
        )}
        {STATUS_FLOW[c.status]?.includes('archive') && (
          <IconButton title="Archive" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setAction({ course: c, next: 'archived' })}><Archive className="h-4 w-4" /></IconButton>
        )}
      </div>
    )},
  ]

  const previewCourse = preview && db.courses.find((c) => c.id === preview.id)

  return (
    <div>
      <PageHeader title="Courses" subtitle="Create, publish and archive course offerings" actions={
        <Button icon={Plus} onClick={openNew}>New course</Button>
      } />

      <Card>
        <CardHeader title="Course catalogue" subtitle="Organise by category, subject and lifecycle status" actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Search by title or subject…" className="w-60" />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-36">
              <option value="all">All categories</option>
              {['JEE', 'NEET', 'Foundation', 'Board', 'Olympiad', 'UPSC'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-32">
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        } />
        <DataTable columns={columns} data={filtered} onRowClick={(c) => setPreview(c)} emptyMessage="No courses match the filters." />
      </Card>

      {/* Create / edit */}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit course' : 'Create course'} subtitle="Fields marked * are required" wide>
        {edit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title} className="sm:col-span-2">
              <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Physics for JEE Advanced 2027" />
            </Field>
            <Field label="Category" required error={errors.category}>
              <Select value={edit.category} invalid={!!errors.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
                {['JEE', 'NEET', 'Foundation', 'Board', 'Olympiad', 'UPSC'].map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Subject" required>
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
            <Field label="Primary teacher" required error={errors.teacherId}>
              <Select value={edit.teacherId} invalid={!!errors.teacherId} onChange={(e) => setEdit({ ...edit, teacherId: e.target.value })}>
                <option value="">Select teacher</option>
                {db.teachers.filter((t) => t.status === 'active').map((t) => <option key={t.id} value={t.id}>{t.name} — {t.subject}</option>)}
              </Select>
            </Field>
            <Field label="Description" required error={errors.description} className="sm:col-span-2">
              <Textarea rows={3} value={edit.description} invalid={!!errors.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <Field label="Cover style" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {db.covers.map((cv, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setEdit({ ...edit, coverIndex: i })}
                    className={cx('flex h-14 w-20 items-center justify-center rounded-lg text-xl ring-2 transition', edit.coverIndex === i ? 'ring-indigo-500' : 'ring-transparent hover:ring-slate-300')}
                    style={{ background: `linear-gradient(135deg, ${cv.from}, ${cv.to})` }}
                  >
                    {cv.emoji}
                  </button>
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save}>{edit.id ? 'Save changes' : 'Create course'}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Preview */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title={previewCourse?.title} subtitle={`${previewCourse?.category} · ${previewCourse?.subjectName}`} wide>
        {previewCourse && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {(() => {
                const cover = db.covers[previewCourse.coverIndex] || db.covers[0]
                return (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-3xl" style={{ background: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }}>
                    {cover.emoji}
                  </span>
                )
              })()}
              <div className="flex-1">
                <p className="text-sm text-slate-600">{previewCourse.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="navy">{previewCourse.level}</Badge>
                  <Badge tone="indigo">{formatINR(previewCourse.price)}</Badge>
                  <Badge tone="slate">{previewCourse.durationHours} hours</Badge>
                  <Badge tone={previewCourse.status === 'published' ? 'green' : 'amber'}>{previewCourse.status}</Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3"><p className="text-xs text-slate-400">Teacher</p><p className="mt-1 text-sm font-semibold">{teacherName(previewCourse.teacherId)}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-400">Enrollments</p><p className="mt-1 text-sm font-semibold">{statsFor(previewCourse).enrollments}</p></Card>
              <Card className="p-3"><p className="text-xs text-slate-400">Avg. progress</p><p className="mt-1 text-sm font-semibold">{statsFor(previewCourse).avgProgress}%</p></Card>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900">Curriculum</h4>
              <div className="mt-2 space-y-2">
                {db.sections.filter((s) => s.courseId === previewCourse.id).map((s) => (
                  <div key={s.id} className="rounded-lg border border-slate-200">
                    <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">{s.title}</p>
                    <ul className="divide-y divide-slate-100">
                      {db.lessons.filter((l) => l.sectionId === s.id).map((l) => (
                        <li key={l.id} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600">
                          <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                          {l.title}
                          <span className="ml-auto flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3 w-3" />{l.durationMin}m</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!action}
        onClose={() => setAction(null)}
        onConfirm={applyStatus}
        title={action?.next === 'archived' ? 'Archive course?' : action?.next === 'published' ? 'Publish course?' : 'Unpublish course?'}
        message={action?.next === 'archived'
          ? 'Archiving hides the course from students and stops new enrollments. Existing enrollments remain accessible.'
          : action?.next === 'published'
            ? 'The course becomes visible to students immediately.'
            : 'The course is hidden from the catalogue but stays in your list as a draft.'}
        confirmLabel="Confirm"
        danger={action?.next === 'archived'}
      />
    </div>
  )
}
