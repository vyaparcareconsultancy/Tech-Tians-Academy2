import React, { useMemo } from 'react'
import {
  Download, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { useToast } from '../../components/ui.jsx'
import { Badge, Button } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'

export default function Orders() {
  const { user } = useAuth()
  const { db } = useData()
  const toast = useToast()

  // Student
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId) ||
      (db.students || [])[0] || { id: 'stu-1001', name: 'Rohan Verma' }
    )
  }, [db.students, user])

  // Orders for this student or sample orders
  const ordersList = useMemo(() => {
    const list = (db.orders || []).filter((o) => o.studentId === student.id)
    if (list.length > 0) {
      return list.map((o) => {
        const course = (db.courses || []).find((c) => c.id === o.courseId)
        return {
          ...o,
          courseTitle: course ? course.title : 'Physics for JEE Advanced 2027',
          gateway: 'Razorpay UPI',
        }
      })
    }

    return [
      {
        id: 'ord-demo-1',
        orderId: 'ORD-2026-4102',
        courseTitle: 'Physics for JEE Advanced 2027',
        amount: 3999,
        discount: 500,
        status: 'paid',
        gateway: 'UPI / PhonePe',
        createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
      },
      {
        id: 'ord-demo-2',
        orderId: 'ORD-2026-3891',
        courseTitle: 'Foundation Mathematics: Vectors & 3D Geometry',
        amount: 2499,
        discount: 0,
        status: 'paid',
        gateway: 'Credit Card',
        createdAt: new Date(Date.now() - 86400000 * 65).toISOString(),
      },
      {
        id: 'ord-demo-3',
        orderId: 'ORD-2026-3112',
        courseTitle: 'Organic Chemistry Masterclass: Mechanisms & Synthesis',
        amount: 2999,
        discount: 300,
        status: 'paid',
        gateway: 'Net Banking',
        createdAt: new Date(Date.now() - 86400000 * 110).toISOString(),
      },
    ]
  }, [db.orders, db.courses, student.id])

  // Total spent
  const totalSpent = useMemo(() => {
    return ordersList.reduce((acc, o) => acc + (o.status === 'paid' ? o.amount : 0), 0)
  }, [ordersList])

  const handleDownloadInvoice = (orderId) => {
    toast.success(`Downloading invoice receipt for ${orderId}`)
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Orders & Payment Receipts
        </h1>
        <p className="text-sm text-muted">
          Access your tax invoices, transaction records, and enrollment receipts.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-base glass p-5 border border-white/10 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Total Investment
          </span>
          <span className="block font-mono text-3xl font-bold text-gold">
            ₹{totalSpent.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="card-base glass p-5 border border-white/10 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Active Enrollments
          </span>
          <span className="block font-mono text-3xl font-bold text-white">
            {ordersList.length} Courses
          </span>
        </div>

        <div className="card-base glass p-5 border border-white/10 space-y-1">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Payment Security
          </span>
          <div className="flex items-center gap-2 pt-1">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-mono text-xs text-white">256-bit Encrypted</span>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card-base glass overflow-hidden border border-white/10">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="font-heading text-base font-semibold text-white">
            Transaction History
          </h3>
          <span className="font-mono text-xs text-muted">
            {ordersList.length} transactions recorded
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface/90 font-mono uppercase tracking-wider text-muted border-b border-white/5">
              <tr>
                <th className="px-5 py-3">Order ID</th>
                <th className="px-5 py-3">Course Curriculum</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ordersList.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4 font-mono font-medium text-brand">
                    {order.orderId || order.id}
                  </td>
                  <td className="px-5 py-4 text-white font-medium max-w-xs truncate">
                    {order.courseTitle}
                  </td>
                  <td className="px-5 py-4 font-mono text-muted">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-5 py-4 font-mono text-muted">
                    {order.gateway || 'UPI Gateway'}
                  </td>
                  <td className="px-5 py-4 font-mono font-bold text-gold">
                    ₹{order.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      variant={order.status === 'paid' ? 'success' : order.status === 'pending' ? 'warning' : 'danger'}
                      className="font-mono text-[10px] uppercase"
                    >
                      {order.status === 'paid' ? 'Paid' : order.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs font-mono"
                      onClick={() => handleDownloadInvoice(order.orderId || order.id)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>PDF</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
