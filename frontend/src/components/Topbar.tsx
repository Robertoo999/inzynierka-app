import React from 'react'
import { useAuth } from '../hooks/useAuth'
import AccessibilityBar from './AccessibilityBar'

export default function Topbar(){
    const { auth, setAuth } = useAuth()
    const displayName = auth ? ((auth.firstName || auth.lastName) ? `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() : auth.email) : null
    return (
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:12}}>
                <div className="brand">ProLearn</div>
                {/* Accessibility controls visible globally — improves WCAG compliance */}
                <AccessibilityBar />
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                {auth ? (
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <div style={{textAlign:'right'}}>
                            <div style={{fontWeight:700}}>Cześć{displayName ? `, ${displayName}` : ''}!</div>
                            <div className="text-muted" style={{fontSize:12}}>{auth.email} · {auth.role}</div>
                        </div>
                        <button className="btn" onClick={() => setAuth(null)}>Wyloguj</button>
                    </div>
                ) : (
                    <div className="text-muted">Zaloguj się, aby rozpocząć</div>
                )}
            </div>
        </div>
    )
}
