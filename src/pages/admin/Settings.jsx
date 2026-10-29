import React, { useState } from 'react'
import { ShieldCheck, RotateCcw, ScrollText, Building2, Bell, Camera, AlertCircle } from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { Badge, Button, Card, CardHeader, Field, Input, Select, Switch, PageHeader, useToast, Avatar, ProgressBar } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { storageApi } from '../../lib/api/storage.js'
import { isDemoMode } from '../../lib/supabase.js'
import { profilesApi } from '../../lib/api/index.js'
import { formatDateTime } from '../../lib/utils.js'

export default function Settings() {
  const { user, mode, updateUser } = useAuth()
  const { db, updatePolicy, audit, resetDemo } = useData()
  const toast = useToast()
  const [academy, setAcademy] = useState({ name: 'Tech Tians Academy', tagline: 'Learn. Teach. Grow.', timezone: 'Asia/Kolkata', currency: 'INR (₹)' })
  const [prefs, setPrefs] = useState({ newEnrollment: true, failedPayment: true, pendingApprovals: true, weeklyDigest: false })

  const [avatarError, setAvatarError] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)

  const handleAvatarChange = async (e) => {
    const f = e.target.files?.[0]
    setAvatarError('')
    if (!f) return
    try {
      storageApi.validateFile(f)
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type) && !/\.(png|jpe?g|webp)$/i.test(f.name)) {
        throw new Error('Avatar must be an image (PNG, JPG, or WEBP).')
      }
    } catch (err) {
      setAvatarError(err.message)
      return
    }

    setIsUploadingAvatar(true)
    setAvatarProgress(10)

    try {
      const cleanName = f.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const targetUserId = user?.id || 'admin'
      const path = `avatars/${targetUserId}/${Date.now()}-${cleanName}`
      const res = await storageApi.upload('avatars', path, f, setAvatarProgress)

      let newAvatarUrl = ''
      if (res.isMock || isDemoMode) {
        newAvatarUrl = URL.createObjectURL(f)
        toast.info('uploads work only with Supabase')
      } else {
        newAvatarUrl = storageApi.getPublicUrl('avatars', res.path) || res.path
      }

      if (mode === 'supabase' && user?.id) {
        await profilesApi.update(user.id, { avatarUrl: newAvatarUrl })
      }
      if (updateUser) {
        updateUser({ avatarUrl: newAvatarUrl })
      }
      toast.success('Avatar updated.')
    } catch (err) {
      toast.error(err.message || 'Failed to update avatar')
    } finally {
      setIsUploadingAvatar(false)
      setAvatarProgress(0)
    }
  }

  const saveAcademy = async () => {
    try {
      await audit('settings.updated', 'settings', 'Academy profile updated')
      toast.success('Academy settings saved.')
    } catch (err) {
      toast.error(err.message || 'Failed to save settings')
    }
  }

  const savePolicy = async (key, value) => {
    try {
      await updatePolicy({ [key]: value })
      await audit('policy.changed', 'settings', `${key} → ${value}`)
      toast.success('Policy updated. Changes apply immediately.')
    } catch (err) {
      toast.error(err.message || 'Failed to update policy')
    }
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
          <CardHeader title="Your account" subtitle="Admin identity" actions={<Avatar name={user?.name || 'A'} src={user?.avatarUrl} />} />
          <div className="flex items-center gap-4 border-b border-white/5 px-5 py-4">
            <div className="relative group">
              <Avatar name={user?.name || 'A'} src={user?.avatarUrl} className="h-16 w-16 text-xl border-2 border-brand/40 shadow-glow" />
              <label
                htmlFor="adminAvatarInput"
                className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-full bg-void/70 opacity-0 backdrop-blur-xs transition group-hover:opacity-100"
                title="Change avatar"
              >
                <Camera className="h-5 w-5 text-brand" />
              </label>
              <input
                type="file"
                id="adminAvatarInput"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploadingAvatar}
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name || 'Admin User'}</p>
              <button
                type="button"
                disabled={isUploadingAvatar}
                onClick={() => document.getElementById('adminAvatarInput')?.click()}
                className="mt-1 font-mono text-xs text-brand hover:underline"
              >
                {isUploadingAvatar ? 'Uploading…' : 'Change profile photo'}
              </button>
              {avatarError && (
                <p className="mt-1 flex items-center gap-1 font-mono text-xs text-rose-400">
                  <AlertCircle className="h-3 w-3 shrink-0" /> {avatarError}
                </p>
              )}
              {isUploadingAvatar && (
                <div className="mt-1.5 w-32 space-y-1">
                  <ProgressBar value={avatarProgress} />
                </div>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 px-5 py-4">
            <div><dt className="text-xs font-medium text-muted">Name</dt><dd className="mt-0.5 text-sm font-medium text-white">{user?.name}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Email</dt><dd className="mt-0.5 font-mono text-xs font-medium text-white">{user?.email}</dd></div>
            <div><dt className="text-xs font-medium text-muted">Role</dt><dd className="mt-0.5"><Badge tone="brand">{user?.role}</Badge></dd></div>
            <div><dt className="text-xs font-medium text-muted">Mode</dt><dd className="mt-0.5 font-mono text-xs font-medium text-gold">{mode === 'supabase' ? 'Supabase (connected)' : 'Demo (mock data)'}</dd></div>
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


