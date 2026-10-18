import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchInput, Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Avatar, ProgressBar, ConfirmDialog, PageHeader, EmptyState, Tabs, useToast, IconButton } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { isEmail, validateFields, rules } from '../../lib/validators.js'
import { formatDate, formatINR, initials, cx } from '../../lib/utils.js'
import { Eye, Pencil, UserCheck, UserX, X, Search } from 'lucide-react'

export default function Students() {
  const { db, update, audit } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [statusFilter, setStatusFilter] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [progressFilter, setProgressFilter] = useState('all')

  const [viewStudent, setViewStudent] = useState(null)
  const [editStudent, setEditStudent] = useState(null)
  const [editErrors, setEditErrors] = useState({})
  const [suspendTarget, setSuspendTarget] = useState(null)

  useEffect(() => {
    const qp = params.get('q')
    if (qp != null) setQ(qp)
  }, [params])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return db.students.filter((s) => {
      if (query && ![s.name, s.email, s.studentId].join(' ').toLowerCase().includes(query)) return false
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (courseFilter !== 'all' && !db.enrollments.some((e) => e.studentId === s.id && e.courseId === courseFilter)) return false
      const enrs = db.enrollments.filter((e) => e.studentId === s.id)
      const avg = enrs.length ? enrs.reduce((sum, e) => sum + (e.progressPct || 0), 0) / enrs.length : 0
      if (progressFilter === 'on-track' && avg < 50) return false
      if (progressFilter === 'ahead' && avg >= 50) return false
      if (progressFilter === 'none' && enrs.length > 0) return false
      if (progressFilter === 'enrolled' && enrs.length === 0) return false
      return true
    })
  }, [db, q, statusFilter, courseFilter, progressFilter])

  const statsFor = (s) => {
    const enrs = db.enrollments.filter((e) => e.studentId === s.id)
    const avg = enrs.length ? Math.round(enrs.reduce((sum, e) => sum + (e.progressPct || 0), 0) / enrs.length) : 0
    const spent = db.orders.filter((o) => o.studentId === s.id && o.status === 'paid').reduce((sum, o) => sum + o.amount, 0)
    return { enrs, avg, spent }
  }

  const saveEdit = () => {
    const errors = validateFields(editStudent, {
      name: [rules.required('Name'), rules.minLen(3)],
      email: [rules.required('Email'), rules.email()],
      phone: [rules.required('Phone')],
      grade: [rules.required('Class/Grade')],
    })
    setEditErrors(errors)
    if (Object.keys(errors).length) return
    update('students', editStudent.id, editStudent)
    audit('student.updated', 'students', `Updated profile of ${editStudent.name}`)
    toast.success(`Student ${editStudent.name} updated.`)
    setEditStudent(null)
  }

  const toggleStatus = (s) => {
    const next = s.status === 'active' ? 'suspended' : 'active'
    update('students', s.id, { status: next })
    audit(next === 'suspended' ? 'student.suspended' : 'student.activated', 'students', `${next === 'suspended' ? 'Suspended' : 'Reactivated'} account of ${s.name} (${s.studentId})`)
    toast.success(next === 'suspended' ? `${s.name} suspended.` : `${s.name} reactivated.`)
    setSuspendTarget(null)
  }

  const columns = [
    { key: 'name', label: 'Student', sortable: true, render: (s) => (
      <div className="flex items-center gap-3">
        <Avatar name={s.name} />
        <div>
          <p className="font-medium text-slate-900">{s.name}</p>
          <p className="text-xs text-slate-500">{s.studentId}</p>
        </div>
      </div>
    )},
    { key: 'email', label: 'Email', sortable: true },
    { key: 'grade', label: 'Class', sortable: true },
    { key: 'courses', label: 'Enrollments', render: (s) => <span>{statsFor(s).enrs.length} course(s)</span> },
    { key: 'progress', label: 'Avg. progress', render: (s) => {
      const { avg } = statsFor(s)
      return avg ? <div className="flex w-28 items-center gap-2"><ProgressBar value={avg} className="w-16" /><span className="text-xs text-slate-500">{avg}%</span></div> : <span className="text-xs text-slate-400">—</span>
    }},
    { key: 'status', label: 'Status', sortable: true, render: (s) => <Badge tone={s.status === 'active' ? 'green' : 'red'}>{s.status}</Badge> },
    { key: 'enrolledAt', label: 'Joined', sortable: true, render: (s) => formatDate(s.enrolledAt) },
    { key: 'actions', label: '', render: (s) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View profile" onClick={() => setViewStudent(s)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Edit" onClick={() => { setEditStudent({ ...s }); setEditErrors({}) }}><Pencil className="h-4 w-4" /></IconButton>
        {s.status === 'active'
          ? <IconButton title="Suspend account" className="hover:bg-rose-50 hover:text-rose-600" onClick={() => setSuspendTarget(s)}><UserX className="h-4 w-4" /></IconButton>
          : <IconButton title="Reactivate account" onClick={() => toggleStatus(s)}><UserCheck className="h-4 w-4" /></IconButton>}
      </div>
    )},
  ]

  const drawer = viewStudent && db.students.find((s) => s.id === viewStudent.id)
  const drawerStats = drawer ? statsFor(drawer) : null

  return (
    <div>
      <PageHeader title="Students" subtitle={`${db.students.length} learners on the platform`} actions={
        <Badge tone="navy" className="px-2.5 py-1">Search, filter, suspend or reactivate accounts</Badge>
      } />

      <Card>
        <CardHeader title="All students" subtitle="Refine the list with search and filters" actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Name, email or student ID…" className="w-64" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-32">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-48">
              <option value="all">All courses</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Select value={progressFilter} onChange={(e) => setProgressFilter(e.target.value)} className="w-36">
              <option value="all">Any progress</option>
              <option value="enrolled">Enrolled</option>
              <option value="on-track">Behind (&lt;50%)</option>
              <option value="ahead">On track (≥50%)</option>
              <option value="none">No enrollments</option>
            </Select>
          </div>
        } />
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(s) => setViewStudent(s)}
          emptyMessage="Try adjusting your search or filters."
        />
      </Card>

      {/* Profile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-navy-950/40" onClick={() => setViewStudent(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-pop">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={drawer.name} className="h-11 w-11" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{drawer.name}</h2>
                  <p className="text-sm text-slate-500">{drawer.studentId} · {drawer.grade}</p>
                </div>
              </div>
              <IconButton onClick={() => setViewStudent(null)}><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Tabs
                value={params.get('tab') || 'overview'}
                onChange={(v) => setParams({ q: params.get('q') || '', tab: v })}
                tabs={[{ value: 'overview', label: 'Overview' }, { value: 'enrollments', label: `Enrollments (${drawerStats.enrs.length})` }, { value: 'activity', label: 'Payments' }]}
              />
              <div className="mt-5">
                {params.get('tab') !== 'enrollments' && params.get('tab') !== 'activity' && (
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {[
                      ['Email', drawer.email],
                      ['Phone', drawer.phone],
                      ['Class', drawer.grade],
                      ['City', drawer.city],
                      ['Status', drawer.status],
                      ['Member since', formatDate(drawer.enrolledAt)],
                      ['Avg. progress', `${drawerStats.avg}%`],
                      ['Total spent', formatINR(drawerStats.spent)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs font-medium text-slate-400">{k}</dt>
                        <dd className="mt-0.5 text-sm font-medium text-slate-800">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {params.get('tab') === 'enrollments' && (
                  <ul className="space-y-3">
                    {drawerStats.enrs.length === 0 && <EmptyState icon={Search} title="No enrollments yet" />}
                    {drawerStats.enrs.map((e) => {
                      const c = db.courses.find((c) => c.id === e.courseId)
                      const b = e.batchId ? db.batches.find((x) => x.id === e.batchId) : null
                      return (
                        <li key={e.id} className="rounded-lg border border-slate-200 p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-800">{c?.title}</p>
                            <Badge tone={e.status === 'active' ? 'green' : 'slate'}>{e.status}</Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">{b ? `Batch ${b.name}` : 'Direct enrollment'} · since {formatDate(e.enrolledAt)}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <ProgressBar value={e.progressPct || 0} className="flex-1" />
                            <span className="text-xs text-slate-500">{e.progressPct || 0}%</span>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {params.get('tab') === 'activity' && (
                  <ul className="space-y-2">
                    {db.orders.filter((o) => o.studentId === drawer.id).length === 0 && (
                      <EmptyState title="No orders" message="This student has not placed any orders." />
                    )}
                    {db.orders.filter((o) => o.studentId === drawer.id).map((o) => (
                      <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3.5 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{o.orderId}</p>
                          <p className="text-xs text-slate-500">{db.courses.find((c) => c.id === o.courseId)?.title} · {formatDate(o.createdAt)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatINR(o.amount)}</p>
                          <Badge tone={o.status === 'paid' ? 'green' : o.status === 'refunded' ? 'slate' : 'amber'}>{o.status}</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Edit modal */}
      <Modal open={!!editStudent} onClose={() => setEditStudent(null)} title="Edit student" subtitle="Only permitted profile fields can be edited">
        {editStudent && (
          <div className="space-y-4">
            <Field label="Full name" required error={editErrors.name}>
              <Input value={editStudent.name} invalid={!!editErrors.name} onChange={(e) => setEditStudent({ ...editStudent, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" required error={editErrors.email}>
                <Input value={editStudent.email} invalid={!!editErrors.email} onChange={(e) => setEditStudent({ ...editStudent, email: e.target.value })} />
              </Field>
              <Field label="Phone" required error={editErrors.phone}>
                <Input value={editStudent.phone} invalid={!!editErrors.phone} onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Class / Grade" required error={editErrors.grade}>
                <Input value={editStudent.grade} invalid={!!editErrors.grade} onChange={(e) => setEditStudent({ ...editStudent, grade: e.target.value })} />
              </Field>
              <Field label="City">
                <Input value={editStudent.city} onChange={(e) => setEditStudent({ ...editStudent, city: e.target.value })} />
              </Field>
            </div>
            <Field label="Account status">
              <Select value={editStudent.status} onChange={(e) => setEditStudent({ ...editStudent, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </Field>
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Email, password and role changes require a separate identity workflow (Supabase Auth admin API).
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditStudent(null)}>Cancel</Button>
              <Button onClick={saveEdit}>Save changes</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => toggleStatus(suspendTarget)}
        title={suspendTarget?.status === 'active' ? 'Suspend student account?' : 'Reactivate account?'}
        message={suspendTarget?.status === 'active'
          ? `${suspendTarget?.name} will lose access to all courses immediately. This action is audited.`
          : `${suspendTarget?.name} will regain access to their enrolled courses.`}
        confirmLabel={suspendTarget?.status === 'active' ? 'Suspend account' : 'Reactivate'}
        danger
      />
    </div>
  )
}
