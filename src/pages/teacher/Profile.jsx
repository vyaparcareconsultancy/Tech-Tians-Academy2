import React, { useState } from 'react'
import { Save, KeyRound, BookOpen, Users, Star, Camera, UploadCloud, AlertCircle } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Textarea, PageHeader, useToast, ProgressBar } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { storageApi } from '../../lib/api/storage.js'
import { isDemoMode } from '../../lib/supabase.js'
import { validateFields, rules, passwordStrength } from '../../lib/validators.js'
import { formatDate } from '../../lib/utils.js'
import { updateTeacherProfile, changePassword as apiChangePassword, profilesApi } from '../../lib/api/index.js'

export default function TeacherProfile() {
  const { user, mode, updateUser } = useAuth()
  const { db, teacherIdForUser, update, reload, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)
  const teacher = db.teachers.find((t) => t.id === teacherId)

  // Only phone, bio, qualification are teacher-editable (not role, status, rating)
  const [profile, setProfile] = useState({ phone: teacher?.phone || '', qualification: teacher?.qualification || '', bio: teacher?.bio || '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})

  const [avatarError, setAvatarError] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const studentIds = new Set(db.enrollments.filter((e) => myCourseIds.includes(e.courseId)).map((e) => e.studentId))

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
      const path = `avatars/${user.id}/${Date.now()}-${cleanName}`
      const res = await storageApi.upload('avatars', path, f, setAvatarProgress)

      let newAvatarUrl = ''
      if (res.isMock || isDemoMode) {
        newAvatarUrl = URL.createObjectURL(f)
        toast.info('uploads work only with Supabase')
      } else {
        newAvatarUrl = storageApi.getPublicUrl('avatars', res.path) || res.path
      }

      if (mode === 'supabase') {
        try {
          await updateTeacherProfile({ ...profile, avatarUrl: newAvatarUrl })
        } catch {
          await profilesApi.update(user.id, { avatarUrl: newAvatarUrl })
        }
        reload()
      } else {
        await update('teachers', teacherId, { avatarUrl: newAvatarUrl })
      }

      if (updateUser) {
        updateUser({ avatarUrl: newAvatarUrl })
      }
      await audit('profile.avatar_updated', 'teachers', 'Updated avatar')
      toast.success('Avatar updated.')
    } catch (err) {
      toast.error(err.message || 'Failed to update avatar')
    } finally {
      setIsUploadingAvatar(false)
      setAvatarProgress(0)
    }
  }

  const saveProfile = async () => {
    try {
      if (mode === 'supabase') {
        await updateTeacherProfile(profile)
        reload()
      } else {
        await update('teachers', teacherId, profile)
      }
      await audit('profile.updated', 'teachers', 'Updated own profile')
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    }
  }

  const changePassword = async () => {
    const errs = validateFields(pw, {
      current: [rules.required('Current password')],
      next: [rules.required('New password'), rules.minLen(8)],
      confirm: [(v) => (v === pw.next ? null : 'Passwords do not match')],
    })
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    try {
      if (mode === 'supabase') {
        await apiChangePassword(pw.next)
      }
      toast.success('Password updated.')
      setPw({ current: '', next: '', confirm: '' })
    } catch (err) {
      toast.error(err.message || 'Failed to change password')
    }
  }

  const strength = passwordStrength(pw.next)

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your public teaching profile" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="flex flex-col items-center px-5 py-6 text-center">
            <div className="relative group">
              <Avatar name={teacher?.name || user.name} src={teacher?.avatarUrl || user.avatarUrl} className="h-24 w-24 text-2xl border-2 border-brand/40 shadow-glow" />
              <label
                htmlFor="teacherAvatarInput"
                className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-full bg-void/70 opacity-0 backdrop-blur-xs transition group-hover:opacity-100"
                title="Change avatar"
              >
                <Camera className="h-6 w-6 text-brand" />
                <span className="mt-0.5 font-mono text-[10px] text-white">Change</span>
              </label>
              <input
                type="file"
                id="teacherAvatarInput"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploadingAvatar}
                onChange={handleAvatarChange}
              />
            </div>

            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isUploadingAvatar}
                icon={UploadCloud}
                onClick={() => document.getElementById('teacherAvatarInput')?.click()}
                className="text-xs text-brand hover:text-white"
              >
                {isUploadingAvatar ? 'Uploading…' : 'Upload photo'}
              </Button>
            </div>

            {avatarError && (
              <p className="mt-2 flex items-center justify-center gap-1 font-mono text-xs text-rose-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {avatarError}
              </p>
            )}

            {isUploadingAvatar && (
              <div className="mt-2 w-full max-w-[180px] space-y-1">
                <ProgressBar value={avatarProgress} />
                <p className="font-mono text-[10px] text-muted">Uploading {avatarProgress}%</p>
              </div>
            )}

            <h2 className="mt-3 font-heading text-lg font-semibold text-white">{teacher?.name || user.name}</h2>
            <p className="text-sm text-muted">{teacher?.subject} faculty</p>
            <Badge tone="green" className="mt-2">{teacher?.status}</Badge>
            <dl className="mt-5 w-full space-y-3 text-left">
              <div className="flex justify-between border-b border-line pb-2">
                <dt className="text-xs text-muted">Email</dt>
                <dd className="truncate font-mono text-xs font-medium text-white/90">{user.email}</dd>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <dt className="text-xs text-muted">Member since</dt>
                <dd className="font-mono text-xs font-medium text-white/90">{formatDate(teacher?.joinedAt)}</dd>
              </div>
              <div className="flex justify-between border-b border-line pb-2">
                <dt className="text-xs text-muted">Qualification</dt>
                <dd className="text-right text-xs font-medium text-white/90">{teacher?.qualification}</dd>
              </div>
            </dl>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-line px-5 py-4">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-mono text-lg font-semibold text-white"><BookOpen className="h-4 w-4 text-brand" />{db.courses.filter((c) => myCourseIds.includes(c.id)).length}</p>
              <p className="font-mono text-xs text-muted">Courses</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-mono text-lg font-semibold text-white"><Users className="h-4 w-4 text-brand" />{studentIds.size}</p>
              <p className="font-mono text-xs text-muted">Students</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 font-mono text-lg font-semibold text-white"><Star className="h-4 w-4 fill-gold text-gold" />{teacher?.rating || '—'}</p>
              <p className="font-mono text-xs text-muted">Rating</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Profile information" subtitle="Only phone, qualification and bio are editable" />
            <div className="space-y-4 px-5 py-4">
              <Field label="Full name">
                <Input value={teacher?.name || user.name} disabled className="opacity-60" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                </Field>
                <Field label="Qualification">
                  <Input value={profile.qualification} onChange={(e) => setProfile({ ...profile, qualification: e.target.value })} />
                </Field>
              </div>
              <Field label="Bio">
                <Textarea rows={4} value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </Field>
              <div className="flex justify-end">
                <Button icon={Save} onClick={saveProfile}>Save profile</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Change password" subtitle="Stored securely via Supabase Auth" actions={<KeyRound className="h-4 w-4 text-brand" />} />
            <div className="space-y-4 px-5 py-4">
              <Field label="Current password" required>
                <Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="New password" required error={pwErrors.next} hint="8+ characters recommended">
                  <Input type="password" invalid={!!pwErrors.next} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                </Field>
                <Field label="Confirm new password" required error={pwErrors.confirm}>
                  <Input type="password" invalid={!!pwErrors.confirm} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                </Field>
              </div>
              {pw.next && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <span key={i} className={`h-1.5 w-10 rounded-full ${strength >= i ? 'bg-emerald-500' : 'bg-line'}`} />
                    ))}
                  </div>
                  <span className="font-mono text-xs text-muted">{['Weak', 'Fair', 'Good', 'Strong'][strength - 1] || 'Too weak'}</span>
                </div>
              )}
              <div className="flex justify-end">
                <Button onClick={changePassword}>Update password</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
