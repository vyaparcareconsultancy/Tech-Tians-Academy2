import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase, isDemoMode } from './supabase.js'
import { buildDemoDB } from '../data/mockData.js'

const AuthCtx = createContext(null)

const SESSION_KEY = 'tta_session'
const SESSION_DAYS = 30

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (s.expiresAt && Date.now() > s.expiresAt) return null
    return s
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readSession())
  const [loading, setLoading] = useState(false)

  // In Supabase mode, follow the auth state so token refreshes/logout elsewhere work.
  useEffect(() => {
    if (isDemoMode || !supabase) return
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null)
        return
      }
      // Role must come from a trusted DB record — never from client-side choice.
      supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', session.user.id)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            setUser(null)
            return
          }
          setUser({ id: data.id, email: data.email, name: data.full_name, role: data.role, mode: 'supabase' })
        })
    })
    return () => supabase.auth.removeSubscription(sub.subscription)
  }, [])

  const persist = (session, remember) => {
    const json = JSON.stringify(session)
    if (remember) {
      sessionStorage.removeItem(SESSION_KEY)
      localStorage.setItem(SESSION_KEY, json)
    } else {
      localStorage.removeItem(SESSION_KEY)
      sessionStorage.setItem(SESSION_KEY, json)
    }
  }

  const value = useMemo(() => {
    const demoUsers = buildDemoDB().users

    const loginDemo = async (email, password, remember) => {
      // Simulate secure credential check against the trusted user record.
      await new Promise((r) => setTimeout(r, 650))
      const account = demoUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!account || account.password !== password) {
        throw new Error('Incorrect email or password. Please try again.')
      }
      if (account.role === 'student') {
        throw new Error('Student accounts use the Tech Tians learner app, not this portal.')
      }
      const session = {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role, // sourced from the trusted profile record
        profileId: account.profileId,
        mode: 'demo',
        remember,
        expiresAt: remember ? Date.now() + SESSION_DAYS * 864e5 : null,
      }
      persist(session, remember)
      return session
    }

    const loginSupabase = async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .eq('id', data.user.id)
        .single()
      if (pErr || !profile) {
        await supabase.auth.signOut()
        throw new Error('No staff profile linked to this account. Contact your administrator.')
      }
      const session = { id: profile.id, email: profile.email, name: profile.full_name, role: profile.role, mode: 'supabase', remember: false }
      persist(session, false)
      return session
    }

    return {
      user,
      mode: user?.mode || (isDemoMode ? 'demo' : 'supabase'),
      login: async (email, password, remember) => (isDemoMode ? loginDemo(email, password, remember) : loginSupabase(email, password)),
      logout: async () => {
        if (!isDemoMode && supabase) await supabase.auth.signOut().catch(() => {})
        localStorage.removeItem(SESSION_KEY)
        sessionStorage.removeItem(SESSION_KEY)
        setUser(null)
      },
      clearSession: () => {
        localStorage.removeItem(SESSION_KEY)
        sessionStorage.removeItem(SESSION_KEY)
        setUser(null)
      },
    }
  }, [user])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
