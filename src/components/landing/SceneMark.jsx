import React from 'react'
import '../../styles/stratum-hero.css'

/**
 * A small framed window onto the hero scene (grid horizon at night), used
 * on the sign-in pages in place of a decorative illustration. Pure CSS
 * fallback underneath, the same background video on top when available.
 */
export default function SceneMark({ size = 'lg' }) {
  const small = size === 'sm'
  return (
    <div className={`tt-scene ${small ? 'tt-scene-sm' : ''}`} aria-hidden="true">
      <div className="bg">
        <video src="/videos/hero-grid.mp4" autoPlay muted loop playsInline preload="metadata" onCanPlay={(e) => e.currentTarget.classList.add('ready')} />
      </div>
      <span className="ln ln-t" />
      <span className="ln ln-b" />
      <span className="ln ln-l" />
      <span className="ln ln-r" />
      <span className="cn cn-tl" />
      <span className="cn cn-tr" />
      <span className="cn cn-bl" />
      <span className="cn cn-br" />
      <img className="mark" src="/logo-mark.png" alt="" width="40" height="40" />
    </div>
  )
}
