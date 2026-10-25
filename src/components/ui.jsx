import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
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
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-88 max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-surface/90 p-4 backdrop-blur-lg shadow-card-soft',
              t.tone === 'success' && 'border-l-4 border-l-gold',
              t.tone === 'error' && 'border-l-4 border-l-rose-500',
              t.tone === 'info' && 'border-l-4 border-l-brand'
            )}
          >
            {t.tone === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold" />}
            {t.tone === 'error' && <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />}
            {t.tone === 'info' && <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />}
            <div className="min-w-0 flex-1">
              {t.title && <p className="font-heading text-sm font-semibold text-white">{t.title}</p>}
              <p className="text-xs text-muted">{t.message}</p>
            </div>
            <button
              onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              className="ml-auto rounded p-0.5 text-muted transition hover:text-white"
              aria-label="Close notification"
            >
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
const btnBase =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-void disabled:cursor-not-allowed disabled:opacity-50'

const btnVariants = {
  primary:
    'bg-gradient-to-r from-brand-deep to-brand text-white uppercase tracking-wider shadow-glow hover:scale-105 hover:shadow-glow-lg active:scale-[0.98]',
  indigo:
    'bg-gradient-to-r from-brand-deep to-brand text-white uppercase tracking-wider shadow-glow hover:scale-105 hover:shadow-glow-lg active:scale-[0.98]',
  secondary:
    'border border-white/20 bg-transparent text-white hover:border-white hover:bg-white/10 active:scale-[0.98]',
  outline:
    'border border-white/20 bg-transparent text-white hover:border-white hover:bg-white/10 active:scale-[0.98]',
  ghost:
    'bg-transparent text-muted hover:bg-white/10 hover:text-brand active:scale-[0.98]',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_-5px_rgba(225,29,72,0.5)] active:scale-[0.98]',
  link:
    'bg-transparent text-brand hover:underline p-0 min-h-0 h-auto shadow-none font-normal',
}

const btnSizes = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, ...rest }) {
  const isLink = variant === 'link'
  return (
    <button
      className={cx(
        btnBase,
        btnVariants[variant] || btnVariants.primary,
        !isLink && btnSizes[size],
        !isLink && 'min-h-[44px]',
        isLink && 'min-h-0 h-auto p-0',
        className
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin text-current" /> : Icon ? <Icon className="h-4 w-4 shrink-0" /> : null}
      {children}
    </button>
  )
}

export function IconButton({ className, children, title, ...rest }) {
  return (
    <button
      title={title}
      className={cx(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-surface text-muted transition hover:border-brand/50 hover:bg-white/5 hover:text-white hover:shadow-glow focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...rest}
    >
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
          {label} {required && <span className="text-brand">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1 font-mono text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export function Input(props) {
  const { invalid, className, ...rest } = props
  return (
    <input
      {...rest}
      className={cx(
        'input-base',
        invalid && '!border-rose-500 focus:!border-rose-500 focus:!shadow-[0_10px_20px_-10px_rgba(244,63,94,0.3)]',
        className
      )}
    />
  )
}

export function Textarea(props) {
  const { invalid, className, ...rest } = props
  return (
    <textarea
      {...rest}
      className={cx(
        'input-base',
        invalid && '!border-rose-500 focus:!border-rose-500 focus:!shadow-[0_10px_20px_-10px_rgba(244,63,94,0.3)]',
        className
      )}
    />
  )
}

export function Select({ children, invalid, className, ...rest }) {
  return (
    <select
      {...rest}
      className={cx(
        'input-base [&>option]:bg-surface [&>option]:text-white',
        invalid && '!border-rose-500 focus:!border-rose-500',
        className
      )}
    >
      {children}
    </select>
  )
}

export function Checkbox({ label, className, ...rest }) {
  return (
    <label className={cx('flex cursor-pointer items-center gap-2.5 text-sm text-muted transition-colors hover:text-white', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-white/20 bg-black/50 text-brand accent-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        {...rest}
      />
      <span>{label}</span>
    </label>
  )
}

export function Switch({ checked, onChange, label, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx('flex items-center gap-2.5 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand', className)}
    >
      <span
        className={cx(
          'relative inline-flex h-6 w-11 items-center rounded-full border border-white/10 transition-colors',
          checked ? 'bg-brand shadow-glow' : 'bg-black/50'
        )}
      >
        <span
          className={cx(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-none transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </span>
      {label && <span className="text-sm text-muted">{label}</span>}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Display primitives                                                  */
/* ------------------------------------------------------------------ */
export function Badge({ tone = 'default', live = false, children, className }) {
  const tones = {
    default: 'bg-white/5 text-muted border-white/10',
    muted: 'bg-white/5 text-muted border-white/10',
    slate: 'bg-white/5 text-muted border-white/10',
    brand: 'bg-brand/10 text-brand border-brand/30',
    gold: 'bg-gold/10 text-gold border-gold/30',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    red: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    amber: 'bg-gold/10 text-gold border-gold/30',
    indigo: 'bg-brand/10 text-brand border-brand/30',
    blue: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    navy: 'bg-brand-deep/10 text-brand-deep border-brand-deep/30',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest',
        tones[tone] || tones.default,
        className
      )}
    >
      {live && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}

export function Card({ className, children, interactive, ...rest }) {
  return (
    <div
      className={cx(
        'card-base',
        interactive && 'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-[0_0_30px_-10px_rgba(247,147,26,0.2)]',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, subtitle, actions, className }) {
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-6 py-4', className)}>
      <div>
        <h3 className="font-heading text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function StatCard({ icon: Icon, label, value, delta, deltaUp, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand/20 border-brand/50 text-brand shadow-glow/30',
    gold: 'bg-gold/20 border-gold/50 text-gold shadow-glow-gold/30',
    muted: 'bg-white/5 border-white/10 text-muted',
    indigo: 'bg-brand/20 border-brand/50 text-brand shadow-glow/30',
    navy: 'bg-brand-deep/20 border-brand-deep/50 text-brand-deep',
    emerald: 'bg-gold/20 border-gold/50 text-gold shadow-glow-gold/30',
    amber: 'bg-gold/20 border-gold/50 text-gold shadow-glow-gold/30',
    rose: 'bg-rose-500/20 border-rose-500/50 text-rose-400',
    cyan: 'bg-brand/20 border-brand/50 text-brand shadow-glow/30',
    violet: 'bg-brand/20 border-brand/50 text-brand shadow-glow/30',
    slate: 'bg-white/5 border-white/10 text-muted',
  }
  return (
    <Card interactive className="group flex items-center gap-4 p-5">
      <div className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-105', tones[tone] || tones.brand)}>
        {Icon && <Icon className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate font-mono text-xs uppercase tracking-wider text-muted">{label}</p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-white">{value}</p>
        {delta && (
          <p className={cx('mt-0.5 font-mono text-xs font-medium', deltaUp === false ? 'text-rose-400' : 'text-gold')}>
            {delta}
          </p>
        )}
      </div>
    </Card>
  )
}

export function Avatar({ name, className }) {
  const colors = [
    'bg-brand/20 text-brand border-brand/40',
    'bg-gold/20 text-gold border-gold/40',
    'bg-brand-deep/20 text-brand-deep border-brand-deep/40',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    'bg-sky-500/20 text-sky-400 border-sky-500/40',
    'bg-violet-500/20 text-violet-400 border-violet-500/40',
  ]
  let h = 0
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % 997
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('')
  return (
    <span
      className={cx(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold',
        colors[h % colors.length],
        className
      )}
    >
      {initials}
    </span>
  )
}

export function ProgressBar({ value, tone = 'brand', className }) {
  const fills = {
    brand: 'bg-gradient-to-r from-brand-deep via-brand to-gold shadow-glow',
    emerald: 'bg-emerald-500',
    amber: 'bg-gold',
    rose: 'bg-rose-500',
    indigo: 'bg-gradient-to-r from-brand-deep via-brand to-gold shadow-glow',
  }
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full border border-white/5 bg-white/10', className)}>
      <div
        className={cx('h-full rounded-full transition-all duration-500', fills[tone] || fills.brand)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function EmptyState({ icon: Icon, title, message, action, className }) {
  return (
    <div className={cx('relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-surface/50 p-10 text-center', className)}>
      {Icon && (
        <div className="pointer-events-none absolute -bottom-6 -right-6 select-none opacity-5">
          <Icon className="h-44 w-44 text-white" strokeWidth={1} />
        </div>
      )}
      {Icon && (
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand shadow-glow/20">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <p className="relative font-heading text-base font-semibold text-white">{title}</p>
      {message && <p className="relative mt-1.5 max-w-sm text-sm text-muted">{message}</p>}
      {action && <div className="relative mt-5">{action}</div>}
    </div>
  )
}

export function Spinner({ className }) {
  return <Loader2 className={cx('h-5 w-5 animate-spin text-brand', className)} />
}

export function PageHeader({ title, subtitle, eyebrow, actions, className }) {
  return (
    <div className={cx('mb-6 flex flex-wrap items-center justify-between gap-4', className)}>
      <div>
        {eyebrow && (
          <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-brand">
            {eyebrow}
          </p>
        )}
        <h1 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function Modal({ open, onClose, title, subtitle, children, footer, wide }) {
  const modalRef = useRef(null)
  // Keep the latest onClose in a ref so the focus effect below runs only when
  // the modal opens/closes, not on every parent re-render (inline arrows).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const prevActive = document.activeElement

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          last.focus()
          e.preventDefault()
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus()
          e.preventDefault()
        }
      }
    }

    const t = setTimeout(() => {
      const root = modalRef.current
      if (!root || root.contains(document.activeElement)) return
      const field = root.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])')
      const fallback = root.querySelector('button, [href], [tabindex]:not([tabindex="-1"])')
      ;(field || fallback)?.focus()
    }, 50)

    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      if (prevActive && prevActive.focus) prevActive.focus()
    }
  }, [open])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={modalRef}
        className={cx('my-8 w-full rounded-2xl border border-white/10 bg-surface/95 text-white shadow-card-soft backdrop-blur-lg', wide ? 'max-w-3xl' : 'max-w-lg')}
      >
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 id="modal-title" className="font-heading text-lg font-semibold text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-sm text-white/90">{children}</div>
        {footer && <div className="flex justify-end gap-2.5 border-t border-white/10 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Tabs / Search / Pagination                                          */
/* ------------------------------------------------------------------ */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cx('inline-flex gap-1 border-b border-white/10 sm:gap-2', className)}>
      {tabs.map((t) => {
        const active = value === t.value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cx(
              'relative px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus:outline-none focus-visible:text-brand',
              active ? 'text-brand' : 'text-muted hover:text-white'
            )}
          >
            <span>{t.label}</span>
            {t.count != null && (
              <span className={cx('ml-1.5 text-[11px]', active ? 'text-brand/80' : 'text-muted/70')}>
                ({t.count})
              </span>
            )}
            {active && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand shadow-glow" />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder, className }) {
  return (
    <div className={cx('relative', className)}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || 'Search…'}
        className="input-base pl-10"
      />
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
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
    <div className="flex items-center gap-1 font-mono text-xs">
      <button
        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-muted transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Prev
      </button>
      {unique.map((p) => {
        const gap = p - last > 1
        last = p
        return (
          <React.Fragment key={p}>
            {gap && <span className="px-1 text-muted">…</span>}
            <button
              onClick={() => onChange(p)}
              className={cx(
                'h-8 w-8 rounded-lg border text-xs font-semibold transition',
                p === page
                  ? 'border-brand bg-brand/20 text-brand shadow-glow'
                  : 'border-white/10 text-muted hover:border-white/20 hover:bg-white/5 hover:text-white'
              )}
            >
              {p}
            </button>
          </React.Fragment>
        )
      })}
      <button
        className="rounded-lg border border-white/10 px-2.5 py-1.5 text-muted transition hover:border-white/20 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </div>
  )
}

export function DemoBanner() {
  return (
    <div className="border-b border-gold/30 bg-gold/5 px-4 py-2 text-center font-mono text-xs font-medium text-gold backdrop-blur-md">
      Demo mode — you are viewing simulated data. No real users, courses or payments are affected.
    </div>
  )
}
