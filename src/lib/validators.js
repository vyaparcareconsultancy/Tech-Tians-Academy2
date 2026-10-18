/** Shared client-side validation helpers.
 *  IMPORTANT: client-side validation is UX only. In production every input
 *  must be re-validated server-side (Supabase Edge Functions / DB constraints). */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function isEmail(v) {
  return EMAIL_RE.test(String(v || '').trim())
}

export function isRequired(v) {
  return v != null && String(v).trim().length > 0
}

/** Returns an errors object { field: message } for the given rules. */
export function validateFields(values, rules) {
  const errors = {}
  for (const [field, checks] of Object.entries(rules)) {
    const value = values[field]
    for (const check of checks) {
      const msg = check(value, values)
      if (msg) {
        errors[field] = msg
        break
      }
    }
  }
  return errors
}

export const rules = {
  required: (label) => (v) => (isRequired(v) ? null : `${label} is required`),
  email: () => (v) => (isRequired(v) && !isEmail(v) ? 'Enter a valid email address' : null),
  minLen: (n) => (v) =>
    isRequired(v) && String(v).length < n ? `Must be at least ${n} characters` : null,
  maxLen: (n) => (v) => (v && String(v).length > n ? `Must be at most ${n} characters` : null),
  number: (label) => (v) =>
    isRequired(v) && (Number.isNaN(Number(v)) || Number(v) < 0) ? `${label} must be a positive number` : null,
  url: () => (v) => (isRequired(v) && !/^https?:\/\//.test(v) ? 'Must be a valid http(s) URL' : null),
  videoUrl: () => (v) =>
    isRequired(v) && !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)/.test(v)
      ? 'Use an authorized host: YouTube or Vimeo'
      : null,
}

/** Strong-enough password policy for demo accounts (8+ chars, mixed case + digit). */
export function passwordStrength(pw = '') {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}
