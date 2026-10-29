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

  // 1. Who is calling?
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData?.user) return json({ error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, status')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (callerProfile?.role !== 'admin' || callerProfile?.status !== 'active') {
    return json({ error: 'Only active admins can invite staff' }, 403)
  }

  // 2. Validate input
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  const fullName = String(body.name ?? body.fullName ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Valid email is required' }, 400)
  if (fullName.length < 3) return json({ error: 'Full name is required' }, 400)
  if (!subject) return json({ error: 'Subject is required' }, 400)

  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  if (existing) return json({ error: 'An account with this email already exists' }, 409)

  // 3. Create auth user + send invite email
  const redirectTo = typeof body.redirectTo === 'string' ? body.redirectTo : undefined
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo,
  })
  if (inviteErr || !invited?.user) return json({ error: inviteErr?.message ?? 'Invite failed' }, 400)

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
  if (profErr) return json({ error: profErr.message }, 400)

  return json({ profile })
})
