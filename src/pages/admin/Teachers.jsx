import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  SearchInput, Badge, Button, Card, CardHeader, Field, Input, Modal, Select, Avatar,
  PageHeader, Tabs, useToast, IconButton, ConfirmDialog,
} from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules } from '../../lib/validators.js'
import { formatDate, cx } from '../../lib/utils.js'
import { Eye, UserCheck, UserX, UserPlus, Star, BookOpen, X, CheckCircle2 } from 'lucide-react'

export default function Teachers() {
  const { db, insert, update, remove, audit } = useData()
  const toast = useToast()
  const [params] = useSearchParams()
  const [localQ, setLocalQ] = useState(params.get('q') || '')
  const q = localQ
  const [tab, setTab] = useState('all')
  const [viewTeacher, setViewTeacher] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [assignTarget, setAssignTarget] = useState(null)
  const [actionTarget, setActionTarget] = useState(null) // { teacher, action }

  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', subject: '', qualification: '' })
  const [inviteErrors, setInviteErrors] = useState({})

  useEffect(() => {
    const qp = params.get('q')
    if (qp != null) setLocalQ(qp)
    if (qp) setTab('all')
  }, [params])

  const counts = useMemo(() => ({
    all: db.teachers.length,
    active: db.teachers.filter((t) => t.status === 'active').length,
    pending: db.teachers.filter((t) => t.status === 'pending').length,
    suspended: db.teachers.filter((t) => t.status === 'suspended').length,
  }), [db])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return db.teachers.filter((t) => {
      if (t.status === 'rejected') return false // rejected applications leave the directory
      if (query && ![t.name, t.email, t.subject].join(' ').toLowerCase().includes(query)) return false
      if (tab !== 'all' && t.status !== tab) return false
      return true
    })
  }, [db, q, tab])

  const statsFor = (t) => {
    const courseIds = db.teacherCourses.filter((tc) => tc.teacherId === t.id).map((tc) => tc.courseId)
    const students = new Set(db.enrollments.filter((e) => courseIds.includes(e.courseId)).map((e) => e.studentId))
    return { courseCount: courseIds.length, studentCount: students.size }
  }

  const submitInvite = () => {
    const errors = validateFields(inviteForm, {
      name: [rules.required('Full name'), rules.minLen(3)],
      email: [rules.required('Email'), rules.email()],
      subject: [rules.required('Subject')],
    })
    setInviteErrors(errors)
    if (Object.keys(errors).length) return
    insert('teachers', {
      name: inviteForm.name,
      email: inviteForm.email,
      phone: inviteForm.phone || '',
      subject: inviteForm.subject,
      qualification: inviteForm.qualification || '',
      bio: '',
      status: 'pending',
      rating: null,
      totalStudents: 0,
      joinedAt: new Date().toISOString(),
      approvedAt: null,
      appliedAt: new Date().toISOString(),
      userId: null,
    })
    audit('teacher.invited', 'teachers', `Invited ${inviteForm.name} (${inviteForm.email}) to apply`)
    toast.success(`Invitation sent to ${inviteForm.name}. They will appear under Pending.`)
    setInviteOpen(false)
    setInviteForm({ name: '', email: '', phone: '', subject: '', qualification: '' })
  }

  const decide = (teacher, decision) => {
    if (decision === 'approve') {
      update('teachers', teacher.id, { status: 'active', approvedAt: new Date().toISOString() })
      audit('teacher.approved', 'teachers', `Approved teacher application of ${teacher.name}`)
      toast.success(`${teacher.name} approved and activated.`)
    } else if (decision === 'reject') {
      update('teachers', teacher.id, { status: 'rejected' })
      audit('teacher.rejected', 'teachers', `Rejected application of ${teacher.name}`)
      toast.info(`Application from ${teacher.name} was rejected.`)
    } else {
      const next = teacher.status === 'suspended' ? 'active' : 'suspended'
      update('teachers', teacher.id, { status: next })
      audit(next === 'suspended' ? 'teacher.suspended' : 'teacher.activated', 'teachers', `${next === 'suspended' ? 'Suspended' : 'Reactivated'} ${teacher.name}`)
      toast.success(`${teacher.name} ${next === 'suspended' ? 'suspended' : 'reactivated'}.`)
    }
    setActionTarget(null)
  }

  const saveAssignments = () => {
    const selected = [...assignTarget.selected]
    // remove old links for this teacher, add new ones
    db.teacherCourses.filter((tc) => tc.teacherId === assignTarget.teacher.id).forEach((tc) => remove('teacherCourses', tc.id))
    selected.forEach((courseId) =>
      insert('teacherCourses', { teacherId: assignTarget.teacher.id, courseId, role: 'assistant', assignedAt: new Date().toISOString() })
    )
    audit('teacher.courses_assigned', 'teacher_courses', `Assigned ${selected.length} course(s) to ${assignTarget.teacher.name}`)
    toast.success('Course assignments updated.')
    setAssignTarget(null)
  }

  const columns = [
    { key: 'name', label: 'Teacher', sortable: true, render: (t) => (
      <div className="flex items-center gap-3">
        <Avatar name={t.name} />
        <div>
          <p className="font-medium text-white">{t.name}</p>
          <p className="text-xs text-muted">{t.subject}</p>
        </div>
      </div>
    )},
    { key: 'email', label: 'Email', sortable: true, render: (t) => <span className="font-mono text-xs text-muted">{t.email}</span> },
    { key: 'courses', label: 'Courses', render: (t) => <span className="font-mono text-sm">{statsFor(t).courseCount}</span> },
    { key: 'students', label: 'Students', render: (t) => <span className="font-mono text-sm">{statsFor(t).studentCount}</span> },
    { key: 'rating', label: 'Rating', sortable: true, render: (t) => t.rating ? (
      <span className="inline-flex items-center gap-1 font-mono text-sm font-medium text-gold"><Star className="h-3.5 w-3.5 fill-gold text-gold" />{t.rating}</span>
    ) : <span className="font-mono text-xs text-muted">—</span> },
    { key: 'status', label: 'Status', sortable: true, render: (t) => (
      <Badge tone={t.status === 'active' ? 'brand' : t.status === 'pending' ? 'gold' : 'red'}>{t.status}</Badge>
    )},
    { key: 'joinedAt', label: 'Joined', sortable: true, render: (t) => <span className="font-mono text-xs">{formatDate(t.joinedAt)}</span> },
    { key: 'actions', label: '', render: (t) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View profile" onClick={() => setViewTeacher(t)}><Eye className="h-4 w-4" /></IconButton>
        <IconButton title="Assign courses" onClick={() => setAssignTarget({ teacher: t, selected: db.teacherCourses.filter((tc) => tc.teacherId === t.id).map((tc) => tc.courseId) })}><BookOpen className="h-4 w-4" /></IconButton>
        {t.status === 'active'
          ? <IconButton title="Suspend" className="hover:bg-red-500/10 hover:text-red-400" onClick={() => setActionTarget({ teacher: t, action: 'suspend' })}><UserX className="h-4 w-4" /></IconButton>
          : <IconButton title="Reactivate" onClick={() => setActionTarget({ teacher: t, action: 'activate' })}><UserCheck className="h-4 w-4" /></IconButton>}
      </div>
    )},
  ]

  const view = viewTeacher && db.teachers.find((t) => t.id === viewTeacher.id)

  return (
    <div>
      <PageHeader title="Teachers" subtitle={<span className="font-mono">{counts.active} active · {counts.pending} pending review</span>} actions={
        <Button icon={UserPlus} onClick={() => setInviteOpen(true)}>Add / invite teacher</Button>
      } />

      <Card>
        <CardHeader
          title="Teacher directory"
          subtitle="Review applications, assign courses and manage access"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput value={q} onChange={setLocalQ} placeholder="Search teachers…" className="w-56" />
              <Tabs value={tab} onChange={setTab} tabs={[
                { value: 'all', label: 'All', count: counts.all },
                { value: 'pending', label: 'Pending', count: counts.pending },
                { value: 'active', label: 'Active', count: counts.active },
                { value: 'suspended', label: 'Suspended', count: counts.suspended },
              ]} />
            </div>
          }
        />
        {tab === 'pending' && counts.pending > 0 && (
          <div className="border-b border-gold/20 bg-gold/10 px-5 py-2.5 font-mono text-xs text-gold">
            {counts.pending} application(s) awaiting review. Approving grants access to the teacher panel.
          </div>
        )}
        <DataTable columns={columns} data={filtered} onRowClick={(t) => setViewTeacher(t)} emptyMessage="No teachers match the current filters." />
      </Card>

      {/* Profile drawer */}
      {view && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setViewTeacher(null)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-surface/95 text-white border-l border-white/10 shadow-card-soft backdrop-blur-xl">
            <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <Avatar name={view.name} className="h-11 w-11" />
                <div>
                  <h2 className="font-heading text-lg font-semibold text-white">{view.name}</h2>
                  <p className="font-mono text-xs text-muted">{view.subject} · {view.status}</p>
                </div>
              </div>
              <IconButton onClick={() => setViewTeacher(null)}><X className="h-5 w-5" /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                {[
                  { label: 'Email', value: view.email, mono: true, xs: true },
                  { label: 'Phone', value: view.phone || '—', mono: true, xs: true },
                  { label: 'Subject', value: view.subject },
                  { label: 'Qualification', value: view.qualification || '—' },
                  { label: 'Rating', value: view.rating ? `${view.rating} / 5` : 'Not rated yet', mono: !!view.rating },
                  { label: 'Joined', value: formatDate(view.joinedAt), mono: true },
                  { label: 'Approved', value: view.approvedAt ? formatDate(view.approvedAt) : '—', mono: !!view.approvedAt },
                  { label: 'Students taught', value: statsFor(view).studentCount, mono: true },
                ].map((item) => (
                  <div key={item.label}>
                    <dt className="text-xs font-medium text-muted">{item.label}</dt>
                    <dd className={cx('mt-0.5 text-sm font-medium text-white', item.mono && 'font-mono', item.xs && 'text-xs')}>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {view.bio && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-muted">{view.bio}</p>}
              <h3 className="mt-6 font-heading text-sm font-semibold text-white">Assigned courses</h3>
              <div className="mt-2 space-y-2">
                {db.teacherCourses.filter((tc) => tc.teacherId === view.id).length === 0 && (
                  <p className="text-sm text-muted">No courses assigned yet.</p>
                )}
                {db.teacherCourses.filter((tc) => tc.teacherId === view.id).map((tc) => {
                  const c = db.courses.find((x) => x.id === tc.courseId)
                  if (!c) return null
                  const stuCount = db.enrollments.filter((e) => e.courseId === c.id).length
                  return (
                    <div key={tc.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5">{db.covers[c.coverIndex]?.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{c.title}</p>
                        <p className="text-xs text-muted"><span className="font-mono">{stuCount}</span> students · {tc.role}</p>
                      </div>
                      <Badge tone="brand">{c.status}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
              <Button variant="secondary" onClick={() => { setViewTeacher(null); setAssignTarget({ teacher: view, selected: db.teacherCourses.filter((tc) => tc.teacherId === view.id).map((tc) => tc.courseId) }) }}>
                Assign courses
              </Button>
              {view.status === 'active' && (
                <Button variant="danger" onClick={() => setActionTarget({ teacher: view, action: 'suspend' })} icon={UserX}>Suspend</Button>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Add / invite teacher" subtitle="Invited teachers must apply and be approved before they can sign in">
        <div className="space-y-4">
          <Field label="Full name" required error={inviteErrors.name}>
            <Input value={inviteForm.name} invalid={!!inviteErrors.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="e.g. Dr. Anita Verma" />
          </Field>
          <Field label="Email" required error={inviteErrors.email}>
            <Input type="email" value={inviteForm.email} invalid={!!inviteErrors.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="name@techtians.academy" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} />
            </Field>
            <Field label="Subject" required error={inviteErrors.subject}>
              <Select value={inviteForm.subject} invalid={!!inviteErrors.subject} onChange={(e) => setInviteForm({ ...inviteForm, subject: e.target.value })}>
                <option value="">Select subject</option>
                {db.subjects.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Qualification">
            <Input value={inviteForm.qualification} onChange={(e) => setInviteForm({ ...inviteForm, qualification: e.target.value })} placeholder="e.g. Ph.D. Physics, IIT Delhi" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={submitInvite} icon={UserPlus}>Send invitation</Button>
          </div>
        </div>
      </Modal>

      {/* Assign courses modal */}
      <Modal open={!!assignTarget} onClose={() => setAssignTarget(null)} title={`Assign courses — ${assignTarget?.teacher.name || ''}`} subtitle="Teachers can only manage courses assigned to them">
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {db.courses.map((c) => {
            const checked = assignTarget?.selected.includes(c.id)
            return (
              <label key={c.id} className={cx('flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition', checked ? 'border-brand/40 bg-brand/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20')}>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-black/50 text-brand focus:ring-brand/30"
                  checked={!!checked}
                  onChange={(e) => setAssignTarget((st) => ({ ...st, selected: e.target.checked ? [...st.selected, c.id] : st.selected.filter((id) => id !== c.id) }))}
                />
                <span className="text-sm font-medium text-white">{c.title}</span>
                <Badge tone="muted" className="ml-auto">{c.category}</Badge>
              </label>
            )
          })}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button onClick={saveAssignments} icon={CheckCircle2}>Save assignments</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={() => actionTarget && decide(actionTarget.teacher, actionTarget.action)}
        title={actionTarget?.action === 'suspend' ? 'Suspend teacher?' : 'Reactivate teacher?'}
        message={actionTarget?.action === 'suspend'
          ? `${actionTarget?.teacher.name} will immediately lose access to their courses, batches and live classes. This action is audited.`
          : `${actionTarget?.teacher.name} will regain full teacher access.`}
        confirmLabel={actionTarget?.action === 'suspend' ? 'Suspend' : 'Reactivate'}
        danger={actionTarget?.action === 'suspend'}
      />
    </div>
  )
}
