import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Breadcrumbs from '../../components/Breadcrumbs'
import { api } from '../../api'

export default function StudentHome(){
    const { auth } = useAuth()
    const [classes, setClasses] = React.useState<any[]|null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string|undefined>()

    React.useEffect(()=>{
        if (!auth) return
        setLoading(true)
        api.myClasses(auth.token).then(data=>setClasses(data)).catch(e=>setError(String(e))).finally(()=>setLoading(false))
    }, [auth])

    const totalClasses = classes?.length ?? 0

    return (
        <div className="card" style={{display:'grid', gap:16}}>
            <div style={{ marginBottom: 8 }}>
                <Breadcrumbs
                    items={[
                        { label: 'Panel ucznia', to: '/student' },
                        { label: 'Moje klasy', to: '/student/classes' },
                    ]}
                />
            </div>

            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                <div>
                    <h3 className="section-title">Panel ucznia</h3>
                    <p>Witaj, {(auth && ((auth.firstName || auth.lastName) ? `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() : auth.email))}</p>
                    <p className="text-muted" style={{fontSize:13, marginTop:4}}>
                        Tu znajdziesz swoje klasy i zadania. Otwórz klasę, aby przejść do lekcji, rozwiązywać zadania i quizy oraz sprawdzać swoje wyniki.
                    </p>
                </div>
                <div style={{textAlign:'right', fontSize:12, color:'var(--muted)'}}>
                    <div>Łącznie klas: <b>{totalClasses}</b></div>
                </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1.2fr)', gap:16}}>
                <section style={{display:'grid', gap:12}}>
                    <h4>Twoje klasy</h4>
                    <p className="text-muted" style={{margin:0, fontSize:13}}>
                        Wybierz klasę, aby otworzyć przypisane lekcje, zadania i quizy.
                    </p>
                    <div style={{display:'flex', gap:8, marginTop:4, marginBottom:8, flexWrap:'wrap'}}>
                        <Link to="/student/classes" className="btn">Przejdź do klas</Link>
                        <Link to="/profile" className="btn">Profil</Link>
                    </div>

                    {loading && <div className="text-muted">Ładowanie…</div>}
                    {error && <div className="text-danger">Błąd: {error}</div>}
                    {classes && classes.length === 0 && (
                        <div className="text-muted">Brak klas — dołącz do klasy lub poproś nauczyciela o zaproszenie.</div>
                    )}
                    {classes && classes.length > 0 && (
                        <ul className="list">
                            {classes.map((c:any) => (
                                <li key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                                    <div>
                                        <div style={{display:'flex', alignItems:'baseline', gap:8}}>
                                            <b>{c.name}</b> <small className="text-muted">#{c.id}</small>
                                        </div>
                                        {c.studentCount != null && (
                                            <div className="text-muted" style={{fontSize:12}}>
                                                {c.studentCount} uczniów
                                                {c.lastActivityAt && (
                                                    <>
                                                        {' '}
                                                        • ostatnia aktywność {new Date(c.lastActivityAt).toLocaleDateString('pl-PL')}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{display:'flex', flexDirection:'column', gap:6}}>
                                        <Link to={`/student/classes/${c.id}`} className="btn">Otwórz</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside style={{borderLeft:'1px solid var(--line)', paddingLeft:16, display:'grid', gap:12, alignContent:'flex-start'}}>
                    <h4>Podpowiedzi</h4>
                    <p className="text-muted" style={{fontSize:13}}>
                        Tu widzisz listę swoich klas. Po wejściu do klasy możesz:
                    </p>
                    <ul className="text-muted" style={{fontSize:13, paddingLeft:18, display:'grid', gap:4}}>
                        <li>otwierać lekcje i przeglądać materiały,</li>
                        <li>rozwiązywać zadania i quizy,</li>
                        <li>sprawdzać wyniki i postępy.</li>
                    </ul>
                </aside>
            </div>
        </div>
    )
}
