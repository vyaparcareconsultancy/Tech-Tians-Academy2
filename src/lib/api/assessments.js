import { createTableCrud } from './helpers.js'

export const assignmentsApi = createTableCrud('assignments', {
  toDb: (data) => {
    const out = { ...data }
    if (out.teacherId === '') out.teacherId = null
    if (out.batchId === '') out.batchId = null
    if (out.maxMarks !== undefined) out.maxMarks = Number(out.maxMarks) || 0
    delete out.submissions
    delete out.course
    delete out.batch
    delete out.teacher
    return out
  },
})

export const submissionsApi = createTableCrud('assignment_submissions', {
  toDb: (data) => {
    const out = { ...data }
    if (out.marks !== undefined && out.marks !== null) out.marks = Number(out.marks)
    return out
  },
})

export const quizzesApi = createTableCrud('quizzes', {
  toDb: (data) => {
    const out = { ...data }
    if (out.teacherId === '') out.teacherId = null
    if (out.batchId === '') out.batchId = null
    if (out.timeLimitMin !== undefined) out.timeLimitMin = Number(out.timeLimitMin) || 0
    if (out.totalMarks !== undefined) out.totalMarks = Number(out.totalMarks) || 0
    if (out.maxAttempts !== undefined) out.maxAttempts = Number(out.maxAttempts) || 1
    delete out.course
    delete out.batch
    delete out.teacher
    delete out.attempts
    return out
  },
})

export const quizQuestionsApi = createTableCrud('quiz_questions')

export const quizAttemptsApi = createTableCrud('quiz_attempts', {
  fromDb: (base, raw) => {
    if (!base) return null
    return {
      ...base,
      maxScore: raw.max_score != null ? raw.max_score : base.maxScore,
    }
  },
  toDb: (data) => {
    const out = { ...data }
    if (out.maxScore !== undefined) {
      out.max_score = Number(out.maxScore) || 0
      delete out.maxScore
    }
    if (out.score !== undefined) out.score = Number(out.score) || 0
    return out
  },
})

export const list = assignmentsApi.list
export const get = assignmentsApi.get
export const insert = assignmentsApi.insert
export const update = assignmentsApi.update
export const remove = assignmentsApi.remove
