import { profilesApi, studentsApi, teachersApi } from './profiles.js'
import { subjectsApi, coursesApi, sectionsApi, lessonsApi, teacherCoursesApi } from './catalog.js'
import { batchesApi, batchStudentsApi } from './batches.js'
import { liveClassesApi, lecturesApi, materialsApi, attendanceApi } from './classes.js'
import { assignmentsApi, submissionsApi, quizzesApi, quizQuestionsApi, quizAttemptsApi } from './assessments.js'
import { ordersApi, paymentsApi, couponsApi, enrollmentsApi, lessonProgressApi } from './commerce.js'
import { announcementsApi, auditLogsApi, policiesApi } from './comms.js'
import { storageApi } from './storage.js'

export * from './helpers.js'
export * from './profiles.js'
export * from './catalog.js'
export * from './batches.js'
export * from './classes.js'
export * from './assessments.js'
export * from './commerce.js'
export * from './comms.js'
export * from './reports.js'
export * from './storage.js'

export const ENTITY_API_MAP = {
  storage: storageApi,
  profiles: profilesApi,
  students: studentsApi,
  teachers: teachersApi,
  subjects: subjectsApi,
  courses: coursesApi,
  sections: sectionsApi,
  lessons: lessonsApi,
  teacherCourses: teacherCoursesApi,
  batches: batchesApi,
  batchStudents: batchStudentsApi,
  liveClasses: liveClassesApi,
  lectures: lecturesApi,
  materials: materialsApi,
  attendance: attendanceApi,
  assignments: assignmentsApi,
  submissions: submissionsApi,
  quizzes: quizzesApi,
  quizQuestions: quizQuestionsApi,
  quizAttempts: quizAttemptsApi,
  orders: ordersApi,
  payments: paymentsApi,
  coupons: couponsApi,
  enrollments: enrollmentsApi,
  lessonProgress: lessonProgressApi,
  announcements: announcementsApi,
  auditLogs: auditLogsApi,
  policies: policiesApi,
}

export function getEntityApi(entity) {
  const api = ENTITY_API_MAP[entity]
  if (!api) {
    throw new Error(`No API client mapped for entity: "${entity}"`)
  }
  return api
}
