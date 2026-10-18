import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

const HOME_BY_ROLE = { admin: '/admin/dashboard', teacher: '/teacher/dashboard', student: '/login' }

export function RequireAuth({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return children
}

export function RequireRole({ roles = [], children }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (!roles.includes(user.role)) {
    // Students and teachers are never allowed into admin routes, and vice versa.
    return <Navigate to={HOME_BY_ROLE[user.role] || '/login'} state={{ denied: location.pathname }} replace />
  }
  return children
}
