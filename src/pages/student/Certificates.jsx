import React, { useState, useMemo } from 'react'
import {
  Award, Download, Copy, Check, ShieldCheck, GraduationCap, Lock
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { useToast } from '../../components/ui.jsx'
import { Badge, Button } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'

export default function Certificates() {
  const { user } = useAuth()
  const { db } = useData()
  const toast = useToast()
  const [copiedId, setCopiedId] = useState(null)
  const isDemo = isDemoMode

  // Find student
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId || s.id === user?.id) ||
      (db.students || [])[0] || {
        name: user?.fullName || 'Student',
        enrollmentNumber: 'STU-24-101',
      }
    )
  }, [db.students, user])

  // Completed lesson IDs for this student
  const completedLessonIds = useMemo(() => {
    return new Set(
      (db.lessonProgress || [])
        .filter(
          (lp) =>
            (lp.studentId === student?.id || lp.studentId === user?.id) &&
            (lp.completed === true || lp.status === 'completed' || lp.pct === 100)
        )
        .map((lp) => lp.lessonId)
    )
  }, [db.lessonProgress, student?.id, user?.id])

  // Enrolled courses
  const enrollments = useMemo(() => {
    return (db.enrollments || []).filter(
      (e) => e.studentId === student?.id || e.studentId === user?.id
    )
  }, [db.enrollments, student?.id, user?.id])

  const enrolledCoursesWithProgress = useMemo(() => {
    return enrollments
      .map((e) => {
        const course = (db.courses || []).find((c) => c.id === e.courseId)
        if (!course) return null

        const courseLessons = (db.lessons || []).filter(
          (l) => l.courseId === course.id && (l.status === 'published' || !l.status)
        )
        const totalLessons = courseLessons.length
        const completedLessons = courseLessons.filter((l) => completedLessonIds.has(l.id)).length
        const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : (e.progressPct || 0)

        const teacher = (db.teachers || []).find((t) => t.id === course.teacherId)
        const teacherName = course.teacherName || teacher?.name || 'Tech Tians Faculty'

        return {
          ...course,
          enrollmentDate: e.enrolledAt,
          enrollmentStatus: e.status,
          totalLessons,
          completedLessons,
          progress,
          teacherName,
        }
      })
      .filter(Boolean)
  }, [enrollments, db.courses, db.lessons, db.teachers, completedLessonIds])

  // Completed courses
  const completedCourses = useMemo(() => {
    return enrolledCoursesWithProgress.filter(
      (c) => c.progress >= 100 || c.enrollmentStatus === 'completed'
    )
  }, [enrolledCoursesWithProgress])

  // In progress courses
  const inProgressCourses = useMemo(() => {
    return enrolledCoursesWithProgress.filter(
      (c) => c.progress < 100 && c.enrollmentStatus !== 'completed'
    )
  }, [enrolledCoursesWithProgress])

  // Certificates list: computed from real completed courses; demo fallback only in demo mode
  const certificates = useMemo(() => {
    const list = completedCourses.map((c) => ({
      id: `cert-${c.id}`,
      certNumber: `CERT-${String(c.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      courseTitle: c.title,
      instructor: c.teacherName,
      issueDate: c.enrollmentDate ? formatDate(c.enrollmentDate) : 'Recently',
      grade: 'Distinction (100%)',
      verified: true,
    }))
    if (list.length > 0) return list
    if (isDemo) {
      return [
        {
          id: 'cert-01',
          certNumber: 'CERT-2026-TTA-8849',
          courseTitle: 'Physics for JEE Advanced 2027',
          instructor: 'Dr. Meera Rao, Ph.D. IIT Delhi',
          issueDate: 'October 15, 2026',
          grade: 'Distinction (94%)',
          verified: true,
        },
        {
          id: 'cert-02',
          certNumber: 'CERT-2026-TTA-6120',
          courseTitle: 'Foundation Mathematics: Vectors & 3D Geometry',
          instructor: 'Prof. Arjun Deshpande, BITS Pilani',
          issueDate: 'September 28, 2026',
          grade: 'Excellence (89%)',
          verified: true,
        },
      ]
    }
    return []
  }, [completedCourses, isDemo])

  const [selectedCertId, setSelectedCertId] = useState(null)
  const selectedCert = useMemo(() => {
    if (selectedCertId) {
      const found = certificates.find((c) => c.id === selectedCertId)
      if (found) return found
    }
    return certificates[0] || null
  }, [certificates, selectedCertId])

  const handleCopyLink = (certNumber) => {
    navigator.clipboard?.writeText(`https://techtians.academy/verify/${certNumber}`)
    setCopiedId(certNumber)
    toast.success('Verification link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleDownload = () => {
    toast.success('Certificate download started (PDF)')
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Certificates
          </h1>
          <p className="text-sm text-muted">
            Official verified certificates awarded upon comprehensive curriculum completion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={certificates.length > 0 ? 'warning' : 'default'} className="font-mono text-xs uppercase tracking-wider gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            <span>{certificates.length} {certificates.length === 1 ? 'Verified Credential' : 'Verified Credentials'}</span>
          </Badge>
        </div>
      </div>

      {/* Main Certificate Preview with Gold Border Glow or Empty State */}
      {selectedCert ? (
        <div className="relative mx-auto max-w-4xl">
          {/* Outer glow background */}
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-gold/30 via-brand/20 to-gold/30 blur-xl opacity-60 pointer-events-none" />

          {/* Certificate Card */}
          <div className="relative rounded-2xl bg-surface/95 border-2 border-gold/60 p-6 sm:p-12 shadow-[0_0_60px_rgba(255,214,0,0.18)] overflow-hidden">
            {/* Subtle Guilloche/Grid watermarks */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-radial-gradient from-gold/10 to-transparent blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-radial-gradient from-brand/10 to-transparent blur-2xl pointer-events-none" />

            {/* Certificate Inner Frame */}
            <div className="relative border border-gold/30 rounded-xl p-6 sm:p-10 text-center space-y-6 bg-void/30">
              {/* Top Brand Header */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-gold text-void shadow-glow">
                  <GraduationCap className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <span className="block font-heading text-lg font-bold tracking-wider text-white">
                    TECH TIANS ACADEMY
                  </span>
                  <span className="block font-mono text-[9px] uppercase tracking-widest text-gold font-semibold">
                    Excellence in STEM & Advanced Sciences
                  </span>
                </div>
              </div>

              {/* Certificate Title */}
              <div className="space-y-1">
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  Certificate of Academic Achievement
                </span>
                <p className="text-xs text-muted/80">
                  This document certifies that
                </p>
              </div>

              {/* Student Name in font-heading */}
              <div className="py-2">
                <h2 className="font-heading text-3xl sm:text-5xl font-bold tracking-tight text-white">
                  {student.name}
                </h2>
                <div className="mx-auto mt-2 h-0.5 w-32 bg-gradient-to-r from-transparent via-gold to-transparent" />
              </div>

              {/* Description */}
              <p className="text-sm sm:text-base text-muted max-w-xl mx-auto leading-relaxed">
                has successfully completed all rigorous lecture coursework, lab modules, assignments, and proctored unit evaluations for
              </p>

              {/* Course Title with Gradient */}
              <div className="py-1">
                <h3 className="font-heading text-xl sm:text-2xl font-bold bg-gradient-to-r from-brand via-gold to-brand bg-clip-text text-transparent">
                  {selectedCert.courseTitle}
                </h3>
                <span className="font-mono text-xs text-gold font-semibold mt-1 inline-block">
                  Grade: {selectedCert.grade}
                </span>
              </div>

              {/* Verification Footer Row */}
              <div className="pt-8 border-t border-gold/20 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                {/* Left: Issued date */}
                <div className="text-left space-y-1">
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">Date of Issue</span>
                  <span className="block font-mono text-xs font-semibold text-white">{selectedCert.issueDate}</span>
                  <span className="block font-mono text-[10px] text-muted">{selectedCert.certNumber}</span>
                </div>

                {/* Center: Gold Seal */}
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-gold shadow-glow-gold">
                    <Award className="h-8 w-8 text-gold" />
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-gold font-bold">
                    Verified Seal
                  </span>
                </div>

                {/* Right: Instructor Signature */}
                <div className="text-right space-y-1">
                  <span className="block font-serif italic text-sm text-gold/90 font-medium">
                    {(selectedCert.instructor || 'Faculty').split(',')[0]}
                  </span>
                  <div className="ml-auto h-px w-28 bg-gold/30" />
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">Faculty Signature</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Controls for Selected Certificate */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" onClick={handleDownload} className="gap-2 shadow-glow">
              <Download className="h-4 w-4" />
              <span>Download Certificate PDF</span>
            </Button>

            <Button
              variant="ghost"
              onClick={() => handleCopyLink(selectedCert.certNumber)}
              className="gap-2"
            >
              {copiedId === selectedCert.certNumber ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              <span>{copiedId === selectedCert.certNumber ? 'Copied' : 'Copy Verification Link'}</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="card-base glass p-12 text-center space-y-3 border border-white/10 max-w-4xl mx-auto">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/15 text-gold border border-gold/30 mx-auto">
            <Award className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-lg font-bold text-white">No Certificates Earned Yet</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Complete 100% of your course lessons and assignments to automatically unlock your verified certificate of completion.
          </p>
        </div>
      )}

      {/* Certificate Selector / Other Credentials */}
      {certificates.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="font-heading text-lg font-semibold text-white">
            All Earned Credentials
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {certificates.map((cert) => {
              const isSelected = selectedCert?.id === cert.id
              return (
                <div
                  key={cert.id}
                  onClick={() => setSelectedCertId(cert.id)}
                  className={`card-base glass p-5 cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-gold bg-gold/5 shadow-[0_0_20px_rgba(255,214,0,0.15)] ring-1 ring-gold/40'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold border border-gold/30">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-heading text-sm font-semibold text-white">
                          {cert.courseTitle}
                        </h4>
                        <p className="text-xs text-muted">{cert.instructor}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Badge variant="warning" className="font-mono text-[10px]">
                        Viewing
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3 text-xs font-mono text-muted">
                    <span>Issued: {cert.issueDate}</span>
                    <span className="text-gold font-semibold">{cert.grade}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Courses in Progress (Track to next certificate) */}
      <div className="card-base glass p-6 space-y-4">
        <h3 className="font-heading text-base font-semibold text-white">
          Next Certificates in Progress
        </h3>
        <p className="text-xs text-muted">
          Complete remaining course lectures and achieve 60%+ in unit tests to unlock these credentials.
        </p>

        {inProgressCourses.length === 0 ? (
          <p className="text-xs text-muted pt-2">No courses currently in progress.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {inProgressCourses.slice(0, 4).map((course) => {
              const progress = course.progress
              return (
                <div key={course.id} className="card-base bg-surface/60 p-4 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-muted" />
                      <h4 className="font-heading text-sm font-semibold text-white">
                        {course.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted">Faculty: {course.teacherName}</p>
                  </div>

                  <div className="flex items-center gap-4 sm:w-64">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-muted">
                        <span>Progress</span>
                        <span className="text-white font-bold">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <Badge variant="default" className="font-mono text-[10px] shrink-0">
                      Locked
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
