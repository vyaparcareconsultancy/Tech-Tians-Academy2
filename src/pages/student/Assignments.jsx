import React, { useState, useMemo } from 'react'
import {
  Clock, Upload, FileText
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { useToast } from '../../components/ui.jsx'
import { Badge, Button, Modal } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'

export default function Assignments() {
  const { user } = useAuth()
  const { db, insert } = useData()
  const toast = useToast()
  const isDemo = isDemoMode()

  const [activeTab, setActiveTab] = useState('all') // all, pending, submitted
  const [submittingAssignment, setSubmittingAssignment] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [submissionNote, setSubmissionNote] = useState('')

  // Student
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId || s.id === user?.id) ||
      (db.students || [])[0] || { id: user?.id || 'stu-1001', name: user?.fullName || 'Student' }
    )
  }, [db.students, user])

  // Submissions for this student
  const mySubmissions = useMemo(() => {
    return (db.submissions || []).filter(
      (s) => s.studentId === student?.id || s.studentId === user?.id
    )
  }, [db.submissions, student?.id, user?.id])

  // Assignments: real data in Supabase mode; fallback sample only in demo mode
  const assignmentsList = useMemo(() => {
    const list = (db.assignments || []).map((asg) => {
      const sub = mySubmissions.find((s) => s.assignmentId === asg.id)
      const course = (db.courses || []).find((c) => c.id === asg.courseId)
      return {
        ...asg,
        courseName: course ? course.title : (asg.courseName || 'Course Assignment'),
        subjectName: course ? course.subjectName : (asg.subjectName || 'General'),
        submission: sub || null,
        isSubmitted: !!sub,
        isGraded: !!(sub && sub.marks !== null && sub.marks !== undefined),
      }
    })

    if (list.length > 0) return list
    if (isDemo) {
      return [
        {
          id: 'asg-01',
          title: 'Kinematics & Projectile Motion Problem Set',
          courseName: 'Physics for JEE Advanced 2027',
          subjectName: 'Physics',
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          maxMarks: 50,
          instructions: 'Solve all 10 numerical problems with full free body diagrams.',
          submission: null,
          isSubmitted: false,
          isGraded: false,
        },
        {
          id: 'asg-02',
          title: 'Chemical Bonding & Hybridization Worksheet',
          courseName: 'Physical & Inorganic Chemistry 2027',
          subjectName: 'Chemistry',
          dueDate: new Date(Date.now() - 86400000 * 3).toISOString(),
          maxMarks: 40,
          instructions: 'Determine VSEPR geometry for all 15 listed coordination complexes.',
          submission: {
            id: 'sub-demo-1',
            submittedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            fileName: 'rohan_verma_chem_bonding.pdf',
            marks: 38,
            feedback: 'Exceptional working on molecular orbital diagrams. Well presented!',
          },
          isSubmitted: true,
          isGraded: true,
        },
      ]
    }
    return []
  }, [db.assignments, db.courses, mySubmissions, isDemo])

  const filtered = useMemo(() => {
    if (activeTab === 'pending') return assignmentsList.filter((a) => !a.isSubmitted)
    if (activeTab === 'submitted') return assignmentsList.filter((a) => a.isSubmitted)
    return assignmentsList
  }, [assignmentsList, activeTab])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!uploadedFile && !submissionNote.trim()) {
      toast.error('Please attach a file or type your submission notes.')
      return
    }

    try {
      const activeStudentId = user?.id || student?.id
      if (insert && submittingAssignment && activeStudentId) {
        await insert('submissions', {
          assignmentId: submittingAssignment.id,
          studentId: activeStudentId,
          submittedAt: new Date().toISOString(),
          fileName: uploadedFile?.name || 'submission.txt',
          content: submissionNote,
          marks: null,
          feedback: '',
          graded: false,
          published: false,
        })
      }
      toast.success('Assignment submitted successfully!')
      setSubmittingAssignment(null)
      setUploadedFile(null)
      setSubmissionNote('')
    } catch (err) {
      toast.error(err.message || 'Failed to submit assignment')
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Assignments & Problem Sets
          </h1>
          <p className="text-sm text-muted">
            Submit your weekly worksheets, review faculty feedback, and monitor your marks.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface/80 border border-white/5">
          {['all', 'pending', 'submitted'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-brand text-void font-bold shadow-glow'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="card-base glass p-12 text-center space-y-2 border border-white/10">
            <p className="font-heading text-base font-medium text-white">No assignments found</p>
            <p className="text-xs text-muted">
              {activeTab === 'pending'
                ? 'Great job! You have no pending assignments waiting for submission.'
                : activeTab === 'submitted'
                ? 'You have not submitted any assignments yet.'
                : 'No assignments scheduled for your enrolled batches.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="card-base glass p-5 sm:p-6 space-y-4 border border-white/10 hover:border-brand/30 transition-all"
            >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="primary" className="font-mono text-[10px] uppercase">
                    {item.subjectName}
                  </Badge>
                  <span className="font-mono text-xs text-muted">
                    {item.courseName}
                  </span>
                </div>

                <h3 className="font-heading text-base sm:text-lg font-semibold text-white">
                  {item.title}
                </h3>

                <p className="text-xs text-muted max-w-2xl leading-relaxed">
                  {item.instructions}
                </p>
              </div>

              {/* Status and Marks */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                {item.isGraded ? (
                  <Badge variant="success" className="font-mono text-xs">
                    Graded: {item.submission.marks} / {item.maxMarks}
                  </Badge>
                ) : item.isSubmitted ? (
                  <Badge variant="warning" className="font-mono text-xs">
                    Under Review
                  </Badge>
                ) : (
                  <Badge variant="default" className="font-mono text-xs">
                    Pending Submission
                  </Badge>
                )}

                <span className="font-mono text-xs text-gold">
                  Max: {item.maxMarks} marks
                </span>
              </div>
            </div>

            {/* Teacher Feedback Banner if Graded */}
            {item.submission?.feedback && (
              <div className="rounded-xl border border-gold/30 bg-gold/5 p-3.5 text-xs">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-gold font-bold mb-1">
                  Faculty Evaluation Feedback:
                </span>
                <p className="text-white/90 italic">"{item.submission.feedback}"</p>
              </div>
            )}

            {/* Bottom Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs font-mono">
              <div className="flex items-center gap-4 text-muted">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-gold" />
                  <span>Due: {formatDate(item.dueDate || new Date().toISOString())}</span>
                </span>
                {item.submission && (
                  <span className="text-emerald-400">
                    Submitted: {formatDate(item.submission.submittedAt || new Date().toISOString())}
                  </span>
                )}
              </div>

              <div>
                {!item.isSubmitted ? (
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-2 shadow-glow"
                    onClick={() => setSubmittingAssignment(item)}
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload solution</span>
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted hover:text-white"
                    onClick={() => toast.success(`Viewing submission: ${item.submission?.fileName || 'submission.pdf'}`)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>View submitted copy</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )))}
      </div>

      {/* Submit Assignment Modal */}
      <Modal
        open={!!submittingAssignment}
        onClose={() => setSubmittingAssignment(null)}
        title={submittingAssignment?.title || 'Assignment Submission'}
        subtitle="Upload your solution PDF or documents"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Box */}
          <div className="rounded-xl border-2 border-dashed border-white/15 bg-surface/50 p-6 text-center space-y-2 hover:border-brand/40 transition-colors">
            <Upload className="h-8 w-8 text-gold mx-auto" />
            <div className="space-y-1">
              <p className="text-xs text-white font-medium">
                {uploadedFile ? uploadedFile.name : 'Click to select or drag and drop your PDF'}
              </p>
              <p className="text-[11px] font-mono text-muted">
                Accepted formats: PDF, DOCX, PNG (Max 25MB)
              </p>
            </div>
            <input
              type="file"
              id="asgFile"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadedFile(e.target.files[0])
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('asgFile')?.click()}
              className="text-xs"
            >
              Choose file
            </Button>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="block text-xs font-mono text-muted">
              Submission Notes / Working Comments
            </label>
            <textarea
              rows={3}
              value={submissionNote}
              onChange={(e) => setSubmissionNote(e.target.value)}
              placeholder="Mention any assumptions made or specific question queries for the instructor…"
              className="w-full rounded-xl bg-surface/80 border border-white/10 p-3 text-xs text-white placeholder-muted focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSubmittingAssignment(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="shadow-glow">
              Confirm submission
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
