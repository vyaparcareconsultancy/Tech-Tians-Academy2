import { createTableCrud } from './helpers.js'

export const liveClassesApi = createTableCrud('live_classes')

export const lecturesApi = createTableCrud('recorded_lectures', {
  toDb: (data) => {
    const out = { ...data }
    delete out.sectionName
    return out
  },
})

export const materialsApi = createTableCrud('study_materials', {
  fromDb: (base, raw) => {
    if (!base) return null
    return {
      ...base,
      sizeMB: raw.size_mb != null ? String(raw.size_mb) : '0.0',
    }
  },
  toDb: (data) => {
    const out = { ...data }
    if (out.sizeMB !== undefined) {
      out.size_mb = Number(out.sizeMB) || 0
      delete out.sizeMB
    }
    return out
  },
})

export const attendanceApi = createTableCrud('attendance_records')

export const list = liveClassesApi.list
export const get = liveClassesApi.get
export const insert = liveClassesApi.insert
export const update = liveClassesApi.update
export const remove = liveClassesApi.remove
