import React from 'react'
import { api } from '../../api'
import { useNavigate } from 'react-router-dom'

export default function ForgotPassword(){
    const [email, setEmail] = React.useState('')
    const [loading, setLoading] = React.useState(false)
    const [token, setToken] = React.useState<string | null | undefined>(undefined)
    const [fieldError, setFieldError] = React.useState<string|undefined>()
    const nav = useNavigate()

    function isEmailValid(v: string){
        return Boolean(v && v.includes('@'))
    }

    async function doRequest(){
        setFieldError(undefined)
        if (!isEmailValid(email.trim())) {
            setFieldError('Podaj poprawny adres email')
            return
        }
        setLoading(true)
        try{
            const res = await api.forgotPassword({ email: email.trim() })
            setToken(res?.token ?? null)
        }catch(e:any){
            setToken(undefined)
            setFieldError('Wystąpił błąd. Spróbuj ponownie.')
        }finally{ setLoading(false) }
    }

    return (
        <div className="card" style={{maxWidth:720}}>
            <h3 className="section-title">Reset hasła (tryb demo)</h3>
            <p className="text-muted">W trybie demo wygenerowany kod resetu zostanie wyświetlony zamiast wysłania wiadomości email.</p>

            <label>Email</label>
            <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="np. uczen@szkola.pl" aria-invalid={fieldError?true:false} />
            {fieldError && <div className="text-danger" style={{fontSize:13, marginTop:6}}>{fieldError}</div>}

            <div style={{display:'flex',gap:8,marginTop:10}}>
                <button className="btn primary" onClick={doRequest} disabled={loading || !isEmailValid(email)}>{loading ? 'Wysyłam…' : 'Wygeneruj kod (demo)'}</button>
                <button className="btn ghost" onClick={()=>nav('/login')}>Powrót</button>
            </div>

            {token !== undefined && (
                <div style={{marginTop:16}}>
                    <div className="alert" style={{marginBottom:10}}>Jeśli konto istnieje, kod został wygenerowany. Skopiuj kod poniżej.</div>
                    {token === null ? (
                        <div className="text-muted">Kod został wygenerowany (pokazywany tylko w trybie demo).</div>
                    ) : (
                        <div>
                            <div style={{marginBottom:8}}>Kod resetu (skopiuj):</div>
                            <div style={{display:'flex',gap:8,alignItems:'center'}}>
                                <input readOnly className="input" value={token} style={{background:'#f0f6ff',border:'1px solid rgba(0,0,0,0.08)',padding:'8px 10px',borderRadius:6,flex:1,color:'#000'}} />
                                <button className="btn" onClick={()=>navigator.clipboard?.writeText(token)} aria-label="Kopiuj kod">📋</button>
                                <button className="btn" onClick={()=>nav(`/reset-password?token=${encodeURIComponent(token)}`)} disabled={!token}>Użyj kodu</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
