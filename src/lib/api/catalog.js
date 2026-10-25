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
    delete out.subjectName
    delete out.subjects
    return out
  },
})

export const sectionsApi = createTableCrud('course_sections', {
  toDb: (data) => {
    const out = { ...data }
    return out
  },
})

export const lessonsApi = createTableCrud('lessons')

export const teacherCoursesApi = createTableCrud('teacher_courses')

// Primary exports for catalog
export const list = coursesApi.list
export const get = coursesApi.get
export const insert = coursesApi.insert
export const update = coursesApi.update
export const remove = coursesApi.remove
