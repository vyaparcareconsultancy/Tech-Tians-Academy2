import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Hash } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, useToast, IconButton, ConfirmDialog, EmptyState, SearchInput } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'

const PALETTE = ['#4672B8', '#6366F1', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function Subjects() {
  const { db, insert, update, remove, audit } = useData()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = db.subjects.filter((s) => !q.trim() || `${s.name} ${s.code}`.toLowerCase().includes(q.trim().toLowerCase()))

  const usageCount = (id) => db.courses.filter((c) => c.subjectId === id).length

  const save = () => {
    const errs = validateFields(edit, { name: [rules.required('Subject name'), rules.minLen(2)] })
    setErrors(errs)
    if (Object.keys(errs).length) return
    const code = (edit.code || edit.name.slice(0, 4)).toUpperCase()
    if (edit.id) {
      update('subjects', edit.id, { ...edit, code })
      audit('subject.updated', 'subjects', `Updated subject ${edit.name}`)
      toast.success('Subject updated.')
    } else {
      insert('subjects', { ...edit, code, courses_count: 0 })
      audit('subject.created', 'subjects', `Created subject ${edit.name}`)
      toast.success('Subject created.')
    }
    setEdit(null)
  }

  const removeSubject = () => {
    const used = usageCount(deleteTarget.id)
    if (used > 0) {
      toast.error(`Cannot delete — ${used} course(s) use this subject.`, 'Referential integrity')
      setDeleteTarget(null)
      return
    }
    remove('subjects', deleteTarget.id)
    audit('subject.deleted', 'subjects', `Deleted subject ${deleteTarget.name}`)
    toast.success('Subject deleted.')
    setDeleteTarget(null)
  }

  return (
    <div>
      <PageHeader title="Subjects" subtitle="Course taxonomy used across the academy" actions={
        <Button icon={Plus} onClick={() => { setEdit({ name: '', code: '', color: PALETTE[0], description: '' }); setErrors({}) }}>Add subject</Button>
      } />

      <Card>
        <CardHeader title="All subjects" subtitle={`${db.subjects.length} subjects defined`} actions={
          <SearchInput value={q} onChange={setQ} placeholder="Search subjects…" className="w-56" />
        } />
        <DataTable
          columns={[
            { key: 'color', label: '', render: (s) => <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: s.color }} /> },
            { key: 'name', label: 'Subject', sortable: true, render: (s) => <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-slate-400" /><span className="font-medium text-slate-900">{s.name}</span></div> },
            { key: 'code', label: 'Code', sortable: true },
            { key: 'description', label: 'Description' },
            { key: 'courses', label: 'Courses', render: (s) => <Badge tone="navy">{usageCount(s.id)}</Badge> },
            { key: 'actions', label: '', render: (s) => (
              <div className="flex justify-end gap-1">
                <IconButton title="Edit" onClick={() => { setEdit({ ...s }); setErrors({}) }}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton title="Delete" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            )},
          ]}
          data={filtered}
          emptyMessage="No subjects match the search."
        />
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit subject' : 'Add subject'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Subject name" required error={errors.name}>
              <Input value={edit.name} invalid={!!errors.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="e.g. Physics" />
            </Field>
            <Field label="Code" hint="Up to 4 characters, auto-generated if empty">
              <Input value={edit.code} maxLength={4} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="e.g. PHYS" />
            </Field>
            <Field label="Description">
              <Input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} placeholder="Short description" />
            </Field>
            <Field label="Accent colour">
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => (
                  <button key={c} type="button" onClick={() => setEdit({ ...edit, color: c })}
                    className={`h-8 w-8 rounded-lg transition ${edit.color === c ? 'ring-2 ring-indigo-500 ring-offset-2' : 'hover:scale-105'}`}
                    style={{ background: c }} aria-label={`colour ${c}`} />
                ))}
              </div>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={removeSubject}
        title="Delete subject?"
        message={`${deleteTarget?.name} is used by ${usageCount(deleteTarget?.id || '')} course(s). Subjects in use cannot be deleted.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
