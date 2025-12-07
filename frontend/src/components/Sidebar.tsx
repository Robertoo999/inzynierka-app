import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Sidebar(){
    const { auth } = useAuth()
    const role = auth?.role ?? null
    return (
        <div>
            <div style={{marginBottom:18}}>
                <div className="brand">ProLearn</div>
                <div className="text-muted" style={{marginTop:6}}>Nauka programowania</div>
            </div>
            <nav style={{display:'grid', gap:8}}>
                {!auth && <>
                    <Link to="/login" className="tab">Zaloguj</Link>
                    <Link to="/register" className="tab">Zarejestruj</Link>
                </>}
                {role === 'STUDENT' && <>
                    <Link to="/student" className="tab">Panel ucznia</Link>
                    <Link to="/student/classes" className="tab">Moje klasy</Link>
                </>}
                {role === 'TEACHER' && <>
                    <Link to="/teacher" className="tab">Panel nauczyciela</Link>
                    <Link to="/teacher/classes" className="tab">Zarządzanie klasami</Link>
                </>}
                {auth && <Link to="/profile" className="tab">Profil</Link>}
            </nav>
        </div>
    )
}
