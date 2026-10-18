import React, { useMemo } from 'react'
import { Users } from 'lucide-react'
import { Badge, Card, CardHeader, Modal, PageHeader, IconButton, Avatar } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { formatDate, cx } from '../../lib/utils.js'

export default function MyBatches() {
  const { user } = useAuth()
  const { db, teacherIdForUser } = useData()
  const teacherId = teacherIdForUser(user.id)
  const myCourseIds = db.teacherCourses.filter((tc) => tc.teacherId === teacherId).map((tc) => tc.courseId)

  const myBatches = useMemo(() => db.batches.filter((b) => b.teacherId === teacherId || myCourseIds.includes(b.courseId)), [db, teacherId, myCourseIds])
  const [viewBatch, setViewBatch] = React.useState(null)

  const enrolledCount = (batchId) => db.batchStudents.filter((bs) => bs.batchId === batchId).length

  const columns = [
    { key: 'name', label: 'Batch', sortable: true, render: (b) => (
      <div>
        <p className="font-medium text-white">{b.name}</p>
        <p className="font-mono text-xs text-muted">{b.schedule}</p>
      </div>
    )},
    { key: 'course', label: 'Course', render: (b) => db.courses.find((c) => c.id === b.courseId)?.title || '—' },
    { key: 'dates', label: 'Duration', render: (b) => <span className="font-mono text-xs">{formatDate(b.startDate)} → {formatDate(b.endDate)}</span> },
    { key: 'fill', label: 'Capacity', render: (b) => {
      const n = enrolledCount(b.id)
      const pct = Math.round((n / b.capacity) * 100)
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line">
            <div className={cx('h-full rounded-full', pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-gold' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
          </div>
          <span className="font-mono text-xs text-muted">{n}/{b.capacity}</span>
        </div>
      )
    }},
    { key: 'status', label: 'Status', sortable: true, render: (b) => <Badge tone={b.status === 'active' ? 'green' : b.status === 'upcoming' ? 'blue' : 'muted'}>{b.status}</Badge> },
    { key: 'actions', label: '', render: (b) => (
      <div className="flex justify-end gap-1">
        <IconButton title="View students" onClick={() => setViewBatch(b)}><Users className="h-4 w-4" /></IconButton>
      </div>
    )},
  ]

  const view = viewBatch && db.batches.find((b) => b.id === viewBatch.id)
  const viewStudents = view ? db.batchStudents.filter((bs) => bs.batchId === view.id).map((bs) => ({ bs, student: db.students.find((s) => s.id === bs.studentId) })).filter((x) => x.student) : []

  return (
    <div>
      <PageHeader title="My Batches" subtitle="Batches linked to your assigned courses" />
      <Card>
        <CardHeader title="Batches" subtitle="Contact your admin to create or reassign batches" />
        <DataTable columns={columns} data={myBatches} emptyMessage="No batches assigned to you yet." />
      </Card>

      <Modal open={!!view} onClose={() => setViewBatch(null)} title={`Students — ${view?.name}`} subtitle={`${viewStudents.length} enrolled`} wide>
        <DataTable
          pageSize={10}
          columns={[
            { key: 'name', label: 'Student', render: ({ student }) => (
              <div className="flex items-center gap-2">
                <Avatar name={student.name} className="h-7 w-7 text-[10px]" />
                <span className="font-medium text-white">{student.name}</span>
              </div>
            )},
            { key: 'studentId', label: 'ID', render: ({ student }) => <span className="font-mono text-xs">{student.studentId}</span> },
            { key: 'grade', label: 'Class', render: ({ student }) => <span className="font-mono text-xs">{student.grade}</span> },
            { key: 'enrolledAt', label: 'Enrolled', render: ({ bs }) => <span className="font-mono text-xs">{formatDate(bs.enrolledAt)}</span> },
          ]}
          data={viewStudents}
          emptyMessage="No students enrolled yet."
        />
      </Modal>
    </div>
  )
}
