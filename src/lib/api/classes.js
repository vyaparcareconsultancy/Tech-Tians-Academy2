import { supabase } from '../supabase.js'
import { createTableCrud } from './helpers.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const liveClassesApi = createTableCrud('live_classes', {
  toDb: (data) => {
    const out = { ...data }
    if (out.teacherId === '') out.teacherId = null
    if (out.batchId === '') out.batchId = null
    if (out.durationMin !== undefined) out.durationMin = Number(out.durationMin) || 0
    if (out.createdBy && !UUID_REGEX.test(out.createdBy)) out.createdBy = null
    delete out.course
    delete out.batch
    delete out.teacher
    return out
  },
})

export const lecturesApi = createTableCrud('recorded_lectures', {
  toDb: (data) => {
    const out = { ...data }
    if (out.teacherId === '') out.teacherId = null
    if (out.sectionId === '') out.sectionId = null
    if (out.durationMin !== undefined) out.durationMin = Number(out.durationMin) || 0
    if (out.order !== undefined) out.order = Number(out.order) || 0
    delete out.sectionName
    delete out.course
    delete out.teacher
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
    if (out.teacherId === '') out.teacherId = null
    if (out.courseId === '') out.courseId = null
    if (out.downloads !== undefined) out.downloads = Number(out.downloads) || 0
    return out
  },
})

export const attendanceApi = {
  ...createTableCrud('attendance_records'),
  upsert: async (batchIdOrObj, studentId, date, status) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    const bId = typeof batchIdOrObj === 'object' ? batchIdOrObj.batchId : batchIdOrObj
    const sId = typeof batchIdOrObj === 'object' ? batchIdOrObj.studentId : studentId
    const d = typeof batchIdOrObj === 'object' ? batchIdOrObj.date : date
    const st = typeof batchIdOrObj === 'object' ? batchIdOrObj.status : status
    const { error } = await supabase.rpc('upsert_attendance', {
      p_batch_id: bId,
      p_student_id: sId,
      p_date: d,
      p_status: st,
    })
    if (error) throw new Error(error.message)
    return { batchId: bId, studentId: sId, date: d, status: st }
  },
}

export const list = liveClassesApi.list
export const get = liveClassesApi.get
export const insert = liveClassesApi.insert
export const update = liveClassesApi.update
export const remove = liveClassesApi.remove
