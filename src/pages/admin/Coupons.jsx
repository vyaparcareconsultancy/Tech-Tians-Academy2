import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Ticket } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Switch, PageHeader, useToast, IconButton, ConfirmDialog, SearchInput } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, cx } from '../../lib/utils.js'

export default function Coupons() {
  const { db, insert, update, remove, audit } = useData()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [edit, setEdit] = useState(null)
  const [errors, setErrors] = useState({})
  const [deleteTarget, setDeleteTarget] = useState(null)

  const filtered = db.coupons.filter((c) => !q.trim() || c.code.toLowerCase().includes(q.trim().toLowerCase()))

  const openNew = () => {
    setEdit({ code: '', type: 'percent', value: 10, validFrom: '', validTill: '', maxUses: 100, usedCount: 0, active: true })
    setErrors({})
  }

  const save = () => {
    const errs = validateFields(edit, {
      code: [rules.required('Code')],
      value: [rules.required('Value'), rules.number('Value')],
      validFrom: [rules.required('Valid from')],
      validTill: [rules.required('Valid till')],
    })
    if (edit.type === 'percent' && Number(edit.value) > 100) errs.value = 'Percent discount cannot exceed 100'
    if (edit.validFrom && edit.validTill && edit.validTill < edit.validFrom) errs.validTill = 'Expiry must be after start'
    if (!edit.id && db.coupons.some((c) => c.code.toLowerCase() === (edit.code || '').trim().toLowerCase())) {
      errs.code = 'A coupon with this code already exists'
    }
    setErrors(errs)
    if (Object.keys(errs).length) return
    const payload = { ...edit, code: edit.code.toUpperCase().replace(/\s+/g, ''), value: Number(edit.value), maxUses: Number(edit.maxUses) }
    if (edit.id) {
      update('coupons', edit.id, payload)
      audit('coupon.updated', 'coupons', `Updated coupon ${payload.code}`)
      toast.success('Coupon updated.')
    } else {
      insert('coupons', payload)
      audit('coupon.created', 'coupons', `Created coupon ${payload.code}`)
      toast.success('Coupon created.')
    }
    setEdit(null)
  }

  const toggleActive = (c) => {
    update('coupons', c.id, { active: !c.active })
    audit(c.active ? 'coupon.deactivated' : 'coupon.activated', 'coupons', `Coupon ${c.code} ${c.active ? 'deactivated' : 'activated'}`)
    toast.success(`Coupon ${c.code} ${c.active ? 'deactivated' : 'activated'}.`)
  }

  const columns = [
    { key: 'code', label: 'Code', sortable: true, render: (c) => <span className="font-mono font-medium text-brand">{c.code}</span> },
    { key: 'value', label: 'Discount', render: (c) => <span className="font-mono font-medium text-gold">{c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}</span> },
    { key: 'validity', label: 'Validity', render: (c) => <span className="font-mono text-xs">{formatDate(c.validFrom)} → {formatDate(c.validTill)}</span> },
    { key: 'usage', label: 'Usage', sortable: true, render: (c) => {
      const pct = c.maxUses ? Math.round((c.usedCount / c.maxUses) * 100) : 0
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10">
            <div className={cx('h-full rounded-full transition-all', pct >= 90 ? 'bg-red-500' : 'bg-brand')} style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-xs text-muted">{c.usedCount}/{c.maxUses}</span>
        </div>
      )
    }},
    { key: 'active', label: 'Status', sortable: true, render: (c) => <Badge tone={c.active ? 'brand' : 'muted'}>{c.active ? 'Active' : 'Disabled'}</Badge> },
    { key: 'actions', label: '', render: (c) => (
      <div className="flex items-center justify-end gap-1">
        <Switch checked={c.active} onChange={() => toggleActive(c)} />
        <IconButton title="Edit" onClick={() => { setEdit({ ...c }); setErrors({}) }}><Pencil className="h-4 w-4" /></IconButton>
        <IconButton title="Delete" className="hover:bg-red-500/10 hover:text-red-400" onClick={() => setDeleteTarget(c)}><Trash2 className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Coupons" subtitle="Discount codes for enrollment campaigns" actions={
        <Button icon={Plus} onClick={openNew}>New coupon</Button>
      } />

      <Card>
        <CardHeader title="All coupons" actions={<SearchInput value={q} onChange={setQ} placeholder="Search codes…" className="w-56" />} />
        <DataTable columns={columns} data={filtered} emptyMessage="No coupons match the search." />
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit coupon' : 'New coupon'}>
        {edit && (
          <div className="space-y-4">
            <Field label="Code" required error={errors.code} hint="Uppercase, no spaces">
              <Input value={edit.code} invalid={!!errors.code} onChange={(e) => setEdit({ ...edit, code: e.target.value.toUpperCase() })} placeholder="e.g. FEST25" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <Select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed amount (₹)</option>
                </Select>
              </Field>
              <Field label={edit.type === 'percent' ? 'Discount %' : 'Discount (₹)'} required error={errors.value}>
                <Input type="number" min="0" max={edit.type === 'percent' ? 100 : undefined} value={edit.value} invalid={!!errors.value} onChange={(e) => setEdit({ ...edit, value: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valid from" required error={errors.validFrom}>
                <Input type="date" value={edit.validFrom} invalid={!!errors.validFrom} onChange={(e) => setEdit({ ...edit, validFrom: e.target.value })} />
              </Field>
              <Field label="Valid till" required error={errors.validTill}>
                <Input type="date" value={edit.validTill} invalid={!!errors.validTill} onChange={(e) => setEdit({ ...edit, validTill: e.target.value })} />
              </Field>
            </div>
            <Field label="Max uses">
              <Input type="number" min="1" value={edit.maxUses} onChange={(e) => setEdit({ ...edit, maxUses: e.target.value })} />
            </Field>
            <Switch checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active immediately" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEdit(null)}>Cancel</Button>
              <Button onClick={save} icon={Ticket}>Save coupon</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          remove('coupons', deleteTarget.id)
          audit('coupon.deleted', 'coupons', `Deleted coupon ${deleteTarget.code}`)
          toast.info('Coupon deleted.')
          setDeleteTarget(null)
        }}
        title="Delete coupon?"
        message={`Code ${deleteTarget?.code} will stop working immediately.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  )
}
