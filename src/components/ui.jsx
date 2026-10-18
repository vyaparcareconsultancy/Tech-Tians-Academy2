import React, { createContext, useContext, useEffect, useState } from 'react'
import { CheckCircle2, AlertCircle, Info, X, Loader2 } from 'lucide-react'
import { cx } from '../lib/utils.js'

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */
const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = (message, tone = 'success', title) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((t) => [...t, { id, message, tone, title }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }
  const api = {
    success: (message, title) => push(message, 'success', title),
    error: (message, title) => push(message, 'error', title),
    info: (message, title) => push(message, 'info', title),
  }
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3.5 shadow-pop',
              t.tone === 'success' && 'border-emerald-200',
              t.tone === 'error' && 'border-rose-200',
              t.tone === 'info' && 'border-indigo-200'
            )}
          >
            {t.tone === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />}
            {t.tone === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
            {t.tone === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />}
            <div className="min-w-0">
              {t.title && <p className="text-sm font-semibold text-slate-900">{t.title}</p>}
              <p className="text-sm text-slate-600">{t.message}</p>
            </div>
            <button onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="ml-auto text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
const btnBase = 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50'
const btnVariants = {
  primary: 'bg-navy-800 text-white hover:bg-navy-700 focus:ring-navy-800',
  indigo: 'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-600',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-500 focus:ring-rose-600',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300',
}
const btnSizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-4 py-2.5 text-sm' }

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, ...rest }) {
  return (
    <button className={cx(btnBase, btnVariants[variant], btnSizes[size], className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  )
}

export function IconButton({ className, children, title, ...rest }) {
  return (
    <button title={title} className={cx('inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40', className)} {...rest}>
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */
export function Field({ label, error, hint, required, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label-base">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input(props) {
  const { invalid, ...rest } = props
  return <input {...rest} className={cx('input-base', invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30')} />
}

export function Textarea(props) {
  const { invalid, ...rest } = props
  return <textarea {...rest} className={cx('input-base', invalid && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30')} />
}

export function Select({ children, invalid, ...rest }) {
  return <select {...rest} className={cx('input-base', invalid && 'border-rose-400 focus:border-rose-500')}>{children}</select>
}

export function Checkbox({ label, ...rest }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30" {...rest} />
      {label}
    </label>
  )
}

export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex items-center gap-2">
      <span className={cx('relative inline-flex h-5 w-9 items-center rounded-full transition', checked ? 'bg-indigo-600' : 'bg-slate-300')}>
        <span className={cx('inline-block h-4 w-4 transform rounded-full bg-white transition', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </span>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Display primitives                                                  */
/* ------------------------------------------------------------------ */
export function Badge({ tone = 'slate', children, className }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    red: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    blue: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    purple: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    navy: 'bg-navy-50 text-navy-700 ring-1 ring-navy-200',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
}

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx('card-base', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, delta, deltaUp, tone = 'indigo' }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    navy: 'bg-navy-100 text-navy-700',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    violet: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-xl font-semibold text-slate-900">{value}</p>
        {delta && (
          <p className={cx('mt-0.5 text-xs', deltaUp === false ? 'text-rose-600' : 'text-emerald-600')}>
            {delta}
          </p>
        )}
      </div>
    </Card>
  )
}

export function Avatar({ name, className }) {
  const colors = ['bg-indigo-100 text-indigo-700', 'bg-navy-100 text-navy-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-cyan-100 text-cyan-700', 'bg-violet-100 text-violet-700', 'bg-orange-100 text-orange-700']
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % 997
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('')
  return (
    <span className={cx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', colors[h % colors.length], className)}>
      {initials}
    </span>
  )
}

export function ProgressBar({ value, tone = 'indigo', className }) {
  return (
    <div className={cx('h-1.5 w-full overflow-hidden rounded-full bg-slate-100', className)}>
      <div
        className={cx('h-full rounded-full', tone === 'emerald' ? 'bg-emerald-500' : tone === 'amber' ? 'bg-amber-500' : tone === 'rose' ? 'bg-rose-500' : 'bg-indigo-500')}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {Icon && <Icon className="h-10 w-10 text-slate-300" />}
      <p className="mt-3 text-sm font-medium text-slate-700">{title}</p>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  )
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-slate-400', className)} />
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-navy-950/45 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cx('my-8 w-full rounded-xl bg-white shadow-pop', wide ? 'max-w-3xl' : 'max-w-lg')}>
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger }) {
  return (
    <Modal open={open} onClose={onClose} title={title} footer={
      <>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
      </>
    }>
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Tabs / Search / Pagination                                          */
/* ------------------------------------------------------------------ */
export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === t.value ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          )}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 text-xs text-slate-400">({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder, className }) {
  return (
    <div className={cx('relative', className)}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Search…'} className="input-base pl-9" />
      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
    </div>
  )
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const items = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i)
  }
  const unique = [...new Set(items)]
  let last = 0
  return (
    <div className="flex items-center gap-1">
      <button className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>Prev</button>
      {unique.map((p) => {
        const gap = p - last > 1
        last = p
        return (
          <React.Fragment key={p}>
            {gap && <span className="px-1 text-slate-400">…</span>}
            <button
              onClick={() => onChange(p)}
              className={cx('h-8 w-8 rounded-md text-sm font-medium', p === page ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100')}
            >
              {p}
            </button>
          </React.Fragment>
        )
      })}
      <button className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
      Demo mode — you are viewing simulated data. No real users, courses or payments are affected.
    </div>
  )
}
