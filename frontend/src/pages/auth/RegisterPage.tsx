import React from 'react'
import { api, type Role } from '../../api'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toasts'

export default function RegisterPage(){
    const { setAuth } = useAuth()
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('Haslo123!')
    const [firstName, setFirstName] = React.useState('')
    const [lastName, setLastName] = React.useState('')
    const [role, setRole] = React.useState<Role>('STUDENT')
    const [error, setError] = React.useState<string|undefined>()
    const [fieldErrors, setFieldErrors] = React.useState<Record<string,string>>({})
    const [loading, setLoading] = React.useState(false)
    const nav = useNavigate()
    const toast = useToast()
    const formRef = React.useRef<HTMLDivElement|null>(null)

    function validate(){
        const errs: Record<string,string> = {}
        if (!email || !email.includes('@')) errs.email = 'Podaj poprawny email.'
        if (!password || password.length < 6) errs.password = 'Hasło musi mieć co najmniej 6 znaków.'
        if (!firstName.trim()) errs.firstName = 'Podaj imię.'
        if (!lastName.trim()) errs.lastName = 'Podaj nazwisko.'
        return errs
    }

    async function doRegister(){
        setError(undefined)
        const errs = validate()
        setFieldErrors(errs)
        if (Object.keys(errs).length > 0) {
            const root = formRef.current
            const firstInvalid = root?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            firstInvalid?.focus()
            return
        }
        setLoading(true)
        try{
            const { token, email: e, role: r, firstName: fn, lastName: ln } = await api.register({ email: email.trim(), password, role, firstName: firstName.trim(), lastName: lastName.trim() })
            setAuth({ token, email: e ?? email, firstName: fn ?? firstName, lastName: ln ?? lastName, role: r })
            toast.show('Zarejestrowano', 'success')
            if (r === 'TEACHER') nav('/teacher')
            else nav('/student')
        }catch(e:any){
            let msg = e?.message ? String(e.message) : 'Nieznany błąd rejestracji'
            // Mapowanie potencjalnych angielskich odpowiedzi jeśli backend jeszcze nie zrestartowany
            if (/email already in use/i.test(msg)) msg = 'Email jest już używany'
            if (/role must be/i.test(msg)) msg = 'Rola musi być STUDENT albo TEACHER'
            setError(msg)
            if (e?.fields) setFieldErrors(e.fields)
            // Bez toasta – unikamy podwójnego komunikatu
        }
        finally{ setLoading(false) }
    }

    return (
        <div className="card" style={{maxWidth:720}}>
            <h3 className="section-title">Rejestracja</h3>
            <div ref={formRef} style={{display:'grid',gap:10}}>
                <label htmlFor="reg-fn">Imię</label>
                <input id="reg-fn" className="input" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="np. Jan" aria-describedby="reg-fn-hint reg-fn-error" aria-invalid={fieldErrors.firstName ? true : false} />
                <span id="reg-fn-hint" className="text-muted" style={{fontSize:12}}>Podaj swoje imię.</span>
                {fieldErrors.firstName && <span id="reg-fn-error" className="text-danger" style={{fontSize:12}}>Błąd: {fieldErrors.firstName}</span>}

                <label htmlFor="reg-ln">Nazwisko</label>
                <input id="reg-ln" className="input" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="np. Kowalski" aria-describedby="reg-ln-hint reg-ln-error" aria-invalid={fieldErrors.lastName ? true : false} />
                <span id="reg-ln-hint" className="text-muted" style={{fontSize:12}}>Podaj swoje nazwisko.</span>
                {fieldErrors.lastName && <span id="reg-ln-error" className="text-danger" style={{fontSize:12}}>Błąd: {fieldErrors.lastName}</span>}

                <label htmlFor="reg-email">Email</label>
                <input id="reg-email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="np. uczen@szkola.pl" aria-describedby="reg-email-hint reg-email-error" aria-invalid={fieldErrors.email ? true : false} />
                <span id="reg-email-hint" className="text-muted" style={{fontSize:12}}>Użyj prawdziwego adresu email.</span>
                {fieldErrors.email && <span id="reg-email-error" className="text-danger" style={{fontSize:12}}>Błąd: {fieldErrors.email}</span>}

                <label htmlFor="reg-pass">Hasło</label>
                <input id="reg-pass" className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min. 6 znaków" aria-describedby="reg-pass-hint reg-pass-error" aria-invalid={fieldErrors.password ? true : false} />
                <span id="reg-pass-hint" className="text-muted" style={{fontSize:12}}>Hasło musi mieć co najmniej 6 znaków.</span>
                {fieldErrors.password && <span id="reg-pass-error" className="text-danger" style={{fontSize:12}}>Błąd: {fieldErrors.password}</span>}

                <label htmlFor="reg-role">Rola</label>
                <select id="reg-role" className="select" value={role} onChange={e=>setRole(e.target.value as Role)} aria-describedby="reg-role-hint">
                        <option>STUDENT</option>
                        <option>TEACHER</option>
                    </select>
                <span id="reg-role-hint" className="text-muted" style={{fontSize:12}}>Wybierz swoją rolę.</span>
                <div style={{display:'flex',gap:8}}>
                    <button className="btn primary" type="button" onClick={doRegister} disabled={loading}>{loading ? 'Rejestruję…' : 'Zarejestruj'}</button>
                </div>
                {error && <div className="text-danger">{error}</div>}
            </div>
        </div>
    )
}
