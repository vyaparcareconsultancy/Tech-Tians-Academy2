import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './lib/auth.jsx'
import { RequireAuth, RequireRole } from './components/Guards.jsx'
import { AdminLayout, TeacherLayout } from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'

/* Admin pages */
import AdminDashboard from './pages/admin/Dashboard.jsx'
import Students from './pages/admin/Students.jsx'
import Teachers from './pages/admin/Teachers.jsx'
import Courses from './pages/admin/Courses.jsx'
import Subjects from './pages/admin/Subjects.jsx'
import Batches from './pages/admin/Batches.jsx'
import LiveClasses from './pages/admin/LiveClasses.jsx'
import Lectures from './pages/admin/Lectures.jsx'
import Assignments from './pages/admin/Assignments.jsx'
import Quizzes from './pages/admin/Quizzes.jsx'
import Enrollments from './pages/admin/Enrollments.jsx'
import Payments from './pages/admin/Payments.jsx'
import Coupons from './pages/admin/Coupons.jsx'
import Announcements from './pages/admin/Announcements.jsx'
import Reports from './pages/admin/Reports.jsx'
import Settings from './pages/admin/Settings.jsx'

/* Teacher pages */
import TeacherDashboard from './pages/teacher/Dashboard.jsx'
import MyCourses from './pages/teacher/MyCourses.jsx'
import CourseBuilder from './pages/teacher/CourseBuilder.jsx'
import MyStudents from './pages/teacher/MyStudents.jsx'
import MyBatches from './pages/teacher/MyBatches.jsx'
import TeacherLiveClasses from './pages/teacher/LiveClasses.jsx'
import TeacherLectures from './pages/teacher/Lectures.jsx'
import Materials from './pages/teacher/Materials.jsx'
import TeacherAssignments from './pages/teacher/Assignments.jsx'
import TeacherQuizzes from './pages/teacher/Quizzes.jsx'
import Attendance from './pages/teacher/Attendance.jsx'
import StudentProgress from './pages/teacher/Progress.jsx'
import TeacherAnnouncements from './pages/teacher/Announcements.jsx'
import TeacherProfile from './pages/teacher/Profile.jsx'
import PublicLayout from './pages/public/PublicLayout.jsx'
import Landing from './pages/public/Landing.jsx'
import PublicCourses from './pages/public/Courses.jsx'
import CourseDetail from './pages/public/CourseDetail.jsx'
import Signup from './pages/Signup.jsx'

function HomeRoute() {
  const { user } = useAuth()
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard'} replace />
  }
  return <Landing />
}


function Denied() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const t = setTimeout(() => {
      navigate(user?.role === 'teacher' ? '/teacher/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/login', { replace: true })
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

      {/* ------- Public Marketing ------- */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/courses" element={<PublicCourses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
      </Route>

      <Route path="*" element={<Denied />} />
    </Routes>
  )
}
