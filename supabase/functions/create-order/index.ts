// Supabase Edge Function: create-order
//
// Student course checkout order creation.
// Enforces:
//   1. Caller is an active student (verified via auth JWT + profiles table).
//   2. Course price is loaded from the database (client price never trusted).
//   3. Checks caller is not already actively enrolled.
//   4. Validates coupon server-side (active, date range, usage limit, course restriction).
//   5. If final amount is 0, auto-enrolls via verify_payment(..., 'free', ...).
//   6. If > 0, creates a Razorpay order via API and inserts an orders row with status 'created'.
//
// Deploy: supabase functions deploy create-order
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Verify caller session
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData?.user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (callerProfile?.role !== 'student' || callerProfile?.status !== 'active') {
    return json({ error: 'Only active students can purchase courses' }, 403)
  }

  // 2. Parse and validate body
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const courseId = String(body.course_id ?? body.courseId ?? '').trim()
  const rawBatchId = body.batch_id ?? body.batchId
  const batchId = rawBatchId ? String(rawBatchId).trim() : null
  const rawCoupon = body.coupon_code ?? body.couponCode
  const couponCode = rawCoupon ? String(rawCoupon).trim() : null

  if (!courseId) return json({ error: 'Course ID is required' }, 400)

  // 3. Load course price from DB (never trust client)
  const { data: course, error: courseErr } = await admin
    .from('courses')
    .select('id, title, price, status')
    .eq('id', courseId)
    .maybeSingle()

  if (courseErr || !course || course.status !== 'published') {
    return json({ error: 'Course not found or not available for enrollment' }, 404)
  }

  // 4. Verify student is not already actively enrolled
  const { data: existingEnrollment } = await admin
    .from('enrollments')
    .select('id, status')
    .eq('student_id', userData.user.id)
    .eq('course_id', course.id)
    .eq('status', 'active')
    .maybeSingle()

  if (existingEnrollment) {
    return json({ error: 'Already enrolled' }, 400)
  }

  // Optional batch validation
  if (batchId) {
    const { data: batch } = await admin
      .from('batches')
      .select('id, course_id, status')
      .eq('id', batchId)
      .maybeSingle()
    if (!batch || batch.course_id !== course.id) {
      return json({ error: 'Selected batch does not belong to this course' }, 400)
    }
  }

  // 5. Server-side coupon validation
  const basePrice = Math.max(0, Number(course.price || 0))
  let discount = 0
  let matchedCoupon: { code: string; type: string; value: number } | null = null

  if (couponCode) {
    const { data: coupon } = await admin
      .from('coupons')
      .select('*')
      .ilike('code', couponCode)
      .maybeSingle()

    if (!coupon || !coupon.active) {
      return json({ error: 'Invalid or inactive coupon code' }, 400)
    }

    const now = new Date()
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return json({ error: 'Coupon is not active yet' }, 400)
    }
    if (coupon.valid_till && new Date(coupon.valid_till) < now) {
      return json({ error: 'Coupon has expired' }, 400)
    }
    if (typeof coupon.max_uses === 'number' && typeof coupon.used_count === 'number' && coupon.used_count >= coupon.max_uses) {
      return json({ error: 'Coupon usage limit reached' }, 400)
    }
    if (coupon.course_id && coupon.course_id !== course.id) {
      return json({ error: 'Coupon is not applicable to this course' }, 400)
    }

    matchedCoupon = coupon
    if (coupon.type === 'percent') {
      discount = Math.round((basePrice * Number(coupon.value || 0)) / 100)
    } else {
      discount = Math.round(Number(coupon.value || 0))
    }
    discount = Math.min(basePrice, Math.max(0, discount))
  }

  const finalAmountRupees = Math.max(0, basePrice - discount)
  const finalAmountPaise = Math.round(finalAmountRupees * 100)

  // Generate unique internal order ID
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randSuffix = Math.random().toString(36).slice(2, 7).toUpperCase()
  const internalOrderId = `ORD-${dateStr}-${randSuffix}`

  // 6. Handle Free enrollment (final amount = 0)
  if (finalAmountPaise === 0) {
    const { data: orderRow, error: orderInsertErr } = await admin
      .from('orders')
      .insert({
        order_id: internalOrderId,
        gateway_order_id: `free_${internalOrderId}`,
        student_id: userData.user.id,
        course_id: course.id,
        batch_id: batchId,
        amount: 0,
        discount,
        status: 'paid',
        coupon_code: matchedCoupon ? matchedCoupon.code : null,
      })
      .select()
      .single()

    if (orderInsertErr) {
      return json({ error: orderInsertErr.message }, 400)
    }

    // Call verify_payment to idempotently create enrollment and increment coupon
    const { error: verifyErr } = await admin.rpc('verify_payment', {
      p_order_id: internalOrderId,
      p_gateway: 'free',
      p_txn_id: `free_${internalOrderId}`,
      p_amount: 0,
    })

    if (verifyErr) {
      return json({ error: verifyErr.message }, 500)
    }

    return json({
      free: true,
      order_id: internalOrderId,
      amount: 0,
      currency: 'INR',
    })
  }

  // 7. Handle Paid enrollment via Razorpay Orders API
  const keyId = Deno.env.get('RAZORPAY_KEY_ID')
  const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

  if (!keyId || !keySecret) {
    return json({ error: 'Payment gateway configuration is missing on server' }, 500)
  }

  const basicAuth = btoa(`${keyId}:${keySecret}`)
  const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basicAuth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: finalAmountPaise,
      currency: 'INR',
      receipt: internalOrderId.slice(0, 40),
      notes: {
        course_id: course.id,
        student_id: userData.user.id,
        batch_id: batchId || '',
        internal_order_id: internalOrderId,
      },
    }),
  })

  if (!rzpRes.ok) {
    const errText = await rzpRes.text()
    return json({ error: `Razorpay order creation failed: ${errText}` }, 400)
  }

  const rzpOrder = await rzpRes.json()

  // Insert orders row with status 'created'
  const { error: orderInsertErr } = await admin
    .from('orders')
    .insert({
      order_id: internalOrderId,
      gateway_order_id: rzpOrder.id,
      student_id: userData.user.id,
      course_id: course.id,
      batch_id: batchId,
      amount: finalAmountRupees,
      discount,
      status: 'created',
      coupon_code: matchedCoupon ? matchedCoupon.code : null,
    })

  if (orderInsertErr) {
    return json({ error: orderInsertErr.message }, 400)
  }

  return json({
    order_id: rzpOrder.id,
    internal_order_id: internalOrderId,
    amount: finalAmountPaise,
    currency: 'INR',
    key_id: keyId,
  })
})
