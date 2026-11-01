import { supabase, isDemoMode } from '../supabase.js'
import { toCamel } from './helpers.js'

/**
 * List the signed-in user's notifications, newest first.
 *
 * @param {number} [limit=30]
 * @returns {Promise<Array<object>>}
 */
export async function listMyNotifications(limit = 30) {
  if (isDemoMode || !supabase) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data || []).map((r) => toCamel(r))
}

/**
 * Mark a single notification as read.
 *
 * @param {string} id
 */
export async function markRead(id) {
  if (isDemoMode || !supabase) return
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw new Error(error.message)
}

/**
 * Mark all of the user's notifications as read.
 */
export async function markAllRead() {
  if (isDemoMode || !supabase) return
  const { error } = await supabase.from('notifications').update({ read: true }).eq('read', false)
  if (error) throw new Error(error.message)
}

/**
 * Subscribe to realtime inserts for a user's notifications.
 * Returns an unsubscribe function.
 *
 * @param {string} userId
 * @param {(notification: object) => void} onInsert
 * @returns {() => void}
 */
export function subscribe(userId, onInsert) {
  if (isDemoMode || !supabase || !userId) return () => {}
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert?.(toCamel(payload.new)),
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}

export const notificationsApi = {
  listMyNotifications,
  markRead,
  markAllRead,
  subscribe,
}
