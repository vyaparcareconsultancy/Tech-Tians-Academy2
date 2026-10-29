import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, Clock } from 'lucide-react'
import { supabase, isDemoMode } from '../lib/supabase.js'
import { profilesApi } from '../lib/api/index.js'
import { Logo } from '../components/Layout.jsx'
import { Button, Input } from '../components/ui.jsx'
import { cx } from '../lib/utils.js'

function AnimatedOrb({ size = 'lg' }) {
  const isSmall = size === 'sm'
  return (
    <div className={cx('relative flex items-center justify-center', isSmall ? 'h-24 w-24' : 'h-64 w-64')}>
      {/* Outer spinning ring */}
      <div
        className={cx(
          'absolute rounded-full border border-dashed border-brand/40 animate-spin-slow',
          isSmall ? 'h-24 w-24 border-brand/50' : 'h-64 w-64'
        )}
      />
      {/* Inner reverse spinning ring */}
      <div
        className={cx(
          'absolute rounded-full border border-gold/40 animate-spin-reverse',
          isSmall ? 'h-20 w-20' : 'h-52 w-52'
        )}
        style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
      />
      {/* Glowing floating orb */}
      <div
        className={cx(
          'relative rounded-full bg-gradient-to-tr from-brand-deep via-brand to-gold shadow-glow-lg animate-float',
          isSmall ? 'h-14 w-14' : 'h-36 w-36'
        )}
      >
        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </div>
  )
}

function computePasswordStrength(pass) {
  if (!pass) return { score: 0, label: '', textColor: 'text-muted' }
  let score = 0
  if (pass.length >= 8) score += 1
  if (/[0-9]/.test(pass)) score += 1
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
  if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 10) score += 1

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', textColor: 'text-brand-deep' }
    case 2:
      return { score: 2, label: 'Fair', textColor: 'text-brand' }
    case 3:
      return { score: 3, label: 'Good', textColor: 'text-gold' }
    case 4:
      return { score: 4, label: 'Strong', textColor: 'text-gold' }
    default:
      return { score: 0, label: 'Too short', textColor: 'text-muted' }
  }
}

export default function SetPassword() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(!isDemoMode)
  const [hasSession, setHasSession] = useState(isDemoMode)
  const [sessionUser, setSessionUser] = useState(null)

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [statusNotice, setStatusNotice] = useState('')

  const strength = computePasswordStrength(form.password)

  useEffect(() => {
    if (isDemoMode || !supabase) {
      setChecking(false)
      setHasSession(true)
      return
    }

    let mounted = true

    // Check existing or newly parsed session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (session?.user) {
        setHasSession(true)
        setSessionUser(session.user)
        setChecking(false)
      } else {
        // Wait for hash token exchange if URL has recovery/invite tokens
        const timer = setTimeout(async () => {
          if (!mounted) return
          const { data: { session: retrySession } } = await supabase.auth.getSession()
          if (retrySession?.user) {
            setHasSession(true)
            setSessionUser(retrySession.user)
          } else {
            setHasSession(false)
          }
          setChecking(false)
        }, 700)
        return () => clearTimeout(timer)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session?.user) {
        setHasSession(true)
        setSessionUser(session.user)
        setChecking(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const validate = () => {
    const errs = {}
    if (!form.password) {
      errs.password = 'Password is required'
    } else if (form.password.length < 8) {
      errs.password = 'Password must be at least 8 characters'
    } else if (!/[0-9]/.test(form.password)) {
      errs.password = 'Password must include at least one number'
    }

    if (!form.confirmPassword) {
      errs.confirmPassword = 'Confirm your password'
    } else if (form.confirmPassword !== form.password) {
      errs.confirmPassword = 'Passwords do not match'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setSubmitError('')

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 600))
        navigate('/login', { replace: true })
        return
      }

      if (!supabase) throw new Error('Supabase client not initialized')

      const { data, error } = await supabase.auth.updateUser({
        password: form.password,
      })
      if (error) throw error

      const userId = data.user?.id || sessionUser?.id
      if (!userId) {
        throw new Error('User account not found')
      }

      // Load profile to determine role and approval status
      const profile = await profilesApi.get(userId)

      if (profile?.status === 'pending') {
        await supabase.auth.signOut().catch(() => {})
        setStatusNotice('Your account is waiting for admin approval')
        return
      }

      if (['suspended', 'rejected'].includes(profile?.status)) {
        await supabase.auth.signOut().catch(() => {})
        setSubmitError(`Your account status is ${profile.status}. Contact an administrator.`)
        return
      }

      // Active user: redirect to dashboard by role
      const target =
        profile?.role === 'admin'
          ? '/admin/dashboard'
          : profile?.role === 'teacher'
          ? '/teacher/dashboard'
          : '/student/dashboard'
      navigate(target, { replace: true })
    } catch (err) {
      setSubmitError(err.message || 'Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen bg-void text-white">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />

      {/* Left brand panel (desktop only) */}
      <div className="relative hidden w-[48%] overflow-hidden border-r border-white/10 bg-surface/40 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="glow-blob -left-20 -top-20 h-80 w-80 bg-brand/20 blur-[130px]" />
        <div className="glow-blob -bottom-24 -right-24 h-96 w-96 bg-gold/15 blur-[140px]" />

        <div className="relative z-10">
          <Logo dark />
        </div>

        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <div className="relative my-8 flex items-center justify-center">
            <AnimatedOrb size="lg" />
          </div>

          <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Secure. Fast. <span className="text-gradient">Empowering.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Set your secure password to complete account setup and enter the Tech Tians portal.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>Tech Tians Academy</span>
          <span>Security & Authentication</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="glow-blob -top-20 right-0 h-72 w-72 bg-brand/10 blur-[130px]" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile header */}
          <div className="mb-8 flex flex-col items-center justify-center lg:hidden">
            <Logo dark />
            <div className="mt-5">
              <AnimatedOrb size="sm" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-white">
              Set Your <span className="text-gradient">Password</span>
            </h1>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card-soft sm:p-8">
            {checking ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
                <p className="mt-4 font-mono text-xs uppercase tracking-wider text-muted">
                  Verifying security link…
                </p>
              </div>
            ) : statusNotice ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand/40 bg-brand/15 text-brand shadow-glow/30">
                  <Clock className="h-7 w-7" />
                </div>
                <h2 className="font-heading text-xl font-bold text-white">Password Saved</h2>
                <div className="mt-3 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm text-brand-light">
                  <p className="font-medium text-white">{statusNotice}</p>
                  <p className="mt-1 text-xs text-muted">
                    Your password has been set. An administrator will review and activate your teaching profile shortly.
                  </p>
                </div>
                <div className="mt-6">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate('/login')}
                  >
                    Return to sign in
                  </Button>
                </div>
              </div>
            ) : !hasSession ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/15 text-rose-400 shadow-glow/20">
                  <AlertCircle className="h-7 w-7" />
                </div>
                <h2 className="font-heading text-xl font-bold text-white">This link is invalid or expired</h2>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Invitation and password reset links are single-use and expire after a short period. Please request a new link to proceed.
                </p>
                <div className="mt-6 space-y-3">
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => navigate('/forgot-password')}
                  >
                    Request new link
                  </Button>
                  <Link
                    to="/login"
                    className="inline-block font-mono text-xs text-muted hover:text-white hover:underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-heading text-2xl font-bold text-white">Set new password</h2>
                <p className="mt-1 text-xs text-muted">
                  Create a strong password for your account.
                </p>

                {isDemoMode && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      Demo Mode: Password reset links work with Supabase. In demo mode, sign in with sample accounts on the login page.
                    </span>
                  </div>
                )}

                {submitError && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
                  {/* New password */}
                  <div>
                    <label htmlFor="new-password" className="label-base">
                      New password <span className="text-brand">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        invalid={!!errors.password}
                        className="pl-10 pr-10 font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:text-white"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password ? (
                      <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                        <AlertCircle className="h-3 w-3" />
                        {errors.password}
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        Minimum 8 characters with at least one number.
                      </p>
                    )}

                    {/* Password Strength Meter */}
                    {form.password && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex h-1.5 w-full gap-1.5">
                          {[1, 2, 3, 4].map((step) => (
                            <div
                              key={step}
                              className={cx(
                                'h-full flex-1 rounded-full transition-all duration-300',
                                strength.score >= step
                                  ? step === 1
                                    ? 'bg-brand-deep shadow-glow'
                                    : step === 2
                                    ? 'bg-brand shadow-glow'
                                    : step === 3
                                    ? 'bg-gradient-to-r from-brand to-gold shadow-glow'
                                    : 'bg-gold shadow-glow-gold'
                                  : 'bg-white/10'
                              )}
                            />
                          ))}
                        </div>
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="text-muted">Password strength:</span>
                          <span className={cx('font-medium', strength.textColor)}>{strength.label}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label htmlFor="confirm-password" className="label-base">
                      Confirm new password <span className="text-brand">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={form.confirmPassword}
                        onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                        invalid={!!errors.confirmPassword}
                        className="pl-10 pr-10 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition hover:text-white"
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                        <AlertCircle className="h-3 w-3" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    loading={loading}
                    icon={ArrowRight}
                  >
                    Save password & sign in
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
