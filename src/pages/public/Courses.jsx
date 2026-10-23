import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Clock, Star, BookOpen, ArrowRight, RotateCcw,
  Sparkles
} from 'lucide-react'
import { useData } from '../../lib/store.jsx'
import { Badge, Button } from '../../components/ui.jsx'
import { cx } from '../../lib/utils.js'

export default function Courses() {
  const navigate = useNavigate()
  const { db } = useData()

  const [search, setSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [selectedPrice, setSelectedPrice] = useState('All')
  const [sortBy, setSortBy] = useState('popular')

  // Base published courses
  const allCourses = useMemo(() => {
    return (db.courses || []).filter((c) => c.status === 'published')
  }, [db.courses])

  // Unique subjects list
  const subjectsList = useMemo(() => {
    const names = new Set(allCourses.map((c) => c.subjectName).filter(Boolean))
    return ['All', ...Array.from(names)]
  }, [allCourses])

  const levelsList = ['All', 'Beginner', 'Intermediate', 'Advanced']
  const pricesList = ['All', 'Paid', 'Free']

  // Filtered and sorted courses
  const filteredCourses = useMemo(() => {
    let list = allCourses.filter((course) => {
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchTitle = course.title?.toLowerCase().includes(q)
        const matchDesc = course.description?.toLowerCase().includes(q)
        const matchSubject = course.subjectName?.toLowerCase().includes(q)
        const matchCat = course.category?.toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchSubject && !matchCat) return false
      }

      // Subject
      if (selectedSubject !== 'All' && course.subjectName !== selectedSubject) {
        return false
      }

      // Level
      if (selectedLevel !== 'All' && course.level !== selectedLevel) {
        return false
      }

      // Price
      if (selectedPrice === 'Free' && course.price > 0) return false
      if (selectedPrice === 'Paid' && course.price === 0) return false

      return true
    })

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'duration-asc') return a.durationHours - b.durationHours
      if (sortBy === 'duration-desc') return b.durationHours - a.durationHours
      // Default: popular (by rating)
      const rA = parseFloat(a.rating) || 0
      const rB = parseFloat(b.rating) || 0
      return rB - rA
    })

    return list
  }, [allCourses, search, selectedSubject, selectedLevel, selectedPrice, sortBy])

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedSubject !== 'All' ||
    selectedLevel !== 'All' ||
    selectedPrice !== 'All'

  const resetFilters = () => {
    setSearch('')
    setSelectedSubject('All')
    setSelectedLevel('All')
    setSelectedPrice('All')
    setSortBy('popular')
  }

  return (
    <div className="w-full bg-void min-h-screen">
      {/* ------------------------------------------------------------ */}
      {/* Hero Strip with Search & Filters                             */}
      {/* ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-white/10 bg-surface/50 py-16 sm:py-20">
        {/* Background grid */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="glow-blob -top-24 left-1/3 h-80 w-80 bg-brand/15 blur-[130px]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3.5 py-1 font-mono text-xs uppercase tracking-wider text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Academic Curriculum Directory</span>
            </div>
            <h1 className="mt-4 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Explore Academic <span className="text-gradient">Courses</span>
            </h1>
            <p className="mt-3 text-base sm:text-lg text-muted">
              Master challenging STEM topics and competitive exam curriculums through structured live cohorts and video archives.
            </p>
          </div>

          {/* Search bar */}
          <div className="mt-8 max-w-2xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search courses by title, subject, or exam category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-void/80 py-3.5 pl-12 pr-4 text-sm text-white placeholder-muted/60 backdrop-blur-md transition-all focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-card-soft"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-muted hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips in Mono Pills */}
          <div className="mt-8 space-y-4">
            {/* Subjects */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs uppercase tracking-wider text-muted mr-1">Subject:</span>
              {subjectsList.map((subj) => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setSelectedSubject(subj)}
                  className={cx(
                    'rounded-full px-3.5 py-1 font-mono text-xs uppercase tracking-wider transition-all duration-200 border',
                    selectedSubject === subj
                      ? 'border-brand bg-brand/15 text-brand shadow-glow/20'
                      : 'border-white/10 bg-void/60 text-muted hover:border-white/20 hover:text-white'
                  )}
                >
                  {subj}
                </button>
              ))}
            </div>

            {/* Level & Price Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                {/* Level Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted mr-1">Level:</span>
                  {levelsList.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setSelectedLevel(lvl)}
                      className={cx(
                        'rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider transition-all duration-200 border',
                        selectedLevel === lvl
                          ? 'border-gold bg-gold/15 text-gold shadow-glow-gold/20'
                          : 'border-white/10 bg-void/60 text-muted hover:border-white/20 hover:text-white'
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>

                {/* Price Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted mr-1">Price:</span>
                  {pricesList.map((pr) => (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => setSelectedPrice(pr)}
                      className={cx(
                        'rounded-full px-3 py-1 font-mono text-xs uppercase tracking-wider transition-all duration-200 border',
                        selectedPrice === pr
                          ? 'border-brand bg-brand/15 text-brand'
                          : 'border-white/10 bg-void/60 text-muted hover:border-white/20 hover:text-white'
                      )}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset button if active */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 font-mono text-xs text-brand hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset all filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Course Grid & Active Filter Toolbar                          */}
      {/* ------------------------------------------------------------ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Results summary & Sort select */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <p className="font-mono text-xs uppercase tracking-wider text-muted">
            Showing <span className="font-bold text-white">{filteredCourses.length}</span> of {allCourses.length} published courses
          </p>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="font-mono text-xs uppercase tracking-wider text-muted">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-white/10 bg-surface px-3.5 py-1.5 font-mono text-xs text-white focus:border-brand focus:outline-none transition [&>option]:bg-surface [&>option]:text-white"
            >
              <option value="popular">Top Rated / Rating</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="duration-asc">Duration: Short to Long</option>
              <option value="duration-desc">Duration: Long to Short</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        {filteredCourses.length === 0 ? (
          <div className="card-base glass my-12 flex flex-col items-center justify-center p-12 text-center shadow-card-soft">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface text-muted">
              <BookOpen className="h-8 w-8 text-brand" />
            </div>
            <h3 className="mt-4 font-heading text-xl font-bold text-white">No courses match your criteria</h3>
            <p className="mt-2 max-w-md text-sm text-muted">
              No results found for your active search or filters. Try adjusting your query or resetting all filters.
            </p>
            <Button
              variant="outline"
              size="md"
              onClick={resetFilters}
              className="mt-6"
            >
              <RotateCcw className="h-4 w-4" /> Reset Filters
            </Button>
          </div>
        ) : (
          /* Course Cards Grid */
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const teacher = (db.teachers || []).find((t) => t.id === course.teacherId)
              return (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="card-base group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow/20 cursor-pointer"
                >
                  {/* Card Banner */}
                  <div className="relative flex h-44 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-surface to-void border-b border-white/10">
                    <div className="glow-blob -top-8 left-1/2 h-32 w-32 -translate-x-1/2 bg-brand/25 blur-[75px]" />
                    <span className="text-6xl filter drop-shadow-md transition-transform duration-300 group-hover:scale-110">
                      {course.category === 'JEE' ? '⚛️' : course.category === 'NEET' ? '🧬' : course.category === 'Foundation' ? '📐' : course.category === 'Olympiad' ? '🏆' : '💻'}
                    </span>
                    <div className="absolute right-3.5 top-3.5">
                      <Badge tone="brand">{course.category}</Badge>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone="gold">{course.subjectName}</Badge>
                      <span className="font-mono text-xs text-muted">{course.level}</span>
                    </div>

                    <h2 className="mt-3 font-heading text-lg font-bold text-white line-clamp-1 group-hover:text-brand transition-colors">
                      {course.title}
                    </h2>

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">
                      {course.description}
                    </p>

                    {/* Teacher note */}
                    {teacher && (
                      <p className="mt-3 font-mono text-[11px] text-muted/80">
                        Instructor: <span className="text-white">{teacher.name}</span>
                      </p>
                    )}

                    {/* Meta stats */}
                    <div className="mt-4 flex items-center gap-4 font-mono text-xs text-muted border-t border-white/10 pt-4">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-brand" />
                        {course.durationHours} hrs
                      </span>
                      <span className="flex items-center gap-1.5 text-gold font-semibold">
                        <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                        {course.rating || '4.8'}
                      </span>
                    </div>

                    {/* Footer with Price and Action */}
                    <div className="mt-6 flex items-center justify-between pt-2">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Tuition</p>
                        <p className="font-mono text-xl font-bold text-white">
                          ₹{course.price ? course.price.toLocaleString() : 'Free'}
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/courses/${course.id}`)
                        }}
                      >
                        Enroll <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
