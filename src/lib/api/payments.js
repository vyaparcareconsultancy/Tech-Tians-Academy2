import { supabase, isDemoMode } from '../supabase.js'

export async function createOrder({ courseId, batchId, couponCode } = {}) {
  if (isDemoMode || !supabase) {
    return {
      demo: true,
      order_id: `ord_demo_${Date.now()}`,
      amount: 0,
      currency: 'INR',
      key_id: 'rzp_test_demo',
    }
  }

  const { data, error } = await supabase.functions.invoke('create-order', {
    body: {
      course_id: courseId,
      batch_id: batchId || null,
      coupon_code: couponCode ? couponCode.trim() : null,
    },
  })

  if (error) {
    let msg = error.message || 'Failed to create order'
    if (data && typeof data === 'object' && data.error) {
      msg = data.error
    }
    throw new Error(msg)
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}
