import React, { useState } from 'react'
import { Plus, FileDown, UploadCloud, Trash2, FileText, CheckCircle2, AlertCircle } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, PageHeader, useToast, IconButton, ConfirmDialog, SearchInput, ProgressBar } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { storageApi } from '../../lib/api/storage.js'
import { isDemoMode } from '../../lib/supabase.js'
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
  const [selectedFile, setSelectedFile] = useState(null)
  const [fileError, setFileError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = db.materials.filter((m) => myCourseIds.includes(m.courseId) && (!q.trim() || m.title.toLowerCase().includes(q.trim().toLowerCase())))

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    setFileError('')
    if (!f) return
    try {
      storageApi.validateFile(f)
      setSelectedFile(f)
      const ext = f.name.split('.').pop().toLowerCase()
      setForm((prev) => ({
        ...prev,
        fileName: f.name,
        fileType: ['pdf', 'docx', 'pptx', 'zip'].includes(ext) ? ext : 'pdf',
        title: prev.title || f.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      }))
    } catch (err) {
      setFileError(err.message)
      setSelectedFile(null)
    }
  }

  const save = async () => {
    const errs = validateFields(form, {
      title: [rules.required('Title'), rules.minLen(4)],
      courseId: [rules.required('Course')],
    })
    if (!selectedFile && !form.fileName) {
      errs.fileName = 'Please choose a file to upload.'
    }
    setErrors(errs)
    if (Object.keys(errs).length || fileError) return

    setIsUploading(true)
    setUploadProgress(10)

    try {
      let storageKey = null
      let sizeMB = selectedFile ? (selectedFile.size / (1024 * 1024)).toFixed(1) : '0.0'

      if (selectedFile) {
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `materials/${form.courseId}/${Date.now()}-${cleanName}`
        const res = await storageApi.upload('materials', path, selectedFile, setUploadProgress)
        storageKey = res.path

        if (res.isMock || isDemoMode) {
          toast.info('uploads work only with Supabase')
        }
      }

      await insert('materials', {
        teacherId,
        courseId: form.courseId,
        title: form.title,
        fileName: form.fileName || selectedFile?.name || `${form.title.toLowerCase().replace(/\s+/g, '-')}.${form.fileType}`,
        fileType: form.fileType,
        storageKey,
        sizeMB,
        uploadedAt: new Date().toISOString(),
        downloads: 0,
      })
      await audit('material.uploaded', 'materials', `Uploaded "${form.title}"`)
      toast.success('Study material added.')
      setAdding(false)
      setForm({ title: '', courseId: '', fileType: 'pdf', fileName: '', link: '' })
      setSelectedFile(null)
      setFileError('')
      setUploadProgress(0)
    } catch (err) {
      toast.error(err.message || 'Failed to upload material')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDownload = async (m) => {
    if (m.storageKey) {
      try {
        const url = await storageApi.getSignedUrl('materials', m.storageKey, 3600)
        if (url) {
          window.open(url, '_blank')
          return
        }
      } catch (err) {
        toast.error(err.message || 'Failed to get download URL')
        return
      }
    }
    toast.info(`Demo mode: sample file download simulated (${m.fileName})`)
  }

  const columns = [
    { key: 'title', label: 'Material', sortable: true, render: (m) => (
      <div>
        <p className="font-medium text-white">{m.title}</p>
        <p className="font-mono text-xs text-muted">{db.courses.find((c) => c.id === m.courseId)?.title}</p>
      </div>
    )},
    { key: 'fileName', label: 'File', render: (m) => (
      <span className="inline-flex items-center gap-1.5 font-mono text-xs text-white/90">
        <FileText className="h-3.5 w-3.5 text-muted" />
        {m.fileName}
      </span>
    )},
    { key: 'fileType', label: 'Type', render: (m) => <Badge tone="muted">{m.fileType.toUpperCase()}</Badge> },
    { key: 'sizeMB', label: 'Size', sortable: true, render: (m) => <span className="font-mono">{m.sizeMB} MB</span> },
    { key: 'uploadedAt', label: 'Uploaded', sortable: true, render: (m) => <span className="font-mono text-xs">{formatDate(m.uploadedAt)}</span> },
    { key: 'downloads', label: 'Downloads', sortable: true, render: (m) => (
      <span className="inline-flex items-center gap-1 font-mono text-xs"><FileDown className="h-3.5 w-3.5 text-brand" />{m.downloads}</span>
    )},
    { key: 'actions', label: '', render: (m) => (
      <div className="flex justify-end gap-1">
        <IconButton title="Download" onClick={() => handleDownload(m)} className="hover:border-brand/40 hover:bg-brand/10 hover:text-brand">
          <FileDown className="h-4 w-4" />
        </IconButton>
        <IconButton title="Delete" className="hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-400" onClick={() => setDeleteTarget(m)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
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
            Files upload directly to secure Supabase Storage buckets via signed URLs and are served through time-limited links. In demo mode, sample files and metadata are simulated.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Your materials" actions={<SearchInput value={q} onChange={setQ} placeholder="Search materials…" className="w-56" />} />
        <DataTable columns={columns} data={filtered} emptyMessage="No materials yet — add your first one." />
      </Card>

      <Modal open={adding} onClose={() => !isUploading && setAdding(false)} title="Add study material">
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

          {/* File Upload Box */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-muted">
              File Attachment <span className="text-rose-400">*</span>
            </label>
            <div className="rounded-xl border-2 border-dashed border-line bg-surface/60 p-4 text-center transition hover:border-brand/40">
              <UploadCloud className="mx-auto h-7 w-7 text-brand/80" />
              <p className="mt-1 text-xs font-medium text-white">
                {selectedFile ? selectedFile.name : 'Choose a file from your computer'}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                PDF, DOCX, PPTX, ZIP, PNG, JPG (Max 50 MB)
              </p>
              <input
                type="file"
                id="materialFileInput"
                className="hidden"
                accept=".pdf,.docx,.pptx,.zip,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
              />
              <div className="mt-2.5 flex justify-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isUploading}
                  onClick={() => document.getElementById('materialFileInput')?.click()}
                >
                  {selectedFile ? 'Change file' : 'Select file'}
                </Button>
              </div>
            </div>
            {fileError && (
              <p className="flex items-center gap-1 font-mono text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {fileError}
              </p>
            )}
            {errors.fileName && !fileError && (
              <p className="font-mono text-xs text-rose-400">{errors.fileName}</p>
            )}
            {selectedFile && !fileError && (
              <p className="flex items-center gap-1 font-mono text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB ready
              </p>
            )}
          </div>

          {isUploading && (
            <div className="space-y-1 rounded-xl bg-surface/80 p-3">
              <div className="flex justify-between font-mono text-xs text-muted">
                <span>Uploading file…</span>
                <span>{uploadProgress}%</span>
              </div>
              <ProgressBar value={uploadProgress} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="File type">
              <Select value={form.fileType} onChange={(e) => setForm({ ...form, fileType: e.target.value })}>
                {['pdf', 'docx', 'pptx', 'zip'].map((t) => <option key={t}>{t}</option>)}
              </Select>
            </Field>
            <Field label="File name">
              <Input value={form.fileName} onChange={(e) => setForm({ ...form, fileName: e.target.value })} placeholder="notes-ch3.pdf" />
            </Field>
          </div>

          <Field label="External link (optional)">
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://…" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={isUploading} onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={save} icon={UploadCloud} loading={isUploading}>
              {isUploading ? 'Uploading…' : 'Upload material'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            if (deleteTarget.storageKey) {
              await storageApi.remove('materials', deleteTarget.storageKey).catch(() => {})
            }
            await remove('materials', deleteTarget.id)
            await audit('material.deleted', 'materials', `Removed "${deleteTarget.title}"`)
            toast.info('Material deleted.')
            setDeleteTarget(null)
          } catch (err) {
            toast.error(err.message || 'Failed to delete material')
          }
        }}
        title="Delete material?"
        message={`"${deleteTarget?.title}" will be removed from student access.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
