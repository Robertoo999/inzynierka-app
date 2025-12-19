import React from 'react'
import { api } from '../../api'
import { useToast } from '../../components/Toasts'
import { useNavigate } from 'react-router-dom'

export default function ForgotPassword(){
    const [email, setEmail] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const toast = useToast()
    const nav = useNavigate()

    async function submit(){
        setLoading(true)
        try{
            await api.forgotPassword({ email: email.trim() })
            toast.show('Jeśli taki email istnieje, wysłaliśmy instrukcję (sprawdź logi w trybie dev).', 'info')
            nav('/login')
        }catch(e:any){
            toast.show(String(e), 'error')
        }finally{ setLoading(false) }
    }

    return (
        <div className="card" style={{maxWidth:720}}>
            <h3 className="section-title">Nie pamiętasz hasła?</h3>
            <p className="text-muted">Podaj adres email powiązany z kontem. Jeśli konto istnieje, otrzymasz instrukcję z linkiem resetującym hasło.</p>
            <label>Email</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="twój@email.pl" />
            <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn primary" onClick={submit} disabled={loading}>{loading ? 'Wysyłam…' : 'Wyślij instrukcję'}</button>
                <button className="btn ghost" onClick={()=>nav('/login')}>Powrót</button>
            </div>
        </div>
    )
}
