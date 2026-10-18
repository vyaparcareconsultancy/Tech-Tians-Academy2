import React, { useState } from 'react'
import { Save, KeyRound, BookOpen, Users, Star } from 'lucide-react'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, PageHeader, StatCard, useToast } from '../../components/ui.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { validateFields, rules, passwordStrength } from '../../lib/validators.js'
import { formatDate } from '../../lib/utils.js'

export default function TeacherProfile() {
  const { user } = useAuth()
  const { db, teacherIdForUser, update, audit } = useData()
  const toast = useToast()
  const teacherId = teacherIdForUser(user.id)
  const teacher = db.teachers.find((t) => t.id === teacherId)

  const [profile, setProfile] = useState({ name: teacher?.name || '', phone: teacher?.phone || '', qualification: teacher?.qualification || '', bio: teacher?.bio || '' })
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})

  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)
  const studentIds = new Set(db.enrollments.filter((e) => myCourseIds.includes(e.courseId)).map((e) => e.studentId))

  const saveProfile = () => {
    update('teachers', teacherId, profile)
    audit('profile.updated', 'teachers', 'Updated own profile')
    toast.success('Profile updated.')
  }

  const changePassword = () => {
    const errs = validateFields(pw, {
      current: [rules.required('Current password')],
      next: [rules.required('New password'), rules.minLen(8)],
      confirm: [(v) => (v === pw.next ? null : 'Passwords do not match')],
    })
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    toast.success('Password updated (demo). In Supabase mode this calls auth.updateUser().')
    setPw({ current: '', next: '', confirm: '' })
  }

  const strength = passwordStrength(pw.next)

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your public teaching profile" />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <div className="flex flex-col items-center px-5 py-6 text-center">
            <Avatar name={teacher?.name || user.name} className="h-20 w-20 text-xl" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">{teacher?.name || user.name}</h2>
            <p className="text-sm text-slate-500">{teacher?.subject} faculty</p>
            <Badge tone="green" className="mt-2">{teacher?.status}</Badge>
            <dl className="mt-5 w-full space-y-3 text-left">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-xs text-slate-400">Email</dt>
                <dd className="truncate text-xs font-medium text-slate-700">{user.email}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-xs text-slate-400">Member since</dt>
                <dd className="text-xs font-medium text-slate-700">{formatDate(teacher?.joinedAt)}</dd>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <dt className="text-xs text-slate-400">Qualification</dt>
                <dd className="text-right text-xs font-medium text-slate-700">{teacher?.qualification}</dd>
              </div>
            </dl>
          </div>
          <div className="grid grid-cols-3 gap-3 border-t border-slate-100 px-5 py-4">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-lg font-semibold text-slate-900"><BookOpen className="h-4 w-4 text-slate-400" />{db.courses.filter((c) => myCourseIds.includes(c.id)).length}</p>
              <p className="text-xs text-slate-400">Courses</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-lg font-semibold text-slate-900"><Users className="h-4 w-4 text-slate-400" />{studentIds.size}</p>
              <p className="text-xs text-slate-400">Students</p>
            </div>
            <div className="text-center">
              <p className="flex items-center justify-center gap-1 text-lg font-semibold text-slate-900"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{teacher?.rating || '—'}</p>
              <p className="text-xs text-slate-400">Rating</p>
            </div>
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader title="Profile information" subtitle="Shown to students and administrators" />
            <div className="space-y-4 px-5 py-4">
              <Field label="Full name" required>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
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
                <textarea rows={4} className="input-base" value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
              </Field>
              <div className="flex justify-end">
                <Button icon={Save} onClick={saveProfile}>Save profile</Button>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Change password" subtitle="Stored securely via Supabase Auth (demo: simulated)" actions={<KeyRound className="h-4 w-4 text-slate-400" />} />
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
                      <span key={i} className={`h-1.5 w-10 rounded-full ${strength >= i ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">{['Weak', 'Fair', 'Good', 'Strong'][strength - 1] || 'Too weak'}</span>
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
