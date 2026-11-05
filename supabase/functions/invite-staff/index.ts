// Supabase Edge Function: invite-staff
//
// Lets an admin invite a teacher. Creating a login account needs the
// service-role key, which must never ship to the browser, so this runs on the
// server. Flow:
//   1. Verify the caller's JWT and that their profile role is 'admin'.
//   2. auth.admin.inviteUserByEmail() creates the auth user and emails an invite link.
//   3. The on_auth_user_created trigger creates the profile (role 'student');
//      we then promote it to 'teacher' and store the extra fields.
//
// Deploy:  supabase functions deploy invite-staff
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically to Edge Functions by Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const DEFAULT_ALLOWED_ORIGINS =
  'https://www.techtians.com,https://techtians.com,http://localhost:5173'

function allowedOrigins(): string[] {
  const raw = Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
  if (origin && allowedOrigins().includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Who is calling?
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData?.user) return json(req, { error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (callerProfile?.role !== 'admin' || callerProfile?.status !== 'active') {
    return json(req, { error: 'Only active admins can invite staff' }, 403)
  }

  // 2. Validate input
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Invalid JSON body' }, 400)
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const fullName = String(body.name ?? body.fullName ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req, { error: 'Valid email is required' }, 400)
  if (fullName.length < 3) return json(req, { error: 'Full name is required' }, 400)
  if (!subject) return json(req, { error: 'Subject is required' }, 400)

  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existing) return json(req, { error: 'An account with this email already exists' }, 409)

  // 3. Create auth user + send invite email
  // Only allow redirect targets on the academy's own origins. This prevents an
  // open redirect via invite emails.
  const rawRedirectTo = typeof body.redirectTo === 'string' ? body.redirectTo.trim() : ''
  const redirectTo =
    rawRedirectTo &&
      /^https:\/\/(www\.)?techtians\.com(\/.*)?$|^http:\/\/localhost:5173(\/.*)?$/.test(rawRedirectTo)
      ? rawRedirectTo
      : undefined
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  })
  if (inviteErr || !invited?.user) {
    console.error('invite-staff: inviteUserByEmail failed', inviteErr)
    return json(req, { error: 'Invite failed' }, 400)
  }

  // 4. Promote the auto-created profile to teacher
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .upsert(
      {
        id: invited.user.id,
        email,
        full_name: fullName,
        role: 'teacher',
        status: 'pending',
        subject,
        phone: body.phone ? String(body.phone) : null,
        qualification: body.qualification ? String(body.qualification) : null,
        applied_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select()
    .single()
  if (profErr) {
    console.error('invite-staff: profile upsert failed', profErr)
    return json(req, { error: 'Failed to create teacher profile' }, 400)
  }

  return json(req, { profile })
})
