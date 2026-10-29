import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase, isDemoMode } from '../lib/supabase.js'
import { isEmail } from '../lib/validators.js'
import { Logo } from '../components/Layout.jsx'
import { Button, Input } from '../components/ui.jsx'

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
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/set-password`,
        })
        if (resetError) throw resetError
      }
      setSent(true)
    } catch (err) {
      setError(err.message || 'Could not start the reset flow.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-void px-4 py-12 text-white">
      {/* Background grid + ambient glow */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />
      <div className="glow-blob fixed -left-20 -top-20 h-80 w-80 bg-brand/15 blur-[140px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo dark />
        </div>

        <div className="glass rounded-2xl p-6 shadow-card-soft sm:p-8">
          {!sent ? (
            <>
              <h1 className="font-heading text-2xl font-bold text-white">Reset your password</h1>
              <p className="mt-1 text-xs text-muted">
                Enter the email linked to your staff account and we'll send a secure reset link.
              </p>

              {error && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
                <div>
                  <label htmlFor="reset-email" className="label-base">
                    Email address <span className="text-brand">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@techtians.academy"
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  {error && !isEmail(email) && (
                    <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                      <AlertCircle className="h-3 w-3" />
                      Enter a valid email address
                    </p>
                  )}
                </div>

                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                  Send reset link
                </Button>
              </form>
            </>
          ) : (
            <div className="py-4 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-gold/40 bg-gold/15 text-gold shadow-glow-gold/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="font-heading text-2xl font-bold text-white">Check your inbox</h1>
              <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted">
                {isDemoMode
                  ? 'Demo mode: a password-reset email would be sent to '
                  : 'We sent a password-reset link to '}
                <span className="font-mono font-medium text-white">{email}</span>.
                {isDemoMode && ' No email is actually sent in demo mode.'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mx-auto mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 text-brand" /> Back to sign in
        </button>

        <p className="mt-4 text-center font-mono text-[11px] text-muted">
          Need a staff account? Contact your academy administrator — self-registration is disabled.
        </p>
      </div>
    </div>
  )
}
