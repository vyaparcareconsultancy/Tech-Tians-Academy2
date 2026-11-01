import { supabase, isDemoMode } from '../supabase.js'
import { toSnake } from './helpers.js'

/**
 * Trigger a transactional email via the `send-email` Edge Function.
 *
 * The caller passes a `type` and id-only payload (camelCase); the server looks
 * up recipients and content with the service role and sends via Resend. Raw
 * recipient addresses never leave the server.
 *
 *   sendEmail('announcement',      { announcementId })
 *   sendEmail('class_update',      { liveClassId, change })  // 'cancelled' | 'rescheduled'
 *   sendEmail('assignment_graded', { submissionId })
 *   sendEmail('teacher_approved',  { teacherId })
 *
 * Email is a best-effort side effect: it must never break the main action
 * (announcement saved, class cancelled, grade published, teacher approved).
 * This function therefore never throws — it resolves to:
 *   { ok: true, sent }          on success
 *   { ok: false, error }        on any failure or in demo mode
 */
export async function sendEmail(type, payload = {}) {
  if (isDemoMode || !supabase) {
    return { ok: false, error: 'Email is only sent in Supabase mode' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { type, ...toSnake(payload) },
    })

    if (error) {
      // Edge Functions return the JSON body alongside a non-2xx status; prefer
      // the server's clear message when available.
      let msg = error.message || 'Email could not be sent'
      try {
        const ctx = await error.context?.json?.()
        if (ctx?.error) msg = ctx.error
      } catch {
        /* keep default message */
      }
      return { ok: false, error: msg }
    }

    if (data?.error) return { ok: false, error: data.error }

    return { ok: true, sent: Number(data?.sent || 0) }
  } catch (err) {
    return { ok: false, error: err?.message || 'Email could not be sent' }
  }
}
