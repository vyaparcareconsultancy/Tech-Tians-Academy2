import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronUp, ChevronDown, Send, Save, Video, FileText, Lock } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Textarea, PageHeader, useToast, EmptyState, Tabs } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { uid, cx } from '../../lib/utils.js'

export default function CourseBuilder() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, update, remove, audit } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const teacherId = teacherIdForUser(user.id)

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const myCourses = db.courses.filter((c) => myCourseIds.includes(c.id))

  const [courseId, setCourseId] = useState(params.get('course') || myCourses[0]?.id || '')
  const [course, setCourse] = useState(null)
  const [lessonModal, setLessonModal] = useState(null) // { sectionId } or { lesson } 
  const [sectionModal, setSectionModal] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitConfirm, setSubmitConfirm] = useState(false)

  useEffect(() => {
    const c = db.courses.find((x) => x.id === courseId)
    setCourse(c || null)
  }, [courseId, db])

  const sections = useMemo(() => db.sections.filter((s) => s.courseId === courseId).sort((a, b) => a.order - b.order), [db, courseId])
  const lessonsFor = (secId) => db.lessons.filter((l) => l.sectionId === secId).sort((a, b) => a.order - b.order)

  const saveCourse = () => {
    if (!course) return
    update('courses', course.id, { ...course })
    audit('course.saved_draft', 'courses', `Saved draft of "${course.title}"`)
    toast.success('Course draft saved.')
  }

  const submitForApproval = () => {
    const errs = {}
    if (!course.title.trim()) errs.title = 'Title is required'
    if (!sections.length) errs.sections = 'Add at least one section'
    else if (sections.every((s) => lessonsFor(s.id).length === 0)) errs.sections = 'Add at least one lesson'
    setErrors(errs)
    if (Object.keys(errs).length) return
    update('courses', course.id, { status: 'pending_approval' })
    audit('course.submitted', 'courses', `"${course.title}" submitted for admin approval`)
    toast.success('Course submitted for admin approval.')
    setSubmitConfirm(false)
  }

  const saveSection = (title) => {
    const maxOrder = Math.max(0, ...sections.map((s) => s.order))
    insert('sections', { courseId, title, order: maxOrder + 1 })
    audit('section.created', 'course_sections', `Section "${title}" added to ${course.title}`)
    toast.success('Section added.')
    setSectionModal(false)
  }

  const saveLesson = () => {
    const errs = validateFields(lessonModal, {
      title: [rules.required('Title'), rules.minLen(4)],
      durationMin: [rules.required('Duration'), rules.number('Duration')],
      videoUrl: lessonModal.type === 'video' ? [rules.required('Video URL'), rules.videoUrl('Video URL')] : [],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const siblings = db.lessons.filter((l) => l.sectionId === lessonModal.sectionId)
    insert('lessons', {
      courseId,
      sectionId: lessonModal.sectionId,
      title: lessonModal.title,
      type: lessonModal.type,
      durationMin: Number(lessonModal.durationMin),
      videoUrl: lessonModal.type === 'video' ? lessonModal.videoUrl : null,
      order: siblings.length + 1,
      status: lessonModal.status || 'draft',
    })
    audit('lesson.created', 'lessons', `Lesson "${lessonModal.title}" added`)
    toast.success('Lesson saved as draft.')
    setLessonModal(null)
  }

  const moveLesson = (lesson, dir) => {
    const siblings = lessonsFor(lesson.sectionId)
    const idx = siblings.findIndex((l) => l.id === lesson.id)
    const swap = siblings[idx + dir]
    if (!swap) return
    update('lessons', lesson.id, { order: swap.order })
    update('lessons', swap.id, { order: lesson.order })
  }

  const deleteLesson = (lesson) => {
    remove('lessons', lesson.id)
    audit('lesson.deleted', 'lessons', `Removed lesson "${lesson.title}"`)
    toast.info('Lesson removed.')
  }

  const deleteSection = (section) => {
    db.lessons.filter((l) => l.sectionId === section.id).forEach((l) => remove('lessons', l.id))
    remove('sections', section.id)
    audit('section.deleted', 'course_sections', `Removed section "${section.title}"`)
    toast.info('Section removed with its lessons.')
  }

  const moveSection = (section, dir) => {
    const idx = sections.findIndex((s) => s.id === section.id)
    const swap = sections[idx + dir]
    if (!swap) return
    update('sections', section.id, { order: swap.order })
    update('sections', swap.id, { order: section.order })
  }

  return (
    <div>
      <PageHeader title="Course Builder" subtitle="Organise sections and lessons for your assigned courses" actions={
        <>
          <Button variant="secondary" icon={Save} onClick={saveCourse} disabled={!course}>Save draft</Button>
          <Button icon={Send} onClick={() => setSubmitConfirm(true)} disabled={!course}>Submit for approval</Button>
        </>
      } />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <Field label="Course" className="w-full sm:w-96">
            <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              {myCourses.length === 0 && <option value="">No assigned courses</option>}
              {myCourses.map((c) => <option key={c.id} value={c.id}>{c.title} — {c.status.replace('_', ' ')}</option>)}
            </Select>
          </Field>
          {course && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={course.status === 'published' ? 'green' : course.status === 'pending_approval' ? 'blue' : 'amber'}>{course.status.replace('_', ' ')}</Badge>
              <Field label="Title" className="flex-1">
                <Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
              </Field>
              <Field label="Price ₹" className="w-32">
                <Input type="number" min="0" value={course.price} onChange={(e) => setCourse({ ...course, price: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
        {errors.title && <p className="px-5 pb-3 text-xs text-rose-600">{errors.title}</p>}
        {errors.sections && <p className="px-5 pb-3 text-xs text-rose-600">{errors.sections}</p>}
      </Card>

      {!course ? (
        <Card><EmptyState icon={Lock} title="No course selected" message="Select one of your assigned courses to build its curriculum." /></Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sIdx) => (
            <Card key={section.id}>
              <CardHeader title={section.title} subtitle={`Section ${sIdx + 1} · ${lessonsFor(section.id).length} lessons`} actions={
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => moveSection(section, -1)} disabled={sIdx === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => moveSection(section, 1)} disabled={sIdx === sections.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button size="sm" variant="secondary" icon={Plus} onClick={() => setLessonModal({ sectionId: section.id, title: '', type: 'video', durationMin: 30, videoUrl: '', status: 'draft' })}>Add lesson</Button>
                  <Button size="sm" variant="ghost" className="hover:text-rose-600" onClick={() => deleteSection(section)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              } />
              {lessonsFor(section.id).length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-400">No lessons yet — add one to get started.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {lessonsFor(section.id).map((l, lIdx, arr) => (
                    <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-slate-500">
                        {l.type === 'video' ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{l.title}</p>
                        <p className="text-xs text-slate-500">{l.durationMin} min · {l.type}</p>
                      </div>
                      <Badge tone={l.status === 'published' ? 'green' : 'amber'}>{l.status}</Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => moveLesson(l, -1)} disabled={lIdx === 0}><ChevronUp className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => moveLesson(l, 1)} disabled={lIdx === arr.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="hover:text-rose-600" onClick={() => deleteLesson(l)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}

          {sections.length === 0 && (
            <Card><EmptyState icon={Plus} title="No sections yet" message="Sections group lessons into units." action={<Button className="mt-3" icon={Plus} onClick={() => setSectionModal(true)}>Add first section</Button>} /></Card>
          )}
          {sections.length > 0 && (
            <Button variant="secondary" icon={Plus} onClick={() => setSectionModal(true)}>Add section</Button>
          )}
        </div>
      )}

      {/* Section modal */}
      <Modal open={sectionModal} onClose={() => setSectionModal(false)} title="Add section">
        <SectionForm onCancel={() => setSectionModal(false)} onSave={saveSection} />
      </Modal>

      {/* Lesson modal */}
      <Modal open={!!lessonModal} onClose={() => setLessonModal(null)} title="Add lesson" subtitle="Video files must be hosted on YouTube or Vimeo">
        {lessonModal && (
          <div className="space-y-4">
            <Field label="Title" required error={errors.title}>
              <Input value={lessonModal.title} invalid={!!errors.title} onChange={(e) => setLessonModal({ ...lessonModal, title: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={lessonModal.type} onChange={(e) => setLessonModal({ ...lessonModal, type: e.target.value })}>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                </Select>
              </Field>
              <Field label="Duration (min)" required error={errors.durationMin}>
                <Input type="number" min="1" value={lessonModal.durationMin} invalid={!!errors.durationMin} onChange={(e) => setLessonModal({ ...lessonModal, durationMin: e.target.value })} />
              </Field>
            </div>
            {lessonModal.type === 'video' && (
              <Field label="Video URL (YouTube / Vimeo)" required error={errors.videoUrl} hint="Only the URL is stored — never the video file itself">
                <Input value={lessonModal.videoUrl} invalid={!!errors.videoUrl} onChange={(e) => setLessonModal({ ...lessonModal, videoUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
              </Field>
            )}
            <Field label="Status">
              <Select value={lessonModal.status} onChange={(e) => setLessonModal({ ...lessonModal, status: e.target.value })}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setLessonModal(null)}>Cancel</Button>
              <Button onClick={saveLesson} icon={Plus}>Save lesson</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={submitConfirm} onClose={() => setSubmitConfirm(false)} title="Submit for admin approval?" subtitle="Admins review curriculum completeness before publishing" footer={
        <>
          <Button variant="secondary" onClick={() => setSubmitConfirm(false)}>Keep editing</Button>
          <Button onClick={submitForApproval} icon={Send}>Submit</Button>
        </>
      }>
        <p className="text-sm text-slate-600">
          The course will move to <span className="font-medium">pending approval</span>. An administrator reviews the
          structure and publishes it for students.
        </p>
      </Modal>
    </div>
  )
}

function SectionForm({ onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const submit = () => {
    if (title.trim().length < 3) { setErr('Title must be at least 3 characters'); return }
    onSave(title.trim())
  }
  return (
    <div className="space-y-4">
      <Field label="Section title" required error={err}>
        <Input autoFocus value={title} invalid={!!err} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Unit 1: Foundations" onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit}>Add section</Button>
      </div>
    </div>
  )
}
