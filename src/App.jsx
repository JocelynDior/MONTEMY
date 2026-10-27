import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './components/routing/RouteGuards'

import Landing from './pages/auth/Landing'
import Login from './pages/auth/Login'
const AccountTypeSelect = lazy(() => import('./pages/auth/AccountTypeSelect'))
const Register = lazy(() => import('./pages/auth/Register'))
const PendingVerification = lazy(() => import('./pages/auth/PendingVerification'))

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const StudentAcademics = lazy(() => import('./pages/student/StudentAcademics'))
const StudentAssignment = lazy(() => import('./pages/student/StudentAssignment'))
const StudentResources = lazy(() => import('./pages/student/StudentResources'))
const TeacherResources = lazy(() => import('./pages/teacher/TeacherResources'))
const StudentAiTutor = lazy(() => import('./pages/student/StudentAiTutor'))

const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses'))
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'))
const TeacherProgress = lazy(() => import('./pages/teacher/TeacherProgress'))

const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'))
const ParentMyChild = lazy(() => import('./pages/parent/ParentMyChild'))

const PrincipalDashboard = lazy(() => import('./pages/principal/PrincipalDashboard'))
const PrincipalEvents = lazy(() => import('./pages/principal/PrincipalEvents'))
const PrincipalStats = lazy(() => import('./pages/principal/PrincipalStats'))
const PrincipalStaff = lazy(() => import('./pages/principal/PrincipalStaff'))

const TutorDashboard = lazy(() => import('./pages/tutor/TutorDashboard'))
const TutorStudents = lazy(() => import('./pages/tutor/TutorStudents'))
const TutorSessions = lazy(() => import('./pages/tutor/TutorSessions'))
const SchoolMemberDashboard = lazy(() => import('./pages/schoolmember/SchoolMemberDashboard'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminClasses = lazy(() => import('./pages/admin/AdminClasses'))
const Messages = lazy(() => import('./pages/shared/Messages'))
const AdminOrgs = lazy(() => import('./pages/admin/AdminOrgs'))
const AdminOrgDetail = lazy(() => import('./pages/admin/AdminOrgDetail'))
const SchedulePage = lazy(() => import('./pages/timetable/SchedulePage'))
const Events = lazy(() => import('./pages/shared/Events'))
const Settings = lazy(() => import('./pages/Settings'))
import InstallPrompt from './components/pwa/InstallPrompt'
import OfflineBanner from './components/pwa/OfflineBanner'
import ErrorBoundary from './components/shared/ErrorBoundary'
import LoadingScreen from './components/shared/LoadingScreen'

// Signed in AND the right role
const guard = (role, element) => (
  <ProtectedRoute>
    <RoleRoute role={role}>{element}</RoleRoute>
  </ProtectedRoute>
)

// Error boundary (cleared on every navigation), lazy-page loading state and a short fade between pages
function AppRoutes({ children }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary resetKey={pathname}>
      <div key={pathname} className="page-fade">
        <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
      </div>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
        <OfflineBanner />
        <InstallPrompt />
        <AppRoutes>
        <Routes>
          {/* Public (signed-in users are redirected to their dashboard) */}
          <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/admin-login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

          {/* Registration stays open: it signs the user in itself and then navigates */}
          <Route path="/create-account" element={<AccountTypeSelect />} />
          <Route path="/register/:type" element={<Register />} />
          <Route path="/signup" element={<AccountTypeSelect />} />

          {/* Messaging: one shared page for every role */}
          <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

          {/* Events: one shared page for every role */}
          <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />

          {/* Settings & profile: every role */}
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

          {/* Any signed-in user */}
          <Route path="/pending-verification" element={<ProtectedRoute><PendingVerification /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student/dashboard" element={guard('student', <StudentDashboard />)} />
          <Route path="/student/academics" element={guard('student', <StudentAcademics />)} />
          <Route path="/student/assignments/:id" element={guard('student', <StudentAssignment />)} />
          <Route path="/student/schedule" element={guard('student', <SchedulePage backPath="/student/dashboard" />)} />
          <Route path="/student/resources" element={guard('student', <StudentResources />)} />
          <Route path="/student/ai-tutor" element={guard('student', <StudentAiTutor />)} />

          {/* Teacher */}
          <Route path="/teacher/dashboard" element={guard('teacher', <TeacherDashboard />)} />
          <Route path="/teacher/classes" element={guard('teacher', <TeacherClasses />)} />
          <Route path="/teacher/assignments" element={guard('teacher', <TeacherAssignments />)} />
          <Route path="/teacher/progress" element={guard('teacher', <TeacherProgress />)} />
          <Route path="/teacher/schedule" element={guard('teacher', <SchedulePage backPath="/teacher/dashboard" />)} />
          <Route path="/teacher/resources" element={guard('teacher', <TeacherResources />)} />

          {/* Parent */}
          <Route path="/parent/dashboard" element={guard('parent', <ParentDashboard />)} />
          <Route path="/parent/mychild" element={guard('parent', <ParentMyChild />)} />

          {/* Principal */}
          <Route path="/principal/dashboard" element={guard('principal', <PrincipalDashboard />)} />
          <Route path="/principal/events" element={guard('principal', <PrincipalEvents />)} />
          <Route path="/principal/stats" element={guard('principal', <PrincipalStats />)} />
          <Route path="/principal/timetable" element={guard('principal', <SchedulePage backPath="/principal/dashboard" />)} />
          <Route path="/principal/staff" element={guard('principal', <PrincipalStaff />)} />

          {/* Tutor */}
          <Route path="/tutor/dashboard" element={guard('tutor', <TutorDashboard />)} />
          <Route path="/tutor/students" element={guard('tutor', <TutorStudents />)} />
          <Route path="/tutor/sessions" element={guard('tutor', <TutorSessions />)} />

          {/* School Member */}
          <Route path="/schoolmember/dashboard" element={guard('schoolmember', <SchoolMemberDashboard />)} />
          <Route path="/schoolmember/schedules" element={guard('schoolmember', <SchedulePage backPath="/schoolmember/dashboard" />)} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={guard('admin', <AdminDashboard />)} />
          <Route path="/admin/users" element={guard('admin', <AdminUsers />)} />
          <Route path="/admin/classes" element={guard('admin', <AdminClasses />)} />
          <Route path="/admin/chat" element={<Navigate to="/messages" replace />} />
          <Route path="/admin/organisations" element={guard('admin', <AdminOrgs />)} />
          <Route path="/admin/organisations/:id" element={guard('admin', <AdminOrgDetail />)} />

          {/* Anything else */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AppRoutes>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
