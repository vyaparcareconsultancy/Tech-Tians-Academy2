import { supabase } from '../supabase.js'
import { toCamel } from './helpers.js'

export const reportsApi = {
  getAdminDashboardKpis: async () => {
    if (!supabase) return null
    const { data, error } = await supabase.rpc('get_admin_dashboard_kpis')
    if (error) throw new Error(error.message)
    return toCamel(data)
  },

  getMonthlyMetrics: async (months = 12) => {
    if (!supabase) return []
    const { data, error } = await supabase.rpc('get_monthly_metrics', { p_months: months })
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamel(row))
  },

  getCoursePerformance: async () => {
    if (!supabase) return []
    const { data, error } = await supabase.rpc('get_course_performance')
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamel(row))
  },

  getProgressDistribution: async () => {
    if (!supabase) return []
    const { data, error } = await supabase.rpc('get_progress_distribution')
    if (error) throw new Error(error.message)
    return (data || []).map((row) => ({
      name: row.band,
      value: Number(row.value) || 0,
    }))
  },

  getTeacherLeaderboard: async () => {
    if (!supabase) return []
    const { data, error } = await supabase.rpc('get_teacher_leaderboard')
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamel(row))
  },
}
