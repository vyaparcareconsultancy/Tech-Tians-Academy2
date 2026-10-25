import { supabase } from '../supabase.js'
import { createTableCrud } from './helpers.js'

export const ordersApi = createTableCrud('orders')

const basePaymentsApi = createTableCrud('payments')
export const paymentsApi = {
  ...basePaymentsApi,
  requestRefund: async (orderId, reason = 'Admin authorized refund request') => {
    if (!supabase) return null
    const { data, error } = await supabase.rpc('request_refund', {
      p_order_id: String(orderId),
      p_reason: reason,
    })
    if (error) throw new Error(error.message)
    return data
  },
}

export const couponsApi = createTableCrud('coupons', {
  toDb: (data) => {
    const out = { ...data }
    if (out.value !== undefined) out.value = Number(out.value) || 0
    if (out.maxUses !== undefined) out.maxUses = Number(out.maxUses) || 0
    if (out.usedCount !== undefined) out.usedCount = Number(out.usedCount) || 0
    return out
  },
})

export const enrollmentsApi = createTableCrud('enrollments', {
  toDb: (data) => {
    const out = { ...data }
    if (out.batchId === '') out.batchId = null
    if (out.amountPaid !== undefined) out.amountPaid = Number(out.amountPaid) || 0
    if (out.progressPct !== undefined) out.progressPct = Number(out.progressPct) || 0
    return out
  },
})

export const lessonProgressApi = createTableCrud('lesson_progress')

export const requestRefund = paymentsApi.requestRefund
export const list = ordersApi.list
export const get = ordersApi.get
export const insert = ordersApi.insert
export const update = ordersApi.update
export const remove = ordersApi.remove
