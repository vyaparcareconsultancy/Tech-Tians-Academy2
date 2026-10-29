import { createTableCrud } from './helpers.js'

export const subjectsApi = createTableCrud('subjects')

export const coursesApi = createTableCrud('courses', {
  fromDb: (base, raw) => {
    if (!base) return null
    return {
      ...base,
      subjectName: raw.subjects?.name || base.subjectName || '',
    }
  },
  toDb: (data) => {
    const out = { ...data }
    if (out.teacherId === '') out.teacherId = null
    if (out.subjectId === '') out.subjectId = null
    if (out.price !== undefined) out.price = Number(out.price) || 0
    if (out.durationHours !== undefined) out.durationHours = Number(out.durationHours) || 0
    if (out.coverIndex !== undefined) out.coverIndex = Number(out.coverIndex) || 0
    delete out.subjectName
    delete out.subjects
    delete out.totalStudents
    delete out.lessonsCount
    delete out.enrolledCount
    delete out.batchesCount
    return out
  },
})

export const sectionsApi = createTableCrud('course_sections', {
  toDb: (data) => {
    const out = { ...data }
    if (out.order !== undefined) out.order = Number(out.order) || 0
    return out
  },
})

export const lessonsApi = createTableCrud('lessons', {
  toDb: (data) => {
    const out = { ...data }
    if (out.order !== undefined) out.order = Number(out.order) || 0
    if (out.durationMin !== undefined) out.durationMin = Number(out.durationMin) || 0
    if (out.sectionId === '') out.sectionId = null
    delete out.sectionName
    return out
  },
})

export const teacherCoursesApi = createTableCrud('teacher_courses')

// Primary exports for catalog
export const list = coursesApi.list
export const get = coursesApi.get
export const insert = coursesApi.insert
export const update = coursesApi.update
export const remove = coursesApi.remove
