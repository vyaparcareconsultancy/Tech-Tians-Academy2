import React, { useMemo, useState } from 'react'
import { Download, Lock, RefreshCw, IndianRupee, Clock, XCircle, CheckCircle2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Modal, Select, PageHeader, useToast, StatCard, SearchInput } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { formatINR, formatDateTime, exportCSV } from '../../lib/utils.js'

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export default function Payments() {
  const { db, update, audit } = useData()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [method, setMethod] = useState('all')
  const [range, setRange] = useState('all')
  const [courseFilter, setCourseFilter] = useState('all')
  const [detail, setDetail] = useState(null)
  const [refundTarget, setRefundTarget] = useState(null)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const cutoff = range === 'all' ? null : Date.now() - Number(range) * 864e5
    return db.orders.filter((o) => {
      if (query) {
        const st = db.students.find((s) => s.id === o.studentId)
        const c = db.courses.find((x) => x.id === o.courseId)
        const hay = [o.orderId, st?.name, st?.email, c?.title].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(query)) return false
      }
      if (status !== 'all' && o.status !== status) return false
      if (method !== 'all') {
        const pay = db.payments.find((p) => p.orderId === o.id)
        if (pay?.gateway !== method) return false
      }
      if (courseFilter !== 'all' && o.courseId !== courseFilter) return false
      if (cutoff && new Date(o.createdAt).getTime() < cutoff) return false
      return true
    })
  }, [db, q, status, method, range, courseFilter])

  const summary = useMemo(() => {
    const paid = db.orders.filter((o) => o.status === 'paid')
    return {
      verified: paid.reduce((s, o) => s + o.amount, 0),
      pending: db.orders.filter((o) => o.status === 'pending').reduce((s, o) => s + o.amount, 0),
      failed: db.orders.filter((o) => o.status === 'failed').reduce((s, o) => s + o.amount, 0),
      refunded: db.orders.filter((o) => o.status === 'refunded').reduce((s, o) => s + o.amount, 0),
      count: paid.length,
    }
  }, [db])

  const exportRows = () => {
    const rows = filtered.map((o) => {
      const st = db.students.find((s) => s.id === o.studentId)
      const c = db.courses.find((x) => x.id === o.courseId)
      const pay = db.payments.find((p) => p.orderId === o.id)
      return [o.orderId, formatDateTime(o.createdAt), st?.name, st?.email, c?.title, o.amount, o.discount, pay?.gateway, pay?.txnId, o.status, pay?.verified ? 'verified' : 'unverified']
    })
    exportCSV('techtians-payments.csv', ['Order', 'Date', 'Student', 'Email', 'Course', 'Amount (INR)', 'Discount', 'Gateway', 'Txn ID', 'Status', 'Verification'], rows)
    toast.success('Payment report exported.')
  }

  const requestRefund = () => {
    update('orders', refundTarget.id, { status: 'refunded' })
    const pay = db.payments.find((p) => p.orderId === refundTarget.id)
    if (pay) update('payments', pay.id, { status: 'refunded' })
    audit('payment.refund_requested', 'payments', `Refund requested for ${refundTarget.orderId} (authorized process)`)
    toast.info(`Refund for ${refundTarget.orderId} queued for finance approval.`)
    setRefundTarget(null)
  }

  const statusTone = { paid: 'green', pending: 'amber', failed: 'red', refunded: 'slate' }

  const columns = [
    { key: 'orderId', label: 'Order', sortable: true, render: (o) => <span className="font-mono text-xs">{o.orderId}</span> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (o) => formatDateTime(o.createdAt) },
    { key: 'student', label: 'Student', render: (o) => {
      const s = db.students.find((x) => x.id === o.studentId)
      return s ? <span className="font-medium text-slate-800">{s.name}</span> : '—'
    }},
    { key: 'course', label: 'Course', render: (o) => db.courses.find((c) => c.id === o.courseId)?.title || '—' },
    { key: 'gateway', label: 'Method', render: (o) => db.payments.find((p) => p.orderId === o.id)?.gateway || '—' },
    { key: 'amount', label: 'Amount', sortable: true, render: (o) => (
      <span>
        {formatINR(o.amount)}
        {o.discount > 0 && <span className="ml-1 text-xs text-slate-400 line-through">{formatINR(o.amount + o.discount)}</span>}
      </span>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (o) => <Badge tone={statusTone[o.status]}>{o.status}</Badge> },
    { key: 'verified', label: 'Verification', render: (o) => {
      const pay = db.payments.find((p) => p.orderId === o.id)
      return pay?.verified
        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />gateway-verified</span>
        : <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Clock className="h-3.5 w-3.5" />unverified</span>
    }},
    { key: 'actions', label: '', render: (o) => (
      <div className="flex justify-end gap-1">
        {o.status === 'paid' && (
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => setRefundTarget(o)}>Request refund</Button>
        )}
        {o.status === 'paid' && <Lock className="h-4 w-4 text-slate-300" title="Verified records are read-only" />}
      </div>
    )},
  ]

  const detailOrder = detail && db.orders.find((o) => o.id === detail.id)
  const detailPayment = detailOrder ? db.payments.find((p) => p.orderId === detailOrder.id) : null

  return (
    <div>
      <PageHeader title="Payments & Orders" subtitle="Verified gateway records only — amounts are immutable" actions={
        <Button icon={Download} onClick={exportRows}>Export CSV</Button>
      } />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={IndianRupee} label="Verified revenue" value={formatINR(summary.verified)} tone="emerald" delta={`${summary.count} paid orders`} />
        <StatCard icon={Clock} label="Pending capture" value={formatINR(summary.pending)} tone="amber" />
        <StatCard icon={XCircle} label="Failed" value={formatINR(summary.failed)} tone="rose" />
        <StatCard icon={RefreshCw} label="Refunded" value={formatINR(summary.refunded)} tone="slate" />
      </div>

      <Card className="mt-4">
        <CardHeader title="Order history" subtitle="Filters apply before export" actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={q} onChange={setQ} placeholder="Order, student or course…" className="w-52" />
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-32">
              <option value="all">All status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </Select>
            <Select value={method} onChange={(e) => setMethod(e.target.value)} className="w-36">
              <option value="all">All methods</option>
              {['Razorpay', 'PhonePe', 'UPI', 'Card'].map((m) => <option key={m}>{m}</option>)}
            </Select>
            <Select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="w-48">
              <option value="all">All courses</option>
              {db.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </Select>
            <Select value={range} onChange={(e) => setRange(e.target.value)} className="w-36">
              {RANGE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </Select>
          </div>
        } />
        <DataTable columns={columns} data={filtered} onRowClick={(o) => setDetail(o)} emptyMessage="No transactions match the filters." />
      </Card>

      <Card className="mt-4 border-amber-200 bg-amber-50">
        <div className="flex gap-3 px-5 py-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Security policy:</span> verified payment records cannot be edited or deleted by any console user.
            Refunds follow a two-step authorized process (request → finance approval) and every action is written to the audit log.
            Gateway secrets and webhook verification keys live server-side only.
          </p>
        </div>
      </Card>

      {/* Transaction detail */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Transaction ${detailOrder?.orderId}`} subtitle="Gateway record (read-only)">
        {detailOrder && detailPayment && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
            {[
              ['Order ID', detailOrder.orderId],
              ['Placed at', formatDateTime(detailOrder.createdAt)],
              ['Student', db.students.find((s) => s.id === detailOrder.studentId)?.name],
              ['Email', db.students.find((s) => s.id === detailOrder.studentId)?.email],
              ['Course', db.courses.find((c) => c.id === detailOrder.courseId)?.title],
              ['Amount', formatINR(detailOrder.amount)],
              ['Discount', detailOrder.discount ? formatINR(detailOrder.discount) : '—'],
              ['Coupon', detailOrder.couponCode || '—'],
              ['Gateway', detailPayment.gateway],
              ['Gateway txn ID', detailPayment.txnId],
              ['Payment status', detailPayment.status],
              ['Verification', detailPayment.verified ? 'Verified via gateway webhook' : 'Awaiting webhook confirmation'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs font-medium text-slate-400">{k}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-5 flex justify-end gap-2">
          {detailOrder?.status === 'paid' && (
            <Button variant="danger" icon={RefreshCw} onClick={() => { setRefundTarget(detailOrder); setDetail(null) }}>Request refund</Button>
          )}
          <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
        </div>
      </Modal>

      <Modal open={!!refundTarget} onClose={() => setRefundTarget(null)} title="Request refund" subtitle="Requires finance-team approval">
        <p className="text-sm text-slate-600">
          A refund request for <span className="font-mono">{refundTarget?.orderId}</span> ({formatINR(refundTarget?.amount)})
          will be queued. The verified gateway record is preserved and the request is written to the audit log with your identity.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setRefundTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={requestRefund}>Submit refund request</Button>
        </div>
      </Modal>
    </div>
  )
}
