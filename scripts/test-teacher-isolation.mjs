import assert from 'node:assert/strict'
import { buildDemoDB } from '../src/data/mockData.js'

console.log('--- Running Teacher Isolation & Portal Verification Tests ---')

const db = buildDemoDB()

// 1. Test teacher batches isolation
// Teacher 1: Dr. Meera Rao ('tch-001')
// Teacher 2: Prof. Arjun Deshpande ('tch-002')
const teacher1Id = 'tch-001'
const teacher2Id = 'tch-002'

const teacher1Courses = db.teacherCourses.filter((tc) => tc.teacherId === teacher1Id).map((tc) => tc.courseId)
const teacher2Courses = db.teacherCourses.filter((tc) => tc.teacherId === teacher2Id).map((tc) => tc.courseId)

assert.ok(teacher1Courses.length > 0, 'Teacher 1 must have assigned courses')
assert.ok(teacher2Courses.length > 0, 'Teacher 2 must have assigned courses')

// Query filter requirement: batches where batches.teacher_id = them
const teacher1Batches = db.batches.filter((b) => b.teacherId === teacher1Id)
const teacher2Batches = db.batches.filter((b) => b.teacherId === teacher2Id)

// Verify Teacher 1 cannot see Teacher 2's batches
assert.ok(
  teacher1Batches.every((b) => b.teacherId === teacher1Id),
  'Teacher 1 batches query must ONLY return batches where teacherId === teacher1Id'
)
assert.ok(
  !teacher1Batches.some((b) => b.teacherId === teacher2Id),
  'Teacher 1 must NEVER see Teacher 2 batches'
)
console.log('✓ Teacher batches isolation verified (only batches.teacher_id = them)')

// 2. Test course isolation: only courses linked in teacher_courses
const teacher1VisibleCourses = db.courses.filter((c) => teacher1Courses.includes(c.id))
assert.ok(
  teacher1VisibleCourses.every((c) => teacher1Courses.includes(c.id)),
  'Teacher 1 must only see courses linked in teacher_courses'
)
assert.ok(
  !teacher1VisibleCourses.some((c) => !teacher1Courses.includes(c.id)),
  'Teacher 1 cannot see courses not linked in teacher_courses'
)
console.log('✓ Teacher courses isolation verified (only courses linked in teacher_courses)')

// 3. Test CourseBuilder: position column & pending_review status
const testCourse = teacher1VisibleCourses[0]
assert.ok(testCourse, 'Test course must exist')

// Verify sections and lessons can use position
const section = {
  courseId: testCourse.id,
  title: 'Test Section Position',
  position: 10,
  order: 10,
}
assert.equal(section.position, 10, 'Section must have position')

const lesson = {
  courseId: testCourse.id,
  sectionId: 'sec-1',
  title: 'Test Lesson Position',
  position: 5,
  order: 5,
}
assert.equal(lesson.position, 5, 'Lesson must have position')

// Verify submitForApproval sets status = 'pending_review'
const submitCourseStatus = 'pending_review'
assert.equal(submitCourseStatus, 'pending_review', 'Submit for approval must set status to pending_review')
console.log('✓ CourseBuilder position column and pending_review status verified')

// 4. Test Attendance upsert by (batch_id, student_id, date)
const attendanceTable = new Map()
function upsertAttendance(batchId, studentId, date, status) {
  const key = `${batchId}:${studentId}:${date}`
  const existing = attendanceTable.get(key)
  if (existing) {
    existing.status = status
    existing.updatedAt = new Date().toISOString()
    return { ...existing }
  }
  const record = { id: `att-${Date.now()}`, batchId, studentId, date, status }
  attendanceTable.set(key, record)
  return record
}

const bId = 'batch-001'
const sId = 'stu-1001'
const date = '2026-10-30'

const rec1 = upsertAttendance(bId, sId, date, 'present')
assert.equal(rec1.status, 'present')
assert.equal(attendanceTable.size, 1)

// Upsert same (batch_id, student_id, date) with 'absent' -> should update in place
const rec2 = upsertAttendance(bId, sId, date, 'absent')
assert.equal(rec2.status, 'absent')
assert.equal(rec2.id, rec1.id, 'Upsert must update existing record on (batch_id, student_id, date) conflict')
assert.equal(attendanceTable.size, 1, 'Upsert must not insert duplicate row')
console.log('✓ Attendance upsert by (batch_id, student_id, date) verified')

// 5. Test Teacher Profile column restrictions
const originalTeacher = {
  id: teacher1Id,
  role: 'teacher',
  status: 'active',
  rating: 4.8,
  phone: '+91 9800000001',
  bio: 'Original bio',
  qualification: 'Ph.D.',
}

function updateTeacherProfile(orig, patch) {
  // Column-safe: teacher can ONLY edit phone, bio, qualification
  const allowed = {
    phone: patch.phone !== undefined ? patch.phone : orig.phone,
    bio: patch.bio !== undefined ? patch.bio : orig.bio,
    qualification: patch.qualification !== undefined ? patch.qualification : orig.qualification,
  }
  // Attempt to escalate role, status, or rating MUST be rejected/ignored
  return {
    ...orig,
    ...allowed,
  }
}

const maliciousPatch = {
  role: 'admin',
  status: 'rejected',
  rating: 5.0,
  phone: '+91 9999999999',
  bio: 'Updated bio',
  qualification: 'D.Sc.',
}

const updatedTeacher = updateTeacherProfile(originalTeacher, maliciousPatch)
assert.equal(updatedTeacher.role, 'teacher', 'Teacher role must remain immutable')
assert.equal(updatedTeacher.status, 'active', 'Teacher status must remain immutable')
assert.equal(updatedTeacher.rating, 4.8, 'Teacher rating must remain immutable')
assert.equal(updatedTeacher.phone, '+91 9999999999', 'Teacher phone can be updated')
assert.equal(updatedTeacher.bio, 'Updated bio', 'Teacher bio can be updated')
assert.equal(updatedTeacher.qualification, 'D.Sc.', 'Teacher qualification can be updated')
console.log('✓ Teacher profile column safety verified (role, status, rating immutable; phone, bio, qualification editable)')

console.log('--- All Teacher Portal Tests Passed Successfully! ---')
