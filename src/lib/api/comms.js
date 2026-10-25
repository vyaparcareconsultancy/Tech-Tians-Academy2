import { supabase } from '../supabase.js'
import { createTableCrud, toCamel, toSnake } from './helpers.js'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const announcementsApi = createTableCrud('announcements', {
  fromDb: (base, raw) => {
    if (!base) return null
    return {
      ...base,
      createdBy: raw.created_by || raw.author_id || base.createdBy || '',
    }
  },
  toDb: (data) => {
    const out = { ...data }
    if (out.batchId === '') out.batchId = null
    const creator = out.createdBy && UUID_REGEX.test(out.createdBy) ? out.createdBy : null
    out.createdBy = creator
    out.authorId = creator
    return out
  },
})

export const auditLogsApi = createTableCrud('audit_logs', {
  toDb: (data) => {
    const out = { ...data }
    if (out.actorId && !UUID_REGEX.test(out.actorId)) out.actorId = null
    return out
  },
})

export const policiesApi = {
  ...createTableCrud('platform_policies'),
  getPolicy: async () => {
    if (!supabase) return null
    const { data, error } = await supabase
      .from('platform_policies')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return toCamel(data)
  },
  updatePolicy: async (id, patch) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    const payload = toSnake(patch)
    delete payload.id
    const { data, error } = await supabase
      .from('platform_policies')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamel(data)
  },
}

export const list = announcementsApi.list
export const get = announcementsApi.get
export const insert = announcementsApi.insert
export const update = announcementsApi.update
export const remove = announcementsApi.remove
