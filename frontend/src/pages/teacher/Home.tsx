import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import Breadcrumbs from '../../components/Breadcrumbs'
import { api } from '../../api'

export default function TeacherHome(){
    const { auth } = useAuth()
    const nav = useNavigate()
    const [classes, setClasses] = React.useState<any[]|null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string|undefined>()

    React.useEffect(()=>{
        if (!auth) return
        setLoading(true)
        api.myClasses(auth.token).then(data=>setClasses(data)).catch(e=>setError(String(e))).finally(()=>setLoading(false))
    }, [auth])

    const totalClasses = classes?.length ?? 0
    const sampleStudents = classes ? classes.reduce((sum:number, c:any) => sum + (c.studentCount ?? 0), 0) : 0

    return (
        <div className="card" style={{display:'grid', gap:16}}>
            <div style={{ marginBottom: 8 }}>
                <Breadcrumbs
                    items={[
                        { label: 'Panel nauczyciela', to: '/teacher' },
                        { label: 'Zarządzanie klasami', to: '/teacher/classes' },
                    ]}
                />
            </div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                <div>
                    <h3 className="section-title">Panel nauczyciela</h3>
                    <p>Witaj, {(auth && ((auth.firstName || auth.lastName) ? `${auth.firstName ?? ''} ${auth.lastName ?? ''}`.trim() : auth.email))}</p>
                    <p className="text-muted" style={{fontSize:13, marginTop:4}}>
                        Webowy system wspomagający naukę programowania dla uczniów szkół podstawowych,
                        przeznaczony dla nauczyciela i ucznia, zrealizowany zgodnie z zasadami projektowania uniwersalnego.
                    </p>
                </div>
                <div style={{textAlign:'right', fontSize:12, color:'#9fb3c8'}}>
                    <div>Łącznie klas: <b>{totalClasses}</b></div>
                    {totalClasses > 0 && sampleStudents > 0 && (
                        <div>Szacowana liczba uczniów: <b>{sampleStudents}</b></div>
                    )}
                </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1.2fr)', gap:16}}>
                <section style={{display:'grid', gap:12}}>
                    <h4>Twoje klasy</h4>
                    <p className="text-muted" style={{margin:0, fontSize:13}}>
                        Wybierz istniejącą klasę lub utwórz nową, aby zarządzać lekcjami, zadaniami i postępami uczniów.
                    </p>
                    <div style={{display:'flex', gap:8, marginTop:4, marginBottom:8}}>
                        <button
                            type="button"
                            className="btn"
                            onClick={()=> nav('/teacher/classes')}
                        >
                            Zarządzaj klasami
                        </button>
                    </div>
                    {loading && <div className="text-muted">Ładowanie…</div>}
                    {error && <div className="text-danger">Błąd: {error}</div>}
                    {classes && classes.length === 0 && (
                        <div className="text-muted">Brak klas — utwórz nową klasę w panelu administratora.</div>
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
                                        <Link to={`/classes/${c.id}`} className="btn">Otwórz</Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <aside style={{borderLeft:'1px solid #1b2836', paddingLeft:16, display:'grid', gap:12, alignContent:'flex-start'}}>
                    <h4>Podpowiedzi</h4>
                    <p className="text-muted" style={{fontSize:13}}>
                        Tu widzisz listę swoich klas. Po wejściu do klasy możesz:
                    </p>
                    <ul className="text-muted" style={{fontSize:13, paddingLeft:18, display:'grid', gap:4}}>
                        <li>tworzyć lekcje z materiałami, zadaniami i quizami,</li>
                        <li>sprawdzać rozwiązania zadań i quizów uczniów,</li>
                        <li>śledzić postępy całej klasy w czasie.</li>
                    </ul>
                    {/* Usunięto zapowiedź przyszłych funkcji */}
                </aside>
            </div>
        </div>
    )
}
