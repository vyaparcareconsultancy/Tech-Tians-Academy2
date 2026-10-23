import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BookOpen, Play, Search, ArrowRight
} from 'lucide-react'
import { useAuth } from '../../lib/auth.jsx'
import { useData } from '../../lib/store.jsx'
import { Badge, Button } from '../../components/ui.jsx'

export default function MyCourses() {
  const { user } = useAuth()
  const { db } = useData()
  const navigate = useNavigate()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all, in-progress, completed

  // Student
  const student = useMemo(() => {
    return (
      (db.students || []).find((s) => s.userId === user?.id || s.id === user?.profileId) ||
      (db.students || [])[0] || { id: 'stu-1001', name: 'Rohan Verma' }
    )
  }, [db.students, user])

  // Enrollments
  const enrollments = useMemo(() => {
    return (db.enrollments || []).filter((e) => e.studentId === student.id)
  }, [db.enrollments, student.id])

  // Enrolled courses with calculated progress
  const enrolledCourses = useMemo(() => {
    const list = enrollments
      .map((e, idx) => {
        const course = (db.courses || []).find((c) => c.id === e.courseId)
        if (!course) return null

        const courseLessons = (db.lessons || []).filter((l) => l.courseId === course.id)
        const totalLessons = courseLessons.length || 18

        // Deterministic progress based on index
        const progressValues = [68, 45, 82, 100, 30]
        const progress = progressValues[idx % progressValues.length]
        const completedLessons = Math.round((progress / 100) * totalLessons)

        return {
          ...course,
          enrolledAt: e.enrolledAt,
          progress,
          totalLessons,
          completedLessons,
          isCompleted: progress >= 100,
        }
      })
      .filter(Boolean)

    // Fallback if no enrollments
    if (list.length === 0 && db.courses && db.courses.length > 0) {
      return db.courses.slice(0, 3).map((c, idx) => ({
        ...c,
        progress: idx === 0 ? 68 : 45,
        totalLessons: 18,
        completedLessons: idx === 0 ? 12 : 8,
        isCompleted: false,
      }))
    }

    return list
  }, [enrollments, db.courses, db.lessons])

  // Filtered courses
  const filteredCourses = useMemo(() => {
    return enrolledCourses.filter((c) => {
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subjectName.toLowerCase().includes(searchQuery.toLowerCase())

      if (!matchesSearch) return false

      if (activeTab === 'in-progress') return !c.isCompleted
      if (activeTab === 'completed') return c.isCompleted
      return true
    })
  }, [enrolledCourses, searchQuery, activeTab])

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            My Courses
          </h1>
          <p className="text-sm text-muted">
            Track your ongoing curriculum, resume video lectures, and master key topics.
          </p>
        </div>

        <Button variant="ghost" asChild>
          <Link to="/courses" className="gap-2">
            <span>Browse more courses</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-base glass p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-void/60 border border-white/5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Courses', count: enrolledCourses.length },
            { id: 'in-progress', label: 'In Progress', count: enrolledCourses.filter((c) => !c.isCompleted).length },
            { id: 'completed', label: 'Completed', count: enrolledCourses.filter((c) => c.isCompleted).length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? 'bg-brand text-void font-bold shadow-glow'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1.5 opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search enrolled courses…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-surface/70 border border-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="card-base glass group flex flex-col justify-between overflow-hidden border border-white/10 hover:border-brand/40 hover:shadow-card-hover transition-all duration-300"
            >
              {/* Card Header Banner */}
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="primary" className="font-mono text-[10px] uppercase">
                    {course.subjectName}
                  </Badge>
                  <span className="font-mono text-xs text-muted">
                    {course.targetExam || 'Competitive Prep'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-brand transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-xs text-muted line-clamp-2">
                    {course.description || 'Comprehensive video lectures, assignments and test series.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted pt-1">
                  <span className="text-white font-medium">{course.teacherName}</span>
                </div>
              </div>

              {/* Progress Section */}
              <div className="p-6 pt-0 space-y-4">
                <div className="space-y-1.5 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-muted">
                      {course.completedLessons} of {course.totalLessons} lessons
                    </span>
                    <span className="text-white font-bold">{course.progress}%</span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-gold transition-all duration-500"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>

                {/* Card Actions */}
                <Button
                  variant="primary"
                  className="w-full gap-2 shadow-glow"
                  onClick={() => navigate(`/student/learn/${course.id}`)}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>{course.progress > 0 ? 'Continue learning' : 'Start learning'}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-base glass p-12 text-center space-y-4 border border-white/10">
          <BookOpen className="h-10 w-10 text-muted mx-auto" />
          <h3 className="font-heading text-base font-semibold text-white">No courses found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {searchQuery
              ? `No enrolled courses match "${searchQuery}". Try a different search term.`
              : 'You have not enrolled in any courses in this category yet.'}
          </p>
          <Button variant="ghost" asChild>
            <Link to="/courses">Explore Academy Catalog</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
