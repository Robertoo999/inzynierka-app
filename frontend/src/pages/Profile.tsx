import React from 'react'
import { useAuth } from '../hooks/useAuth'
import Breadcrumbs from '../components/Breadcrumbs'
import { api } from '../api'

export default function Profile(){
    const { auth, setAuth } = useAuth()
    const [oldPass, setOldPass] = React.useState('')
    const [newPass, setNewPass] = React.useState('')
    const [msg, setMsg] = React.useState('')
    const [oldPassErr, setOldPassErr] = React.useState<string|undefined>()
    const [newPassErr, setNewPassErr] = React.useState<string|undefined>()
    const formRef = React.useRef<HTMLDivElement|null>(null)

    async function changePassword(){
        if (!auth) return
        setMsg('')
        // simple client-side validation and focus first invalid input
        const localErrors: { old?: string; next?: string } = {}
        if (!oldPass) localErrors.old = 'Podaj obecne hasło.'
        if (!newPass) localErrors.next = 'Podaj nowe hasło.'
        setOldPassErr(localErrors.old)
        setNewPassErr(localErrors.next)
        if (localErrors.old || localErrors.next) {
            const root = formRef.current
            const firstInvalid = root?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            firstInvalid?.focus()
            setMsg('Uzupełnij wymagane pola.')
            return
        }
        setOldPassErr(undefined)
        setNewPassErr(undefined)
        try{
            // backend may not expose password change; call it only if present
            const res = await (api as any).changePassword(auth.token, { oldPassword: oldPass, newPassword: newPass })
            // update token in auth context so user keeps authenticated session
            setAuth({ ...auth, token: res.token })
            setOldPass('')
            setNewPass('')
            setMsg('Hasło zmienione')
        }catch(e:any){
            let raw = e?.message ? String(e.message) : 'Nieznany błąd zmiany hasła'
            // remove possible leading status numbers if any sneaked in
            raw = raw.replace(/^\d{3}\s+/, '')
            setMsg(raw)
            if (e?.fields) {
                if (e.fields.oldPassword) setOldPassErr(e.fields.oldPassword)
                if (e.fields.newPassword) setNewPassErr(e.fields.newPassword)
            }
        }
    }

    if (!auth) return (
        <div className="card"><p className="text-muted">Zaloguj się, aby zobaczyć profil.</p></div>
    )

    return (
        <div className="card">
            <h3 className="section-title">Profil</h3>
            <Breadcrumbs items={[{ label: 'Profil' }]} />
            <div style={{display:'grid',gap:10}}>
                <div><b>Imię i nazwisko:</b> {(auth.firstName || auth.lastName) ? `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() : '—'}</div>
                <div><b>Email:</b> {auth.email}</div>
                <div><b>Rola:</b> {auth.role}</div>
                <details>
                    <summary className="text-muted">Token (skrót)</summary>
                    <code style={{wordBreak:'break-all'}}>{auth.token}</code>
                </details>

                <h4>Zmiana hasła (jeśli obsługiwane)</h4>
                <div ref={formRef} style={{display:'grid', gap:8}}>
                    <label htmlFor="old-pass" style={{display:'grid', gap:4}}>
                        <span className="text-muted" style={{fontSize:12}}>Stare hasło</span>
                        <input
                            id="old-pass"
                            className="input"
                            type="password"
                            placeholder="Stare hasło"
                            value={oldPass}
                            onChange={e=>setOldPass(e.target.value)}
                            aria-describedby="old-pass-hint old-pass-error"
                            aria-invalid={oldPassErr ? true : false}
                        />
                        <span id="old-pass-hint" className="text-muted" style={{fontSize:12}}>Wpisz swoje obecne hasło.</span>
                        {oldPassErr && <span id="old-pass-error" style={{fontSize:12,color:'var(--danger)'}}>Błąd: {oldPassErr}</span>}
                    </label>
                    <label htmlFor="new-pass" style={{display:'grid', gap:4}}>
                        <span className="text-muted" style={{fontSize:12}}>Nowe hasło</span>
                        <input
                            id="new-pass"
                            className="input"
                            type="password"
                            placeholder="Nowe hasło"
                            value={newPass}
                            onChange={e=>setNewPass(e.target.value)}
                            aria-describedby="new-pass-hint new-pass-error"
                            aria-invalid={newPassErr ? true : false}
                        />
                        <span id="new-pass-hint" className="text-muted" style={{fontSize:12}}>Użyj hasła łatwego do zapamiętania.</span>
                        {newPassErr && <span id="new-pass-error" style={{fontSize:12,color:'var(--danger)'}}>Błąd: {newPassErr}</span>}
                    </label>
                </div>
                <div style={{display:'flex',gap:8}}>
                    <button className="btn" type="button" onClick={changePassword}>Zmień hasło</button>
                    <button className="btn" onClick={()=>setAuth(null)}>Wyloguj</button>
                </div>
                {msg && <div className="text-muted">{msg}</div>}
            </div>
        </div>
    )
}
