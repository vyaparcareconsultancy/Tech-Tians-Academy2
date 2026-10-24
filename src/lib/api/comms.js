import { supabase } from '../supabase.js'
import { createTableCrud, toCamel, toSnake } from './helpers.js'

export const announcementsApi = createTableCrud('announcements')

export const auditLogsApi = createTableCrud('audit_logs')

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
