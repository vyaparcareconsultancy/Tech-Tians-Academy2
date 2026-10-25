import { supabase } from '../supabase.js'
import { createTableCrud, toCamel } from './helpers.js'

function fromDbProfile(base, raw) {
  if (!base) return null
  return {
    ...base,
    userId: base.id,
    name: raw.full_name || base.name || '',
    studentId: raw.student_id || base.studentId || '',
    enrolledAt: raw.created_at,
    joinedAt: raw.created_at,
    lastActiveAt: raw.last_active_at || raw.created_at,
    totalStudents: 0,
  }
}

function toDbProfile(data) {
  const out = { ...data }
  if (out.name !== undefined) {
    out.fullName = out.name
    delete out.name
  }
  delete out.userId
  delete out.enrolledAt
  delete out.joinedAt
  delete out.totalStudents
  return out
}

export const profilesApi = createTableCrud('profiles', {
  fromDb: fromDbProfile,
  toDb: toDbProfile,
})

export const studentsApi = {
  list: async (queryFilter) => {
    return profilesApi.list((q) => {
      let query = q.eq('role', 'student')
      if (typeof queryFilter === 'function') query = queryFilter(query)
      return query
    })
  },
  get: async (id) => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'student')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return fromDbProfile(toCamel(data), data)
  },
  insert: async (record) => {
    return profilesApi.insert({ ...record, role: 'student' })
  },
  update: async (id, patch) => {
    return profilesApi.update(id, patch)
  },
  remove: async (id) => {
    return profilesApi.remove(id)
  },
}

export const teachersApi = {
  list: async (queryFilter) => {
    return profilesApi.list((q) => {
      let query = q.eq('role', 'teacher')
      if (typeof queryFilter === 'function') query = queryFilter(query)
      return query
    })
  },
  get: async (id) => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .eq('role', 'teacher')
      .maybeSingle()
    if (error) throw new Error(error.message)
    return fromDbProfile(toCamel(data), data)
  },
  insert: async (record) => {
    return profilesApi.insert({ ...record, role: 'teacher' })
  },
  update: async (id, patch) => {
    return profilesApi.update(id, patch)
  },
  remove: async (id) => {
    return profilesApi.remove(id)
  },
}

export const list = profilesApi.list
export const get = profilesApi.get
export const insert = profilesApi.insert
export const update = profilesApi.update
export const remove = profilesApi.remove
