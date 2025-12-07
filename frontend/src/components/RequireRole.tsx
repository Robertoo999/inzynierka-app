import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function RequireTeacher({ children }:{ children: React.ReactElement }){
    const { auth } = useAuth()
    const loc = useLocation()
    if (!auth) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
    if (auth.role !== 'TEACHER') return <Navigate to="/student" replace />
    return children
}

export function RequireStudent({ children }:{ children: React.ReactElement }){
    const { auth } = useAuth()
    const loc = useLocation()
    if (!auth) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
    if (auth.role !== 'STUDENT') return <Navigate to="/teacher" replace />
    return children
}

export default function RequireRole({ role, children }:{ role: 'TEACHER'|'STUDENT'; children: React.ReactElement }){
    const { auth } = useAuth()
    const loc = useLocation()
    if (!auth) return <Navigate to="/login" state={{ from: loc.pathname }} replace />
    if (auth.role !== role) return <Navigate to={role === 'TEACHER' ? '/teacher' : '/student'} replace />
    return children
}
