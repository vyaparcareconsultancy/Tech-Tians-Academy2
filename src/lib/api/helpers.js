import { supabase } from '../supabase.js'

export function snakeToCamel(str) {
  return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase())
}

export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

export function toCamel(obj, customMap = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    const mappedKey = customMap[k] || snakeToCamel(k)
    // Don't recurse into Date, Blob, arrays (unless arrays of objects)
    out[mappedKey] = v
  }
  return out
}

export function toSnake(obj, customMap = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    // skip undefined
    if (v === undefined) continue
    const mappedKey = customMap[k] || camelToSnake(k)
    out[mappedKey] = v
  }
  return out
}

/**
 * Creates standard async CRUD methods for a Supabase table.
 * All DB interaction goes through these methods.
 */
export function createTableCrud(tableName, { fromDb, toDb, idKey = 'id' } = {}) {
  const transformRow = (row) => {
    if (!row) return null
    const base = toCamel(row)
    return fromDb ? fromDb(base, row) : base
  }

  const transformInput = (data) => {
    if (!data) return {}
    const pre = toDb ? toDb(data) : data
    return toSnake(pre)
  }

  return {
    tableName,
    list: async (buildQuery) => {
      if (!supabase) return []
      let query = supabase.from(tableName).select('*')
      if (typeof buildQuery === 'function') {
        query = buildQuery(query)
      } else if (buildQuery && typeof buildQuery === 'object') {
        for (const [k, v] of Object.entries(buildQuery)) {
          if (v !== undefined) query = query.eq(camelToSnake(k), v)
        }
      }
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []).map(transformRow)
    },

    get: async (id) => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(idKey, id)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return transformRow(data)
    },

    insert: async (record) => {
      if (!supabase) throw new Error('Supabase client not initialized')
      const payload = transformInput(record)
      const { data, error } = await supabase
        .from(tableName)
        .insert(payload)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return transformRow(data)
    },

    update: async (id, patch) => {
      if (!supabase) throw new Error('Supabase client not initialized')
      const payload = transformInput(patch)
      // Do not allow updating primary key id
      delete payload.id
      const { data, error } = await supabase
        .from(tableName)
        .update(payload)
        .eq(idKey, id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return transformRow(data)
    },

    remove: async (id) => {
      if (!supabase) throw new Error('Supabase client not initialized')
      const { error } = await supabase.from(tableName).delete().eq(idKey, id)
      if (error) throw new Error(error.message)
      return true
    },
  }
}
