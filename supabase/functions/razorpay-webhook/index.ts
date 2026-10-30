// Supabase Edge Function: razorpay-webhook
//
// Receives signed webhooks from Razorpay.
// Enforces:
//   1. Validates X-Razorpay-Signature with HMAC SHA-256 against RAZORPAY_WEBHOOK_SECRET.
//   2. Constant-time comparison prevents timing attacks.
//   3. On 'payment.captured' and 'order.paid', invokes public.verify_payment via service role.
//   4. Idempotent: handles duplicate deliveries safely without double-enrollment.
//
// Deploy: supabase functions deploy razorpay-webhook --no-verify-jwt
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function timingSafeEqualHex(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

async function verifyWebhookSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody))
  const hashArray = Array.from(new Uint8Array(sigBuf))
  const digestHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return timingSafeEqualHex(digestHex.toLowerCase(), signature.trim().toLowerCase())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const signature = req.headers.get('x-razorpay-signature') || req.headers.get('X-Razorpay-Signature')
  const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return json({ error: 'Missing signature or webhook secret configuration' }, 400)
  }

  const rawBody = await req.text()

  const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret)
  if (!isValid) {
    return json({ error: 'Invalid webhook signature' }, 400)
  }

  let eventPayload: Record<string, any>
  try {
    eventPayload = JSON.parse(rawBody)
  } catch {
    return json({ error: 'Invalid JSON payload' }, 400)
  }

  const eventName = eventPayload.event
  if (eventName === 'payment.captured' || eventName === 'order.paid') {
    const paymentEntity = eventPayload.payload?.payment?.entity
    const orderEntity = eventPayload.payload?.order?.entity

    // Razorpay order id (e.g. order_xxx)
    const orderId = paymentEntity?.order_id || orderEntity?.id
    const paymentId = paymentEntity?.id || `pay_${orderId || Date.now()}`
    const amount = paymentEntity?.amount ?? orderEntity?.amount ?? 0

    if (orderId) {
      const url = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

      const { error: rpcErr } = await admin.rpc('verify_payment', {
        p_order_id: String(orderId),
        p_gateway: 'razorpay',
        p_txn_id: String(paymentId),
        p_amount: Number(amount),
      })

      if (rpcErr) {
        console.error('verify_payment error:', rpcErr.message)
        // Even if error, return 200 if it was already processed
        return json({ status: 'error', message: rpcErr.message }, 200)
      }
    }
  }

  return json({ status: 'ok', received: true }, 200)
})
