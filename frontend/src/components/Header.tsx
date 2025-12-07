import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Header(){
    const { auth } = useAuth()
    const role = auth?.role ?? null
    const displayName = auth ? ((auth.firstName || auth.lastName) ? `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() : auth.email) : null
    return (
        <header className="header">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',gap:16}}>
                <div style={{display:'flex',flexDirection:'column'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                        <NavLink to="/" className="brand" style={{textDecoration:'none'}}>ProLearn</NavLink>
                        <small className="text-muted">Learning app</small>
                    </div>
                    <nav className="tabs" aria-label="Main navigation">
                        {role === 'TEACHER' ? (
                            <>
                                <NavLink to="/" end className={({isActive}) => isActive ? 'tab active' : 'tab'}>Start</NavLink>
                                <NavLink to="/teacher" className={({isActive}) => isActive ? 'tab active' : 'tab'}>Panel nauczyciela</NavLink>
                                <NavLink to="/teacher/classes" className={({isActive}) => isActive ? 'tab active' : 'tab'}>Klasy</NavLink>
                            </>
                        ) : (
                            <>
                                <NavLink to="/student" className={({isActive}) => isActive ? 'tab active' : 'tab'}>Panel ucznia</NavLink>
                                <NavLink to="/student/classes" className={({isActive}) => isActive ? 'tab active' : 'tab'}>Moje klasy</NavLink>
                            </>
                        )}
                        <NavLink to="/profile" className={({isActive}) => isActive ? 'tab active' : 'tab'}>Profil</NavLink>
                    </nav>
                </div>
                <div aria-live="polite" className="text-muted" style={{textAlign:'right'}}>
                    {auth ? (
                        <>
                            <div style={{fontWeight:600}}>Cześć{displayName ? `, ${displayName}` : ''}!</div>
                            <div style={{fontSize:12}}>{auth.email}</div>
                        </>
                    ) : (
                        <span>Zaloguj się, aby rozpocząć</span>
                    )}
                </div>
            </div>
        </header>
    )
}
