import React, { useState } from 'react'
import { ShieldCheck, RotateCcw, ScrollText, Building2, Bell } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { Badge, Button, Card, CardHeader, Field, Input, Select, Switch, PageHeader, useToast, Avatar } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { formatDateTime } from '../../lib/utils.js'

export default function Settings() {
  const { user } = useAuth()
  const { db, updatePolicy, audit, resetDemo } = useData()
  const toast = useToast()
  const [academy, setAcademy] = useState({ name: 'Tech Tians Academy', tagline: 'Learn. Teach. Grow.', timezone: 'Asia/Kolkata', currency: 'INR (₹)' })
  const [prefs, setPrefs] = useState({ newEnrollment: true, failedPayment: true, pendingApprovals: true, weeklyDigest: false })

  const saveAcademy = () => {
    audit('settings.updated', 'settings', 'Academy profile updated')
    toast.success('Academy settings saved.')
  }

  const savePolicy = (key, value) => {
    updatePolicy({ [key]: value })
    audit('policy.changed', 'settings', `${key} → ${value}`)
    toast.success('Policy updated. Changes apply immediately.')
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Academy configuration, policies and audit trail" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Academy profile" subtitle="Public-facing identity" actions={<Building2 className="h-4 w-4 text-muted" />} />
          <div className="space-y-4 px-5 py-4">
            <Field label="Academy name">
              <Input value={academy.name} onChange={(e) => setAcademy({ ...academy, name: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={academy.tagline} onChange={(e) => setAcademy({ ...academy, tagline: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Timezone">
                <Select value={academy.timezone} onChange={(e) => setAcademy({ ...academy, timezone: e.target.value })}>
                  {['Asia/Kolkata', 'Asia/Delhi', 'UTC'].map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Currency">
                <Input value={academy.currency} disabled />
              </Field>
            </div>
            <Button onClick={saveAcademy}>Save profile</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Platform policies" subtitle="Controls what teachers can do" actions={<ShieldCheck className="h-4 w-4 text-muted" />} />
          <div className="divide-y divide-white/5 px-5 py-2">
            <PolicyRow label="Teachers may create courses" hint="Draft courses go to admin approval queue" value={db.policies.teachersCanCreateCourses} onChange={(v) => savePolicy('teachersCanCreateCourses', v)} />
            <PolicyRow label="Lectures require admin approval" hint="When off, teachers publish directly" value={db.policies.lecturesRequireApproval} onChange={(v) => savePolicy('lecturesRequireApproval', v)} />
            <PolicyRow label="Maintenance mode" hint="Shows a banner on all staff pages" value={db.policies.maintenanceMode} onChange={(v) => savePolicy('maintenanceMode', v)} />
            <div className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-medium text-white">Teacher scheduling window (days)</p>
                <p className="text-xs text-muted">How far ahead teachers may schedule live classes</p>
              </div>
              <Select value={String(db.policies.teacherScheduleWindowDays)} onChange={(e) => savePolicy('teacherScheduleWindowDays', Number(e.target.value))} className="w-24">
                {[7, 14, 30].map((n) => <option key={n} value={n}>{n} days</option>)}
              </Select>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notification preferences" subtitle="Email digests for the admin team" actions={<Bell className="h-4 w-4 text-muted" />} />
          <div className="divide-y divide-white/5 px-5 py-2">
            {Object.entries({ newEnrollment: 'New enrollment alerts', failedPayment: 'Failed payment alerts', pendingApprovals: 'Pending approval reminders', weeklyDigest: 'Weekly performance digest' }).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between py-3.5">
                <span className="text-sm text-white/90">{label}</span>
                <Switch checked={prefs[k]} onChange={(v) => setPrefs({ ...prefs, [k]: v })} />
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 px-5 py-4">
            <Button size="sm" variant="secondary" onClick={() => toast.success('Preferences saved.')}>Save preferences</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Your account" subtitle="Admin identity" actions={<Avatar name={user?.name || 'A'} />} />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
            <div><dt className="text-xs font-medium text-muted">Name</dt><dd className="mt-0.5 text-sm font-medium text-white">{user?.name}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Email</dt><dd className="mt-0.5 font-mono text-xs font-medium text-white">{user?.email}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Role</dt><dd className="mt-0.5"><Badge tone="brand">{user?.role}</Badge></dd></div>
            <div><dt className="text-xs font-medium text-muted">Mode</dt><dd className="mt-0.5 font-mono text-xs font-medium text-gold">Demo (mock data)</dd></div>
          </dl>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Audit log" subtitle="Most recent administrative actions" actions={<ScrollText className="h-4 w-4 text-muted" />} />
          <DataTable
            pageSize={10}
            columns={[
              { key: 'createdAt', label: 'When', sortable: true, render: (l) => <span className="font-mono text-xs text-muted">{formatDateTime(l.createdAt)}</span> },
              { key: 'actorName', label: 'Actor', render: (l) => <span className="text-white/90">{l.actorName}</span> },
              { key: 'action', label: 'Action', render: (l) => <span className="font-mono text-xs text-brand">{l.action}</span> },
              { key: 'details', label: 'Details', render: (l) => <span className="text-muted">{l.details}</span> },
            ]}
            data={db.auditLogs}
            emptyMessage="No audit entries yet."
          />
        </Card>

        <Card className="border-red-500/20 bg-red-500/[0.02] xl:col-span-2">
          <CardHeader title="Danger zone" subtitle="Demo workspace controls" actions={<RotateCcw className="h-4 w-4 text-muted" />} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <p className="max-w-xl text-sm text-muted">
              Reset the workspace to regenerate the original demo dataset. All in-memory edits
              (students, courses, grades, payments) will be discarded.
            </p>
            <Button variant="danger" icon={RotateCcw} onClick={() => { resetDemo(); audit('demo.reset', 'system', 'Demo data regenerated'); toast.success('Demo data regenerated.') }}>
              Reset demo data
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

function PolicyRow({ label, hint, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <Switch checked={value} onChange={onChange} />
    </div>
  )
}


