import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { useToast } from './components/Toasts'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import NotFound from './pages/NotFound'
import StudentHome from './pages/student/Home'
import TeacherHome from './pages/teacher/Home'
import ClassesPage from './pages/ClassesPage'
import ClassPage from './pages/ClassPage'
import Profile from './pages/Profile'
import { RequireTeacher, RequireStudent } from './components/RequireRole'
import LessonStudentView from './pages/lesson-editor/LessonStudentView'

function RequireAuth({ children }:{ children: React.ReactElement }){
    const { auth } = useAuth()
    const location = useLocation()
    if (!auth) return <Navigate to="/login" state={{ from: location.pathname }} replace />
    return children
}

function RootRedirect(){
    const { auth } = useAuth()
    if (!auth) return <Navigate to="/login" replace />
    return auth.role === 'TEACHER' ? <Navigate to="/teacher" replace /> : <Navigate to="/student" replace />
}

export default function App(){
    return (
        <AuthProvider>
            <AppLayout>
                <Routes>
                    <Route path="/" element={<RootRedirect/>} />
                    <Route path="/login" element={<LoginPage/>} />
                    <Route path="/register" element={<RegisterPage/>} />
                    <Route path="/forgot-password" element={<ForgotPassword/>} />
                    <Route path="/reset-password" element={<ResetPassword/>} />
                    {/* Student routes */}
                    <Route path="/student/*" element={<RequireAuth><RequireStudent><StudentHome/></RequireStudent></RequireAuth>} />
                    <Route path="/student/classes" element={<RequireAuth><RequireStudent><ClassesPage/></RequireStudent></RequireAuth>} />
                    <Route path="/student/classes/:classId" element={<RequireAuth><RequireStudent><ClassPage/></RequireStudent></RequireAuth>} />
                    <Route path="/student/classes/:classId/lessons/:lessonId" element={<RequireAuth><RequireStudent><LessonStudentView/></RequireStudent></RequireAuth>} />

                    {/* Teacher routes */}
                    <Route path="/teacher/*" element={<RequireAuth><RequireTeacher><TeacherHome/></RequireTeacher></RequireAuth>} />
                    <Route path="/teacher/classes" element={<RequireAuth><RequireTeacher><ClassesPage/></RequireTeacher></RequireAuth>} />
                    <Route path="/teacher/classes/:classId" element={<RequireAuth><RequireTeacher><ClassPage/></RequireTeacher></RequireAuth>} />
                    <Route path="/teacher/classes/:classId/lessons/:lessonId" element={<RequireAuth><RequireTeacher><ClassPage/></RequireTeacher></RequireAuth>} />

                    {/* generic /classes redirect to role-aware path */}
                    <Route path="/classes/:classId" element={<RequireAuth><RoleAwareClassRedirect/></RequireAuth>} />
                    <Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>} />
                    <Route path="*" element={<NotFound/>} />
                </Routes>
            </AppLayout>
        </AuthProvider>
    )
}

function RoleAwareClassRedirect(){
    const { auth } = useAuth()
    const loc = useLocation()
    const parts = loc.pathname.split('/')
    const classId = parts[parts.length - 1]
    if (!auth) return <Navigate to="/login" replace />
    if (auth.role === 'TEACHER') return <Navigate to={`/teacher/classes/${classId}`} replace />
    return <Navigate to={`/student/classes/${classId}`} replace />
}
