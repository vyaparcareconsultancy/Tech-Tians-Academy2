import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight,
  AlertCircle, Sparkles, CheckCircle2
} from 'lucide-react'
import { supabase, isDemoMode } from '../lib/supabase.js'
import { isEmail } from '../lib/validators.js'
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
      {/* Glowing floating orb sphere */}
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

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [successNotice, setSuccessNotice] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const strength = computePasswordStrength(form.password)

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Full name is required'
    if (!form.email.trim()) errs.email = 'Email address is required'
    else if (!isEmail(form.email)) errs.email = 'Enter a valid email address'
    if (!form.phone.trim()) errs.phone = 'Phone number is required'
    else if (form.phone.trim().length < 8) errs.phone = 'Enter a valid contact number'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    else if (!/[0-9]/.test(form.password)) errs.password = 'Password must include at least one number'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setSubmitError('')
    setSuccessNotice('')

    try {
      if (isDemoMode || !supabase) {
        // Demo mode simulation
        setTimeout(() => {
          setLoading(false)
          setSuccessNotice('Account created successfully (Simulated in Demo Mode). Redirecting to login…')
          setTimeout(() => {
            navigate('/login')
          }, 1800)
        }, 800)
        return
      }

      // Supabase mode
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            phone: form.phone,
            role: 'student',
          },
        },
      })

      if (error) throw error

      if (data?.user && !data.session) {
        setSuccessNotice('Check your email to confirm your account')
      } else {
        setSuccessNotice('Account created successfully! Redirecting to login…')
        setTimeout(() => navigate('/login'), 1500)
      }
    } catch (err) {
      setSubmitError(err.message || 'Failed to create account. Please try again.')
    } finally {
      if (!isDemoMode) {
        setLoading(false)
      }
    }
  }

  return (
    <div className="relative flex min-h-screen bg-void text-white">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />

      {/* Left Brand Panel (Desktop only) */}
      <div className="relative hidden w-[48%] overflow-hidden border-r border-white/10 bg-surface/40 p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Glow blobs */}
        <div className="glow-blob -left-20 -top-20 h-80 w-80 bg-brand/20 blur-[130px]" />
        <div className="glow-blob -bottom-24 -right-24 h-96 w-96 bg-gold/15 blur-[140px]" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Logo />
        </div>

        {/* Center: Animated orb + Floating stat chips + Headline */}
        <div className="relative z-10 my-auto flex flex-col items-center text-center">
          <div className="relative my-8 flex items-center justify-center">
            <AnimatedOrb size="lg" />

            {/* Stat Chip 1 */}
            <div
              className="glass absolute -left-8 top-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2 shadow-card-soft animate-bounce"
              style={{ animationDuration: '4s' }}
            >
              <span className="flex h-2 w-2 rounded-full bg-gold shadow-glow-gold" />
              <div className="text-left leading-tight">
                <p className="font-mono text-xs font-bold text-white">99.4%</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Attendance (Sample)</p>
              </div>
            </div>

            {/* Stat Chip 2 */}
            <div
              className="glass absolute -right-12 top-20 flex items-center gap-2.5 rounded-xl px-3.5 py-2 shadow-card-soft animate-bounce"
              style={{ animationDuration: '4.8s', animationDelay: '1.2s' }}
            >
              <span className="flex h-2 w-2 rounded-full bg-brand shadow-glow" />
              <div className="text-left leading-tight">
                <p className="font-mono text-xs font-bold text-white">2,400+</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Students</p>
              </div>
            </div>

            {/* Stat Chip 3 */}
            <div
              className="glass absolute -bottom-6 left-6 flex items-center gap-2.5 rounded-xl px-3.5 py-2 shadow-card-soft animate-bounce"
              style={{ animationDuration: '5.2s', animationDelay: '0.6s' }}
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <div className="text-left leading-tight">
                <p className="font-mono text-xs font-bold text-white">48 Batches</p>
                <p className="font-mono text-[9px] uppercase tracking-wider text-muted">Active Now</p>
              </div>
            </div>
          </div>

          <h1 className="mt-6 font-heading text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Join. Learn. <span className="text-gradient">Excel.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            The high-precision learning platform for modern technical education. Register your student profile to access cohorts, tests, and live problem sessions.
          </p>
        </div>

        {/* Bottom footer note */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>Tech Tians Academy</span>
          <span>Student Registration v1.0</span>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="glow-blob -top-20 right-0 h-72 w-72 bg-brand/10 blur-[130px]" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile header with small orb */}
          <div className="mb-8 flex flex-col items-center justify-center lg:hidden">
            <Logo />
            <div className="mt-5">
              <AnimatedOrb size="sm" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-white">
              Join. Learn. <span className="text-gradient">Excel.</span>
            </h1>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card-soft sm:p-8">
            <h2 className="font-heading text-2xl font-bold text-white">Create an account</h2>
            <p className="mt-1 text-xs text-muted">Sign up as a student to enroll in courses and live batches.</p>

            {/* Demo mode notice */}
            {isDemoMode && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-gold">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <div>
                  <p className="font-semibold">Demo Mode Active</p>
                  <p className="text-gold/80 mt-0.5">
                    Account registration is simulated in demo mode. No email verification or payment required.
                  </p>
                </div>
              </div>
            )}

            {/* Error banner */}
            {submitError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success banner */}
            {successNotice && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successNotice}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              {/* Name */}
              <div>
                <label htmlFor="name" className="label-base">Full name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Aarav Sharma"
                    value={form.name}
                    onChange={set('name')}
                    invalid={!!errors.name}
                    className="pl-10"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="label-base">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="aarav@student.techtians.in"
                    value={form.email}
                    onChange={set('email')}
                    invalid={!!errors.email}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="label-base">Phone number</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={set('phone')}
                    invalid={!!errors.phone}
                    className="pl-10 font-mono"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.phone}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="label-base">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    invalid={!!errors.password}
                    className="pl-10 pr-10 font-mono"
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

                {/* Password Strength Meter (orange to gold) */}
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
                      <span className={cx('font-semibold', strength.textColor)}>
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  className="w-full"
                >
                  {loading ? 'Creating account…' : 'Create Account'} {!loading && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-white/10 pt-4 text-center">
              <p className="text-xs text-muted">
                Already have an account?{' '}
                <Link to="/login" className="font-mono text-brand transition hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-[11px] text-muted">
            By signing up you agree to the Tech Tians Academy terms and honor code.
          </p>
        </div>
      </div>
    </div>
  )
}
