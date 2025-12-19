import React from 'react'
import { useNavigate } from 'react-router-dom'
import { api, type Role, type Classroom } from '../api'
import { ROLE_LABELS_PL } from '../constants/roles'
import { useAuth, type Auth } from '../hooks/useAuth'
import { useToast } from '../components/Toasts'
import Breadcrumbs from '../components/Breadcrumbs'

export default function ClassesPage() {
    const { auth, setAuth } = useAuth()
    const nav = useNavigate()
    const role = auth?.role ?? 'STUDENT'

    return (
        <section className="grid">
            <div style={{display:'grid', gap:12}}>
                <h2 className="section-title">{role === 'TEACHER' ? 'Zarządzanie klasami' : 'Moje klasy'}</h2>
                <Breadcrumbs
                    items={role === 'TEACHER'
                        ? [
                            { label: 'Panel nauczyciela', to: '/teacher' },
                            { label: 'Zarządzanie klasami' },
                        ]
                        : [
                            { label: 'Panel ucznia', to: '/student' },
                            { label: 'Moje klasy' },
                        ]}
                />
                <p className="text-muted" style={{margin:0, fontSize:13}}>
                    {role === 'TEACHER'
                        ? 'Jesteś w panelu zarządzania klasami. Tutaj możesz tworzyć nowe klasy, dołączać do nich oraz usuwać istniejące.'
                        : 'Tutaj dołączysz do klasy za pomocą kodu od nauczyciela oraz zobaczysz listę swoich klas.'}
                </p>
                <AuthCard auth={auth} setAuth={setAuth} />
            </div>
            {auth && <MyClassesCard token={auth.token} role={auth.role} onOpen={c => {
                // navigate to student-scoped class route when viewing from student area, otherwise to the generic class page
                const prefix = window.location.pathname.startsWith('/student') ? '/student' : ''
                nav(`${prefix}/classes/${c.id}`)
            }} />}
        </section>
    )
}

/* --------- komponenty --------- */

function AuthCard({ auth, setAuth }: { auth: Auth; setAuth: (a: Auth) => void }) {
    const [mode, setMode] = React.useState<'login'|'register'>('login')
    const [email, setEmail] = React.useState(auth?.email ?? '')
    const [password, setPassword] = React.useState('Haslo123!')
    const [role, setRole] = React.useState<Role>('STUDENT')
    const [msg, setMsg] = React.useState('')
    const toast = useToast()

    async function doRegister() {
        setMsg('Rejestruję…')
        try {
            const { token, email: e, role: r, firstName, lastName } = await api.register({ email, password, role });
            setAuth({ token, email: e ?? email, firstName: firstName ?? null, lastName: lastName ?? null, role: r });
            setMsg('Zarejestrowano ✅')
            try{ toast.show('Zarejestrowano', 'success') }catch{}
        }
        catch (e:any) { const m = String(e); setMsg(m); try{ toast.show(m, 'error') }catch{} }
    }
    async function doLogin() {
        setMsg('Loguję…')
        try { const { token, email: e, role: r, firstName, lastName } = await api.login({ email, password }); setAuth({ token, email: e ?? email, firstName: firstName ?? null, lastName: lastName ?? null, role: r }); setMsg('Zalogowano ✅'); try{ toast.show('Zalogowano', 'success') }catch{} }
        catch (e:any) { const m = String(e); setMsg(m); try{ toast.show(m, 'error') }catch{} }
    }
    function doLogout(){ setAuth(null); setMsg('Wylogowano.') }

    return (
        <div className="card">
            <h3 className="section-title">{auth ? 'Konto' : (mode==='login'?'Logowanie':'Rejestracja')}</h3>
            {!auth ? (
                <>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <label>Email<input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="user@demo.pl" /></label>
                        <label>Hasło<input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
                    </div>
                    {mode==='register' && (
                        <div style={{marginTop:10}}>
                            <label>Rola{' '}
                                <select className="select" value={role} onChange={e=>setRole(e.target.value as Role)}>
                                    <option value="STUDENT">{ROLE_LABELS_PL.STUDENT}</option>
                                    <option value="TEACHER">{ROLE_LABELS_PL.TEACHER}</option>
                                </select>
                            </label>
                        </div>
                    )}
                    <div style={{display:'flex',gap:10,marginTop:12}}>
                        {mode==='login'
                            ? <button className="btn primary" onClick={doLogin}>Zaloguj</button>
                            : <button className="btn primary" onClick={doRegister}>Zarejestruj</button>}
                        <button className="btn ghost" onClick={()=>setMode(m=>m==='login'?'register':'login')}>
                            {mode==='login'?'Przejdź do rejestracji':'Mam konto – logowanie'}
                        </button>
                    </div>
                    {msg && <p className="text-muted" style={{marginTop:8}}>Info: {msg}</p>}
                </>
            ) : (
                <>
                    <p>Jesteś zalogowany jako <b>{auth.email}</b> <span className="badge">{auth.role}</span></p>
                    <details><summary className="text-muted">Token (skrót)</summary><code>{auth.token.slice(0,28)}…</code></details>
                    <div style={{marginTop:10}}><button className="btn" onClick={doLogout}>Wyloguj</button></div>
                </>
            )}
        </div>
    )
}

function MyClassesCard({ token, role, onOpen }:{
    token:string; role:Role; onOpen:(c:Classroom)=>void;
}) {
    const toast = useToast()
    const [list, setList] = React.useState<Classroom[]|null>(null)
    const [name, setName] = React.useState('Klasa 1A')
    const [code, setCode] = React.useState('')
    const [msg, setMsg] = React.useState('')

    async function refresh(){ try { setList(await api.myClasses(token)); setMsg('') } catch(e:any){ const m = String(e); setMsg(m); try{ toast.show(m,'error') }catch{} } }
    React.useEffect(()=>{ refresh() }, [])

    async function createClass(){
        const nm = (name||'').trim()
        if (nm.length < 3) {
            const m = 'Nazwa klasy musi mieć co najmniej 3 znaki'
            setMsg(m); try{ toast.show(m,'error') }catch{}; return
        }
        setMsg('Tworzę…');
        try{
            await api.createClass(token,{name:nm});
            setName(''); await refresh(); setMsg('Utworzono ✅'); try{ toast.show('Utworzono klasę','success') }catch{}
        } catch(e:any){
            const raw = String(e?.message ?? e)
            const friendly = raw.includes('409') || /już istnieje/i.test(raw)
                ? 'Klasa o tej nazwie już istnieje'
                : raw
            setMsg(friendly); try{ toast.show(friendly,'error') }catch{}
        }
    }
    async function joinByCode(){ setMsg('Dołączam…'); try{ await api.joinClass(token,{code}); setCode(''); await refresh(); setMsg('Dołączono ✅'); try{ toast.show('Dołączono do klasy','success') }catch{} } catch(e:any){ const m=String(e); setMsg(m); try{ toast.show(m,'error') }catch{} } }

    return (
        <div className="card">
            <h3 className="section-title">Moje klasy</h3>
            <div className="grid">
                {role==='TEACHER' && (
                    <div>
                        <h4 className="text-muted" style={{margin:'4px 0'}}>Utwórz klasę</h4>
                        <div style={{display:'flex',gap:8}}>
                            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Nazwa klasy" />
                            <button className="btn primary" onClick={createClass}>Utwórz</button>
                        </div>
                    </div>
                )}
                {role==='STUDENT' && (
                    <div>
                        <h4 className="text-muted" style={{margin:'4px 0'}}>Dołącz do klasy</h4>
                        <div style={{display:'flex',gap:8}}>
                            <input className="input" value={code} onChange={e=>setCode(e.target.value)} placeholder="Kod (np. 7K3A9B)" />
                            <button className="btn primary" onClick={joinByCode}>Dołącz</button>
                        </div>
                    </div>
                )}
                <div>
                    <h4 className="text-muted" style={{margin:'4px 0'}}>Lista klas</h4>
                    {!list ? <p className="text-muted">Ładowanie…</p> :
                        list.length===0 ? <p className="text-muted">Brak klas.</p> :
                            <ul className="list">
                                {list.map(c=>(
                                    <li key={c.id} style={{marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                                        <div>
                                            <b>{c.name}</b> <span className="time">(id: {c.id})</span>
                                            {c.joinCode && <> <span className="badge">kod {c.joinCode}</span></>}
                                        </div>
                                        <div style={{display:'flex', gap:8}}>
                                            <button className="btn" onClick={()=>onOpen(c)}>Otwórz</button>
                                            {role === 'STUDENT' && (
                                                <button className="btn" style={{borderColor:'#6b1d1d'}} onClick={async ()=>{
                                                    try{
                                                        if (!confirm(`Czy na pewno chcesz opuścić klasę ${c.name}?`)) return
                                                        await api.leaveClass(token, c.id)
                                                        try{ await refresh() } catch {}
                                                        try{ toast.show('Opuściłeś klasę', 'success') } catch{}
                                                    }catch(e:any){ try{ toast.show('Błąd: ' + (e?.message ?? String(e)), 'error') }catch{} }
                                                }}>Opuść</button>
                                            )}
                                            {role === 'TEACHER' && (
                                                <button
                                                    className="btn"
                                                    style={{borderColor:'#6b1d1d'}}
                                                    title="Usuń klasę (tej operacji nie można cofnąć)"
                                                    onClick={async ()=>{
                                                        try{
                                                            if (!confirm(`Czy na pewno chcesz usunąć klasę ${c.name}? Tej operacji nie można cofnąć.`)) return
                                                            await api.deleteClass(token, c.id)
                                                            try{ await refresh() } catch {}
                                                            try{ toast.show('Usunięto klasę', 'success') } catch{}
                                                        }catch(e:any){
                                                            try{ toast.show('Błąd: ' + (e?.message ?? String(e)), 'error') }catch{}
                                                        }
                                                    }}
                                                >
                                                    Usuń
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>}
                </div>
                {msg && <p className="text-muted">Info: {msg}</p>}
            </div>
        </div>
    )
}
