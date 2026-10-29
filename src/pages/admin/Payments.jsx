import React, { useMemo, useState } from 'react'
import { Download, Lock, RefreshCw, IndianRupee, Clock, XCircle, CheckCircle2 } from 'lucide-react'
import { Badge, Button, Card, CardHeader, Modal, Select, PageHeader, useToast, StatCard, SearchInput } from '../../components/ui.jsx'
import DataTable from '../../components/DataTable.jsx'
import { useData } from '../../lib/store.jsx'
import { paymentsApi } from '../../lib/api/commerce.js'
import { formatINR, formatDateTime, exportCSV, cx } from '../../lib/utils.js'

const RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

export default function Payments() {
  const { db, update, audit, isDemo, reload } = useData()
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

  const requestRefund = async () => {
    try {
      if (isDemo) {
        await update('orders', refundTarget.id, { status: 'refunded' })
        const pay = db.payments.find((p) => p.orderId === refundTarget.id)
        if (pay) await update('payments', pay.id, { status: 'refunded' })
        await audit('payment.refund_requested', 'payments', `Refund requested for ${refundTarget.orderId} (authorized process)`)
      } else {
        await paymentsApi.requestRefund(refundTarget.orderId || refundTarget.id, 'Refund requested by administrator')
        await audit('payment.refund_requested', 'payments', `Refund requested for ${refundTarget.orderId} (authorized process)`)
        reload()
      }
      toast.info(`Refund for ${refundTarget.orderId} queued for finance approval.`)
      setRefundTarget(null)
    } catch (err) {
      toast.error(err.message || 'Failed to process refund')
    }
  }

  const statusTone = { paid: 'brand', pending: 'gold', failed: 'red', refunded: 'muted' }

  const columns = [
    { key: 'orderId', label: 'Order', sortable: true, render: (o) => <span className="font-mono text-xs text-brand">{o.orderId}</span> },
    { key: 'createdAt', label: 'Date', sortable: true, render: (o) => <span className="font-mono text-xs text-muted">{formatDateTime(o.createdAt)}</span> },
    { key: 'student', label: 'Student', render: (o) => {
      const s = db.students.find((x) => x.id === o.studentId)
      return s ? <span className="font-medium text-white">{s.name}</span> : '—'
    }},
    { key: 'course', label: 'Course', render: (o) => <span className="text-white/90">{db.courses.find((c) => c.id === o.courseId)?.title || '—'}</span> },
    { key: 'gateway', label: 'Method', render: (o) => <span className="font-mono text-xs text-muted">{db.payments.find((p) => p.orderId === o.id)?.gateway || '—'}</span> },
    { key: 'amount', label: 'Amount', sortable: true, render: (o) => (
      <span className="font-mono text-sm font-medium text-gold">
        {formatINR(o.amount)}
        {o.discount > 0 && <span className="ml-1 text-xs text-muted line-through">{formatINR(o.amount + o.discount)}</span>}
      </span>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (o) => <Badge tone={statusTone[o.status]}>{o.status}</Badge> },
    { key: 'verified', label: 'Verification', render: (o) => {
      const pay = db.payments.find((p) => p.orderId === o.id)
      return pay?.verified
        ? <span className="inline-flex items-center gap-1 font-mono text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />gateway-verified</span>
        : <span className="inline-flex items-center gap-1 font-mono text-xs text-muted"><Clock className="h-3.5 w-3.5" />unverified</span>
    }},
    { key: 'actions', label: '', render: (o) => (
      <div className="flex justify-end gap-1">
        {o.status === 'paid' && (
          <Button size="sm" variant="ghost" icon={RefreshCw} onClick={() => setRefundTarget(o)}>Request refund</Button>
        )}
        {o.status === 'paid' && <Lock className="h-4 w-4 text-muted" title="Verified records are read-only" />}
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
        <StatCard icon={IndianRupee} label="Verified revenue" value={formatINR(summary.verified)} tone="brand" delta={`${summary.count} paid orders`} />
        <StatCard icon={Clock} label="Pending capture" value={formatINR(summary.pending)} tone="gold" />
        <StatCard icon={XCircle} label="Failed" value={formatINR(summary.failed)} tone="red" />
        <StatCard icon={RefreshCw} label="Refunded" value={formatINR(summary.refunded)} tone="muted" />
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

      <Card className="mt-4 border-gold/20 bg-gold/5">
        <div className="flex gap-3 px-5 py-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <p className="text-sm text-gold/90">
            <span className="font-semibold text-gold">Security policy:</span> verified payment records cannot be edited or deleted by any console user.
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
              { label: 'Order ID', value: detailOrder.orderId, mono: true, brand: true },
              { label: 'Placed at', value: formatDateTime(detailOrder.createdAt), mono: true },
              { label: 'Student', value: db.students.find((s) => s.id === detailOrder.studentId)?.name },
              { label: 'Email', value: db.students.find((s) => s.id === detailOrder.studentId)?.email, mono: true, xs: true },
              { label: 'Course', value: db.courses.find((c) => c.id === detailOrder.courseId)?.title },
              { label: 'Amount', value: formatINR(detailOrder.amount), mono: true, gold: true },
              { label: 'Discount', value: detailOrder.discount ? formatINR(detailOrder.discount) : '—', mono: !!detailOrder.discount },
              { label: 'Coupon', value: detailOrder.couponCode || '—', mono: !!detailOrder.couponCode },
              { label: 'Gateway', value: detailPayment.gateway },
              { label: 'Gateway txn ID', value: detailPayment.txnId, mono: true, xs: true },
              { label: 'Payment status', value: detailPayment.status },
              { label: 'Verification', value: detailPayment.verified ? 'Verified via gateway webhook' : 'Awaiting webhook confirmation' },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs font-medium text-muted">{item.label}</dt>
                <dd className={cx('mt-0.5 text-sm font-medium text-white', item.mono && 'font-mono', item.xs && 'text-xs', item.gold && 'text-gold', item.brand && 'text-brand')}>{item.value}</dd>
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
        <p className="text-sm text-muted">
          A refund request for <span className="font-mono text-brand">{refundTarget?.orderId}</span> (<span className="font-mono text-gold">{formatINR(refundTarget?.amount)}</span>)
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
