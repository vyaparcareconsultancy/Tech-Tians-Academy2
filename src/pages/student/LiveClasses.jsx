import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock, Play, Radio, Users, ArrowUpRight
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { isDemoMode } from '../../lib/supabase.js'
import { Badge, Button } from '../../components/ui.jsx'
import { formatDate } from '../../lib/utils.js'

export default function LiveClasses() {
  const { user } = useAuth()
  const { db } = useData()
  const isDemo = isDemoMode

  // Find student & batches
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId || s.id === user?.id) ||
      (db.students || [])[0] || { id: user?.id || 'stu-1001', name: user?.fullName || 'Student' }
    )
  }, [db.students, user])

  const studentBatchIds = useMemo(() => {
    const list = (db.batchStudents || [])
      .filter((bs) => bs.studentId === student?.id || bs.studentId === user?.id)
      .map((bs) => bs.batchId)
    return new Set(list)
  }, [db.batchStudents, student?.id, user?.id])

  const allClasses = useMemo(() => {
    if (studentBatchIds.size > 0) {
      return (db.liveClasses || []).filter((lc) => studentBatchIds.has(lc.batchId))
    }
    // In demo mode with no enrolled batches found, allow viewing demo classes
    return isDemo ? (db.liveClasses || []) : []
  }, [db.liveClasses, studentBatchIds, isDemo])

  // Split into live, upcoming, past
  const liveNow = useMemo(() => {
    return allClasses.find((c) => c.status === 'live') || null
  }, [allClasses])

  const upcomingClasses = useMemo(() => {
    return allClasses.filter((c) => c.id !== liveNow?.id && c.status !== 'completed' && c.status !== 'live')
  }, [allClasses, liveNow])

  const pastClasses = useMemo(() => {
    return allClasses.filter((c) => c.status === 'completed')
  }, [allClasses])

  // Countdown timer for next/live class
  const targetClass = liveNow || upcomingClasses[0] || null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const formattedCountdown = useMemo(() => {
    if (!targetClass?.scheduledAt) return targetClass?.status === 'live' ? 'LIVE NOW' : '--:--:--'
    const diff = Math.max(0, Math.floor((new Date(targetClass.scheduledAt).getTime() - now) / 1000))
    if (diff <= 0 && targetClass.status === 'live') {
      return 'LIVE NOW'
    }
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [targetClass, now])

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Live Interactive Classes
        </h1>
        <p className="text-sm text-muted">
          Join real-time lecture streams, interactive problem-solving marathons, and faculty Q&A.
        </p>
      </div>

      {/* Featured Live Room Banner */}
      {liveNow && (
        <div className="relative overflow-hidden rounded-2xl border border-brand/50 bg-gradient-to-br from-surface via-surface/90 to-brand/10 p-6 sm:p-8 shadow-[0_0_40px_rgba(247,147,26,0.15)]">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-radial-gradient from-brand/20 to-transparent blur-2xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {/* Live badge with ping dot */}
                <span className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-red-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                  </span>
                  Streaming Live Now
                </span>
                <Badge variant="primary" className="font-mono text-xs">
                  {liveNow.batchName || 'Live Session'}
                </Badge>
              </div>

              <h2 className="font-heading text-xl sm:text-2xl font-bold text-white">
                {liveNow.title}
              </h2>

              <p className="text-sm text-muted max-w-2xl">
                Advanced live seminar: High-yield problem breakdown, shortcut derivation techniques, and live chat doubt resolution with faculty.
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-muted pt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-gold" />
                  <span>Duration: {liveNow.durationMin || 90} mins</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-brand" />
                  <span>Interactive class room</span>
                </span>
              </div>
            </div>

            {/* Right side: Countdown & Join */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-4 shrink-0">
              <div className="rounded-xl border border-white/10 bg-void/60 p-4 text-right">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-muted">
                  Session Clock
                </span>
                <span className="block font-mono text-2xl font-bold text-gold">
                  {formattedCountdown}
                </span>
              </div>

              <Button
                variant="primary"
                size="lg"
                asChild
                className="gap-2 shadow-glow w-full sm:w-auto"
              >
                <a
                  href={liveNow.meetingUrl || 'https://meet.techtians.academy/live-session'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Radio className="h-4 w-4 animate-pulse text-void" />
                  <span>Enter Live Classroom</span>
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Schedule */}
      <div className="space-y-4">
        <h3 className="font-heading text-lg font-semibold text-white">
          Upcoming Schedule
        </h3>

        {upcomingClasses.length === 0 ? (
          <div className="card-base glass p-8 text-center space-y-2 border border-white/10">
            <p className="font-heading text-base font-medium text-white">No upcoming live classes scheduled</p>
            <p className="text-xs text-muted">
              Your instructors will post upcoming batch schedule and live room links here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingClasses.map((item) => (
              <div
                key={item.id}
                className="card-base glass p-5 space-y-4 border border-white/10 hover:border-brand/30 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <Badge variant="default" className="font-mono text-[10px] uppercase">
                      {item.batchName || 'Live Class'}
                    </Badge>
                    <h4 className="font-heading text-base font-semibold text-white">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-surface/80 px-2.5 py-1 font-mono text-xs text-gold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{item.durationMin || 60}m</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="block font-mono text-muted text-[11px]">
                      {formatDate(item.scheduledAt || new Date().toISOString())}
                    </span>
                    <span className="block text-white/80">Batch Live Stream</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="gap-1.5 text-xs font-mono"
                  >
                    <a href={item.meetingUrl || '#'} target="_blank" rel="noopener noreferrer">
                      <span>Class link</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past Class Recordings */}
      <div className="space-y-4 pt-4">
        <h3 className="font-heading text-lg font-semibold text-white">
          Class Archive & Replays
        </h3>

        {pastClasses.length === 0 ? (
          <div className="card-base glass p-8 text-center space-y-2 border border-white/10">
            <p className="font-heading text-base font-medium text-white">No recorded lectures yet</p>
            <p className="text-xs text-muted">
              Past class recordings and replays will be archived here after live sessions conclude.
            </p>
          </div>
        ) : (
          <div className="card-base glass overflow-hidden">
            <div className="divide-y divide-white/5">
              {pastClasses.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted border border-white/10">
                      <Play className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-heading text-sm font-semibold text-white">
                        {item.title}
                      </h4>
                      <p className="text-xs font-mono text-muted">
                        Conducted on {formatDate(item.scheduledAt || new Date().toISOString())} • {item.durationMin || 90} mins
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="success" className="font-mono text-[10px]">
                      Recording Available
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-1.5">
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Watch replay</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
