import React from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toasts'
import { useNavigate, useLocation } from 'react-router-dom'

function useQuery(){ return new URLSearchParams(useLocation().search) }

export default function ResetPassword(){
    const q = useQuery()
    const tokenFromQuery = q.get('token') ?? ''
    const [email, setEmail] = React.useState('')
    const [token, setToken] = React.useState(tokenFromQuery)
    const [password, setPassword] = React.useState('')
    const [confirm, setConfirm] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [fieldErrors, setFieldErrors] = React.useState<{ email?:string; token?:string; password?:string; confirm?:string }>({})
    const toast = useToast()
    const nav = useNavigate()

    function validate(){
        const err: { email?:string; token?:string; password?:string; confirm?:string } = {}
        if (!email || !email.includes('@')) err.email = 'Podaj poprawny email'
        if (!token) err.token = 'Wprowadź kod resetu'
        if (!password || password.length < 6) err.password = 'Hasło musi mieć co najmniej 6 znaków'
        if (password !== confirm) err.confirm = 'Hasła nie są takie same'
        return err
    }

    async function submit(){
        const v = validate()
        setFieldErrors(v)
        if (Object.keys(v).length > 0) return
        setLoading(true)
        try{
            await api.resetPassword({ email: email.trim(), token, newPassword: password })
            toast.show('Hasło zmienione. Zaloguj się nowym hasłem.', 'success')
            nav('/login')
        }catch(e:any){
            // show general error under token if present
            setFieldErrors({ token: String(e?.message ?? e) })
        }finally{ setLoading(false) }
    }

    return (
        <div className="card" style={{maxWidth:720}}>
            <h3 className="section-title">Ustaw nowe hasło</h3>
            <label>Email (konto)</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="twój@email.pl" aria-invalid={fieldErrors.email?true:false} />
            {fieldErrors.email && <div className="text-danger" style={{fontSize:13, marginTop:6}}>{fieldErrors.email}</div>}

            <label>Kod resetu</label>
            <input className="input" value={token} onChange={e=>setToken(e.target.value)} placeholder="Kod resetu" aria-invalid={fieldErrors.token?true:false} />
            {fieldErrors.token && <div className="text-danger" style={{fontSize:13, marginTop:6}}>{fieldErrors.token}</div>}

            <label>Nowe hasło</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nowe hasło" aria-invalid={fieldErrors.password?true:false} />
            {fieldErrors.password && <div className="text-danger" style={{fontSize:13, marginTop:6}}>{fieldErrors.password}</div>}

            <label>Powtórz hasło</label>
            <input className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Powtórz hasło" aria-invalid={fieldErrors.confirm?true:false} />
            {fieldErrors.confirm && <div className="text-danger" style={{fontSize:13, marginTop:6}}>{fieldErrors.confirm}</div>}

            <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn primary" onClick={submit} disabled={loading}>{loading ? 'Zmieniam…' : 'Zmień hasło'}</button>
                <button className="btn ghost" onClick={()=>nav('/login')}>Anuluj</button>
            </div>
        </div>
    )
}
