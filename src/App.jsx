import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './components/routing/RouteGuards'

import Landing from './pages/auth/Landing'
import Login from './pages/auth/Login'
import AccountTypeSelect from './pages/auth/AccountTypeSelect'
import Register from './pages/auth/Register'
import PendingVerification from './pages/auth/PendingVerification'

import StudentDashboard from './pages/student/StudentDashboard'
import StudentAcademics from './pages/student/StudentAcademics'
import StudentResources from './pages/student/StudentResources'
import StudentAiTutor from './pages/student/StudentAiTutor'

import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherClasses from './pages/teacher/TeacherClasses'
import TeacherAssignments from './pages/teacher/TeacherAssignments'
import TeacherProgress from './pages/teacher/TeacherProgress'

import ParentDashboard from './pages/parent/ParentDashboard'
import ParentMyChild from './pages/parent/ParentMyChild'

import PrincipalDashboard from './pages/principal/PrincipalDashboard'
import PrincipalEvents from './pages/principal/PrincipalEvents'
import PrincipalStats from './pages/principal/PrincipalStats'

import TutorDashboard from './pages/tutor/TutorDashboard'
import SchoolMemberDashboard from './pages/schoolmember/SchoolMemberDashboard'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminClasses from './pages/admin/AdminClasses'
import AdminChat from './pages/admin/AdminChat'

// Signed in AND the right role
const guard = (role, element) => (
  <ProtectedRoute>
    <RoleRoute role={role}>{element}</RoleRoute>
  </ProtectedRoute>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public (signed-in users are redirected to their dashboard) */}
          <Route path="/" element={<PublicOnlyRoute><Landing /></PublicOnlyRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/admin-login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />

          {/* Registration stays open: it signs the user in itself and then navigates */}
          <Route path="/create-account" element={<AccountTypeSelect />} />
          <Route path="/register/:type" element={<Register />} />
          <Route path="/signup" element={<AccountTypeSelect />} />

          {/* Any signed-in user */}
          <Route path="/pending-verification" element={<ProtectedRoute><PendingVerification /></ProtectedRoute>} />

          {/* Student */}
          <Route path="/student/dashboard" element={guard('student', <StudentDashboard />)} />
          <Route path="/student/academics" element={guard('student', <StudentAcademics />)} />
          <Route path="/student/resources" element={guard('student', <StudentResources />)} />
          <Route path="/student/ai-tutor" element={guard('student', <StudentAiTutor />)} />

          {/* Teacher */}
          <Route path="/teacher/dashboard" element={guard('teacher', <TeacherDashboard />)} />
          <Route path="/teacher/classes" element={guard('teacher', <TeacherClasses />)} />
          <Route path="/teacher/assignments" element={guard('teacher', <TeacherAssignments />)} />
          <Route path="/teacher/progress" element={guard('teacher', <TeacherProgress />)} />

          {/* Parent */}
          <Route path="/parent/dashboard" element={guard('parent', <ParentDashboard />)} />
          <Route path="/parent/mychild" element={guard('parent', <ParentMyChild />)} />

          {/* Principal */}
          <Route path="/principal/dashboard" element={guard('principal', <PrincipalDashboard />)} />
          <Route path="/principal/events" element={guard('principal', <PrincipalEvents />)} />
          <Route path="/principal/stats" element={guard('principal', <PrincipalStats />)} />

          {/* Tutor */}
          <Route path="/tutor/dashboard" element={guard('tutor', <TutorDashboard />)} />

          {/* School Member */}
          <Route path="/schoolmember/dashboard" element={guard('schoolmember', <SchoolMemberDashboard />)} />

          {/* Admin */}
          <Route path="/admin/dashboard" element={guard('admin', <AdminDashboard />)} />
          <Route path="/admin/users" element={guard('admin', <AdminUsers />)} />
          <Route path="/admin/classes" element={guard('admin', <AdminClasses />)} />
          <Route path="/admin/chat" element={guard('admin', <AdminChat />)} />

          {/* Anything else */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
