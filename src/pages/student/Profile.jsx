import React, { useState, useMemo } from 'react'
import {
  Shield, Save, Camera, UploadCloud, AlertCircle
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { useToast, ProgressBar, Avatar } from '../../components/ui.jsx'
import { Badge, Button } from '../../components/ui.jsx'
import { storageApi } from '../../lib/api/storage.js'
import { isDemoMode } from '../../lib/supabase.js'
import { profilesApi } from '../../lib/api/index.js'

export default function Profile() {
  const { user, mode, updateUser } = useAuth()
  const { db, update } = useData()
  const toast = useToast()

  // Find student record
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId) ||
      (db.students || [])[0] || {
        id: 'stu-1001',
        name: 'Rohan Verma',
        email: 'rohan.verma@techtians.academy',
        phone: '+91 98765 43210',
        city: 'Patna',
        targetExam: 'JEE Advanced 2027',
        grade: 'Class 12',
        enrollmentNumber: 'STU-24-101',
      }
    )
  }, [db.students, user])

  // Form state
  const [name, setName] = useState(student.name || 'Rohan Verma')
  const [email] = useState(student.email || user?.email || 'rohan.verma@techtians.academy')
  const [phone, setPhone] = useState(student.phone || '+91 98765 43210')
  const [city, setCity] = useState(student.city || 'Patna')
  const [targetExam, setTargetExam] = useState(student.targetExam || 'JEE Advanced 2027')
  const [grade, setGrade] = useState(student.grade || 'Class 12')
  const [isSaving, setIsSaving] = useState(false)

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
      const targetUserId = user?.id || student.id
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
      if (update && student?.id) {
        await update('students', student.id, { avatarUrl: newAvatarUrl })
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

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (update && student?.id) {
        await update('students', student.id, { name, phone, city, targetExam, grade })
      }
      toast.success('Profile details updated successfully!')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Student Profile
        </h1>
        <p className="text-sm text-muted">
          Manage your personal details, academic focus, and account security preferences.
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-surface via-surface/90 to-brand/10 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar with Glow Ring */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <Avatar
                name={name}
                src={student.avatarUrl || user?.avatarUrl}
                className="h-20 w-20 text-3xl font-heading font-bold rounded-2xl shadow-glow border-2 border-brand/40"
              />
              <label
                htmlFor="studentAvatarInput"
                className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-2xl bg-void/70 opacity-0 backdrop-blur-xs transition group-hover:opacity-100"
                title="Change avatar"
              >
                <Camera className="h-5 w-5 text-brand" />
                <span className="mt-0.5 font-mono text-[10px] text-white">Change</span>
              </label>
              <input
                type="file"
                id="studentAvatarInput"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                disabled={isUploadingAvatar}
                onChange={handleAvatarChange}
              />
            </div>
            <button
              type="button"
              disabled={isUploadingAvatar}
              onClick={() => document.getElementById('studentAvatarInput')?.click()}
              className="mt-2 inline-flex items-center gap-1 font-mono text-xs text-brand hover:underline"
            >
              <UploadCloud className="h-3 w-3" />
              {isUploadingAvatar ? 'Uploading…' : 'Change photo'}
            </button>
            {avatarError && (
              <p className="mt-1 flex items-center gap-1 font-mono text-xs text-rose-400">
                <AlertCircle className="h-3 w-3 shrink-0" /> {avatarError}
              </p>
            )}
            {isUploadingAvatar && (
              <div className="mt-1.5 w-24 space-y-1">
                <ProgressBar value={avatarProgress} />
              </div>
            )}
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">
                {name}
              </h2>
              <Badge variant="warning" className="font-mono text-xs uppercase tracking-wider">
                {grade}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted">
              <span>Enrollment: <strong className="text-white">{student.enrollmentNumber || 'STU-24-101'}</strong></span>
              <span>•</span>
              <span>Target: <strong className="text-brand">{targetExam}</strong></span>
              <span>•</span>
              <span>Location: <strong className="text-white">{city}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-base glass p-6 sm:p-8 space-y-6">
          <h3 className="font-heading text-lg font-semibold text-white border-b border-white/5 pb-4">
            Personal & Academic Information
          </h3>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl bg-surface/40 border border-white/5 px-4 py-2.5 text-xs text-muted cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Current City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Target Exam
                </label>
                <input
                  type="text"
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Grade / Class
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="Class 9">Class 9</option>
                  <option value="Class 10">Class 10</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Class 12">Class 12</option>
                  <option value="Dropper / Repeater">Dropper / Repeater</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" variant="primary" loading={isSaving} className="gap-2 shadow-glow">
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Security & Verification Card */}
        <div className="space-y-6">
          <div className="card-base glass p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-heading text-sm font-bold text-white">
                  Account Verification
                </h4>
                <p className="text-[11px] font-mono text-muted">
                  Status: Active Student
                </p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Your profile is verified and linked to your active enrollment batch. Any modifications to registered emails must be verified by academic operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
