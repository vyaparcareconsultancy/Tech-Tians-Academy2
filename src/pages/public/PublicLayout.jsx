import React, { useState } from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { Menu, X, ArrowRight, Sparkles } from 'lucide-react'
import { Logo } from '../../components/Layout.jsx'
import { Button } from '../../components/ui.jsx'
import { isDemoMode } from '../../lib/supabase.js'

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const navLinks = [
    { label: 'Courses', href: '#courses' },
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ]

  const handleNavClick = (e, href) => {
    e.preventDefault()
    setMobileMenuOpen(false)
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-void text-white flex flex-col selection:bg-brand/30 selection:text-white">
      {/* Sticky Glass Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <Logo />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="font-mono text-xs uppercase tracking-wider text-muted transition-colors hover:text-white focus:outline-none focus-visible:text-brand"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden items-center gap-3 sm:flex">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/login')}
              className="font-mono text-xs uppercase tracking-wider text-muted hover:text-white"
            >
              Login
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const el = document.querySelector('#courses')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
                else navigate('/login')
              }}
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface text-muted transition hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-white/10 bg-surface/95 px-4 py-6 backdrop-blur-xl md:hidden">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="font-mono text-sm uppercase tracking-wider text-muted transition-colors hover:text-brand"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2.5 pt-4 border-t border-white/10">
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    navigate('/login')
                  }}
                  className="w-full justify-center font-mono text-xs uppercase tracking-wider"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    const el = document.querySelector('#courses')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                    else navigate('/login')
                  }}
                  className="w-full justify-center"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer on Surface */}
      <footer className="border-t border-white/10 bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand column */}
            <div className="space-y-4 md:col-span-2">
              <Logo />
              <p className="max-w-sm text-sm leading-relaxed text-muted">
                The high-precision learning platform for modern technical education. Engineered for STEM mastery, live interactive cohorts, and verifiable student success.
              </p>
              {isDemoMode && (
                <div className="inline-flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-1 font-mono text-xs text-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Demo mode active — sample student & course records</span>
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">Platform</p>
              <ul className="mt-4 space-y-2.5 font-mono text-xs text-muted">
                <li>
                  <a href="#courses" onClick={(e) => handleNavClick(e, '#courses')} className="transition hover:text-white">
                    Featured Courses
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" onClick={(e) => handleNavClick(e, '#how-it-works')} className="transition hover:text-white">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#pricing" onClick={(e) => handleNavClick(e, '#pricing')} className="transition hover:text-white">
                    Cohort Pricing
                  </a>
                </li>
                <li>
                  <a href="#faq" onClick={(e) => handleNavClick(e, '#faq')} className="transition hover:text-white">
                    Help & FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Programs */}
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">Curriculums</p>
              <ul className="mt-4 space-y-2.5 font-mono text-xs text-muted">
                <li><span className="text-white/80">JEE Main & Advanced</span></li>
                <li><span className="text-white/80">NEET UG Medical</span></li>
                <li><span className="text-white/80">Class 11 & 12 Foundation</span></li>
                <li><span className="text-white/80">Science Olympiad Prep</span></li>
                <li><span className="text-white/80">Computer Science & Python</span></li>
              </ul>
            </div>

            {/* Access & Portals */}
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-brand">Portals</p>
              <ul className="mt-4 space-y-2.5 font-mono text-xs text-muted">
                <li>
                  <Link to="/login" className="transition hover:text-white">
                    Staff & Teacher Login
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="transition hover:text-white">
                    Admin Console
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="transition hover:text-white">
                    Student Classroom
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row font-mono text-xs text-muted">
            <p>© {new Date().getFullYear()} Tech Tians Academy. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
