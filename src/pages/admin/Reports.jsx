import React, { useMemo, useState } from 'react'
import { Users, CreditCard, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardHeader, Button, PageHeader, Select } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { formatINR, exportCSV, monthKey, monthLabel } from '../../lib/utils.js'
import { chartColors, chartAxis, chartGrid, chartTooltip } from '../../lib/chartTheme.js'

export default function Reports() {
  const { db } = useData()
  const [range, setRange] = useState('8')

  const keys = useMemo(() => {
    const n = Number(range)
    const arr = []
    const d = new Date()
    d.setDate(1)
    for (let i = n - 1; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
      arr.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)
    }
    return arr
  }, [range])

  const revenueSeries = keys.map((k) => ({
    m: monthLabel(k),
    revenue: db.orders.filter((o) => o.status === 'paid' && monthKey(o.createdAt) === k).reduce((s, o) => s + o.amount, 0),
  }))

  const enrollmentByCourse = useMemo(() => db.courses
    .map((c) => ({ name: c.title.length > 26 ? c.title.slice(0, 26) + '…' : c.title, students: db.enrollments.filter((e) => e.courseId === c.id).length }))
    .sort((a, b) => b.students - a.students), [db])

  const progressDistribution = useMemo(() => {
    const bands = { 'Not started': 0, '0–25%': 0, '25–50%': 0, '50–75%': 0, '75–100%': 0, 'Completed': 0 }
    db.enrollments.forEach((e) => {
      const p = e.progressPct || 0
      if (p === 0) bands['Not started']++
      else if (p < 25) bands['0–25%']++
      else if (p < 50) bands['25–50%']++
      else if (p < 75) bands['50–75%']++
      else if (p < 100) bands['75–100%']++
      else bands['Completed']++
    })
    return Object.entries(bands).map(([name, value]) => ({ name, value }))
  }, [db])

  const teacherLeaderboard = useMemo(() => db.teachers
    .filter((t) => t.status === 'active')
    .map((t) => {
      const courseIds = db.teacherCourses.filter((tc) => tc.teacherId === t.id).map((tc) => tc.courseId)
      const students = new Set(db.enrollments.filter((e) => courseIds.includes(e.courseId)).map((e) => e.studentId)).size
      const revenue = db.orders.filter((o) => o.status === 'paid' && courseIds.includes(o.courseId)).reduce((s, o) => s + o.amount, 0)
      return { teacher: t, students, revenue, rating: t.rating || 0 }
    })
    .sort((a, b) => b.revenue - a.revenue), [db])

  const exportStudents = () => {
    exportCSV('techtians-students.csv', ['Student ID', 'Name', 'Email', 'Phone', 'Class', 'City', 'Status', 'Enrolled'],
      db.students.map((s) => [s.studentId, s.name, s.email, s.phone, s.grade, s.city, s.status, s.enrolledAt.slice(0, 10)]))
  }
  const exportPayments = () => {
    exportCSV('techtians-payments.csv', ['Order', 'Date', 'Student', 'Course', 'Amount', 'Gateway', 'Txn ID', 'Status'],
      db.orders.filter((o) => o.status === 'paid').map((o) => {
        const pay = db.payments.find((p) => p.orderId === o.id)
        return [o.orderId, o.createdAt, db.students.find((s) => s.id === o.studentId)?.name, db.courses.find((c) => c.id === o.courseId)?.title, o.amount, pay?.gateway, pay?.txnId, o.status]
      }))
  }
  const exportEnrollments = () => {
    exportCSV('techtians-enrollments.csv', ['Student', 'Course', 'Batch', 'Enrolled', 'Progress %', 'Status'],
      db.enrollments.map((e) => [
        db.students.find((s) => s.id === e.studentId)?.name,
        db.courses.find((c) => c.id === e.courseId)?.title,
        e.batchId ? db.batches.find((b) => b.id === e.batchId)?.name : 'Direct',
        e.enrolledAt.slice(0, 10),
        e.progressPct || 0,
        e.status,
      ]))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Built from verified payment and enrollment records"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-32">
              <option value="6">6 months</option>
              <option value="8">8 months</option>
              <option value="12">12 months</option>
            </Select>
            <Button size="sm" variant="secondary" icon={Users} onClick={exportStudents}>Students CSV</Button>
            <Button size="sm" variant="secondary" icon={CreditCard} onClick={exportPayments}>Payments CSV</Button>
            <Button size="sm" variant="secondary" icon={BookOpen} onClick={exportEnrollments}>Enrollments CSV</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Revenue trend" subtitle="Verified payments only" />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid {...chartGrid} />
                <XAxis dataKey="m" {...chartAxis} />
                <YAxis {...chartAxis} width={52} tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)} />
                <Tooltip {...chartTooltip} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Bar dataKey="revenue" fill={chartColors.brand} radius={[6, 6, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Learning progress distribution" subtitle="Across all active enrollments" />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={progressDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} strokeWidth={0}>
                  {progressDistribution.map((_, i) => (
                    <Cell key={i} fill={chartColors.palette[i % chartColors.palette.length]} />
                  ))}
                </Pie>
                <Tooltip {...chartTooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {progressDistribution.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 font-mono text-xs text-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: chartColors.palette[i % chartColors.palette.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Enrollments by course" subtitle="Current active enrollments" />
          <div className="h-72 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentByCourse} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid {...chartGrid} horizontal={false} />
                <XAxis type="number" {...chartAxis} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltip} />
                <Bar dataKey="students" fill={chartColors.brand} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Teacher revenue leaderboard" subtitle="Verified revenue from assigned courses" />
          <DataTable
            pageSize={8}
            columns={[
              { key: 'rank', label: '#', render: (_, i) => <span className="font-mono text-xs text-muted">{i + 1}</span> },
              { key: 'teacher', label: 'Teacher', render: ({ teacher }) => <span className="font-medium text-white">{teacher.name}</span> },
              { key: 'students', label: 'Students', sortable: true, render: ({ students }) => <span className="font-mono">{students}</span> },
              { key: 'revenue', label: 'Revenue', sortable: true, render: ({ revenue }) => <span className="font-mono font-semibold text-white">{formatINR(revenue)}</span> },
              { key: 'rating', label: 'Rating', sortable: true, render: ({ rating }) => <span className="font-mono text-gold">{rating ? rating.toFixed(1) : '—'}</span> },
            ]}
            data={teacherLeaderboard.map((t, i) => ({ ...t, rank: i + 1 }))}
            emptyMessage="No teacher data."
          />
        </Card>
      </div>
    </div>
  )
}
