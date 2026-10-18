import React, { useState } from 'react'
import { Megaphone, Pin, Trash2, Send } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Select, Textarea, Switch, PageHeader, useToast, IconButton, ConfirmDialog, EmptyState } from '../../components/ui.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { timeAgo } from '../../lib/utils.js'

export default function Announcements() {
  const { db, insert, remove, audit } = useData()
  const toast = useToast()
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', batchId: '', pinned: false })
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const sorted = [...db.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))

  const save = () => {
    const errs = validateFields(form, {
      title: [rules.required('Title'), rules.minLen(4), rules.maxLen(120)],
      body: [rules.required('Message'), rules.minLen(10)],
    })
    setErrors(errs)
    if (Object.keys(errs).length) return
    insert('announcements', {
      ...form,
      batchId: form.batchId || null,
      createdBy: 'adm-001',
      createdAt: new Date().toISOString(),
    })
    audit('announcement.posted', 'announcements', `Posted "${form.title}" to ${form.audience}`)
    toast.success('Announcement published.')
    setForm({ title: '', body: '', audience: 'all', batchId: '', pinned: false })
  }

  const audienceLabel = { all: 'Everyone', students: 'Students only', teachers: 'Teachers only', batch: 'Single batch' }

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Broadcast messages to students, teachers or the whole academy" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1 h-fit">
          <CardHeader title="Compose" subtitle="Pinned announcements stay on top" />
          <div className="space-y-4 px-5 py-4">
            <Field label="Title" required error={errors.title}>
              <Input value={form.title} invalid={!!errors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Exam schedule update" />
            </Field>
            <Field label="Message" required error={errors.body}>
              <Textarea rows={4} value={form.body} invalid={!!errors.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write the announcement…" />
            </Field>
            <Field label="Audience">
              <Select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                <option value="all">Everyone</option>
                <option value="students">Students only</option>
                <option value="teachers">Teachers only</option>
                <option value="batch">Single batch</option>
              </Select>
            </Field>
            {form.audience === 'batch' && (
              <Field label="Batch">
                <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
                  <option value="">Select batch</option>
                  {db.batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            )}
            <Switch checked={form.pinned} onChange={(v) => setForm({ ...form, pinned: v })} label="Pin to top" />
            <Button className="w-full" icon={Send} onClick={save}>Publish announcement</Button>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Published" subtitle={<span className="font-mono">{db.announcements.length} announcements</span>} />
          {sorted.length === 0 ? (
            <EmptyState icon={Megaphone} title="No announcements yet" message="Compose your first announcement." />
          ) : (
            <ul className="divide-y divide-white/5">
              {sorted.map((a) => {
                const author = a.createdBy === 'adm-001' ? 'Aarav Sharma (Admin)' : db.teachers.find((t) => t.id === a.createdBy)?.name || 'Staff'
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                      <Megaphone className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading text-sm font-semibold text-white">{a.title}</p>
                        {a.pinned && <Badge tone="gold"><Pin className="h-3 w-3" />Pinned</Badge>}
                        <Badge tone="brand">{audienceLabel[a.audience] || a.audience}</Badge>
                        {a.batchId && <Badge tone="muted"><span className="font-mono">{db.batches.find((b) => b.id === a.batchId)?.name}</span></Badge>}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">{a.body}</p>
                      <p className="mt-1.5 font-mono text-xs text-muted">{author} · {timeAgo(a.createdAt)}</p>
                    </div>
                    <IconButton title="Delete" className="hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget(a)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          remove('announcements', deleteTarget.id)
          audit('announcement.deleted', 'announcements', `Removed announcement "${deleteTarget.title}"`)
          toast.info('Announcement removed.')
          setDeleteTarget(null)
        }}
        title="Delete announcement?"
        message={`"${deleteTarget?.title}" will no longer be visible to students and teachers.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
