// Supabase Edge Function: send-email
//
// Sends real transactional emails from noreply@techtians.com via Resend.
//
// The client never passes raw recipient email addresses — only a `type` and
// the id(s) of the thing that happened. This function verifies the caller,
// looks up both the recipients and the content on the server with the
// service-role key, and then sends the email. That keeps recipient lists and
// the Resend API key off the browser entirely.
//
// Supported types (see `resolve*` helpers below):
//   announcement       { announcement_id }
//   class_update       { live_class_id, change: 'cancelled' | 'rescheduled' }
//   assignment_graded  { submission_id }
//   teacher_approved   { teacher_id }                 (admin only)
//
// Authorization:
//   - Caller must be an active admin or active teacher.
//   - Admins may send any type for anyone.
//   - Teachers may only send announcement / class_update for batches and
//     courses they own, and assignment_graded for assignments they own.
//
// Required env (set with `supabase secrets set ...`):
//   RESEND_API_KEY
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected
// automatically by Supabase.
//
// Deploy:  npx supabase functions deploy send-email
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

const FROM = 'Tech Tians Academy <noreply@techtians.com>'
const FROM_ADDRESS = 'noreply@techtians.com'
const SITE = 'https://www.techtians.com'
const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const BCC_BATCH_SIZE = 50

type SupabaseClient = ReturnType<typeof createClient>

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

// ---------------------------------------------------------------------------
// Branded email template
// ---------------------------------------------------------------------------
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

interface EmailContent {
  subject: string
  heading: string
  // Paragraphs of body copy (plain strings; rendered safely).
  lines: string[]
  ctaLabel: string
  ctaPath: string // appended to SITE
}

function renderEmail(c: EmailContent): { html: string; text: string } {
  const ctaUrl = `${SITE}${c.ctaPath}`
  const bodyHtml = c.lines
    .map(
      (line) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(
          line,
        )}</p>`,
    )
    .join('')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#0f1115;padding:24px 32px;">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">Tech Tians Academy</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;color:#0f172a;font-weight:700;">${escapeHtml(
    c.heading,
  )}</h1>
                ${bodyHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
                  <tr>
                    <td style="border-radius:8px;background:#F7931A;">
                      <a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(
    c.ctaLabel,
  )}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #e2e8f0;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">
                  Tech Tians Academy · This is an automated message, please do not reply.<br />
                  <a href="${SITE}" style="color:#94a3b8;">www.techtians.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = [
    'Tech Tians Academy',
    '',
    c.heading,
    '',
    ...c.lines,
    '',
    `${c.ctaLabel}: ${ctaUrl}`,
    '',
    '—',
    'Tech Tians Academy · This is an automated message, please do not reply.',
    SITE,
  ].join('\n')

  return { html, text }
}

// ---------------------------------------------------------------------------
// Recipient helpers (service role)
// ---------------------------------------------------------------------------
async function emailsForStudentIds(admin: SupabaseClient, ids: string[]): Promise<string[]> {
  const unique = Array.from(new Set(ids)).filter(Boolean)
  if (unique.length === 0) return []
  const { data } = await admin
    .from('profiles')
    .select('email')
    .in('id', unique)
    .eq('role', 'student')
    .eq('status', 'active')
  return (data ?? []).map((r: { email: string }) => r.email).filter(Boolean)
}

async function studentIdsInBatch(admin: SupabaseClient, batchId: string): Promise<string[]> {
  // The roster lives in two places historically — enrollments.batch_id and the
  // batch_students join table. Union both so no active student is missed.
  const ids: string[] = []
  const { data: enr } = await admin
    .from('enrollments')
    .select('student_id')
    .eq('batch_id', batchId)
    .eq('status', 'active')
  for (const r of enr ?? []) ids.push(r.student_id)

  const { data: bs } = await admin
    .from('batch_students')
    .select('student_id')
    .eq('batch_id', batchId)
    .eq('status', 'active')
  for (const r of bs ?? []) ids.push(r.student_id)

  return ids
}

async function studentIdsInCourses(admin: SupabaseClient, courseIds: string[]): Promise<string[]> {
  if (courseIds.length === 0) return []
  const { data } = await admin
    .from('enrollments')
    .select('student_id')
    .in('course_id', courseIds)
    .eq('status', 'active')
  return (data ?? []).map((r: { student_id: string }) => r.student_id)
}

// Course ids a teacher owns, via explicit assignment or via batches they teach.
async function courseIdsForTeacher(admin: SupabaseClient, teacherId: string): Promise<string[]> {
  const ids = new Set<string>()
  const { data: tc } = await admin
    .from('teacher_courses')
    .select('course_id')
    .eq('teacher_id', teacherId)
  for (const r of tc ?? []) ids.add(r.course_id)
  const { data: batches } = await admin
    .from('batches')
    .select('course_id')
    .eq('teacher_id', teacherId)
  for (const r of batches ?? []) ids.add(r.course_id)
  return Array.from(ids)
}

async function teacherOwnsCourse(
  admin: SupabaseClient,
  teacherId: string,
  courseId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('teacher_courses')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('course_id', courseId)
    .maybeSingle()
  return !!data
}

function formatIST(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// ---------------------------------------------------------------------------
// Resend delivery
// ---------------------------------------------------------------------------
interface SendResult {
  sent: number
  error: string | null
}

async function resendSend(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; error: string | null }> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    let msg = `Resend responded with ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) msg = body.message
      else if (body?.error) msg = typeof body.error === 'string' ? body.error : msg
    } catch {
      /* keep default */
    }
    return { ok: false, error: msg }
  }
  return { ok: true, error: null }
}

// One personal email, addressed directly to a single recipient.
async function sendPersonal(
  apiKey: string,
  to: string,
  content: EmailContent,
): Promise<SendResult> {
  const { html, text } = renderEmail(content)
  const r = await resendSend(apiKey, { from: FROM, to: [to], subject: content.subject, html, text })
  return { sent: r.ok ? 1 : 0, error: r.error }
}

// A broadcast: recipients are bcc'd in batches of 50 so no student sees any
// other student's address. The visible `to` is the academy's own address.
async function sendBroadcast(
  apiKey: string,
  recipients: string[],
  content: EmailContent,
): Promise<SendResult> {
  const unique = Array.from(new Set(recipients)).filter(Boolean)
  if (unique.length === 0) return { sent: 0, error: null }
  const { html, text } = renderEmail(content)

  let sent = 0
  let lastError: string | null = null
  for (let i = 0; i < unique.length; i += BCC_BATCH_SIZE) {
    const chunk = unique.slice(i, i + BCC_BATCH_SIZE)
    const r = await resendSend(apiKey, {
      from: FROM,
      to: [FROM_ADDRESS],
      bcc: chunk,
      subject: content.subject,
      html,
      text,
    })
    if (r.ok) sent += chunk.length
    else lastError = r.error
  }
  return { sent, error: lastError }
}

// ---------------------------------------------------------------------------
// Type resolvers — each returns the recipients and the rendered content, or an
// error { status, message } if the caller is not allowed or data is missing.
// ---------------------------------------------------------------------------
interface Caller {
  id: string
  role: string
}
interface Resolved {
  personal: boolean
  recipients: string[]
  content: EmailContent
  // Optional pre-split send groups (used for mixed-audience announcements like
  // "everyone"); each group is broadcast separately with its own content so
  // teachers and students each get the right dashboard CTA.
  groups?: { recipients: string[]; content: EmailContent }[]
}
interface ResolveError {
  error: string
  status: number
}
type ResolveOutcome = Resolved | ResolveError

function isError(x: ResolveOutcome): x is ResolveError {
  return (x as ResolveError).error !== undefined
}

async function resolveAnnouncement(
  admin: SupabaseClient,
  caller: Caller,
  body: Record<string, unknown>,
): Promise<ResolveOutcome> {
  const id = String(body.announcement_id ?? '').trim()
  if (!id) return { error: 'announcement_id is required', status: 400 }

  const { data: ann } = await admin
    .from('announcements')
    .select('id, title, body, audience, batch_id, created_by')
    .eq('id', id)
    .maybeSingle()
  if (!ann) return { error: 'Announcement not found', status: 404 }

  const audience = ann.audience ?? (ann.batch_id ? 'batch' : 'students')

  const content = (ctaPath: string): EmailContent => ({
    subject: `New announcement: ${ann.title}`,
    heading: ann.title,
    lines: [ann.body],
    ctaLabel: 'Open your dashboard',
    ctaPath,
  })

  const activeEmails = async (role: string): Promise<string[]> => {
    const { data } = await admin
      .from('profiles')
      .select('email')
      .eq('role', role)
      .eq('status', 'active')
    return (data ?? []).map((r: { email: string }) => r.email).filter(Boolean)
  }

  // Teachers-only — admins only.
  if (audience === 'teachers') {
    if (caller.role !== 'admin') {
      return { error: 'Only admins can send announcements to teachers', status: 403 }
    }
    const recipients = await activeEmails('teacher')
    return { personal: false, recipients, content: content('/teacher/dashboard') }
  }

  // Platform-wide — admins reach every active student and teacher; teachers may
  // never send platform-wide announcements.
  if (audience === 'all') {
    if (caller.role === 'teacher') {
      return { error: 'Teachers cannot send platform-wide announcements', status: 403 }
    }
    const studentEmails = await activeEmails('student')
    const teacherEmails = await activeEmails('teacher')
    return {
      personal: false,
      recipients: [...studentEmails, ...teacherEmails],
      groups: [
        { recipients: studentEmails, content: content('/student/dashboard') },
        { recipients: teacherEmails, content: content('/teacher/dashboard') },
      ],
    }
  }

  // Batch-scoped (audience 'batch' or any announcement that has a batch set).
  if (ann.batch_id) {
    if (caller.role === 'teacher') {
      const { data: batch } = await admin
        .from('batches')
        .select('id, course_id, teacher_id')
        .eq('id', ann.batch_id)
        .maybeSingle()
      const owns =
        !!batch &&
        (batch.teacher_id === caller.id ||
          (await teacherOwnsCourse(admin, caller.id, batch.course_id)))
      if (!owns) return { error: 'You can only send for your own batches', status: 403 }
    }
    const recipients = await emailsForStudentIds(admin, await studentIdsInBatch(admin, ann.batch_id))
    return { personal: false, recipients, content: content('/student/dashboard') }
  }

  // Students — admin reaches every active student; a teacher reaches only the
  // students of courses they own.
  const recipients =
    caller.role === 'teacher'
      ? await emailsForStudentIds(
        admin,
        await studentIdsInCourses(admin, await courseIdsForTeacher(admin, caller.id)),
      )
      : await activeEmails('student')
  return { personal: false, recipients, content: content('/student/dashboard') }
}

async function resolveClassUpdate(
  admin: SupabaseClient,
  caller: Caller,
  body: Record<string, unknown>,
): Promise<ResolveOutcome> {
  const id = String(body.live_class_id ?? '').trim()
  const change = String(body.change ?? '').trim()
  if (!id) return { error: 'live_class_id is required', status: 400 }
  if (change !== 'cancelled' && change !== 'rescheduled') {
    return { error: "change must be 'cancelled' or 'rescheduled'", status: 400 }
  }

  const { data: lc } = await admin
    .from('live_classes')
    .select('id, title, batch_id, teacher_id, course_id, scheduled_at')
    .eq('id', id)
    .maybeSingle()
  if (!lc) return { error: 'Live class not found', status: 404 }

  if (caller.role === 'teacher') {
    const owns =
      lc.teacher_id === caller.id || (await teacherOwnsCourse(admin, caller.id, lc.course_id))
    if (!owns) return { error: 'You can only send for your own classes', status: 403 }
  }

  const recipients = await emailsForStudentIds(admin, await studentIdsInBatch(admin, lc.batch_id))
  const when = formatIST(lc.scheduled_at)

  const content: EmailContent =
    change === 'cancelled'
      ? {
        subject: `Class cancelled: ${lc.title}`,
        heading: `Your class has been cancelled`,
        lines: [
          `The live class "${lc.title}" scheduled for ${when} has been cancelled.`,
          'We will let you know as soon as it is rescheduled.',
        ],
        ctaLabel: 'View live classes',
        ctaPath: '/student/live-classes',
      }
      : {
        subject: `Class rescheduled: ${lc.title}`,
        heading: `Your class has been rescheduled`,
        lines: [
          `The live class "${lc.title}" has a new time: ${when}.`,
          'Please check your live classes for the updated joining details.',
        ],
        ctaLabel: 'View live classes',
        ctaPath: '/student/live-classes',
      }

  return { personal: false, recipients, content }
}

async function resolveAssignmentGraded(
  admin: SupabaseClient,
  caller: Caller,
  body: Record<string, unknown>,
): Promise<ResolveOutcome> {
  const id = String(body.submission_id ?? '').trim()
  if (!id) return { error: 'submission_id is required', status: 400 }

  const { data: sub } = await admin
    .from('assignment_submissions')
    .select('id, assignment_id, student_id, marks, feedback, published')
    .eq('id', id)
    .maybeSingle()
  if (!sub) return { error: 'Submission not found', status: 404 }

  const { data: asg } = await admin
    .from('assignments')
    .select('id, title, teacher_id, course_id, max_marks, results_published')
    .eq('id', sub.assignment_id)
    .maybeSingle()
  if (!asg) return { error: 'Assignment not found', status: 404 }

  // Only email a grade once the results have been published.
  if (!sub.published && !asg.results_published) {
    return { error: 'Results are not published yet', status: 409 }
  }

  if (caller.role === 'teacher') {
    const owns =
      asg.teacher_id === caller.id || (await teacherOwnsCourse(admin, caller.id, asg.course_id))
    if (!owns) return { error: 'You can only send for your own assignments', status: 403 }
  }

  const recipients = await emailsForStudentIds(admin, [sub.student_id])

  const lines = [`Your submission for "${asg.title}" has been graded.`]
  if (sub.marks !== null && sub.marks !== undefined) {
    lines.push(`Marks: ${sub.marks} / ${asg.max_marks}`)
  }
  if (sub.feedback) lines.push(`Feedback from your teacher: ${sub.feedback}`)

  return {
    personal: true,
    recipients,
    content: {
      subject: `Your assignment has been graded: ${asg.title}`,
      heading: 'Your assignment has been graded',
      lines,
      ctaLabel: 'View your feedback',
      ctaPath: '/student/assignments',
    },
  }
}

async function resolveTeacherApproved(
  admin: SupabaseClient,
  caller: Caller,
  body: Record<string, unknown>,
): Promise<ResolveOutcome> {
  if (caller.role !== 'admin') return { error: 'Only admins can send this', status: 403 }
  const id = String(body.teacher_id ?? '').trim()
  if (!id) return { error: 'teacher_id is required', status: 400 }

  const { data: teacher } = await admin
    .from('profiles')
    .select('email, full_name, role')
    .eq('id', id)
    .eq('role', 'teacher')
    .maybeSingle()
  if (!teacher) return { error: 'Teacher not found', status: 404 }

  const firstName = (teacher.full_name || '').split(' ')[0] || 'there'

  return {
    personal: true,
    recipients: [teacher.email].filter(Boolean),
    content: {
      subject: 'Your Tech Tians Academy teacher account is approved',
      heading: `Welcome aboard, ${firstName}!`,
      lines: [
        'Your teacher application has been approved. You now have full access to the teacher panel.',
        'You can manage your courses, batches, live classes and assignments from your dashboard.',
      ],
      ctaLabel: 'Go to your dashboard',
      ctaPath: '/teacher/dashboard',
    },
  }
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405)

  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) return json(req, { error: 'Email service is not configured on the server' }, 500)

  // 1. Verify the caller.
  const authHeader = req.headers.get('Authorization') ?? ''
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: userData, error: userErr } = await caller.auth.getUser()
  if (userErr || !userData?.user) return json(req, { error: 'Not signed in' }, 401)

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } })
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('id, role, status')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (
    !callerProfile ||
    callerProfile.status !== 'active' ||
    (callerProfile.role !== 'admin' && callerProfile.role !== 'teacher')
  ) {
    return json(req, { error: 'Only active admins and teachers can send emails' }, 403)
  }
  const callerCtx: Caller = { id: callerProfile.id, role: callerProfile.role }

  // 2. Parse input.
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json(req, { error: 'Invalid JSON body' }, 400)
  }
  const type = String(body.type ?? '').trim()

  // 3. Resolve recipients + content for the requested type.
  let outcome: ResolveOutcome
  switch (type) {
    case 'announcement':
      outcome = await resolveAnnouncement(admin, callerCtx, body)
      break
    case 'class_update':
      outcome = await resolveClassUpdate(admin, callerCtx, body)
      break
    case 'assignment_graded':
      outcome = await resolveAssignmentGraded(admin, callerCtx, body)
      break
    case 'teacher_approved':
      outcome = await resolveTeacherApproved(admin, callerCtx, body)
      break
    default:
      return json(req, { error: `Unsupported email type: "${type}"` }, 400)
  }

  if (isError(outcome)) return json(req, { error: outcome.error }, outcome.status)

  // 4. Nobody to email is not an error — the main action already succeeded.
  if (outcome.recipients.length === 0) return json(req, { sent: 0 })

  // 5. Send.
  try {
    let result: SendResult = { sent: 0, error: null }
    if (outcome.groups && outcome.groups.length > 0) {
      for (const group of outcome.groups) {
        const r = await sendBroadcast(resendKey, group.recipients, group.content)
        result.sent += r.sent
        if (r.error) result.error = r.error
      }
    } else {
      result = outcome.personal
        ? await sendPersonal(resendKey, outcome.recipients[0], outcome.content)
        : await sendBroadcast(resendKey, outcome.recipients, outcome.content)
    }

    if (result.sent === 0 && result.error) {
      console.error('send-email: delivery failed', result.error)
      return json(req, { error: 'Email delivery failed' }, 502)
    }
    return json(req, { sent: result.sent })
  } catch (err) {
    console.error('send-email: unexpected error', err)
    return json(req, { error: 'Email delivery failed' }, 502)
  }
})
