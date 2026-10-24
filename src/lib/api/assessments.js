import { createTableCrud } from './helpers.js'

export const assignmentsApi = createTableCrud('assignments')

export const submissionsApi = createTableCrud('assignment_submissions')

export const quizzesApi = createTableCrud('quizzes')

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
      out.max_score = out.maxScore
      delete out.maxScore
    }
    return out
  },
})

export const list = assignmentsApi.list
export const get = assignmentsApi.get
export const insert = assignmentsApi.insert
export const update = assignmentsApi.update
export const remove = assignmentsApi.remove
