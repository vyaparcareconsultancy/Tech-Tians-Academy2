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
  const [user, setUser] = useState(() => (isDemoMode ? readSession() : null))
  const [loading, setLoading] = useState(!isDemoMode)

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

  // In Supabase mode, follow the auth state and rebuild user on app load from the profiles table.
  useEffect(() => {
    if (isDemoMode || !supabase) return

    let mounted = true

    const syncUser = async (session) => {
      if (!session?.user?.id) {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
        sessionStorage.removeItem(SESSION_KEY)
        localStorage.removeItem(SESSION_KEY)
        return
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, status, avatar_url')
          .eq('id', session.user.id)
          .single()

        if (
          error ||
          !profile ||
          ['suspended', 'pending', 'rejected'].includes(profile.status)
        ) {
          if (typeof window !== 'undefined' && window.location.pathname !== '/set-password') {
            await supabase.auth.signOut().catch(() => {})
          }
          if (mounted) {
            setUser(null)
            setLoading(false)
          }
          sessionStorage.removeItem(SESSION_KEY)
          localStorage.removeItem(SESSION_KEY)
          return
        }

        const isRemembered = Boolean(localStorage.getItem(SESSION_KEY))
        const authUser = {
          id: profile.id,
          profileId: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: profile.role,
          avatarUrl: profile.avatar_url || null,
          mode: 'supabase',
          remember: isRemembered,
          expiresAt: isRemembered ? Date.now() + SESSION_DAYS * 864e5 : null,
        }
        if (mounted) {
          setUser(authUser)
          setLoading(false)
        }
        persist(authUser, isRemembered)
      } catch {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    // On app load, call supabase.auth.getSession() and rebuild user from profiles table
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncUser(session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      syncUser(session)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(() => {
    const demoUsers = buildDemoDB().users

    const loginDemo = async (email, password, remember) => {
      // Simulate secure credential check against the trusted user record.
      await new Promise((r) => setTimeout(r, 650))
      const account = demoUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
      if (!account || account.password !== password) {
        throw new Error('Incorrect email or password. Please try again.')
      }
      const demoDb = buildDemoDB()
      let userName = account.name
      if (!userName) {
        if (account.role === 'admin') userName = 'Admin'
        else if (account.role === 'teacher') {
          const t = demoDb.teachers.find((x) => x.id === account.profileId)
          userName = t?.name || 'Dr. Meera Rao'
        } else if (account.role === 'student') {
          const s = demoDb.students.find((x) => x.id === account.profileId)
          userName = s?.name || 'Rohan Verma'
        }
      }
      const session = {
        id: account.id,
        email: account.email,
        name: userName,
        role: account.role, // sourced from the trusted profile record
        profileId: account.profileId,
        mode: 'demo',
        remember,
        expiresAt: remember ? Date.now() + SESSION_DAYS * 864e5 : null,
      }
      persist(session, remember)
      setUser(session)
      return session
    }

    const loginSupabase = async (email, password, remember) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw new Error(error.message)
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status, avatar_url')
        .eq('id', data.user.id)
        .single()
      if (pErr || !profile) {
        await supabase.auth.signOut()
        throw new Error('No profile linked to this account. Contact your administrator.')
      }
      if (['suspended', 'pending', 'rejected'].includes(profile.status)) {
        await supabase.auth.signOut()
        throw new Error(`Your account status is ${profile.status}. Contact your administrator.`)
      }
      const session = {
        id: profile.id,
        profileId: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        avatarUrl: profile.avatar_url || null,
        mode: 'supabase',
        remember,
        expiresAt: remember ? Date.now() + SESSION_DAYS * 864e5 : null,
      }
      persist(session, remember)
      setUser(session)
      return session
    }

    return {
      user,
      loading,
      mode: user?.mode || (isDemoMode ? 'demo' : 'supabase'),
      login: async (email, password, remember) =>
        isDemoMode ? loginDemo(email, password, remember) : loginSupabase(email, password, remember),
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
      updateUser: (patch) => setUser((u) => (u ? { ...u, ...patch } : u)),
    }
  }, [user, loading])

  return (
    <AuthCtx.Provider value={value}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-void">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent shadow-glow" />
        </div>
      ) : (
        children
      )}
    </AuthCtx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
