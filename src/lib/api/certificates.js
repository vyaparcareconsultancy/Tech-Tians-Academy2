import { supabase, isDemoMode } from '../supabase.js'
import { toCamel } from './helpers.js'

/**
 * Issue a certificate for a completed course (student).
 * In Supabase mode this calls the `issue_certificate` RPC, which validates the
 * enrollment + lesson completion and creates the row server-side.
 *
 * @param {string} courseId
 * @returns {Promise<{ ok: boolean, certificate?: object, error?: string }>}
 */
export async function issueCertificate(courseId) {
  if (isDemoMode || !supabase) {
    const no = `TTA-2026-DEMO-${String(courseId).replace(/-/g, '').slice(-4).toUpperCase()}`
    return {
      ok: true,
      certificate: {
        id: `cert-demo-${courseId}`,
        courseId,
        certificateNo: no,
        issuedAt: new Date().toISOString(),
      },
    }
  }

  const { data, error } = await supabase.rpc('issue_certificate', {
    p_course_id: courseId,
  })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('Could not issue certificate')
  return { ok: true, certificate: toCamel(row) }
}

/**
 * Verify a certificate number (public). Returns the public certificate record
 * (student name, course title, issued date) or null when not found.
 *
 * @param {string} no
 * @returns {Promise<object|null>}
 */
export async function verifyCertificate(no) {
  if (isDemoMode || !supabase) return null
  const { data, error } = await supabase.rpc('verify_certificate', { p_no: no })
  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : data
  return row ? toCamel(row) : null
}

/**
 * List the signed-in student's certificates, newest first.
 *
 * @returns {Promise<Array<object>>}
 */
export async function listMyCertificates() {
  if (isDemoMode || !supabase) return []
  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .order('issued_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data || []).map((r) => toCamel(r))
}

export const certificatesApi = {
  issueCertificate,
  verifyCertificate,
  listMyCertificates,
}
