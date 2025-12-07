import React from 'react'
import { type Role } from '../api'

export type Auth = { token: string; email: string; firstName?: string | null; lastName?: string | null; role: Role } | null

const AuthContext = React.createContext<{ auth: Auth; setAuth: (a: Auth) => void } | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }){
    const [auth, setAuthState] = React.useState<Auth>(() => {
        try{ const raw = localStorage.getItem('auth'); return raw ? JSON.parse(raw) as Auth : null } catch { return null }
    })
    React.useEffect(()=>{ if (auth) localStorage.setItem('auth', JSON.stringify(auth)); else localStorage.removeItem('auth') }, [auth])
    const setAuth = (a: Auth) => setAuthState(a)
    return <AuthContext.Provider value={{ auth, setAuth }}>{children}</AuthContext.Provider>
}

export function useAuth(){
    const ctx = React.useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}
