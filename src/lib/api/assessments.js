import { supabase } from '../supabase.js'
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

export async function startQuiz(quizId) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('start_quiz', {
    p_quiz_id: quizId,
  })
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    attemptId: data.attempt_id,
    quizId: data.quiz_id,
    title: data.title,
    timeLimitMin: data.time_limit_min,
    startedAt: data.started_at,
    totalMarks: data.total_marks,
    questions: data.questions || [],
  }
}

export async function submitQuiz(attemptId, answers) {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('submit_quiz', {
    p_attempt_id: attemptId,
    p_answers: answers,
  })
  if (error) throw new Error(error.message)
  if (!data) return null
  return {
    score: data.score,
    total: data.total,
    correctCount: data.correct_count,
    totalQuestions: data.total_questions,
    percentage: data.percentage,
    passed: data.passed,
    late: data.late,
    resultsPublished: data.results_published,
    correctAnswers: data.correct_answers || null,
  }
}

quizzesApi.startQuiz = startQuiz
quizzesApi.submitQuiz = submitQuiz

// Students cannot SELECT quizzes directly (rows hold the answers). This RPC
// returns only safe metadata for published quizzes of the caller's courses.
export async function listStudentQuizzes() {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('list_student_quizzes')
  if (error) throw new Error(error.message)
  return (data || []).map((r) => ({
    id: r.id,
    courseId: r.course_id,
    batchId: r.batch_id,
    teacherId: r.teacher_id,
    title: r.title,
    timeLimitMin: r.time_limit_min,
    totalMarks: r.total_marks,
    maxAttempts: r.max_attempts,
    status: r.status,
    resultsPublished: r.results_published,
    createdAt: r.created_at,
    questionCount: r.question_count,
    questions: [],
  }))
}

quizzesApi.listForStudent = listStudentQuizzes
