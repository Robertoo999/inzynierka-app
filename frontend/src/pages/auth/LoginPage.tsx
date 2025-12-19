import React from 'react'
import { api } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/Toasts'
import { useNavigate, useLocation } from 'react-router-dom'

export default function LoginPage(){
    const { setAuth } = useAuth()
    // Keep email ALWAYS empty on load (do not prefill from storage)
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [error, setError] = React.useState<string|undefined>()
    const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({})
    const [loading, setLoading] = React.useState(false)
    const nav = useNavigate()
    const toast = useToast()
    const location = useLocation()
    const state = (location.state ?? {}) as any
    const from = state?.from as string | undefined
    const formRef = React.useRef<HTMLDivElement|null>(null)

    function validate(){
        const errors: { email?: string; password?: string } = {}
        if (!email || !email.includes('@')) errors.email = 'Podaj poprawny email.'
        if (!password || password.length < 6) errors.password = 'Hasło musi mieć co najmniej 6 znaków.'
        return errors
    }

    async function doLogin(){
        setError(undefined)
        const v = validate()
        setFieldErrors(v)
        if (v.email || v.password){
            // focus first invalid field
            const root = formRef.current
            const firstInvalid = root?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            firstInvalid?.focus()
            return
        }
        setLoading(true)
        try{
            const { token, email: e, role, firstName, lastName } = await api.login({ email: email.trim(), password })
            setAuth({ token, email: e ?? email, firstName: firstName ?? null, lastName: lastName ?? null, role })
            toast.show('Zalogowano', 'success')
            // redirect to original path if present, otherwise by role
            if (from) {
                try { nav(from, { replace: true }) } catch { /* fallback below */ }
            } else if (role === 'TEACHER') nav('/teacher')
            else nav('/student')
        }catch(e:any){
            let msg = e?.message ? String(e.message) : String(e)
            // Mapuj znane angielskie komunikaty na polskie (fallback gdy backend jeszcze w starej wersji)
            if (/invalid credentials/i.test(msg)) msg = 'Nieprawidłowe dane logowania'
            if (/user not authenticated/i.test(msg)) msg = 'Użytkownik nieautoryzowany'
            setError(msg)
            // Nie pokazujemy toasta, jeden komunikat pod formularzem wystarczy
        }finally{ setLoading(false) }
    }

    return (
        <div className="card" style={{maxWidth:720}}>
            <h3 className="section-title">Logowanie</h3>
            <div ref={formRef} style={{display:'grid',gap:10}}>
                <div style={{display:'flex', justifyContent:'flex-end'}}>
                    <div style={{display:'flex', gap:10}}>
                        <a href="/register" style={{fontSize:13, color:'var(--brand)'}}>Nie masz konta? Zarejestruj się</a>
                        <a href="/forgot-password" style={{fontSize:13, color:'var(--brand)'}}>Nie pamiętasz hasła?</a>
                    </div>
                </div>
                <label htmlFor="login-email">Email</label>
                <input
                    id="login-email"
                    className="input"
                    value={email}
                    onChange={e=>setEmail(e.target.value)}
                    placeholder="np. uczen@szkola.pl"
                    aria-describedby="login-email-hint login-email-error"
                    aria-invalid={fieldErrors.email ? true : false}
                    autoComplete="username"
                />
                <span id="login-email-hint" className="text-muted" style={{fontSize:12}}>Użyj adresu email do logowania.</span>
                {fieldErrors.email && <span id="login-email-error" className="text-danger" style={{fontSize:12}}>Błąd: {fieldErrors.email}</span>}

                <label htmlFor="login-pass" style={{marginTop:6}}>Hasło</label>
                <input
                    id="login-pass"
                    className="input"
                    type="password"
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    placeholder="Hasło"
                    aria-describedby="login-pass-hint login-pass-error"
                    aria-invalid={fieldErrors.password ? true : false}
                    autoComplete="current-password"
                />
                <span id="login-pass-hint" className="text-muted" style={{fontSize:12}}>Hasło ma mieć min. 6 znaków.</span>
                {fieldErrors.password && <span id="login-pass-error" className="text-danger" style={{fontSize:12}}>Błąd: {fieldErrors.password}</span>}
                <div style={{display:'flex',gap:8}}>
                    <button className="btn primary" type="button" onClick={doLogin} disabled={loading}>{loading ? 'Logowanie…' : 'Zaloguj'}</button>
                </div>
                {error && <div className="text-danger">{error}</div>}
            </div>
        </div>
    )
}
