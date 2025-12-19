import React from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toasts'
import { useNavigate, useLocation } from 'react-router-dom'

function useQuery(){ return new URLSearchParams(useLocation().search) }

export default function ResetPassword(){
    const q = useQuery()
    const token = q.get('token') ?? ''
    const [password, setPassword] = React.useState('')
    const [confirm, setConfirm] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const toast = useToast()
    const nav = useNavigate()

    async function submit(){
        if (!token) { toast.show('Brak tokenu resetu w URL', 'error'); return }
        if (!password || password.length < 6) { toast.show('Hasło musi mieć co najmniej 6 znaków', 'error'); return }
        if (password !== confirm) { toast.show('Hasła nie są takie same', 'error'); return }
        setLoading(true)
        try{
            await api.resetPassword({ token, newPassword: password })
            toast.show('Hasło zmienione. Zaloguj się nowym hasłem.', 'success')
            nav('/login')
        }catch(e:any){ toast.show(String(e), 'error') }
        finally{ setLoading(false) }
    }

    return (
        <div className="card" style={{maxWidth:720}}>
            <h3 className="section-title">Ustaw nowe hasło</h3>
            <label>Nowe hasło</label>
            <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Nowe hasło" />
            <label>Powtórz hasło</label>
            <input className="input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Powtórz hasło" />
            <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn primary" onClick={submit} disabled={loading}>{loading ? 'Zmieniam…' : 'Zmień hasło'}</button>
                <button className="btn ghost" onClick={()=>nav('/login')}>Anuluj</button>
            </div>
        </div>
    )
}
