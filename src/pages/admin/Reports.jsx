import React, { useMemo, useState } from 'react'
import { Users, CreditCard, BookOpen } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card, CardHeader, Button, PageHeader, Select } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { formatINR, exportCSV, monthKey, monthLabel } from '../../lib/utils.js'

const PIE_COLORS = ['#4F46E5', '#4672B8', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9']

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
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Built from verified payment and enrollment records" actions={
        <div className="flex gap-2">
          <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-32">
            <option value="6">6 months</option>
            <option value="8">8 months</option>
            <option value="12">12 months</option>
          </Select>
          <Button size="sm" variant="secondary" icon={Users} onClick={exportStudents}>Students CSV</Button>
          <Button size="sm" variant="secondary" icon={CreditCard} onClick={exportPayments}>Payments CSV</Button>
          <Button size="sm" variant="secondary" icon={BookOpen} onClick={exportEnrollments}>Enrollments CSV</Button>
        </div>
      } />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Revenue trend" subtitle="Verified payments only" />
          <div className="h-64 px-4 py-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueSeries} margin={{ top: 6, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                <XAxis dataKey="m" tick={{ fontSize: 12, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} width={52} tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} formatter={(v) => [formatINR(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#345A99" radius={[6, 6, 0, 0]} maxBarSize={38} />
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
                  {progressDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap justify-center gap-3">
              {progressDistribution.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 13 }} />
                <Bar dataKey="students" fill="#4F46E5" radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Teacher revenue leaderboard" subtitle="Verified revenue from assigned courses" />
          <DataTable
            pageSize={8}
            columns={[
              { key: 'rank', label: '#', render: (_, i) => <span className="text-xs text-slate-400">{i + 1}</span> },
              { key: 'teacher', label: 'Teacher', render: ({ teacher }) => <span className="font-medium text-slate-800">{teacher.name}</span> },
              { key: 'students', label: 'Students', sortable: true },
              { key: 'revenue', label: 'Revenue', sortable: true, render: ({ revenue }) => formatINR(revenue) },
              { key: 'rating', label: 'Rating', sortable: true, render: ({ rating }) => rating ? rating.toFixed(1) : '—' },
            ]}
            data={teacherLeaderboard.map((t, i) => ({ ...t, rank: i + 1 }))}
            emptyMessage="No teacher data."
          />
        </Card>
      </div>
    </div>
  )
}
