import React, { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { RequireAuth, RequireRole } from './components/Guards.jsx'
import { AdminLayout, TeacherLayout, StudentLayout } from './components/Layout.jsx'
import PublicLayout from './pages/public/PublicLayout.jsx'

/* Public / Auth Pages (Lazy loaded) */
const Login = lazy(() => import('./pages/Login.jsx'))
const Signup = lazy(() => import('./pages/Signup.jsx'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'))
const Landing = lazy(() => import('./pages/public/Landing.jsx'))
const PublicCourses = lazy(() => import('./pages/public/Courses.jsx'))
const CourseDetail = lazy(() => import('./pages/public/CourseDetail.jsx'))

/* Admin Pages (Lazy loaded) */
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'))
const Students = lazy(() => import('./pages/admin/Students.jsx'))
const Teachers = lazy(() => import('./pages/admin/Teachers.jsx'))
const Courses = lazy(() => import('./pages/admin/Courses.jsx'))
const Subjects = lazy(() => import('./pages/admin/Subjects.jsx'))
const Batches = lazy(() => import('./pages/admin/Batches.jsx'))
const LiveClasses = lazy(() => import('./pages/admin/LiveClasses.jsx'))
const Lectures = lazy(() => import('./pages/admin/Lectures.jsx'))
const Assignments = lazy(() => import('./pages/admin/Assignments.jsx'))
const Quizzes = lazy(() => import('./pages/admin/Quizzes.jsx'))
const Enrollments = lazy(() => import('./pages/admin/Enrollments.jsx'))
const Payments = lazy(() => import('./pages/admin/Payments.jsx'))
const Coupons = lazy(() => import('./pages/admin/Coupons.jsx'))
const Announcements = lazy(() => import('./pages/admin/Announcements.jsx'))
const Reports = lazy(() => import('./pages/admin/Reports.jsx'))
const Settings = lazy(() => import('./pages/admin/Settings.jsx'))

/* Teacher Pages (Lazy loaded) */
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard.jsx'))
const MyCourses = lazy(() => import('./pages/teacher/MyCourses.jsx'))
const CourseBuilder = lazy(() => import('./pages/teacher/CourseBuilder.jsx'))
const MyStudents = lazy(() => import('./pages/teacher/MyStudents.jsx'))
const MyBatches = lazy(() => import('./pages/teacher/MyBatches.jsx'))
const TeacherLiveClasses = lazy(() => import('./pages/teacher/LiveClasses.jsx'))
const TeacherLectures = lazy(() => import('./pages/teacher/Lectures.jsx'))
const Materials = lazy(() => import('./pages/teacher/Materials.jsx'))
const TeacherAssignments = lazy(() => import('./pages/teacher/Assignments.jsx'))
const TeacherQuizzes = lazy(() => import('./pages/teacher/Quizzes.jsx'))
const Attendance = lazy(() => import('./pages/teacher/Attendance.jsx'))
const StudentProgress = lazy(() => import('./pages/teacher/Progress.jsx'))
const TeacherAnnouncements = lazy(() => import('./pages/teacher/Announcements.jsx'))
const TeacherProfile = lazy(() => import('./pages/teacher/Profile.jsx'))

/* Student Pages (Lazy loaded) */
const StudentDashboard = lazy(() => import('./pages/student/Dashboard.jsx'))
const StudentMyCourses = lazy(() => import('./pages/student/MyCourses.jsx'))
const CoursePlayer = lazy(() => import('./pages/student/CoursePlayer.jsx'))
const StudentLiveClasses = lazy(() => import('./pages/student/LiveClasses.jsx'))
const StudentAssignments = lazy(() => import('./pages/student/Assignments.jsx'))
const StudentQuizzes = lazy(() => import('./pages/student/Quizzes.jsx'))
const QuizAttempt = lazy(() => import('./pages/student/QuizAttempt.jsx'))
const StudentCertificates = lazy(() => import('./pages/student/Certificates.jsx'))
const StudentOrders = lazy(() => import('./pages/student/Orders.jsx'))
const StudentProfile = lazy(() => import('./pages/student/Profile.jsx'))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent shadow-glow" />
        <span className="font-mono text-xs uppercase tracking-wider text-muted">Loading…</span>
      </div>
    </div>
  )
}

function HomeRoute() {
  const { user } = useAuth()
  if (user) {
    const dest =
      user.role === 'admin'
        ? '/admin/dashboard'
        : user.role === 'teacher'
        ? '/teacher/dashboard'
        : '/student/dashboard'
    return <Navigate to={dest} replace />
  }
  return <Landing />
}

function Denied() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const t = setTimeout(() => {
      const dest =
        user?.role === 'teacher'
          ? '/teacher/dashboard'
          : user?.role === 'student'
          ? '/student/dashboard'
          : user?.role === 'admin'
          ? '/admin/dashboard'
          : '/login'
      navigate(dest, { replace: true })
    }, 2500)
    return () => clearTimeout(t)
  }, [navigate, user])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-void px-4">
      <div className="card-base glass max-w-md w-full p-8 text-center shadow-card-soft">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 font-heading text-lg font-bold text-white">Access restricted</h1>
        <p className="mt-1 text-sm text-muted">
          You don't have permission to view <span className="font-mono text-brand">{location.pathname}</span>. Redirecting…
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* ------- Admin ------- */}
        <Route element={<RequireAuth><RequireRole roles={['admin']}><AdminLayout /></RequireRole></RequireAuth>}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/teachers" element={<Teachers />} />
          <Route path="/admin/courses" element={<Courses />} />
          <Route path="/admin/subjects" element={<Subjects />} />
          <Route path="/admin/batches" element={<Batches />} />
          <Route path="/admin/live-classes" element={<LiveClasses />} />
          <Route path="/admin/lectures" element={<Lectures />} />
          <Route path="/admin/assignments" element={<Assignments />} />
          <Route path="/admin/quizzes" element={<Quizzes />} />
          <Route path="/admin/enrollments" element={<Enrollments />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/coupons" element={<Coupons />} />
          <Route path="/admin/announcements" element={<Announcements />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/settings" element={<Settings />} />
        </Route>

        {/* ------- Teacher ------- */}
        <Route element={<RequireAuth><RequireRole roles={['teacher']}><TeacherLayout /></RequireRole></RequireAuth>}>
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/courses" element={<MyCourses />} />
          <Route path="/teacher/course-builder" element={<CourseBuilder />} />
          <Route path="/teacher/students" element={<MyStudents />} />
          <Route path="/teacher/batches" element={<MyBatches />} />
          <Route path="/teacher/live-classes" element={<TeacherLiveClasses />} />
          <Route path="/teacher/lectures" element={<TeacherLectures />} />
          <Route path="/teacher/materials" element={<Materials />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
          <Route path="/teacher/attendance" element={<Attendance />} />
          <Route path="/teacher/progress" element={<StudentProgress />} />
          <Route path="/teacher/announcements" element={<TeacherAnnouncements />} />
          <Route path="/teacher/profile" element={<TeacherProfile />} />
        </Route>

        {/* ------- Student ------- */}
        <Route element={<RequireAuth><RequireRole roles={['student']}><StudentLayout /></RequireRole></RequireAuth>}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<StudentMyCourses />} />
          <Route path="/student/learn/:courseId" element={<CoursePlayer />} />
          <Route path="/student/live-classes" element={<StudentLiveClasses />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/quizzes/:id" element={<QuizAttempt />} />
          <Route path="/student/certificates" element={<StudentCertificates />} />
          <Route path="/student/orders" element={<StudentOrders />} />
          <Route path="/student/profile" element={<StudentProfile />} />
        </Route>

        {/* ------- Public Marketing ------- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/courses" element={<PublicCourses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
        </Route>

        <Route path="*" element={<Denied />} />
      </Routes>
    </Suspense>
  )
}
