import React, { useEffect, useLayoutEffect, useRef } from 'react'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DURATION = 400 // every label resolves in the same time, whatever its length

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * A label that "decodes" left to right: resolved characters trail a short
 * band of random capitals (re-rolled every 45 ms), with nothing drawn beyond
 * it. The label's natural width is reserved first so the scramble never
 * reflows its row. It decodes once after `delay` ms, again whenever `text`
 * changes, and again whenever the pointer enters the surrounding link/button.
 */
export function DecodeText({ text, delay = 0, className = 't' }) {
  const ref = useRef(null)
  const state = useRef({ raf: 0, timer: 0, start: 0 })

  const settle = () => {
    const el = ref.current
    const s = state.current
    if (s.raf) cancelAnimationFrame(s.raf)
    if (s.timer) clearTimeout(s.timer)
    s.raf = 0
    s.timer = 0
    if (el) el.textContent = el.dataset.text || ''
  }

  const decode = () => {
    const el = ref.current
    if (!el) return
    settle()
    if (prefersReducedMotion()) return
    const full = el.dataset.text || ''
    const n = full.length
    const rand = new Array(n)
    const roll = () => {
      for (let i = 0; i < n; i++) rand[i] = LETTERS.charAt((Math.random() * 26) | 0)
    }
    roll()
    const t0 = performance.now()
    let lastRoll = 0
    const step = (now) => {
      const p = Math.min(1, (now - t0) / DURATION)
      const front = p * n
      if (now - lastRoll > 45) {
        roll()
        lastRoll = now
      }
      let out = ''
      for (let i = 0; i < n; i++) {
        const c = full.charAt(i)
        if (i < front) out += c
        else if (i < front + 3.6) out += c === ' ' ? ' ' : rand[i]
        else break
      }
      el.textContent = out
      if (p < 1) state.current.raf = requestAnimationFrame(step)
      else settle()
    }
    state.current.raf = requestAnimationFrame(step)
    // if frames are throttled the label still resolves on its own
    state.current.timer = setTimeout(settle, DURATION + 500)
  }

  // reserve the label's natural width so decoding never shifts the layout
  const reserve = () => {
    const el = ref.current
    if (!el) return
    el.style.width = ''
    const prev = el.textContent
    el.textContent = el.dataset.text || ''
    const w = el.getBoundingClientRect().width
    el.textContent = prev
    if (w) el.style.width = `${Math.ceil(w * 100) / 100}px`
  }

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.dataset.text = text
    el.textContent = text
    reserve()
  }, [text])

  // first decode after the fonts are ready, then on every text change
  const first = useRef(true)
  useEffect(() => {
    let t = 0
    const run = () => {
      reserve()
      t = setTimeout(decode, first.current ? delay : 0)
      first.current = false
    }
    if (first.current && document.fonts?.ready) document.fonts.ready.then(run)
    else run()
    return () => {
      clearTimeout(t)
      settle()
    }
    // decode/reserve/settle only touch refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // hovering the surrounding link or button re-runs the decode
  useEffect(() => {
    const host = ref.current?.closest('a, button')
    if (!host) return undefined
    const onEnter = () => decode()
    host.addEventListener('pointerenter', onEnter)
    let rt = 0
    const onResize = () => {
      clearTimeout(rt)
      rt = setTimeout(reserve, 160)
    }
    window.addEventListener('resize', onResize)
    return () => {
      host.removeEventListener('pointerenter', onEnter)
      window.removeEventListener('resize', onResize)
      clearTimeout(rt)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <span ref={ref} className={className} style={{ display: 'inline-block', whiteSpace: 'pre', textAlign: 'left' }} />
}

export default DecodeText
