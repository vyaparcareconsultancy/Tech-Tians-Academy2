import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'
import { isEmail } from '../lib/validators.js'
import { isDemoMode } from '../lib/supabase.js'
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
        {/* Specular shine */}
        <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </div>
  )
}

const DEMO_ACCOUNTS = [
  { label: 'Demo Admin', email: 'admin@techtians.academy', password: 'Admin@12345', role: 'ADMIN' },
  { label: 'Demo Teacher', email: 'meera.rao@techtians.academy', password: 'Teacher@12345', role: 'TEACHER' },
  { label: 'Demo Student', email: 'rohan.verma@techtians.academy', password: 'Student@12345', role: 'STUDENT' },
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const from = location.state?.from || null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!isEmail(form.email)) errs.email = 'Enter a valid email address'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const doLogin = async (email, password, remember) => {
    setLoading(true)
    setSubmitError('')
    try {
      const session = await login(email, password, remember)
      const target =
        session.role === 'admin'
          ? (from || '/admin/dashboard')
          : session.role === 'teacher'
          ? (from || '/teacher/dashboard')
          : (from || '/student/dashboard')
      navigate(target, { replace: true })
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    doLogin(form.email, form.password, form.remember)
  }

  return (
    <div className="relative flex min-h-screen bg-void text-white">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40" />

      {/* Left brand panel (desktop only) */}
      <div className="relative hidden w-[48%] overflow-hidden border-r border-white/10 bg-surface/40 p-12 lg:flex lg:flex-col lg:justify-between">
        {/* Glow blobs */}
        <div className="glow-blob -left-20 -top-20 h-80 w-80 bg-brand/20 blur-[130px]" />
        <div className="glow-blob -bottom-24 -right-24 h-96 w-96 bg-gold/15 blur-[140px]" />

        {/* Top: Logo */}
        <div className="relative z-10">
          <Logo dark />
        </div>

        {/* Center: Animated orb + Floating stat chips + Hero headline */}
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
            Learn. Build. <span className="text-gradient">Grow.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            The high-precision learning platform for modern technical education. Courses, live classes, batches, and assessments in one place.
          </p>
        </div>

        {/* Bottom footer note */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>Tech Tians Academy</span>
          <span>Staff Portal v1.0</span>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        {/* Subtle background glow for right side */}
        <div className="glow-blob -top-20 right-0 h-72 w-72 bg-brand/10 blur-[130px]" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile header with small orb */}
          <div className="mb-8 flex flex-col items-center justify-center lg:hidden">
            <Logo dark />
            <div className="mt-5">
              <AnimatedOrb size="sm" />
            </div>
            <h1 className="mt-4 font-heading text-2xl font-bold text-white">
              Learn. Build. <span className="text-gradient">Grow.</span>
            </h1>
          </div>

          <div className="glass rounded-2xl p-6 shadow-card-soft sm:p-8">
            <h2 className="font-heading text-2xl font-bold text-white">Welcome back</h2>
            <p className="mt-1 text-xs text-muted">Sign in to continue learning or teaching at Tech Tians.</p>

            {submitError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-5" noValidate>
              <div>
                <label htmlFor="email" className="label-base">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@techtians.academy"
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

              <div>
                <label htmlFor="password" className="label-base">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    invalid={!!errors.password}
                    className="pl-10 pr-10"
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
                {errors.password && (
                  <p className="mt-1.5 flex items-center gap-1 font-mono text-xs text-rose-400">
                    <AlertCircle className="h-3 w-3" />
                    {errors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted transition-colors hover:text-white">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-black/50 text-brand accent-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="font-mono text-xs text-brand transition hover:underline"
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <p className="mt-4 text-center text-xs text-muted">
              New student?{' '}
              <Link to="/signup" className="font-medium text-brand hover:underline">
                Create an account
              </Link>
            </p>

            {isDemoMode && (
              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-muted">Demo Access</p>
                  <span className="font-mono text-[10px] text-gold">One-click sign in</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {DEMO_ACCOUNTS.map((a) => (
                    <button
                      key={a.email}
                      type="button"
                      onClick={() => doLogin(a.email, a.password, true)}
                      disabled={loading}
                      className="glass group flex flex-col items-start rounded-xl p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-glow/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand">
                          {a.role}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-brand" />
                      </div>
                      <span className="mt-1 font-heading text-xs font-semibold text-white">{a.label}</span>
                      <span className="truncate font-mono text-[10px] text-muted">{a.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="mt-6 text-center font-mono text-[11px] text-muted">
            Role is read from a trusted server record — users cannot self-assign permissions.
          </p>
        </div>
      </div>
    </div>
  )
}
