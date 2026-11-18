import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DecodeText } from '../DecodeText.jsx'
import { useTheme } from '../../lib/theme.jsx'
import '../../styles/stratum-hero.css'

// Background scene. Self-hosted copy of a free MotionSites background
// (dark grid horizon), tinted navy per chapter with a CSS filter.
const SCENE_SRC = '/videos/hero-grid.mp4'

// Each chapter of the rail swaps the headline (two rows), the paragraph
// (hand-set lines) and the tint of the scene.
export const CHAPTERS = [
  {
    id: 'academy',
    label: 'ACADEMY',
    head: ['Learn the skills ', 'that shape tomorrow'],
    lines: [
      'Tech Tians Academy teaches the technology careers are built on: AI,',
      'data, web development, cloud and security. Live cohorts, real projects',
      'and mentors who work in the field, from your very first lesson to a',
      'certificate anyone can verify.',
    ],
    scene: { hue: '75deg', sat: 0.8, bri: 1 },
  },
  {
    id: 'ai-data',
    label: 'AI & DATA',
    head: ['Teach machines ', 'to think with data'],
    lines: [
      'From Python and statistics to machine learning and generative AI,',
      'you build models on real datasets, test them honestly and learn to',
      'explain what they find, with a mentor reviewing your work at every',
      'step.',
    ],
    scene: { hue: '95deg', sat: 0.85, bri: 1.05 },
  },
  {
    id: 'development',
    label: 'DEVELOPMENT',
    head: ['Build for the web, ', 'ship for real users'],
    lines: [
      'Full stack development, Python and software testing, taught the way',
      'real teams work: version control, code reviews and projects that you',
      'deploy yourself and can show to an employer long after the course',
      'ends.',
    ],
    scene: { hue: '60deg', sat: 0.75, bri: 1 },
  },
  {
    id: 'cloud',
    label: 'CLOUD',
    head: ['Run it at scale, ', 'keep it running'],
    lines: [
      'AWS and Azure, DevOps pipelines, containers, hardware and networking:',
      'the systems behind every app, learned hands-on in labs that behave',
      'like production, so the first outage you meet is one you have already',
      'fixed.',
    ],
    scene: { hue: '80deg', sat: 0.6, bri: 1.12 },
  },
  {
    id: 'security',
    label: 'SECURITY',
    head: ['Defend what ', 'others build'],
    lines: [
      'Cyber security and ethical hacking from the ground up: networks,',
      'Linux, web vulnerabilities and the tools attackers use, practised',
      'safely in guided labs so you learn to find weaknesses before someone',
      'else does.',
    ],
    scene: { hue: '110deg', sat: 0.7, bri: 0.92 },
  },
  {
    id: 'careers',
    label: 'CAREERS',
    head: ['Skills that turn ', 'into careers'],
    lines: [
      'Design, digital marketing, data analytics and business software sit',
      'beside the code, because every product needs them. Each course ends',
      'with a verifiable certificate and a portfolio of work that speaks for',
      'you.',
    ],
    scene: { hue: '45deg', sat: 0.55, bri: 1.08 },
  },
]

const NAV = [
  { label: 'COURSES', to: '/courses' },
  { label: 'HOW IT WORKS', hash: '#how-it-works' },
  { label: 'PRICING', hash: '#pricing' },
  { label: 'FAQ', hash: '#faq' },
  { label: 'CONTACT', to: '/contact' },
]

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

const PixelIcon = () => (
  <svg className="ico" viewBox="0 0 7 11" aria-hidden="true">
    <rect x="0" y="0" width="4" height="5" />
    <rect x="3" y="4" width="4" height="4" />
    <rect x="0" y="7" width="4" height="4" />
  </svg>
)

const DotsIcon = () => (
  <svg className="ico" viewBox="0 0 10 10" aria-hidden="true">
    <rect x="0" y="0" width="4" height="4" rx=".8" />
    <rect x="6" y="0" width="4" height="4" rx=".8" />
    <rect x="0" y="6" width="4" height="4" rx=".8" />
    <rect x="6" y="6" width="4" height="4" rx=".8" />
  </svg>
)

export default function StratumHero({ scrollTargetId = 'uncover' }) {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const rootRef = useRef(null)
  const bgRef = useRef(null)
  const videoRef = useRef(null)
  const navsetRef = useRef(null)
  const menuRef = useRef(null)
  const [anim, setAnim] = useState(() => !reducedMotion())
  const [chapterId, setChapterId] = useState(CHAPTERS[0].id)
  const [shown, setShown] = useState(CHAPTERS[0])
  const [swapping, setSwapping] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const swapTimer = useRef(0)

  // entrance runs once; nothing animates after ~1.5 s except the scene
  useEffect(() => {
    if (!anim) return undefined
    const t = setTimeout(() => setAnim(false), 2200)
    return () => clearTimeout(t)
  }, [anim])

  // scene parallax (mouse only): the scene drifts against the pointer
  useEffect(() => {
    if (reducedMotion()) return undefined
    const bg = bgRef.current
    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let running = false
    let raf = 0
    const tick = () => {
      cx += (tx - cx) * 0.045
      cy += (ty - cy) * 0.045
      const w = window.innerWidth
      const h = window.innerHeight
      const dx = -cx * w * 0.0156
      const dy = -cy * h * 0.015
      const cover = 2 * Math.max(Math.abs(dx) / w, Math.abs(dy) / h)
      const sc = 1 + cover + 0.014 * Math.max(0, cy)
      if (bg) bg.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${sc.toFixed(4)})`
      if (Math.abs(tx - cx) < 0.0004 && Math.abs(ty - cy) < 0.0004) {
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const wake = () => {
      if (!running) {
        running = true
        raf = requestAnimationFrame(tick)
      }
    }
    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      const r = rootRef.current?.getBoundingClientRect()
      if (!r || e.clientY > r.bottom) {
        tx = 0
        ty = 0
      } else {
        tx = (e.clientX / window.innerWidth) * 2 - 1
        ty = ((e.clientY - r.top) / r.height) * 2 - 1
      }
      wake()
    }
    const onLeave = () => {
      tx = 0
      ty = 0
      wake()
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  // pause the scene when the hero is off screen
  useEffect(() => {
    const v = videoRef.current
    const root = rootRef.current
    if (!v || !root || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play?.().catch(() => {})
      else v.pause?.()
    })
    io.observe(root)
    return () => io.disconnect()
  }, [])

  // chapter switching: copy drops into its mask, swaps, rises back in
  const showChapter = useCallback((id) => {
    const next = CHAPTERS.find((c) => c.id === id)
    if (!next || id === chapterId) return
    setChapterId(id)
    clearTimeout(swapTimer.current)
    setSwapping(true)
    swapTimer.current = setTimeout(() => {
      setShown(next)
      requestAnimationFrame(() => setSwapping(false))
    }, reducedMotion() ? 0 : 500)
  }, [chapterId])
  useEffect(() => () => clearTimeout(swapTimer.current), [])

  // mobile MENU panel: Escape, outside click and widening all close it
  useEffect(() => {
    if (!navOpen) return undefined
    requestAnimationFrame(() => navsetRef.current?.querySelector('a')?.focus())
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setNavOpen(false)
        menuRef.current?.focus()
      }
    }
    const onClick = (e) => {
      if (!navsetRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) setNavOpen(false)
    }
    const onResize = () => {
      if (window.innerWidth > 830) setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
      window.removeEventListener('resize', onResize)
    }
  }, [navOpen])

  const goHash = (hash) => (e) => {
    e.preventDefault()
    setNavOpen(false)
    document.querySelector(hash)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' })
  }

  const scene = (CHAPTERS.find((c) => c.id === chapterId) || CHAPTERS[0]).scene
  const isLight = theme === 'light'

  return (
    <section
      ref={rootRef}
      className={['tt-hero', anim && 'anim', swapping && 'swapping', navOpen && 'nav-open'].filter(Boolean).join(' ')}
      aria-label="Tech Tians Academy"
    >
      <div ref={bgRef} className="bg" role="img" aria-label="A glowing grid horizon at night">
        <video
          ref={videoRef}
          className={videoReady ? 'ready' : undefined}
          src={SCENE_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={() => setVideoReady(true)}
          style={{ '--scene-hue': scene.hue, '--scene-sat': scene.sat, '--scene-bri': scene.bri }}
        />
      </div>
      <div className="shade" aria-hidden="true" />

      <div className="frame">
        <span className="ln ln-t" />
        <span className="ln ln-b" />
        <span className="ln ln-l" />
        <span className="ln ln-r" />
        <span className="cn cn-tl" />
        <span className="cn cn-tr" />
        <span className="cn cn-bl" />
        <span className="cn cn-br" />

        <Link className="logo" to="/" aria-label="Tech Tians Academy — home">
          <span className="mark">
            <img src="/logo-mark.png" alt="" width="32" height="32" />
          </span>
          <span className="word">
            <b>Tech Tians</b>
            <i>ACADEMY</i>
          </span>
        </Link>

        <nav className="masthead" aria-label="Main">
          <div className="navset" id="tt-navset" ref={navsetRef}>
            <div className="links lbl">
              {NAV.map((item, i) =>
                item.to ? (
                  <Link key={item.label} to={item.to} onClick={() => setNavOpen(false)}>
                    <DecodeText text={item.label} delay={360 + i * 45} />
                  </Link>
                ) : (
                  <a key={item.label} href={item.hash} onClick={goHash(item.hash)}>
                    <DecodeText text={item.label} delay={360 + i * 45} />
                  </a>
                )
              )}
            </div>
            <Link className="pill enter lbl" to="/login" onClick={() => setNavOpen(false)}>
              <PixelIcon />
              <DecodeText text="LOGIN" delay={330} />
            </Link>
            <Link className="signup lbl" to="/signup" onClick={() => setNavOpen(false)}>
              GET STARTED
            </Link>
          </div>
          <Link className="pill menu desk lbl" to="/signup">
            <DotsIcon />
            <DecodeText text="GET STARTED" delay={390} />
          </Link>
          <button
            ref={menuRef}
            className="pill menu burger lbl"
            type="button"
            aria-expanded={navOpen}
            aria-controls="tt-navset"
            onClick={(e) => {
              e.stopPropagation()
              setNavOpen((o) => !o)
            }}
          >
            <DotsIcon />
            <DecodeText text={navOpen ? 'CLOSE' : 'MENU'} delay={390} />
          </button>
        </nav>

        <ul className="index" aria-label="What you can learn">
          {CHAPTERS.map((c, i) => (
            <li key={c.id} className={c.id === chapterId ? 'on' : undefined}>
              <button
                type="button"
                aria-current={c.id === chapterId ? 'true' : undefined}
                onClick={() => showChapter(c.id)}
              >
                <DecodeText text={c.label} delay={c.id === CHAPTERS[0].id ? 660 : 720 + (i - 1) * 55} />
              </button>
            </li>
          ))}
        </ul>

        <div className="hero">
          <h1 className="headline">
            <span className="hrow"><span className="hrise">{shown.head[0]}</span></span>
            <span className="hrow"><span className="hrise">{shown.head[1]}</span></span>
          </h1>
          <p className="blurb">
            {shown.lines.map((line, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {i > 0 ? ' ' : ''}
                {line}
              </React.Fragment>
            ))}
          </p>
          <Link className="cta lbl" to="/courses">
            <span className="cta-glass" />
            <svg className="cta-edge" viewBox="0 0 190 41" preserveAspectRatio="none" aria-hidden="true">
              <path d="M3.5.5 H179.5 L189.5 10.5 V37.5 L186.5 40.5 H10.5 L.5 30.5 V3.5 Z" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="cta-in">
              <PixelIcon />
              <DecodeText text="EXPLORE OUR COURSES" delay={900} />
            </span>
          </Link>
        </div>

        <div className="dock">
          <span className="rule" />
          <button
            className="mode lbl"
            type="button"
            aria-pressed={!isLight}
            onClick={toggleTheme}
            title="Switch the site between night and day mode"
          >
            <svg className="ico" viewBox="0 0 13 13" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
              {isLight ? (
                <>
                  <circle cx="6.5" cy="6.5" r="2.6" />
                  <path d="M6.5 .6v1.6M6.5 10.8v1.6M.6 6.5h1.6M10.8 6.5h1.6M2.3 2.3l1.1 1.1M9.6 9.6l1.1 1.1M2.3 10.7l1.1-1.1M9.6 3.4l1.1-1.1" strokeLinecap="round" />
                </>
              ) : (
                <path d="M10.9 8.3A5 5 0 0 1 4.7 2.1 5 5 0 1 0 10.9 8.3Z" strokeLinejoin="round" />
              )}
            </svg>
            <DecodeText text={isLight ? 'DAY MODE' : 'NIGHT MODE'} delay={1000} />
          </button>

          <a className="scroll lbl" href={`#${scrollTargetId}`} onClick={goHash(`#${scrollTargetId}`)}>
            <svg className="ico" viewBox="0 0 5 7" aria-hidden="true">
              <path d="M0 0 H5 L2.5 3 Z" />
              <path d="M0 4 H5 L2.5 7 Z" />
            </svg>
            <DecodeText text="SCROLL TO UNCOVER" delay={1060} />
          </a>

          <a
            className="talk lbl"
            href="/contact"
            onClick={(e) => {
              e.preventDefault()
              navigate('/contact')
            }}
          >
            <DecodeText text="TALK WITH US" delay={1120} />
            <svg className="ico" viewBox="0 0 16 15" aria-hidden="true">
              <path d="M8 .8 C12 .8 15.2 3.8 15.2 7.4 C15.2 11 12 14 8 14 C6.6 14 5.3 13.6 4.2 13 L.9 13.9 L1.9 10.9 C1.2 9.9 .8 8.7 .8 7.4 C.8 3.8 4 .8 8 .8 Z" />
              <g fill="currentColor" stroke="none">
                <circle cx="5.2" cy="7.4" r=".95" />
                <circle cx="8" cy="7.4" r=".95" />
                <circle cx="10.8" cy="7.4" r=".95" />
              </g>
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}
