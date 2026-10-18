import React, { useMemo, useState } from 'react'
import { Plus, ChevronUp, ChevronDown, Send, Pencil } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Textarea, PageHeader, useToast, Tabs, ConfirmDialog, IconButton } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { cx } from '../../lib/utils.js'

export default function Lectures() {
  const { db, insert, update, audit } = useData()
  const toast = useToast()
  const [tab, setTab] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [publishTarget, setPublishTarget] = useState(null)

  const filtered = useMemo(() => db.lectures.filter((l) => {
    if (courseFilter !== 'all' && l.courseId !== courseFilter) return false
    if (tab !== 'all' && l.status !== tab) return false
    return true
  }), [db, tab, courseFilter])

  const counts = useMemo(() => ({
    all: db.lectures.length,
    published: db.lectures.filter((l) => l.status === 'published').length,
    draft: db.lectures.filter((l) => l.status === 'draft').length,
  }), [db])

  const openNew = () => {
    const firstPublished = db.courses.find((c) => c.status === 'published')
    setEdit({
      title: '', description: '', courseId: firstPublished?.id || '', sectionId: '', batchId: '',
      teacherId: '', videoUrl: '', durationMin: 30, order: 1, status: 'draft',
    })
    setErrors({})
  }

  const sectionsForCourse = edit ? db.sections.filter((s) => s.courseId === edit.courseId) : []
  const batchesForCourse = edit ? db.batches.filter((b) => b.courseId === edit.courseId) : []
  const teachersForCourse = edit ? db.teachers.filter((t) =>
    t.status === 'active' && db.teacherCourses.some((tc) => tc.teacherId === t.id && tc.courseId === edit.courseId)) : []

  const save = () => {
    const errs = validateFields(edit, {
      title: [rules.required('Title'), rules.minLen(4)],
      description: [rules.required('Description')],
      courseId: [rules.required('Course')],
      sectionId: [rules.required('Section')],
      videoUrl: [rules.required('Video URL'), rules.videoUrl('Video URL')],
      durationMin: [rules.required('Duration'), rules.number('Duration')],
      teacherId: [rules.required('Teacher')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = { ...edit, durationMin: Number(edit.durationMin), order: Number(edit.order), uploadedAt: edit.id ? edit.uploadedAt : new Date().toISOString() }
    if (edit.id) {
      update('lectures', edit.id, payload)
      audit('lecture.updated', 'lessons', `Updated lecture "${edit.title}"`)
      toast.success('Lecture updated.')
    } else {
      insert('lectures', payload)
      audit('lecture.uploaded', 'lessons', `Added lecture "${edit.title}"`)
      toast.success('Lecture added as draft.')
    }
    setEdit(null)
  }

  const move = (lecture, dir) => {
    const siblings = db.lectures
      .filter((l) => l.courseId === lecture.courseId && l.sectionId === lecture.sectionId)
      .sort((a, b) => a.order - b.order)
    const idx = siblings.findIndex((l) => l.id === lecture.id)
    const swap = siblings[idx + dir]
    if (!swap) return
    update('lectures', lecture.id, { order: swap.order })
    update('lectures', swap.id, { order: lecture.order })
  }

  const togglePublish = () => {
    const next = publishTarget.status === 'published' ? 'draft' : 'published'
    update('lectures', publishTarget.id, { status: next })
    audit(next === 'published' ? 'lecture.published' : 'lecture.unpublished', 'lessons', `"${publishTarget.title}" → ${next}`)
    toast.success(`Lecture ${next === 'published' ? 'published' : 'moved back to draft'}.`)
    setPublishTarget(null)
  }

  const columns = [
    { key: 'order', label: '#', render: (l) => <span className="text-xs text-slate-400">{l.order}</span> },
    { key: 'title', label: 'Lecture', sortable: true, render: (l) => (
      <div>
        <p className="font-medium text-slate-900">{l.title}</p>
        <p className="max-w-md truncate text-xs text-slate-500">{l.description}</p>
      </div>
    )},
    { key: 'course', label: 'Course', render: (l) => db.courses.find((c) => c.id === l.courseId)?.title || '—' },
    { key: 'section', label: 'Section', render: (l) => l.sectionName || db.sections.find((s) => s.id === l.sectionId)?.title || '—' },
    { key: 'teacher', label: 'Teacher', render: (l) => db.teachers.find((t) => t.id === l.teacherId)?.name || '—' },
    { key: 'durationMin', label: 'Duration', sortable: true, render: (l) => `${l.durationMin} min` },
    { key: 'views', label: 'Views', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (l) => <Badge tone={l.status === 'published' ? 'green' : 'amber'}>{l.status}</Badge> },
    { key: 'actions', label: '', render: (l) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Move up" onClick={() => move(l, -1)}><ChevronUp className="h-4 w-4" /></IconButton>
        <IconButton title="Move down" onClick={() => move(l, 1)}><ChevronDown className="h-4 w-4" /></IconButton>
        <IconButton title="Edit" onClick={() => { setEdit({ ...l, date: undefined }); setErrors({}) }}><Pencil className="h-4 w-4" /></IconButton>
        <IconButton title={l.status === 'published' ? 'Unpublish' : 'Publish'} onClick={() => setPublishTarget(l)}>
          <Send className={cx('h-4 w-4', l.status === 'published' ? 'text-amber-600' : 'text-emerald-600')} />
        </IconButton>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Recorded Lectures" subtitle="Video files are hosted on YouTube/Vimeo — only authorised URLs are stored" actions={
        <Button icon={Plus} onClick={openNew}>Add lecture</Button>
      } />

      <Card>
        <CardHeader title="Lecture library" subtitle={`${counts.published} published · ${counts.draft} drafts`} actions={
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
        <DataTable columns={columns} data={filtered} emptyMessage="No lectures match the filters." />
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit lecture' : 'Add recorded lecture'} subtitle="Uploads go through a secure storage workflow in production — never PostgreSQL" wide>
        {edit && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title} className="sm:col-span-2">
              <Input value={edit.title} invalid={!!errors.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} placeholder="e.g. Rotational Motion — Core Concepts" />
            </Field>
            <Field label="Description" required error={errors.description} className="sm:col-span-2">
              <Textarea rows={2} value={edit.description} invalid={!!errors.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} />
            </Field>
            <Field label="Course" required error={errors.courseId}>
              <Select value={edit.courseId} invalid={!!errors.courseId} onChange={(e) => setEdit({ ...edit, courseId: e.target.value, sectionId: '' })}>
                {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </Field>
            <Field label="Section" required error={errors.sectionId}>
              <Select value={edit.sectionId} invalid={!!errors.sectionId} onChange={(e) => setEdit({ ...edit, sectionId: e.target.value })}>
                <option value="">Select section</option>
                {sectionsForCourse.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </Select>
            </Field>
            <Field label="Batch (optional)">
              <Select value={edit.batchId} onChange={(e) => setEdit({ ...edit, batchId: e.target.value })}>
                <option value="">All batches</option>
                {batchesForCourse.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label="Teacher" required error={errors.teacherId}>
              <Select value={edit.teacherId} invalid={!!errors.teacherId} onChange={(e) => setEdit({ ...edit, teacherId: e.target.value })}>
                <option value="">Select teacher</option>
                {(teachersForCourse.length ? teachersForCourse : db.teachers.filter((t) => t.status === 'active')).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Video URL (YouTube / Vimeo)" required error={errors.videoUrl}>
              <Input value={edit.videoUrl} invalid={!!errors.videoUrl} onChange={(e) => setEdit({ ...edit, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
            </Field>
            <Field label="Duration (minutes)" required error={errors.durationMin}>
              <Input type="number" min="1" value={edit.durationMin} invalid={!!errors.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: e.target.value })} />
            </Field>
            <Field label="Order in section">
              <Input type="number" min="1" value={edit.order} onChange={(e) => setEdit({ ...edit, order: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save} icon={Plus}>{edit.id ? 'Save changes' : 'Add lecture'}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        onConfirm={togglePublish}
        title={publishTarget?.status === 'published' ? 'Unpublish lecture?' : 'Publish lecture?'}
        message={publishTarget?.status === 'published'
          ? 'Students will no longer see this lecture in their course player.'
          : 'This lecture becomes visible to all enrolled students.'}
        confirmLabel={publishTarget?.status === 'published' ? 'Unpublish' : 'Publish'}
      />
    </div>
  )
}
