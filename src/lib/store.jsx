import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { buildDemoDB } from '../data/mockData.js'
import { isDemoMode, getMode } from './supabase.js'
import { uid } from './utils.js'
import { useAuth } from './auth.jsx'
import {
  getEntityApi,
  studentsApi,
  teachersApi,
  subjectsApi,
  coursesApi,
  sectionsApi,
  lessonsApi,
  teacherCoursesApi,
  batchesApi,
  batchStudentsApi,
  enrollmentsApi,
  lessonProgressApi,
  liveClassesApi,
  lecturesApi,
  materialsApi,
  attendanceApi,
  assignmentsApi,
  submissionsApi,
  quizzesApi,
  quizQuestionsApi,
  quizAttemptsApi,
  ordersApi,
  paymentsApi,
  couponsApi,
  announcementsApi,
  auditLogsApi,
  policiesApi,
} from './api/index.js'

const DataCtx = createContext(null)

const INITIAL_EMPTY_DB = {
  users: [],
  students: [],
  teachers: [],
  subjects: [],
  courses: [],
  sections: [],
  lessons: [],
  teacherCourses: [],
  batches: [],
  batchStudents: [],
  enrollments: [],
  lessonProgress: [],
  liveClasses: [],
  lectures: [],
  assignments: [],
  submissions: [],
  quizzes: [],
  quizQuestions: [],
  quizAttempts: [],
  announcements: [],
  coupons: [],
  orders: [],
  payments: [],
  materials: [],
  attendance: [],
  auditLogs: [],
  notifications: [],
  policies: {
    teachersCanCreateCourses: true,
    lecturesRequireApproval: false,
    teacherScheduleWindowDays: 14,
    maintenanceMode: false,
  },
  covers: [
    { emoji: '⚛️', from: '#12233F', to: '#4672B8' },
    { emoji: '🧬', from: '#312E81', to: '#6366F1' },
    { emoji: '📐', from: '#1E3A5F', to: '#3B82F6' },
    { emoji: '🔬', from: '#0F2A44', to: '#0EA5E9' },
    { emoji: '💻', from: '#111827', to: '#6366F1' },
    { emoji: '📚', from: '#1B325F', to: '#818CF8' },
    { emoji: '🌍', from: '#14213D', to: '#4F46E5' },
    { emoji: '📈', from: '#0B1F3A', to: '#345A99' },
    { emoji: '🧮', from: '#172554', to: '#4F46E5' },
    { emoji: '🗺️', from: '#1E293B', to: '#4672B8' },
  ],
}

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [db, setDb] = useState(() => (isDemoMode ? buildDemoDB() : INITIAL_EMPTY_DB))
  const [loading, setLoading] = useState(!isDemoMode)
  const [error, setError] = useState(null)
  const [refreshIndex, setRefreshIndex] = useState(0)

  const reload = useCallback(() => {
    setRefreshIndex((i) => i + 1)
  }, [])

  // In Supabase mode, load data scoped to role
  useEffect(() => {
    if (isDemoMode) {
      setLoading(false)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    async function fetchData() {
      try {
        if (!user) {
          // Logged-out / Public visitor: load published catalog
          const [courses, subjects, batches, sections, lessons, teachers] = await Promise.all([
            coursesApi.list((q) => q.eq('status', 'published')),
            subjectsApi.list(),
            batchesApi.list((q) => q.in('status', ['active', 'upcoming'])),
            sectionsApi.list(),
            lessonsApi.list((q) => q.eq('status', 'published')),
            teachersApi.list((q) => q.eq('status', 'active')),
          ])
          if (!isMounted) return
          const subMap = new Map((subjects || []).map((s) => [s.id, s.name]))
          const enrichedCourses = (courses || []).map((c) => ({
            ...c,
            subjectName: c.subjectName || subMap.get(c.subjectId) || '',
          }))
          setDb((prev) => ({
            ...prev,
            courses: enrichedCourses,
            subjects: subjects || [],
            batches: batches || [],
            sections: sections || [],
            lessons: lessons || [],
            teachers: teachers || [],
          }))
          setLoading(false)
          return
        }

        if (user.role === 'admin') {
          // Admin: full visibility
          const [
            students, teachers, subjects, rawCourses, sections, lessons,
            teacherCourses, batches, batchStudents, enrollments, lessonProgress,
            liveClasses, lectures, assignments, submissions, quizzes, quizQuestions,
            quizAttempts, announcements, coupons, orders, payments, materials,
            attendance, auditLogs, policy
          ] = await Promise.all([
            studentsApi.list(),
            teachersApi.list(),
            subjectsApi.list(),
            coursesApi.list(),
            sectionsApi.list(),
            lessonsApi.list(),
            teacherCoursesApi.list(),
            batchesApi.list(),
            batchStudentsApi.list(),
            enrollmentsApi.list(),
            lessonProgressApi.list(),
            liveClassesApi.list(),
            lecturesApi.list(),
            assignmentsApi.list(),
            submissionsApi.list(),
            quizzesApi.list(),
            quizQuestionsApi.list(),
            quizAttemptsApi.list(),
            announcementsApi.list(),
            couponsApi.list(),
            ordersApi.list(),
            paymentsApi.list(),
            materialsApi.list(),
            attendanceApi.list(),
            auditLogsApi.list((q) => q.order('created_at', { ascending: false }).limit(200)),
            policiesApi.getPolicy(),
          ])
          if (!isMounted) return
          const subMap = new Map((subjects || []).map((s) => [s.id, s.name]))
          const courses = (rawCourses || []).map((c) => ({
            ...c,
            subjectName: c.subjectName || subMap.get(c.subjectId) || '',
          }))
          setDb((prev) => ({
            ...prev,
            students: students || [],
            teachers: teachers || [],
            subjects: subjects || [],
            courses,
            sections: sections || [],
            lessons: lessons || [],
            teacherCourses: teacherCourses || [],
            batches: batches || [],
            batchStudents: batchStudents || [],
            enrollments: enrollments || [],
            lessonProgress: lessonProgress || [],
            liveClasses: liveClasses || [],
            lectures: lectures || [],
            assignments: assignments || [],
            submissions: submissions || [],
            quizzes: quizzes || [],
            quizQuestions: quizQuestions || [],
            quizAttempts: quizAttempts || [],
            announcements: announcements || [],
            coupons: coupons || [],
            orders: orders || [],
            payments: payments || [],
            materials: materials || [],
            attendance: attendance || [],
            auditLogs: auditLogs || [],
            policies: policy || prev.policies,
          }))
          setLoading(false)
          return
        }

        if (user.role === 'teacher') {
          // Teacher: own courses/batches/students
          const teacherId = user.id
          const [tCourses, rawCourses, subjects, allBatches, teachers, policy, ann] = await Promise.all([
            teacherCoursesApi.list((q) => q.eq('teacher_id', teacherId)),
            coursesApi.list(),
            subjectsApi.list(),
            batchesApi.list(),
            teachersApi.list(),
            policiesApi.getPolicy(),
            announcementsApi.list(),
          ])
          if (!isMounted) return

          const subMap = new Map((subjects || []).map((s) => [s.id, s.name]))
          const myCourseIds = new Set([
            ...(tCourses || []).map((tc) => tc.courseId),
            ...(rawCourses || []).filter((c) => c.teacherId === teacherId).map((c) => c.id),
          ])
          const myCourses = (rawCourses || [])
            .filter((c) => myCourseIds.has(c.id))
            .map((c) => ({ ...c, subjectName: c.subjectName || subMap.get(c.subjectId) || '' }))

          const myBatches = (allBatches || []).filter(
            (b) => b.teacherId === teacherId || myCourseIds.has(b.courseId)
          )
          const myBatchIds = new Set(myBatches.map((b) => b.id))

          const [
            sections, lessons, enrollments, batchStudents, materials, lectures,
            liveClasses, assignments, quizzes, attendance, allStudents
          ] = await Promise.all([
            sectionsApi.list(),
            lessonsApi.list(),
            enrollmentsApi.list(),
            batchStudentsApi.list(),
            materialsApi.list((q) => q.eq('teacher_id', teacherId)),
            lecturesApi.list((q) => q.eq('teacher_id', teacherId)),
            liveClassesApi.list((q) => q.eq('teacher_id', teacherId)),
            assignmentsApi.list((q) => q.eq('teacher_id', teacherId)),
            quizzesApi.list((q) => q.eq('teacher_id', teacherId)),
            attendanceApi.list(),
            studentsApi.list(),
          ])
          if (!isMounted) return

          const filteredSections = (sections || []).filter((s) => myCourseIds.has(s.courseId))
          const filteredLessons = (lessons || []).filter((l) => myCourseIds.has(l.courseId))
          const filteredEnrollments = (enrollments || []).filter((e) => myCourseIds.has(e.courseId))
          const filteredBatchStudents = (batchStudents || []).filter((bs) => myBatchIds.has(bs.batchId))
          const myStudentIds = new Set([
            ...filteredEnrollments.map((e) => e.studentId),
            ...filteredBatchStudents.map((bs) => bs.studentId),
          ])
          const filteredStudents = (allStudents || []).filter((s) => myStudentIds.has(s.id))
          const filteredAttendance = (attendance || []).filter((a) => myBatchIds.has(a.batchId))

          const asgIds = new Set((assignments || []).map((a) => a.id))
          const quizIds = new Set((quizzes || []).map((q) => q.id))

          const [submissions, quizAttempts] = await Promise.all([
            submissionsApi.list(),
            quizAttemptsApi.list(),
          ])
          if (!isMounted) return

          const filteredSubmissions = (submissions || []).filter((s) => asgIds.has(s.assignmentId))
          const filteredQuizAttempts = (quizAttempts || []).filter((qa) => quizIds.has(qa.quizId))

          setDb((prev) => ({
            ...prev,
            courses: myCourses,
            subjects: subjects || [],
            teachers: teachers || [],
            teacherCourses: tCourses || [],
            batches: myBatches,
            batchStudents: filteredBatchStudents,
            students: filteredStudents,
            enrollments: filteredEnrollments,
            sections: filteredSections,
            lessons: filteredLessons,
            materials: materials || [],
            lectures: lectures || [],
            liveClasses: liveClasses || [],
            assignments: assignments || [],
            submissions: filteredSubmissions,
            quizzes: quizzes || [],
            quizAttempts: filteredQuizAttempts,
            attendance: filteredAttendance,
            announcements: ann || [],
            policies: policy || prev.policies,
          }))
          setLoading(false)
          return
        }

        if (user.role === 'student') {
          // Student: published catalog + own enrollments, progress, submissions, attempts, orders
          const studentId = user.id
          const [
            rawCourses, subjects, enrollments, batchStudents,
            submissions, quizAttempts, orders, announcements, teachers
          ] = await Promise.all([
            coursesApi.list(),
            subjectsApi.list(),
            enrollmentsApi.list((q) => q.eq('student_id', studentId)),
            batchStudentsApi.list((q) => q.eq('student_id', studentId)),
            submissionsApi.list((q) => q.eq('student_id', studentId)),
            quizAttemptsApi.list((q) => q.eq('student_id', studentId)),
            ordersApi.list((q) => q.eq('student_id', studentId)),
            announcementsApi.list(),
            teachersApi.list(),
          ])
          if (!isMounted) return

          const subMap = new Map((subjects || []).map((s) => [s.id, s.name]))
          const enrolledCourseIds = new Set((enrollments || []).map((e) => e.courseId))
          const enrolledBatchIds = new Set((batchStudents || []).map((bs) => bs.batchId))

          const visibleCourses = (rawCourses || [])
            .filter((c) => c.status === 'published' || enrolledCourseIds.has(c.id))
            .map((c) => ({ ...c, subjectName: c.subjectName || subMap.get(c.subjectId) || '' }))

          const [allBatches, sections, lessons, lessonProgress, liveClasses, lectures, materials, assignments, quizzes] = await Promise.all([
            batchesApi.list(),
            sectionsApi.list(),
            lessonsApi.list(),
            lessonProgressApi.list((q) => q.eq('student_id', studentId)),
            liveClassesApi.list(),
            lecturesApi.list(),
            materialsApi.list(),
            assignmentsApi.list(),
            quizzesApi.list(),
          ])
          if (!isMounted) return

          const studentBatches = (allBatches || []).filter(
            (b) => enrolledBatchIds.has(b.id) || enrolledCourseIds.has(b.courseId)
          )
          const studentLiveClasses = (liveClasses || []).filter((lc) => enrolledBatchIds.has(lc.batchId))
          const studentLectures = (lectures || []).filter((l) => enrolledCourseIds.has(l.courseId))
          const studentMaterials = (materials || []).filter((m) => enrolledCourseIds.has(m.courseId))
          const studentAssignments = (assignments || []).filter((a) => enrolledBatchIds.has(a.batchId))
          const studentQuizzes = (quizzes || []).filter(
            (q) => enrolledBatchIds.has(q.batchId) || enrolledCourseIds.has(q.courseId)
          )

          setDb((prev) => ({
            ...prev,
            courses: visibleCourses,
            subjects: subjects || [],
            teachers: teachers || [],
            batches: studentBatches,
            batchStudents: batchStudents || [],
            enrollments: enrollments || [],
            sections: sections || [],
            lessons: lessons || [],
            lessonProgress: lessonProgress || [],
            liveClasses: studentLiveClasses,
            lectures: studentLectures,
            materials: studentMaterials,
            assignments: studentAssignments,
            submissions: submissions || [],
            quizzes: studentQuizzes,
            quizAttempts: quizAttempts || [],
            orders: orders || [],
            announcements: announcements || [],
          }))
          setLoading(false)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load store data from Supabase:', err)
        setError(err.message || 'Error fetching data')
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [user, refreshIndex])

  const value = useMemo(() => {
    const isDemo = getMode() === 'demo'

    const list = (entity) => db[entity] || []
    const get = (entity, id) => (db[entity] || []).find((r) => r.id === id)

    const insert = async (entity, record) => {
      if (isDemo) {
        const row = { ...record, id: record.id || uid(entity.slice(0, 3)) }
        setDb((d) => ({ ...d, [entity]: [...(d[entity] || []), row] }))
        return row
      }
      const api = getEntityApi(entity)
      const saved = await api.insert(record)
      setDb((d) => ({ ...d, [entity]: [...(d[entity] || []), saved] }))
      return saved
    }

    const update = async (entity, id, patch) => {
      if (isDemo) {
        let updatedRow = null
        setDb((d) => {
          const arr = (d[entity] || []).map((r) => {
            if (r.id === id) {
              updatedRow = { ...r, ...patch }
              return updatedRow
            }
            return r
          })
          return { ...d, [entity]: arr }
        })
        return updatedRow
      }
      const api = getEntityApi(entity)
      const saved = await api.update(id, patch)
      setDb((d) => ({
        ...d,
        [entity]: (d[entity] || []).map((r) => (r.id === id ? saved : r)),
      }))
      return saved
    }

    const remove = async (entity, id) => {
      if (isDemo) {
        setDb((d) => ({ ...d, [entity]: (d[entity] || []).filter((r) => r.id !== id) }))
        return true
      }
      const api = getEntityApi(entity)
      await api.remove(id)
      setDb((d) => ({ ...d, [entity]: (d[entity] || []).filter((r) => r.id !== id) }))
      return true
    }

    const audit = async (action, entity, details) => {
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
      if (isDemo) {
        setDb((d) => ({ ...d, auditLogs: [entry, ...(d.auditLogs || [])] }))
        return entry
      }
      try {
        const saved = await auditLogsApi.insert({
          actorId: user?.id,
          actorName,
          action,
          entity,
          details,
        })
        setDb((d) => ({ ...d, auditLogs: [saved, ...(d.auditLogs || [])] }))
        return saved
      } catch (err) {
        console.error('Audit log failed:', err)
        return entry
      }
    }

    const resetDemo = () => {
      if (isDemo) setDb(buildDemoDB())
      else reload()
    }

    const markNotificationRead = (id) =>
      setDb((d) => ({
        ...d,
        notifications: (d.notifications || []).map((n) => (n.id === id ? { ...n, read: true } : n)),
      }))

    const markAllNotificationsRead = () =>
      setDb((d) => ({
        ...d,
        notifications: (d.notifications || []).map((n) => ({ ...n, read: true })),
      }))

    const updatePolicy = async (patch) => {
      if (isDemo) {
        setDb((d) => ({ ...d, policies: { ...d.policies, ...patch } }))
        return { ...db.policies, ...patch }
      }
      const policyId = db.policies?.id
      if (policyId) {
        const saved = await policiesApi.updatePolicy(policyId, patch)
        setDb((d) => ({ ...d, policies: { ...d.policies, ...saved } }))
        return saved
      } else {
        const saved = await policiesApi.insert(patch)
        setDb((d) => ({ ...d, policies: { ...d.policies, ...saved } }))
        return saved
      }
    }

    return {
      db,
      loading,
      error,
      reload,
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
      isDemo,
      // Helper getters
      courseById: (id) => (db.courses || []).find((c) => c.id === id),
      studentById: (id) => (db.students || []).find((s) => s.id === id),
      teacherById: (id) => (db.teachers || []).find((t) => t.id === id),
      batchById: (id) => (db.batches || []).find((b) => b.id === id),
      coursesForTeacher: (teacherId) => {
        const links = (db.teacherCourses || []).filter((tc) => tc.teacherId === teacherId)
        const linkCourses = links.map((l) => (db.courses || []).find((c) => c.id === l.courseId)).filter(Boolean)
        const directCourses = (db.courses || []).filter((c) => c.teacherId === teacherId)
        const all = [...linkCourses, ...directCourses]
        return Array.from(new Map(all.map((c) => [c.id, c])).values())
      },
      batchesForTeacher: (teacherId) => (db.batches || []).filter((b) => b.teacherId === teacherId),
      studentsInCourse: (courseId) => {
        const ids = new Set((db.enrollments || []).filter((e) => e.courseId === courseId).map((e) => e.studentId))
        return (db.students || []).filter((s) => ids.has(s.id))
      },
      studentsInBatch: (batchId) => {
        const ids = new Set((db.batchStudents || []).filter((bs) => bs.batchId === batchId).map((bs) => bs.studentId))
        return (db.students || []).filter((s) => ids.has(s.id))
      },
      teacherIdForUser: (userId) => (db.teachers || []).find((t) => t.userId === userId || t.id === userId)?.id,
      studentByIdFromUser: (userId) => (db.students || []).find((s) => s.userId === userId || s.id === userId),
    }
  }, [db, loading, error, reload, user])

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData() {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
