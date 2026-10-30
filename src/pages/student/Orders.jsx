import React, { useState, useMemo } from 'react'
import {
  Download, ShieldCheck, Printer, CheckCircle2
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { Badge, Button, Modal } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'

const STATUS_TONES = {
  paid: 'green',
  created: 'gold',
  pending: 'gold',
  failed: 'red',
  refunded: 'muted',
}

export default function Orders() {
  const { user } = useAuth()
  const { db } = useData()
  const [selectedInvoice, setSelectedInvoice] = useState(null)

  // Student
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId || s.id === user?.id) ||
      (db.students || [])[0] || { id: user?.id || 'stu-1001' }
    )
  }, [db.students, user])

  // Orders for this student only — strictly real store orders
  const ordersList = useMemo(() => {
    const list = (db.orders || []).filter(
      (o) => o.studentId === student?.id || o.studentId === user?.id
    )
    return list.map((o) => {
      const course = (db.courses || []).find((c) => c.id === o.courseId)
      const payment = (db.payments || []).find((p) => p.orderId === o.id)
      return {
        ...o,
        courseTitle: course ? course.title : (o.courseTitle || 'Course Order'),
        gateway: payment?.gateway || o.gateway || (o.status === 'paid' ? 'Razorpay' : 'Pending Gateway'),
      }
    })
  }, [db.orders, db.courses, db.payments, student?.id, user?.id])

  // Total spent
  const totalSpent = useMemo(() => {
    return ordersList.reduce((acc, o) => acc + (o.status === 'paid' ? Number(o.amount || 0) : 0), 0)
  }, [ordersList])

  const activeEnrollmentsCount = useMemo(() => {
    const studentEnrollments = (db.enrollments || []).filter(
      (e) => e.studentId === student?.id || e.studentId === user?.id
    )
    return studentEnrollments.filter((e) => e.status !== 'dropped').length
  }, [db.enrollments, student?.id, user?.id])

  const handlePrint = () => {
    window.print()
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
            {activeEnrollmentsCount} {activeEnrollmentsCount === 1 ? 'Course' : 'Courses'}
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

        {ordersList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="font-heading text-base font-medium text-white">No orders yet</p>
            <p className="text-xs text-muted">
              You have not made any course purchases or payments yet.
            </p>
          </div>
        ) : (
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
                      {order.gateway}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-gold">
                      ₹{Number(order.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        tone={STATUS_TONES[order.status] || 'default'}
                        className="font-mono text-[10px] uppercase"
                      >
                        {order.status === 'paid' ? 'Paid' : order.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {order.status === 'paid' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs font-mono text-brand hover:text-white"
                          onClick={() => setSelectedInvoice(order)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Invoice</span>
                        </Button>
                      ) : (
                        <span className="font-mono text-[11px] text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Invoice Modal */}
      <Modal
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        title={`Tax Invoice — ${selectedInvoice?.orderId || selectedInvoice?.id}`}
        subtitle="Official Course Enrollment Receipt"
      >
        {selectedInvoice && (
          <div className="space-y-6 text-xs" id="printable-invoice">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between border-b border-white/10 pb-4 gap-4">
              <div>
                <p className="font-heading text-lg font-bold text-white">Tech Tians Academy</p>
                <p className="text-muted">Online Learning & Mentorship Platform</p>
                <p className="text-muted">GSTIN: 27AABCT1234F1Z8</p>
              </div>
              <div className="sm:text-right font-mono text-muted space-y-1">
                <p><span className="text-white font-medium">Receipt #:</span> {selectedInvoice.orderId || selectedInvoice.id}</p>
                <p><span className="text-white font-medium">Date:</span> {formatDate(selectedInvoice.createdAt)}</p>
                <p><span className="text-white font-medium">Payment:</span> {selectedInvoice.gateway}</p>
              </div>
            </div>

            {/* Student & Course Details */}
            <div className="rounded-xl border border-white/10 bg-surface/80 p-4 space-y-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Billed To</span>
                <p className="font-heading text-sm font-semibold text-white mt-0.5">
                  {user?.name || user?.fullName || student?.name || 'Enrolled Student'}
                </p>
                <p className="font-mono text-muted">{user?.email || student?.email}</p>
              </div>

              <div className="border-t border-white/5 pt-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Purchased Course</span>
                <p className="font-heading text-sm font-semibold text-brand mt-0.5">
                  {selectedInvoice.courseTitle}
                </p>
              </div>
            </div>

            {/* Price breakdown table */}
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-surface/90 font-mono text-[10px] uppercase tracking-wider text-muted border-b border-white/5">
                  <tr>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="px-4 py-3 text-white">Course Tuition Fee</td>
                    <td className="px-4 py-3 text-right font-mono text-white">
                      ₹{(Number(selectedInvoice.amount || 0) + Number(selectedInvoice.discount || 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                  {Number(selectedInvoice.discount || 0) > 0 && (
                    <tr>
                      <td className="px-4 py-2 text-emerald-400">
                        Coupon Discount {selectedInvoice.couponCode ? `(${selectedInvoice.couponCode})` : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-400">
                        -₹{Number(selectedInvoice.discount).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  )}
                  <tr className="bg-surface/60 font-semibold">
                    <td className="px-4 py-3 text-white">Total Paid</td>
                    <td className="px-4 py-3 text-right font-mono text-gold text-sm font-bold">
                      ₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Verification confirmation */}
            <div className="flex items-center justify-between text-muted border-t border-white/10 pt-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-mono text-[11px] font-medium">Payment Verified & Settled</span>
              </div>
              <span className="font-mono text-[10px] text-muted">Computer generated invoice</span>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="secondary" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <Button variant="primary" icon={Printer} onClick={handlePrint}>
                Print Invoice
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
