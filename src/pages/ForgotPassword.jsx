import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { supabase, isDemoMode } from '../lib/supabase.js'
import { isEmail } from '../lib/validators.js'
import { Logo } from '../components/Layout.jsx'
import { Button, Field, Input } from '../components/ui.jsx'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (isDemoMode) {
        // Demo mode: simulate the reset-email workflow.
        await new Promise((r) => setTimeout(r, 700))
      } else if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })
        if (error) throw error
      }
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not start the reset flow.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <div className="card-base p-6 sm:p-8">
          {!sent ? (
            <>
              <h1 className="text-xl font-semibold text-slate-900">Reset your password</h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter the email linked to your staff account and we'll send a secure reset link.
              </p>
              {error && <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                <Field label="Email address" required error={error && !isEmail(email) ? 'Enter a valid email address' : ''}>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@techtians.academy" className="pl-9" autoFocus />
                  </div>
                </Field>
                <Button type="submit" variant="primary" className="w-full" loading={loading}>
                  Send reset link
                </Button>
              </form>
            </>
          ) : (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h1 className="mt-3 text-xl font-semibold text-slate-900">Check your inbox</h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
                {isDemoMode
                  ? 'Demo mode: a password-reset email would be sent to '
                  : 'We sent a password-reset link to '}
                <span className="font-medium text-slate-800">{email}</span>.
                {isDemoMode && ' No email is actually sent in demo mode.'}
              </p>
            </div>
          )}
        </div>
        <button onClick={() => navigate('/login')} className="mx-auto mt-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">Need a staff account? Contact your academy administrator — self-registration is disabled.</p>
      </div>
    </div>
  )
}
