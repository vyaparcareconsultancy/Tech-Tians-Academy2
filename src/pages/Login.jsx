import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowRight, GraduationCap, ShieldCheck, MonitorPlay, Sparkles, AlertCircle } from 'lucide-react'
import { useAuth } from '../lib/auth.jsx'
import { isEmail } from '../lib/validators.js'
import { cx } from '../lib/utils.js'
import { Logo } from '../components/Layout.jsx'
import { Button, Input } from '../components/ui.jsx'

function HeroArt() {
  return (
    <svg viewBox="0 0 520 360" className="h-auto w-full" fill="none" aria-hidden="true">
      {/* backdrop cards */}
      <rect x="40" y="40" width="440" height="280" rx="20" fill="#ffffff" fillOpacity="0.06" />
      <rect x="60" y="60" width="400" height="240" rx="16" fill="#ffffff" fillOpacity="0.08" />
      {/* monitor */}
      <rect x="110" y="100" width="300" height="170" rx="12" fill="#ffffff" fillOpacity="0.96" />
      <rect x="110" y="100" width="300" height="170" rx="12" stroke="#6366F1" strokeOpacity="0.4" />
      <rect x="126" y="116" width="110" height="10" rx="5" fill="#12233F" />
      <rect x="126" y="134" width="70" height="8" rx="4" fill="#C3D5ED" />
      {/* chart bars */}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={126 + i * 56} y={238 - [34, 58, 44, 74, 62][i]} width={34} height={[34, 58, 44, 74, 62][i]} rx={5} fill={i === 3 ? '#6366F1' : '#4672B8'} fillOpacity={0.85} />
      ))}
      {/* play button */}
      <circle cx="360" cy="150" r="24" fill="#4F46E5" />
      <path d="M354 141v18l16-9z" fill="#fff" />
      {/* monitor stand */}
      <rect x="245" y="270" width="30" height="14" fill="#ffffff" fillOpacity="0.7" />
      <rect x="215" y="284" width="90" height="8" rx="4" fill="#ffffff" fillOpacity="0.7" />
      {/* graduation cap */}
      <g transform="translate(70 46)">
        <path d="M46 10 92 32 46 54 0 32Z" fill="#6366F1" />
        <path d="M18 40v18c0 6 12 11 28 11s28-5 28-11V40l-28 12z" fill="#fff" fillOpacity="0.92" />
        <path d="M92 32v22" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <circle cx="92" cy="58" r="5" fill="#F59E0B" />
      </g>
      {/* floating chips */}
      <g transform="translate(396 60)">
        <rect width="86" height="34" rx="17" fill="#ffffff" fillOpacity="0.95" />
        <circle cx="17" cy="17" r="8" fill="#10B981" />
        <rect x="32" y="13" width="44" height="8" rx="4" fill="#12233F" opacity="0.8" />
      </g>
      <g transform="translate(404 180)">
        <rect width="76" height="34" rx="17" fill="#ffffff" fillOpacity="0.95" />
        <circle cx="17" cy="17" r="8" fill="#F59E0B" />
        <rect x="32" y="13" width="34" height="8" rx="4" fill="#12233F" opacity="0.8" />
      </g>
      <g transform="translate(60 220)">
        <rect width="92" height="34" rx="17" fill="#ffffff" fillOpacity="0.95" />
        <circle cx="17" cy="17" r="8" fill="#4F46E5" />
        <rect x="32" y="13" width="50" height="8" rx="4" fill="#12233F" opacity="0.8" />
      </g>
      {/* dotted grid */}
      {Array.from({ length: 6 }).map((_, r) =>
        Array.from({ length: 10 }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={70 + c * 40} cy={300 + r * 0} r="2" fill="#ffffff" fillOpacity="0.25" />
        ))
      )}
    </svg>
  )
}

const DEMO_ACCOUNTS = [
  { label: 'Demo Admin', email: 'admin@techtians.academy', password: 'Admin@12345' },
  { label: 'Demo Teacher', email: 'meera.rao@techtians.academy', password: 'Teacher@12345' },
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
      navigate(session.role === 'admin' ? (from || '/admin/dashboard') : '/teacher/dashboard', { replace: true })
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
    <div className="flex min-h-screen bg-white">
      {/* Left panel */}
      <div className="relative hidden w-[46%] overflow-hidden bg-navy-950 lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-navy-600/40 blur-3xl" />
        <div className="relative z-10 flex flex-1 flex-col justify-between p-12">
          <Logo dark />
          <div>
            <HeroArt />
            <h1 className="mt-8 max-w-md text-4xl font-semibold leading-tight text-white">
              Teaching that scales. <span className="text-indigo-300">Learning that sticks.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-slate-300">
              Tech Tians Academy powers courses, live classes, batches, assignments and
              assessments — with clear roles for every educator and administrator.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: MonitorPlay, text: 'Schedule & manage live classes and recorded lectures' },
                { icon: ShieldCheck, text: 'Role-based access with audit logging for every action' },
                { icon: Sparkles, text: 'Real-time dashboards for enrollments, revenue and progress' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3 text-sm text-slate-200">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-indigo-300">
                    <f.icon className="h-4 w-4" />
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Tech Tians Academy · Staff Portal</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="card-base p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to the Tech Tians staff portal.</p>

            {submitError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
              <div>
                <label htmlFor="email" className="label-base">Email address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@techtians.academy"
                    value={form.email}
                    onChange={set('email')}
                    invalid={!!errors.email}
                    className="pl-9"
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-rose-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="label-base">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set('password')}
                    invalid={!!errors.password}
                    className="pr-10 pl-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-rose-600">{errors.password}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(e) => setForm((f) => ({ ...f, remember: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
                  />
                  Remember me
                </label>
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm font-medium text-indigo-600 hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                {loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Demo accounts</p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => doLogin(a.email, a.password, true)}
                    disabled={loading}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 disabled:opacity-50"
                  >
                    <span>
                      <span className="block text-xs font-semibold text-slate-800">{a.label}</span>
                      <span className="block text-[11px] text-slate-500">{a.email}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-indigo-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Role is read from a trusted server record — users can never assign their own role.
          </p>
        </div>
      </div>
    </div>
  )
}
