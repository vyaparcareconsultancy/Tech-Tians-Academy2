import React, { useState, useMemo } from 'react'
import {
  Shield, Save
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { useToast } from '../../components/ui.jsx'
import { Badge, Button } from '../../components/ui.jsx'

export default function Profile() {
  const { user } = useAuth()
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
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-gold font-heading text-3xl font-bold text-void shadow-glow">
            {name.charAt(0)}
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-void" title="Active Student" />
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
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Email Address (Verified)
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full rounded-xl bg-void/50 border border-white/5 px-4 py-2.5 text-xs text-muted cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white font-mono focus:border-brand focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  City / Location
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Target Competitive Exam
                </label>
                <select
                  value={targetExam}
                  onChange={(e) => setTargetExam(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="JEE Advanced 2027">JEE Advanced 2027</option>
                  <option value="JEE Main 2026/2027">JEE Main 2026/2027</option>
                  <option value="NEET UG 2027">NEET UG 2027</option>
                  <option value="Olympiad / KVPY">Olympiad / KVPY</option>
                  <option value="Board Exams Class 12">Board Exams Class 12</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-muted">
                  Current Grade / Standard
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 py-2.5 text-xs text-white focus:border-brand focus:outline-none"
                >
                  <option value="Class 12">Class 12</option>
                  <option value="Class 11">Class 11</option>
                  <option value="Repeater / Dropper">Repeater / Dropper</option>
                  <option value="Foundation (Class 9-10)">Foundation (Class 9-10)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button type="submit" variant="primary" disabled={isSaving} className="gap-2 shadow-glow">
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving…' : 'Save changes'}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Account Details & Security */}
        <div className="space-y-6">
          <div className="card-base glass p-6 space-y-4">
            <h4 className="font-heading text-base font-semibold text-white">
              Academic Standing
            </h4>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between p-2.5 rounded-lg bg-surface/60 border border-white/5">
                <span className="text-muted">Attendance Rate</span>
                <span className="text-emerald-400 font-bold">92%</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-surface/60 border border-white/5">
                <span className="text-muted">Assignments Graded</span>
                <span className="text-white font-bold">14 / 16</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-surface/60 border border-white/5">
                <span className="text-muted">Certificates Unlocked</span>
                <span className="text-gold font-bold">2 Earned</span>
              </div>
            </div>
          </div>

          <div className="card-base glass p-6 space-y-4">
            <div className="flex items-center gap-2 text-white">
              <Shield className="h-4 w-4 text-gold" />
              <h4 className="font-heading text-base font-semibold">
                Security & Session
              </h4>
            </div>
            <p className="text-xs text-muted">
              Demo student authentication active. Sessions are authenticated locally within your browser sandbox.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-mono"
              onClick={() => toast.success('Password reset email dispatched in demo mode.')}
            >
              Change password
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
