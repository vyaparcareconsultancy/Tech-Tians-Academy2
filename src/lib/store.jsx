import React, { createContext, useContext, useMemo, useState } from 'react'
import { buildDemoDB } from '../data/mockData.js'
import { supabase, getMode } from './supabase.js'
import { uid } from './utils.js'
import { useAuth } from './auth.jsx'

/**
 * DataProvider — the single source of truth for the UI.
 *
 * DEMO MODE (default): every operation mutates an in-memory copy of the
 * seeded mock database. Nothing is persisted or transmitted.
 *
 * SUPABASE MODE: auth + profiles + audit logging call the real API.
 * Entity CRUD is intentionally NOT wired yet — functions throw a clear
 * error instead of silently faking success. See README "Integration status".
 */
const DataCtx = createContext(null)

const ENTITIES = [
  'users', 'students', 'teachers', 'subjects', 'courses', 'sections', 'lessons',
  'teacherCourses', 'batches', 'batchStudents', 'enrollments', 'lessonProgress',
  'liveClasses', 'lectures', 'assignments', 'submissions', 'quizzes', 'quizAttempts',
  'announcements', 'coupons', 'orders', 'payments', 'materials', 'attendance',
  'auditLogs', 'notifications', 'policies',
]

export function DataProvider({ children }) {
  const { user, mode } = useAuth()
  const [db, setDb] = useState(() => buildDemoDB())

  const value = useMemo(() => {
    const failSupabase = (op) => {
      throw new Error(`Supabase mode: "${op}" is not wired to the database yet (demo backend active).`)
    }

    const list = (entity) => db[entity] || []
    const get = (entity, id) => (db[entity] || []).find((r) => r.id === id)
    const insert = (entity, record) => {
      if (getMode() !== 'demo') failSupabase(`insert ${entity}`)
      const row = { ...record, id: record.id || uid(entity.slice(0, 3)) }
      setDb((d) => ({ ...d, [entity]: [...(d[entity] || []), row] }))
      return row
    }
    const update = (entity, id, patch) => {
      if (getMode() !== 'demo') failSupabase(`update ${entity}`)
      setDb((d) => ({ ...d, [entity]: (d[entity] || []).map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
    }
    const remove = (entity, id) => {
      if (getMode() !== 'demo') failSupabase(`delete ${entity}`)
      setDb((d) => ({ ...d, [entity]: (d[entity] || []).filter((r) => r.id !== id) }))
    }

    const audit = (action, entity, details) => {
      const actorName = user ? `${user.name}${user.role === 'admin' ? ' (Admin)' : ' (Teacher)'}` : 'System'
      const entry = {
        id: uid('log'),
        actorId: user?.id || 'system',
        actorName,
        action,
        entity,
        entityId: '',
        details,
        createdAt: new Date().toISOString(),
      }
      if (getMode() === 'demo') {
        setDb((d) => ({ ...d, auditLogs: [entry, ...d.auditLogs] }))
      } else if (supabase) {
        // Real audit trail write — requires the audit_logs table + RLS.
        supabase.from('audit_logs').insert({ actor_id: user?.id, actor_name: actorName, action, entity, details }).then(() => {})
      }
      return entry
    }

    const resetDemo = () => setDb(buildDemoDB())

    const markNotificationRead = (id) =>
      setDb((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    const markAllNotificationsRead = () =>
      setDb((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }))

    const updatePolicy = (patch) => {
      if (getMode() !== 'demo') failSupabase('update policies')
      setDb((d) => ({ ...d, policies: { ...d.policies, ...patch } }))
    }

    return {
      db,
      list,
      get,
      insert,
      update,
      remove,
      audit,
      resetDemo,
      updatePolicy,
      markNotificationRead,
      markAllNotificationsRead,
      isDemo: getMode() === 'demo',
      // helpers -------------------------------------------------------------
      courseById: (id) => db.courses.find((c) => c.id === id),
      studentById: (id) => db.students.find((s) => s.id === id),
      teacherById: (id) => db.teachers.find((t) => t.id === id),
      batchById: (id) => db.batches.find((b) => b.id === id),
      coursesForTeacher: (teacherId) => {
        const links = db.teacherCourses.filter((tc) => tc.teacherId === teacherId)
        return links.map((l) => db.courses.find((c) => c.id === l.courseId)).filter(Boolean)
      },
      batchesForTeacher: (teacherId) => db.batches.filter((b) => b.teacherId === teacherId),
      studentsInCourse: (courseId) => {
        const ids = new Set(db.enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId))
        return db.students.filter((s) => ids.has(s.id))
      },
      studentsInBatch: (batchId) => {
        const ids = new Set(db.batchStudents.filter((bs) => bs.batchId === batchId).map((bs) => bs.studentId))
        return db.students.filter((s) => ids.has(s.id))
      },
      teacherIdForUser: (userId) => db.teachers.find((t) => t.userId === userId)?.id,
      studentByIdFromUser: (userId) => db.students.find((s) => s.userId === userId),
    }
  }, [db, user, mode])

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData() {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
