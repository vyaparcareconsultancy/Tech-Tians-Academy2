import React, { useState } from 'react'
import { Plus, FileDown, UploadCloud, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, IconButton, ConfirmDialog, SearchInput } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate } from '../../lib/utils.js'

export default function Materials() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, remove, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)
  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)

  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', courseId: '', fileType: 'pdf', fileName: '', link: '' })
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = db.materials.filter((m) => myCourseIds.includes(m.courseId) && (!q.trim() || m.title.toLowerCase().includes(q.trim().toLowerCase())))

  const save = () => {
    const errs = validateFields(form, {
      title: [rules.required('Title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
      fileName: [rules.required('File name')],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    insert('materials', {
      teacherId,
      courseId: form.courseId,
      title: form.title,
      fileName: form.fileName || `${form.title.toLowerCase().replace(/\s+/g, '-')}.${form.fileType}`,
      fileType: form.fileType,
      sizeMB: '0.0',
      uploadedAt: new Date().toISOString(),
      downloads: 0,
    })
    audit('material.uploaded', 'materials', `Uploaded "${form.title}"`)
    toast.success('Study material added.')
    setAdding(false)
    setForm({ title: '', courseId: '', fileType: 'pdf', fileName: '', link: '' })
  }

  const columns = [
    { key: 'title', label: 'Material', sortable: true, render: (m) => (
      <div>
        <p className="font-medium text-white">{m.title}</p>
        <p className="font-mono text-xs text-muted">{db.courses.find((c) => c.id === m.courseId)?.title}</p>
      </div>
    )},
    { key: 'fileName', label: 'File', render: (m) => <span className="font-mono text-xs">{m.fileName}</span> },
    { key: 'fileType', label: 'Type', render: (m) => <Badge tone="muted">{m.fileType.toUpperCase()}</Badge> },
    { key: 'sizeMB', label: 'Size', sortable: true, render: (m) => <span className="font-mono">{m.sizeMB} MB</span> },
    { key: 'uploadedAt', label: 'Uploaded', sortable: true, render: (m) => <span className="font-mono text-xs">{formatDate(m.uploadedAt)}</span> },
    { key: 'downloads', label: 'Downloads', sortable: true, render: (m) => (
      <span className="inline-flex items-center gap-1 font-mono text-xs"><FileDown className="h-3.5 w-3.5 text-brand" />{m.downloads}</span>
    )},
    { key: 'actions', label: '', render: (m) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Delete" className="hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => setDeleteTarget(m)}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Notes, worksheets and past papers for your courses" actions={
        <Button icon={Plus} onClick={() => setAdding(true)}>Add material</Button>
      } />

      <Card className="mb-4 border-dashed border-line bg-surface/40">
        <div className="flex items-center gap-3 px-5 py-4">
          <UploadCloud className="h-8 w-8 text-brand shrink-0" />
          <p className="text-sm text-muted">
            In production, files upload directly to secure object storage via signed URLs and are served through time-limited links. Demo mode accepts metadata only.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Your materials" actions={<SearchInput value={q} onChange={setQ} placeholder="Search materials…" className="w-56" />} />
        <DataTable columns={columns} data={filtered} emptyMessage="No materials yet — add your first one." />
      </Card>

      <Modal open={adding} onClose={() => setAdding(false)} title="Add study material">
        <div className="space-y-4">
          <Field label="Title" required error={errors.title}>
            <Input value={form.title} invalid={!!errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Chapter 3 Revision Notes" />
          </Field>
          <Field label="Course" required error={errors.courseId}>
            <Select value={form.courseId} invalid={!!errors.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Select course</option>
              {db.courses.filter((c) => myCourseIds.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="File type">
              <Select value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}>
                {['pdf', 'docx', 'pptx', 'zip'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="File name" required error={errors.fileName}>
              <Input value={form.fileName} invalid={!!errors.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="notes-ch3.pdf" />
            </Field>
          </div>
          <Field label="External link (optional)">
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={save} icon={UploadCloud}>Upload material</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          remove('materials', deleteTarget.id)
          audit('material.deleted', 'materials', `Removed "${deleteTarget.title}"`)
          toast.info('Material deleted.')
          setDeleteTarget(null)
        }}
        title="Delete material?"
        message={`"${deleteTarget?.title}" will be removed from student access.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
