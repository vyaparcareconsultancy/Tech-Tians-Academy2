import React, { useState } from 'react'
import { Megaphone, Pin, Send, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea, Switch, PageHeader, useToast, IconButton, ConfirmDialog, EmptyState } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { timeAgo } from '../../lib/utils.js'

export default function TeacherAnnouncements() {
  const { user } = useAuth()
  const { db, teacherIdForUser, insert, remove, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)
  const myBatches = db.batches.filter((b) => b.teacherId === teacherId)

  const [form, setForm] = useState({ title: '', body: '', batchId: '', pinned: false })
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const mine = db.announcements.filter((a) => a.createdBy === teacherId)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))

  const save = () => {
    const errs = validateFields(form, { title: [rules.required('Title'), rules.minLen(4)], body: [rules.required('Message'), rules.minLen(10)] })
    setErrors(errs)
    if (Object.keys(errs).length) return
    insert('announcements', {
      ...form,
      batchId: form.batchId || null,
      audience: form.batchId ? 'batch' : 'students',
      createdBy: teacherId,
      createdAt: new Date().toISOString(),
    })
    audit('announcement.posted', 'announcements', `Posted "${form.title}" to your students`)
    toast.success('Announcement published to your students.')
    setForm({ title: '', body: '', batchId: '', pinned: false })
  }

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Message the students in your batches" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1 h-fit">
          <CardHeader title="Compose" subtitle="Pinned messages stay on top" />
          <div className="space-y-4 px-5 py-4">
            <Field label="Title" required error={errors.title}>
              <Input value={form.title} invalid={!!errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Test postponed to Sunday" />
            </Field>
            <Field label="Message" required error={errors.body}>
              <Textarea rows={4} value={form.body} invalid={!!errors.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <Field label="Batch audience">
              <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                <option value="">All my students</option>
                {myBatches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
            <Switch checked={form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Pin to top" />
            <Button className="w-full" icon={Send} onClick={save}>Publish</Button>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Your announcements" subtitle={`${mine.length} published`} />
          {mine.length === 0 ? (
            <EmptyState icon={Megaphone} title="Nothing published yet" message="Compose an announcement for your students." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {mine.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-5 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Megaphone className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                      {a.pinned && <Badge tone="amber"><Pin className="h-3 w-3" />Pinned</Badge>}
                      {a.batchId && <Badge tone="slate">{db.batches.find((b) => b.id === a.batchId)?.name}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{a.body}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{timeAgo(a.createdAt)}</p>
                  </div>
                  <IconButton title="Delete" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleteTarget(a)}>
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          remove('announcements', deleteTarget.id)
          audit('announcement.deleted', 'announcements', `Removed "${deleteTarget.title}"`)
          toast.info('Announcement removed.')
          setDeleteTarget(null)
        }}
        title="Delete announcement?"
        message={`"${deleteTarget?.title}" will be removed.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
