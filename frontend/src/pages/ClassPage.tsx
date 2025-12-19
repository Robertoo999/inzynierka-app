import React from 'react'
import StudentResults from '../components/StudentResults'
import { useNavigate, useParams, Link } from 'react-router-dom'
import {
    api, LANG_CAPS, type Role, type Classroom, type LessonListItem, type LessonDetail,
    type LessonActivity, type ActivityBody, type PublicTask, type Submission
} from '../api'
import ImageUploader from '../components/ImageUploader'
import LessonEditorPage from './lesson-editor/LessonEditorPage'
import type { LessonEditorHandle } from './lesson-editor/LessonEditorPage'
import QuizViewer from '../components/QuizViewer'
import ClassProgressOverview from '../components/ClassProgressOverview'
import ClassSubmissionsTab from '../components/ClassSubmissionsTab'
import Tabs from '../components/Tabs'
import { useToast } from '../components/Toasts'
import LocalTestConsole from '../components/LocalTestConsole'
import ConfirmModal from '../components/ConfirmModal'
import Breadcrumbs from '../components/Breadcrumbs'

const input: React.CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid var(--line)', width: '100%', background:'var(--input-bg)', color:'var(--text)' }
const ta: React.CSSProperties = { ...input, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }
const btn: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', color:'var(--text)' }

function Modal({ open, onClose, children }:{ open:boolean; onClose:()=>void; children: React.ReactNode }) {
    if (!open) return null
    // delegate to counted modal so module can auto-expand when modals are open
    return <ModalCountered open={open} onClose={onClose}>{children}</ModalCountered>
}

// enhance Modal to update a global open-counter so parent modules can react (auto full-width)
function ModalCountered({ open, onClose, children }:{ open:boolean; onClose:()=>void; children: React.ReactNode }){
    const [mounted, setMounted] = React.useState(false)
    const innerRef = React.useRef<HTMLDivElement|null>(null)
    React.useEffect(()=>{
        // ensure global counter exists
        if ((window as any).__lessonModalCount == null) (window as any).__lessonModalCount = 0
        // when open becomes true, increment
        if (open) {
            (window as any).__lessonModalCount = ((window as any).__lessonModalCount || 0) + 1
            try{ window.dispatchEvent(new CustomEvent('lesson:modal:count', { detail: { count: (window as any).__lessonModalCount } })) }catch{}
            setMounted(true)
        }
        // focus management and Esc handling
        if (open) {
            setTimeout(()=>{
                try { innerRef.current?.focus() } catch {}
            }, 10)
            const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { ev.stopPropagation(); onClose() } }
            window.addEventListener('keydown', onKey)
            return ()=> window.removeEventListener('keydown', onKey)
        }
        return ()=>{
            if (mounted) {
                (window as any).__lessonModalCount = Math.max(0, ((window as any).__lessonModalCount || 1) - 1)
                try{ window.dispatchEvent(new CustomEvent('lesson:modal:count', { detail: { count: (window as any).__lessonModalCount } })) }catch{}
            }
        }
    },[open])

    if (!open) return null
    return (
        <div role="dialog" aria-modal="true" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', zIndex:50}}>
            <div ref={innerRef} tabIndex={-1} style={{minWidth:360, maxWidth:900, width:'92%', background:'var(--panel)', border:'1px solid var(--line)', borderRadius:12, padding:16, maxHeight:'90vh', overflow:'auto'}}>
                <div style={{display:'flex', justifyContent:'flex-end', marginBottom:8}}>
                    <button className="btn" style={btn} onClick={onClose} aria-label="Close">✕</button>
                </div>
                {children}
            </div>
        </div>
    )
}

// replace Modal usages in this file to call ModalCountered by changing the symbol name

import { useAuth } from '../hooks/useAuth'

export default function ClassPage() {
    const { classId } = useParams()
    const nav = useNavigate()
    const { auth } = useAuth()
    const token = auth?.token ?? ''

    const [klass, setKlass] = React.useState<Classroom | null>(null)
    const [lessons, setLessons] = React.useState<LessonListItem[]|null>(null)
    const [selectedLessonId, setSelectedLessonIdState] = React.useState<string | null>(null)
    const [msg, setMsg] = React.useState('')
    const [lessonFilter, setLessonFilter] = React.useState('')
    const selectionKey = React.useMemo(() => (classId ? `class:${classId}:selectedLesson` : null), [classId])
    const setLessonSelection = React.useCallback((lessonId: string | null) => {
        setSelectedLessonIdState(lessonId)
        if (!selectionKey || typeof window === 'undefined') return
        try {
            if (lessonId) {
                window.localStorage.setItem(selectionKey, lessonId)
            } else {
                window.localStorage.removeItem(selectionKey)
            }
        } catch (err) {
            console.warn('Nie udało się zapisać wyboru lekcji', err)
        }
    }, [selectionKey])
    const [members, setMembers] = React.useState<Array<{ id: string; email: string; firstName?: string|null; lastName?: string|null; role: string; joinedAt: string }> | null>(null)
    const [overviewOpen, setOverviewOpen] = React.useState(false)
    const [createLessonOpen, setCreateLessonOpen] = React.useState(false)
    const [newLessonTitle, setNewLessonTitle] = React.useState('Nowa lekcja')
    const toast = useToast()
    const [confirmMember, setConfirmMember] = React.useState<{ id: string; email: string } | null>(null)
    // Dynamiczna etykieta zapisu zależnie od aktywnego bloku w edytorze
    const [saveLabel, setSaveLabel] = React.useState<string>('Zapisz lekcję')
    // Ref to control LessonEditorPage (save/reload)
    const lessonEditorRef = React.useRef<LessonEditorHandle | null>(null)

    React.useEffect(() => {
        if (!token || !classId) return
        api.myClasses(token)
            .then(list => setKlass(list.find(c => String(c.id) === String(classId)) ?? { id:Number(classId), name:'Klasa'} as any))
            .catch(()=>setKlass({ id:Number(classId), name:'Klasa'} as any))
    }, [token, classId])

    async function reload() {
        await reloadAndSync(selectedLessonId ?? null)
    }
    React.useEffect(() => { reloadAndSync() }, [classId])

    const visibleLessons = React.useMemo(() => {
        if (!lessons) return null
        const query = lessonFilter.trim().toLowerCase()
        if (!query) return lessons
        return lessons.filter(l => l.title?.toLowerCase().includes(query))
    }, [lessons, lessonFilter])

    // keep lessons sorted newest-first and maintain selected lesson when reloading
    async function reloadAndSync(selectNewId?: string|null) {
        if (!token || !classId) return
        try {
            let list = await api.listLessonsInClass(token, Number(classId))
            // sort by createdAt desc (newest first). fallback to id desc
            list = list.slice().sort((a,b) => {
                const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
                const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
                if (ta !== tb) return tb - ta
                return (b.id > a.id) ? 1 : -1
            })
            setLessons(list)
            setMsg('')

            let desired: string | null = selectNewId ?? null
            if (!desired && selectionKey && typeof window !== 'undefined') {
                try {
                    const stored = window.localStorage.getItem(selectionKey)
                    if (stored) desired = stored
                } catch (err) {
                    console.warn('Nie udało się odczytać zapisanego wyboru lekcji', err)
                }
            }

            if (desired && !list.find(l => l.id === desired)) {
                desired = null
            }
            if (!desired && list.length > 0) {
                desired = list[0].id
            }

            setLessonSelection(desired ?? null)
        } catch (e:any) {
            setMsg(String(e))
        }
    }

    // load members when participants tab is active
    // moved below tab declaration to avoid using tab before its definition

    if (!auth) return (
        <div className="card"><p className="text-muted">Brak sesji. <Link to="/login">Zaloguj się</Link>.</p></div>
    )

    const role = auth.role as Role

    const [tab, setTab] = React.useState<'LESSONS'|'SUBMISSIONS'|'PARTICIPANTS'|'SETTINGS'|'RESULTS'>('LESSONS')
    // tabs shown depend on role: students only see LESSONS; teachers see PARTICIPANTS and SETTINGS
    const tabsForRole = React.useMemo(() => {
        if (role === 'TEACHER') return [
            { key: 'LESSONS', label: 'Lekcje' },
            { key: 'SUBMISSIONS', label: 'Zgłoszenia' },
            { key: 'PARTICIPANTS', label: 'Uczestnicy' },
            { key: 'SETTINGS', label: 'Ustawienia' }
        ]
        return [
            { key: 'LESSONS', label: 'Lekcje' },
            { key: 'RESULTS', label: 'Moje wyniki' }
        ]
    }, [role])

    React.useEffect(() => {
        if (tab !== 'PARTICIPANTS' || !token || !klass) return
        setMembers(null)
        api.getClassMembers(token, klass.id)
            .then(list => { setMembers(list); setMsg('') })
            .catch((e:any) => { console.error('Nie udało się wczytać członków klasy', e); setMembers([]); setMsg(String(e)) })
    }, [tab, token, klass])

    // Nasłuchuj zmian aktywnego typu aktywności z edytora lekcji
    React.useEffect(()=>{
        function onActiveChanged(e:any){
            const t = e?.detail?.type
            if (t === 'TASK') setSaveLabel('Zapisz zadanie')
            else if (t === 'QUIZ') setSaveLabel('Zapisz quiz')
            else if (t === 'CONTENT') setSaveLabel('Zapisz blok')
            else setSaveLabel('Zapisz lekcję')
        }
        window.addEventListener('lesson:active-changed', onActiveChanged)
        return ()=> window.removeEventListener('lesson:active-changed', onActiveChanged)
    }, [])

    // modal counting removed — no global fullwidth behavior

    return (
        <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <button onClick={() => nav('/')} className="btn back" style={btn}>&larr; Wróć</button>
                <div style={{flex:1}}>
                    <h2 className="page-title" style={{margin:0}}>{klass?.name ?? 'Klasa'}</h2>
                    <Breadcrumbs items={[{ label: 'Klasy', to: role === 'TEACHER' ? '/teacher/classes' : '/student/classes' }, { label: klass?.name ?? 'Klasa' }]} />
                </div>
            </div>

                <div style={{marginTop:12}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                    <Tabs
                        tabs={tabsForRole}
                        active={tab}
                        onChange={(k)=> setTab(k as any)}
                    />
                    {/* Przegląd klasy tylko na zakładce Lekcje */}
                    {role === 'TEACHER' && klass && tab === 'LESSONS' && (
                        <div style={{display:'flex', gap:8}}>
                            <button className="btn" style={btn} onClick={()=> setOverviewOpen(true)}>Przegląd klasy</button>
                            <button className="btn" style={btn} onClick={()=> setCreateLessonOpen(true)}>Dodaj lekcję</button>
                        </div>
                    )}
                </div>

                {tab === 'LESSONS' && (
                    <div>
                        <h3 style={{marginTop:8}}>Lekcje</h3>

                        {/* Teacher view: list on the left, single editor on the right */}
                        {role === 'TEACHER' ? (
                            <div style={{display:'grid', gridTemplateColumns: '340px 1fr', gap:18, alignItems:'start'}}>
                                <aside className="card" style={{padding:12, maxHeight:'80vh', overflowY:'auto'}}>
                                    <div style={{marginBottom:8}}>
                                        <h3 style={{margin:'0 0 8px 0'}}>Lekcje w klasie</h3>
                                        <input
                                            type="search"
                                            placeholder="Filtruj po tytule"
                                            aria-label="Filtruj lekcje po tytule"
                                            value={lessonFilter}
                                            onChange={(e) => setLessonFilter(e.target.value)}
                                            style={{...input, width:'100%'}}
                                        />
                                    </div>
                                    <div style={{display:'grid', gap:8}}>
                                        {!lessons ? (
                                            <p className="text-muted">Ładowanie…</p>
                                        ) : lessons.length === 0 ? (
                                            <p className="text-muted">Brak lekcji.</p>
                                        ) : visibleLessons && visibleLessons.length > 0 ? (
                                            visibleLessons.map(l => (
                                                <div key={l.id} className={"card" + (l.id === selectedLessonId ? ' selected' : '')} style={{padding:10, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer'}} onClick={() => setLessonSelection(l.id)}>
                                                    <div style={{flex:1, minWidth:0, display:'grid', gap:4}}>
                                                        <div style={{fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{l.title}</div>
                                                        <div className="text-muted" style={{fontSize:12}}>{new Date(l.createdAt).toLocaleString()}</div>
                                                        <div className="text-muted" style={{fontSize:12, display:'flex', gap:6, flexWrap:'wrap'}}>
                                                            <span>{l.blocksCount} bloków</span>
                                                            <span>• {l.tasksCount} zadań</span>
                                                            <span>• {l.quizzesCount} quizów</span>
                                                            <span>• max {l.maxPoints} pkt</span>
                                                        </div>
                                                    </div>
                                                    <div style={{display:'flex', gap:8, marginLeft:8}}>
                                                        <button className="btn" style={{...btn}} onClick={(e)=>{ e.stopPropagation(); setLessonSelection(l.id) }}>Otwórz</button>
                                                        <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={async (e)=>{ e.stopPropagation(); if (!confirm('Usuń lekcję?')) return; try{ await api.deleteLessonInClass(token, klass!.id, l.id); await reloadAndSync(); toast.show('Usunięto lekcję','success') }catch(e:any){ toast.show(String(e),'error') } }}>Usuń</button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted">Brak lekcji dla podanego filtra.</p>
                                        )}
                                    </div>
                                    {/* CTA usunięte na życzenie: brak dodatkowego modułu tworzenia lekcji w panelu listy */}
                                </aside>

                                <section style={{minWidth:0}}>
                                    {!lessons ? <p className="text-muted">Ładowanie…</p> : !selectedLessonId ? <p className="text-muted">Wybierz lekcję z listy aby edytować</p> : (() => {
                                        const sel = lessons.find(x=>x.id === selectedLessonId)
                                        return sel ? (
                                            <div style={{display:'grid', gap:12}}>
                                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                                    <div>
                                                        <h2 style={{margin:0}}>{sel.title}</h2>
                                                        <div className="text-muted">{new Date(sel.createdAt).toLocaleString()}</div>
                                                    </div>
                                                    <div style={{display:'flex',gap:8}}>
                                                        {/* Real save for the whole lesson using the editor's imperative API */}
                                                        <button className="btn primary" style={btn} onClick={async ()=>{
                                                            try{
                                                                await lessonEditorRef.current?.save()
                                                            }catch(e:any){ toast.show(String(e),'error') }
                                                            }}>{saveLabel}</button>
                                                        {/* Mapa postępu usunięta — używamy Przeglądu klasy */}
                                                        <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={async ()=>{ if (!confirm('Usuń lekcję?')) return; try{ await api.deleteLessonInClass(token, klass!.id, sel.id); await reloadAndSync(); toast.show('Usunięto lekcję','success') }catch(e:any){ toast.show(String(e),'error') } }}>Usuń</button>
                                                    </div>
                                                </div>

                                                {/* Student summary moved into lesson editor (avoids duplication) */}

                                                {/* Reuse existing LessonEditorPage for full editor */}
                                                <LessonEditorPage ref={lessonEditorRef} key={sel.id} token={token} role={role} klass={klass!} lesson={sel} onChanged={() => reloadAndSync(selectedLessonId)} showHeader={false} />
                                                <ClassProgressOverview open={overviewOpen} onClose={() => setOverviewOpen(false)} token={token} classId={klass!.id} />
                                            </div>
                                        ) : <p className="text-muted">Lekcja nie znaleziona.</p>
                                    })()}
                                </section>
                            </div>
                        ) : (
                            <div style={{display:'grid', gap:12}}>
                                {!lessons ? <p className="text-muted">Ładowanie…</p> : lessons.length === 0 ? <p className="text-muted">Brak lekcji.</p> : (
                                    lessons.map(l => (
                                        <div key={l.id} className="card" style={{padding:12}}>
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                <div>
                                                    <b>{l.title}</b>
                                                    <div className="text-muted">{new Date(l.createdAt).toLocaleString()}</div>
                                                </div>
                                                <div style={{display:'flex', gap:8}}>
                                                    <button className="btn" style={btn} onClick={() => window.location.href = `/student/classes/${klass?.id}/lessons/${l.id}`}>Otwórz</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'SUBMISSIONS' && role === 'TEACHER' && klass && (
                    <div style={{marginTop:8}}>
                        <h3 className="section-title">Zgłoszenia uczniów</h3>
                        <ClassSubmissionsTab token={token} classId={klass.id} />
                    </div>
                )}

                {tab === 'RESULTS' && role === 'STUDENT' && klass && (
                    <div style={{marginTop:8}}>
                        <h3 className="section-title">Moje wyniki</h3>
                        <StudentResults token={token} classId={klass.id} />
                    </div>
                )}

                {tab === 'PARTICIPANTS' && (
                    <div style={{marginTop:8}}>
                        <h3 className="section-title">Uczestnicy</h3>
                        {members === null ? (
                            <p className="text-muted">Ładowanie…</p>
                        ) : members.length === 0 ? (
                            <p className="text-muted">Brak uczestników lub brak uprawnień do wyświetlenia listy.</p>
                        ) : (
                            <ul className="list">
                                {members.map(m => (
                                    <li key={m.id} style={{ display:'flex', justifyContent:'space-between', padding:8, border:'1px solid var(--line)', borderRadius:8, marginBottom:6 }}>
                                        <div>
                                            <div><b>{(m.firstName || m.lastName) ? `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() : m.email}</b> <span className="time">{new Date(m.joinedAt).toLocaleString()}</span></div>
                                            {(m.firstName || m.lastName) && (
                                                <div className="text-muted" style={{fontSize:12}}>{m.email}</div>
                                            )}
                                            <div className="text-muted">{m.role}</div>
                                        </div>
                                        {role === 'TEACHER' && (
                                            <div style={{display:'flex',alignItems:'center', gap:8}}>
                                                {/* copy email */}
                                                <button className="btn" onClick={()=>{ navigator.clipboard.writeText(m.email); toast.show('Adres skopiowany', 'success') }}>Kopiuj email</button>
                                                {/* do not allow deleting yourself */}
                                                {m.email !== auth?.email && (
                                                    <button className="btn" style={{borderColor:'#6b1d1d'}} onClick={() => setConfirmMember({ id: m.id, email: m.email })}>Usuń</button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {klass?.joinCode && (
                            <div style={{marginTop:8, display:'flex', gap:8, alignItems:'center'}}>
                                <div style={{padding:8,background:'rgba(255,255,255,0.02)',border:'1px solid var(--line)',borderRadius:8}}><b>{klass.joinCode}</b></div>
                                <button className="btn" onClick={()=>{ navigator.clipboard?.writeText(klass.joinCode || ''); setMsg('Kod skopiowany') }}>Kopiuj kod</button>
                            </div>
                        )}
                        {msg && <p className="text-muted" style={{marginTop:8}}>Info: {msg}</p>}
                        <ConfirmModal
                            open={!!confirmMember}
                            title={confirmMember ? `Usuń użytkownika ${confirmMember.email}?` : undefined}
                            description={confirmMember ? 'Operacja jest nieodwracalna — użytkownik zostanie usunięty z klasy.' : undefined}
                            confirmLabel="Usuń"
                            cancelLabel="Anuluj"
                            onCancel={() => setConfirmMember(null)}
                            onConfirm={async () => {
                                if (!confirmMember || !token || !klass) { setConfirmMember(null); return }
                                try{
                                    await api.deleteClassMember(token, klass.id, confirmMember.id)
                                    toast.show('Użytkownik usunięty', 'success')
                                    const refreshed = await api.getClassMembers(token, klass.id)
                                    setMembers(refreshed)
                                }catch(e:any){ toast.show('Błąd przy usuwaniu: ' + (e?.message ?? String(e)), 'error') }
                                setConfirmMember(null)
                            }}
                        />
                    </div>
                )}

                {tab === 'SETTINGS' && (
                    <div style={{marginTop:8}}>
                        <h3 className="section-title">Ustawienia</h3>
                        <p className="text-muted">Ustawienia klasy.</p>
                        <div style={{display:'grid',gap:8,maxWidth:520}}>
                            <label>Nazwa klasy<input className="input" value={klass?.name ?? ''} disabled /></label>
                            <label>Kod dołączenia<input className="input" value={klass?.joinCode ?? ''} disabled /></label>
                            {role === 'TEACHER' && klass && (
                                <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:6}}>
                                    <div style={{display:'flex', gap:8}}>
                                        <button className="btn" style={btn} onClick={async () => {
                                            try{
                                                const sample = {
                                                    title: 'Przykładowa lekcja',
                                                    content: 'Auto-generated sample lesson',
                                                    activities: [
                                                        { type: 'CONTENT', title: 'Wprowadzenie', body: JSON.stringify({ blocks: [{ type: 'markdown', md: 'Witaj w próbnej lekcji.' }] }) },
                                                        { type: 'TASK', title: 'Zadanie demonstracyjne', task: { title: 'Rozwiązanie demo', description: 'Opis zadania demo', maxPoints: 5, starterCode: 'function solve(){ return 0 }', tests: '' } }
                                                    ]
                                                }
                                                await api.createLessonWithActivities(token, klass.id, sample as any)
                                                toast.show('Utworzono przykładową lekcję', 'success')
                                                await reload()
                                            }catch(e:any){ toast.show(String(e),'error') }
                                        }}>Dodaj przykładową lekcję</button>
                                    </div>
                                    <div style={{display:'flex', flexDirection:'column', gap:4}}>
                                        <button
                                            className="btn"
                                            style={{...btn, borderColor:'#6b1d1d'}}
                                            onClick={async () => {
                                                if (!klass) return
                                                if (!confirm(`Czy na pewno chcesz usunąć klasę "${klass.name}"? Tej operacji nie można cofnąć.`)) return
                                                try{
                                                    await api.deleteClass(token, klass.id)
                                                    toast.show('Usunięto klasę', 'success')
                                                    nav('/teacher/classes')
                                                }catch(e:any){
                                                    toast.show('Błąd przy usuwaniu klasy: ' + (e?.message ?? String(e)), 'error')
                                                }
                                            }}
                                        >
                                            Usuń klasę
                                        </button>
                                        <small className="text-muted" style={{fontSize:12}}>
                                            Tej operacji nie można cofnąć.
                                        </small>
                                    </div>
                                </div>
                            )}
                            {role === 'STUDENT' && klass && (
                                <div style={{display:'flex', gap:8, marginTop:6}}>
                                    <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={async () => {
                                        if (!confirm('Czy na pewno chcesz opuścić tę klasę?')) return
                                        try{
                                            await api.leaveClass(token, klass.id)
                                            toast.show('Opuściłeś klasę', 'success')
                                            // redirect to student's classes list
                                            window.location.href = '/student/classes'
                                        }catch(e:any){ toast.show('Błąd przy opuszczaniu klasy: ' + (e?.message ?? String(e)), 'error') }
                                    }}>Opuść klasę</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Modal: create new lesson (teacher) */}
                <Modal open={createLessonOpen} onClose={()=>setCreateLessonOpen(false)}>
                    <h3>Nowa lekcja</h3>
                    <div style={{display:'grid', gap:8}}>
                        <input className="input" style={input} value={newLessonTitle} onChange={e=>setNewLessonTitle(e.target.value)} placeholder="Tytuł lekcji" />
                        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                            <button className="btn" style={btn} onClick={()=>setCreateLessonOpen(false)}>Anuluj</button>
                            <button className="btn" style={{...btn, background:'#153d2a', borderColor:'#225f41'}} onClick={async ()=>{
                                if (!klass) return
                                const title = (newLessonTitle||'').trim() || 'Nowa lekcja'
                                try{
                                    const created = await api.createLessonInClass(token, klass.id, { title })
                                    setCreateLessonOpen(false)
                                    setNewLessonTitle('Nowa lekcja')
                                    await reloadAndSync(created.id)
                                }catch(e:any){ toast.show(String(e),'error') }
                            }}>Utwórz</button>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    )
}
/* ----- moduł lekcji: (usunięty CTA tworzenia nowej lekcji na prośbę) ----- */

function LessonModule({ token, role, klass, lesson, onChanged }:{
    token:string; role:Role; klass:Classroom; lesson:LessonListItem; onChanged:()=>void;
}) {
    const [detail, setDetail] = React.useState<LessonDetail|null>(null)
    const [taskMetaMap, setTaskMetaMap] = React.useState<Record<string, PublicTask| null>>({})
    const [activeId, setActiveId] = React.useState<string|undefined>(undefined)
    const [editOpen, setEditOpen] = React.useState(false)
    const [delOpen, setDelOpen] = React.useState(false)
    const [attemptsOpen, setAttemptsOpen] = React.useState(false)
    const [attemptsActivityId, setAttemptsActivityId] = React.useState<string|null>(null)
    const [localTitle, setLocalTitle] = React.useState(lesson.title)
    const [localDesc, setLocalDesc] = React.useState('')
    const [draggingId, setDraggingId] = React.useState<string|null>(null)
    const [dragOverId, setDragOverId] = React.useState<string|null>(null)

    async function load(){
        const d = await api.getLesson(lesson.id)
        setDetail(d); setLocalDesc(d.content ?? ''); if (!activeId && d.activities[0]) setActiveId(d.activities[0].id)
        // load task metadata (language, starter) for activities that reference tasks
        const toLoad = (d.activities || []).map((a:any)=> a.taskId).filter(Boolean).filter((id:any)=> !(id in taskMetaMap))
        if (toLoad.length > 0) {
            try{
                const results = await Promise.all(toLoad.map((tid:any) => api.getPublicTask(tid).catch(()=>null)))
                setTaskMetaMap(m => {
                    const copy = { ...(m||{}) }
                    for (let i = 0; i < toLoad.length; i++) {
                        const tid = toLoad[i]
                        copy[tid] = results[i]
                    }
                    return copy
                })
            }catch(e){}
        }
    }
    React.useEffect(() => { load() }, [lesson.id])

    async function saveMeta(){ await api.updateLessonInClass(token, klass.id, lesson.id, { title: localTitle, content: localDesc }); setEditOpen(false); onChanged(); await load() }
    async function removeLesson(){ await api.deleteLessonInClass(token, klass.id, lesson.id); setDelOpen(false); onChanged() }

    const active = detail?.activities.find(a => a.id === activeId)

    const activityIndex = React.useMemo(() => {
        if (!detail || !activeId) return -1
        return detail.activities.findIndex(a => a.id === activeId)
    }, [detail, activeId])
    const totalActivities = detail?.activities.length ?? 0

    function goPrev(){ if (!detail) return; const i = activityIndex; if (i>0) setActiveId(detail.activities[i-1].id) }
    function goNext(){ if (!detail) return; const i = activityIndex; if (i < (detail.activities.length-1)) setActiveId(detail.activities[i+1].id) }

    // Drag-and-drop handlers for activity reordering
    function onDragStart(e: React.DragEvent, id: string) {
        try { e.dataTransfer?.setData('text/plain', id) } catch {}
        setDraggingId(id)
    }
    function onDragOver(e: React.DragEvent, id: string) {
        e.preventDefault(); // allow drop
        setDragOverId(id)
    }
    function onDragEnd() { setDraggingId(null); setDragOverId(null) }
    async function onDrop(e: React.DragEvent, targetId: string) {
        e.preventDefault()
        const draggedId = e.dataTransfer?.getData('text/plain')
        if (!draggedId || !detail) { setDraggingId(null); setDragOverId(null); return }
        if (draggedId === targetId) { setDraggingId(null); setDragOverId(null); return }
        const arr = detail.activities
        const from = arr.findIndex((x:any)=> x.id === draggedId)
        const to = arr.findIndex((x:any)=> x.id === targetId)
        if (from < 0 || to < 0) { setDraggingId(null); setDragOverId(null); return }
        // optimistic reorder
        const newArr = arr.slice()
        const [item] = newArr.splice(from, 1)
        newArr.splice(to, 0, item)
        setDetail(d => d ? { ...d, activities: newArr } : d)
        try {
            await move(token, lesson.id, arr, from, to, setDetail)
        } catch (err) {
            console.error('Nie udało się zmienić kolejności', err)
            // on error, reload real order
            await load()
        }
        setDraggingId(null); setDragOverId(null)
    }

    // keyboard navigation (left/right)
    React.useEffect(()=>{
        function onKey(e: KeyboardEvent){ if (!detail) return; if (e.key === 'ArrowLeft') goPrev(); if (e.key === 'ArrowRight') goNext() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [detail, activityIndex])

        // prepare activities with optional thumbnail for faster render
        let activitiesWithThumb: { activity: any; thumb: string | null }[] = []
        if (detail) {
            activitiesWithThumb = detail.activities.map((a:any) => {
                let thumb: string | null = null
                if (a.type === 'CONTENT' && a.body) {
                    try { const b = JSON.parse(a.body); const img = (b.blocks || []).find((x:any)=>x.type==='image'); if (img) thumb = img.src } catch {}
                }
                return { activity: a, thumb }
            })
        }

    // keep layout simple — no fullwidth toggle; module stays as a larger centered card

    return (
    <div className="module">
            <div className="module-bar">
                <div><b>{lesson.title}</b> <span className="time">{new Date(lesson.createdAt).toLocaleString()}</span></div>
                {role === 'TEACHER' && (
                    <div style={{display:'flex', gap:8}}>
                        <button className="btn" style={btn} onClick={() => setEditOpen(true)}>Edytuj</button>
                        <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={() => setDelOpen(true)}>Usuń</button>
                    </div>
                )}
            </div>

            <div className="module-grid">
                <aside className="module-aside">
                    {!detail ? (
                        <p className="text-muted">Ładowanie…</p>
                    ) : detail.activities.length === 0 ? (
                        <p className="text-muted">Brak aktywności.</p>
                    ) : (
                        <ul className="list">
                            {activitiesWithThumb.map(({ activity: a, thumb }, idx) => (
                                <li key={a.id} className="module-item"
                                    draggable={role === 'TEACHER'}
                                    onDragStart={(e) => role === 'TEACHER' && onDragStart(e as any, a.id)}
                                    onDragOver={(e) => role === 'TEACHER' && onDragOver(e as any, a.id)}
                                    onDrop={(e) => role === 'TEACHER' && onDrop(e as any, a.id)}
                                    onDragEnd={() => role === 'TEACHER' && onDragEnd()}
                                >
                                    <button
                                        onClick={() => setActiveId(a.id)}
                                        className="btn"
                                        style={{
                                            ...btn,
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            background: a.id === activeId ? '#0f171e' : (dragOverId === a.id ? '#122229' : '#0e1419'),
                                            opacity: (draggingId === a.id) ? 0.5 : 1,
                                            cursor: role === 'TEACHER' ? 'grab' : 'pointer'
                                        }}
                                    >
                                        {thumb && <img src={thumb} alt="thumb" style={{width:40, height:40, objectFit:'cover', borderRadius:6, marginRight:8}} />}
                                        <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                                            {a.type === 'CONTENT' ? '📝' : (a.type === 'QUIZ' ? '❓' : '🧪')} {a.title}
                                            {/* show language badge for TASK activities when known */}
                                            {a.type === 'TASK' && a.taskId && taskMetaMap[a.taskId] && (
                                                <span className="badge" style={{marginLeft:8}}>{(taskMetaMap[a.taskId]?.language || '').toUpperCase()}</span>
                                            )}
                                        </span>
                                    </button>

                                    {role === 'TEACHER' && (
                                        <div className="item-actions">
                                            <button
                                                className="btn"
                                                style={btn}
                                                title="Góra"
                                                disabled={idx === 0}
                                                onClick={() => move(token, lesson.id, detail!.activities, idx, idx - 1, setDetail)}
                                            >
                                                ↑
                                            </button>
                                            <button
                                                className="btn"
                                                style={btn}
                                                title="Dół"
                                                disabled={idx === detail!.activities.length - 1}
                                                onClick={() => move(token, lesson.id, detail!.activities, idx, idx + 1, setDetail)}
                                            >
                                                ↓
                                            </button>

                                            <EditActivity token={token} activity={a} onDone={load}/>
                                            <button className="btn" style={btn} title="Próby" onClick={() => { setAttemptsActivityId(a.id); setAttemptsOpen(true) }}>📋</button>
                                            <DeleteActivity token={token} activity={a} onDone={load}/>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}

                    {role === 'TEACHER' && (
                        <CreateActivity token={token} lessonId={lesson.id} onOk={load}/>
                    )}
                </aside>

                <AttemptsModal open={attemptsOpen} onClose={() => { setAttemptsOpen(false); setAttemptsActivityId(null) }} token={token} activityId={attemptsActivityId} />


                <main className="module-content">
                    {!active ? <p className="text-muted">Wybierz aktywność.</p> : (
                        <div style={{display:'grid', gap:10}}>
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                                <div style={{display:'flex', alignItems:'center', gap:8}}>
                                    <button className="btn" style={btn} onClick={goPrev} disabled={activityIndex <= 0}>◀</button>
                                    <button className="btn" style={btn} onClick={goNext} disabled={activityIndex < 0 || activityIndex >= totalActivities-1}>▶</button>
                                    <div style={{marginLeft:6}}><b>{active.title}</b></div>
                                </div>
                                <div style={{display:'flex', alignItems:'center', gap:8}}>
                                    <div className="text-muted">{activityIndex >= 0 ? `${activityIndex+1}/${totalActivities}` : ''}</div>
                                    <div style={{width:140, height:8, background:'rgba(255,255,255,0.03)', borderRadius:8, overflow:'hidden'}}>
                                        <div style={{height:'100%', background:'#153d2a', width: totalActivities>0 && activityIndex>=0 ? `${Math.round((activityIndex+1)/totalActivities*100)}%` : '0%'}} />
                                    </div>
                                </div>
                            </div>

                            {active.type === 'CONTENT'
                                ? <ContentViewer activity={active}/>
                                : active.type === 'QUIZ'
                                    ? <QuizViewer token={token} activity={active} onSubmitted={load} />
                                    : <TaskActivity token={token} role={role} activity={active} onChanged={load}/>
                            }
                        </div>
                    )}
                </main>
            </div>

            {/* MODALE LEKCJI */}
            <Modal open={editOpen} onClose={() => setEditOpen(false)}>
                <h3>Edytuj lekcję</h3>
                <input style={input} value={localTitle} onChange={e => setLocalTitle(e.target.value)}
                       placeholder="Tytuł"/>
                <textarea style={{...ta, marginTop: 8}} rows={5} value={localDesc}
                          onChange={e => setLocalDesc(e.target.value)}/>
                <div style={{display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end'}}>
                    <button className="btn" style={btn} onClick={() => setEditOpen(false)}>Anuluj</button>
                    <button className="btn" style={{...btn, background: '#153d2a', borderColor: '#225f41'}}
                            onClick={saveMeta}>Zapisz
                    </button>
                </div>
            </Modal>

            <Modal open={delOpen} onClose={() => setDelOpen(false)}>
                <h3>Usunąć lekcję?</h3>
                <p className="text-muted">Znikną wszystkie aktywności i zadania należące do tej lekcji.</p>
                <div style={{display: 'flex', gap: 8, justifyContent: 'flex-end'}}>
                    <button className="btn" style={btn} onClick={() => setDelOpen(false)}>Anuluj</button>
                    <button className="btn" style={{...btn, background: '#471919', borderColor: '#6b1d1d'}}
                            onClick={removeLesson}>Usuń
                    </button>
                </div>
            </Modal>
        </div>
    )
}

async function move(
    token: string,
    lessonId: string,
    arr: LessonActivity[],
    a: number,
    b: number,
    setDetail: React.Dispatch<React.SetStateAction<LessonDetail | null>>
) {
    if (b < 0 || b >= arr.length) return
    const A = arr[a]
    try {
        const updated = await api.moveActivity(token, lessonId, A.id, { newIndex: b })
        // updated is the new array of activities from server
        setDetail(d => d ? { ...d, activities: updated } : d)
    } catch (e:any) {
        console.error('Nie udało się przenieść', e)
    }
}

function ContentViewer({ activity }:{ activity: LessonActivity }) {
    let body: ActivityBody | null = null
    try { body = activity.body ? JSON.parse(activity.body) : null } catch { body = null }
    if (!body || !body.blocks?.length) return <p className="text-muted">Brak treści.</p>
    // Prefer consistent order: image → markdown → code (labelled)
    const blocks = Array.isArray(body.blocks) ? body.blocks : []
	
	type ImageBlock = { type: 'image'; src: string; alt?: string }
    const img = blocks.find(
        (b: any): b is ImageBlock => b && b.type === 'image'
    )
    const texts = blocks.filter((b:any)=> b && b.type === 'markdown')
    const codes = blocks.filter((b:any)=> b && b.type === 'code')
    const embeds = blocks.filter((b:any)=> b && b.type === 'embed')
    const esc = (s:string) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c] as string))
    function highlightPython(src:string): string {
        let out = esc(src)
        out = out.replace(/(\"[^\"]*\"|'[^']*')/g, '<span style="color:#e6d06c">$1<\/span>')
        out = out.replace(/(#.*)$/gm, '<span style="color:#6aa3d9">$1<\/span>')
        const kw = ['def','return','if','elif','else','for','while','in','and','or','not','import','from','as','class','try','except','finally','with','yield','lambda','True','False','None','print','range']
        const kwRe = new RegExp('\\b(' + kw.join('|') + ')\\b','g')
        out = out.replace(kwRe, '<span style="color:#9fe0d6">$1<\/span>')
        out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#c5a5c5">$1<\/span>')
        return out
    }
    return (
        <div style={{ display:'grid', gap:10 }}>
            {img && (
                <div style={{width:'100%', height:360, maxWidth:860, margin:'0 auto', background:'var(--panel)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden'}}>
                    <img src={img.src} alt={img.alt||'Ilustracja do treści bloku'} style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                </div>
            )}
            {texts.map((t:any,i:number)=> <div key={'md-'+i} style={{whiteSpace:'pre-wrap'}}>{t.md}</div>)}
            {codes.length>0 && (
                <div>
                    <div style={{marginBottom:6,fontWeight:700}}>Przykład kodu</div>
                    {codes.map((c:any,i:number)=> (
                        <pre key={'code-'+i} style={{margin:0, padding:10, background:'var(--input-bg)', border:'1px solid var(--line)', borderRadius:8, overflowX:'auto'}}>
                            <code dangerouslySetInnerHTML={{__html: (c.lang && String(c.lang).toLowerCase().startsWith('py')) ? highlightPython(String(c.code||'')) : esc(String(c.code||''))}} />
                        </pre>
                    ))}
                </div>
            )}
            {embeds.map((e:any,i:number)=> <iframe key={'em-'+i} src={e.url} title="embed" style={{width:'100%', aspectRatio:'16/9', border:0}} />)}
        </div>
    )
}


function CreateActivity({ token, lessonId, onOk }:{ token:string; lessonId:string; onOk:()=>void }) {
    const toast = useToast()
    const [tab, setTab] = React.useState<'CONTENT'|'TASK'>('CONTENT')
    const [msg, setMsg] = React.useState('')
    const [ctTitle, setCtTitle] = React.useState('Wprowadzenie')
    const [md, setMd] = React.useState('## Temat lekcji\nOpis krok po kroku…')
    const [img, setImg] = React.useState(''); const [embed, setEmbed] = React.useState('')
    const [tTitle, setTTitle] = React.useState('Ćwiczenie 1')
    const [description, setDescription] = React.useState('Krótki opis…')
    const [maxPoints, setMaxPoints] = React.useState(10)
    const [starterCode, setStarterCode] = React.useState<string>(()=> (LANG_CAPS as any).javascript?.sample || 'function solve(input){ return input }')
    // programming language for a coding task (affects student's editor)
    const [language, setLanguage] = React.useState<string>('javascript')
    // local multiple test cases before creation
    const [localTests, setLocalTests] = React.useState<{ input:string; expected:string; points:number; visible:boolean; mode?:string }[]>([])
    const localTotalPoints = React.useMemo(()=> localTests.reduce((sum,t)=> sum + (Number(t.points)||0), 0), [localTests])

    async function createContent(){
        setMsg('Tworzę treść…')
        try{
            if (!ctTitle || ctTitle.trim().length === 0) { setMsg('Tytuł bloku jest wymagany'); toast.show('Tytuł bloku jest wymagany', 'error'); return }
            const blocks: any[] = [{ type:'markdown', md }]
            if (img.trim()) blocks.push({ type:'image', src: img.trim() })
            if (embed.trim()) blocks.push({ type:'embed', url: embed.trim() })
            await api.createActivity(token, lessonId, { type:'CONTENT', title: ctTitle, body: JSON.stringify({blocks}) })
            setMsg('Dodano ✅'); toast.show('Dodano blok treści', 'success'); onOk()
        }catch(e:any){ setMsg(String(e)) }
    }
    React.useEffect(()=>{
        const caps:any = (LANG_CAPS as any)[language] || {}
        const sample = caps.sample || caps.sampleIO || starterCode
        setStarterCode(sample || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language])

    async function createTask(){
        setMsg('Tworzę zadanie…')
        try{
            if (!tTitle || tTitle.trim().length === 0) { setMsg('Tytuł zadania jest wymagany'); toast.show('Tytuł zadania jest wymagany', 'error'); return }
            // Create task and activity in single call (backend creates both atomically)
            const activity = await api.createActivityWithTask(token, lessonId, {
                type: 'TASK', title: tTitle,
                task: { title: tTitle, description, maxPoints, starterCode, tests: '', language }
            })
            // if user added local tests, create them via API for created task
            if (localTests.length > 0 && activity.taskId) {
                for (const [idx, tcase] of localTests.entries()) {
                    // skip invalid tests
                    if (!tcase.input || String(tcase.input).trim().length === 0 || !tcase.expected || String(tcase.expected).trim().length === 0) {
                        toast.show('Pominięto test z pustym wejściem/oczekiwanym wynikiem', 'info')
                        continue
                    }
                    await api.createTest(token, activity.taskId, { input: tcase.input, expected: tcase.expected, points: tcase.points, visible: tcase.visible, ordering: idx, mode: tcase.mode ?? 'IO' })
                }
            }
            setMsg('Dodano ✅'); toast.show('Dodano zadanie', 'success'); onOk()
        }catch(e:any){ setMsg(String(e)) }
    }

    return (
        <div style={{ marginTop:12 }}>
                                                    <div style={{display:'flex',gap:8}}>
                <button className="btn" style={{...btn, background:tab==='CONTENT'?'#0f171e':'#0e1419'}} onClick={()=>setTab('CONTENT')}>📝 Treść</button>
                <button className="btn" style={{...btn, background:tab==='TASK'?'#0f171e':'#0e1419'}} onClick={()=>setTab('TASK')}>🧪 Ćwiczenie</button>
            </div>
            <div style={{ marginTop:8, padding:10, border:'1px solid #1e2630', borderRadius:10 }}>
                {tab==='CONTENT'?(
                    <div style={{ display:'grid', gap:8 }}>
                        <input style={input} value={ctTitle} onChange={e=>setCtTitle(e.target.value)} placeholder="Tytuł bloku" />
                        <textarea style={ta} rows={5} value={md} onChange={e=>setMd(e.target.value)} />
                        <ImageUploader value={img} onChange={setImg} placeholder="Obraz (URL – opcjonalnie)" />
                        <input style={input} value={embed} onChange={e=>setEmbed(e.target.value)} placeholder="Embed (np. YouTube URL – opcjonalnie)" />
                        <button className="btn" style={btn} onClick={createContent}>Dodaj blok treści</button>
                    </div>
                ):(
                    <div style={{ display:'grid', gap:8 }}>
                        <input style={input} value={tTitle} onChange={e=>setTTitle(e.target.value)} placeholder="Tytuł zadania" />
                        <input style={input} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Opis" />
                        <input type="number" style={input} value={maxPoints} onChange={e=>setMaxPoints(Number(e.target.value))} />
                        <textarea style={ta} rows={5} value={starterCode} onChange={e=>setStarterCode(e.target.value)} />
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                            <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                <span style={{fontSize:12}}>Język:</span>
                                <select className="select" value={language} onChange={e=>setLanguage(e.target.value)} style={{marginLeft:8}}>
                                    <option value="javascript">JavaScript</option>
                                    <option value="python">Python</option>
                                    {/* scope reduced to JS + Python */}
                                </select>
                            </label>
                        </div>
                        <div style={{border:'1px dashed #233038', padding:8, borderRadius:8, marginTop:8}}>
                            <b>Testy automatyczne</b>
                            <div className="text-muted" style={{fontSize:12, marginTop:4}}>
                                Każdy test sprawdza poprawność rozwiązania. Punkty testu to jego waga.
                                Suma punktów z zaliczonych testów składa się na wynik, maksymalnie do wartości
                                „Maksymalna liczba punktów” zadania.
                            </div>
                            {localTests.map((lt, i) => (
                                <div key={i} style={{display:'grid', gap:6, marginTop:6, padding:8, border:'1px solid #1e2630', borderRadius:8}}>
                                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                        <input style={{...input, flex:1}} value={lt.input} placeholder="Wejście" onChange={e=>setLocalTests(s=>s.map((x,idx)=> idx===i ? {...x, input: e.target.value} : x))} />
                                        <input style={{...input, width:240}} value={lt.expected} placeholder="Oczekiwany wynik" onChange={e=>setLocalTests(s=>s.map((x,idx)=> idx===i ? {...x, expected: e.target.value} : x))} />
                                    </div>
                                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                                        <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                            <span style={{fontSize:12}}>Tryb: IO</span>
                                        </label>
                                        <input type="number" style={{...input, width:120}} value={lt.points} placeholder="Punkty testu" onChange={e=>setLocalTests(s=>s.map((x,idx)=> idx===i ? {...x, points: Number(e.target.value)||0} : x))} />
                                        <label style={{display:'flex', gap:6, alignItems:'center'}}><input type="checkbox" checked={lt.visible} onChange={e=>setLocalTests(s=>s.map((x,idx)=> idx===i ? {...x, visible: e.target.checked} : x))} /> Widoczny dla ucznia</label>
                                        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
                                            <button className="btn" style={btn} onClick={()=>setLocalTests(s=>s.filter((_,idx)=>idx!==i))}>Usuń</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div style={{display:'flex', gap:8, marginTop:8}}>
                                <button className="btn" style={btn} onClick={()=>setLocalTests(s=>[...s, { input:'', expected:'', points:0, visible:true }])}>Dodaj test</button>
                            </div>
                            <div className="text-muted" style={{marginTop:6, fontSize:12, display:'flex', alignItems:'center', gap:8}}>
                                <span>Suma punktów w testach: <b>{localTotalPoints}</b></span>
                                <button className="btn" style={btn} onClick={()=>setMaxPoints(localTotalPoints)}>Ustaw jako maks. punkty zadania</button>
                            </div>
                            {/* Lokalna konsola do szybkiego sprawdzania funkcji solve() w JS podczas tworzenia testów */}
                            {language === 'javascript' && (
                                <LocalTestConsole starterCode={starterCode} />
                            )}
                        </div>
                        <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
                            <button className="btn" style={btn} onClick={createTask}>Dodaj zadanie</button>
                            <small className="text-muted">Wybierz język i dodaj testy; uczniowie otrzymają edytor w wybranym języku.</small>
                        </div>
                    </div>
                )}
                {msg && <small className="text-muted" style={{marginLeft:8}}>{msg}</small>}
            </div>
        </div>
    )
}

// LocalTestConsole moved to components/LocalTestConsole

function EditActivity({ token, activity, onDone }:{ token:string; activity:LessonActivity; onDone:()=>void }) {
    const [open, setOpen] = React.useState(false)
    const [title, setTitle] = React.useState(activity.title)
    const [md, setMd] = React.useState('')
    React.useEffect(()=>{
        if (activity.type==='CONTENT'){
            try { const b = activity.body? JSON.parse(activity.body) as ActivityBody : {blocks:[]} ;
                const m = (b as any).blocks.find((x:any)=>x.type==='markdown'); setMd(m?.md||'') } catch {}
        }
    },[activity.id])

    async function save(){
        if (activity.type==='CONTENT'){
            const body: ActivityBody = { blocks: [{type:'markdown', md}] as any }
            await api.updateActivity(token, activity.id, { title, body: JSON.stringify(body) })
        } else {
            await api.updateActivity(token, activity.id, { title })
        }
        setOpen(false); onDone()
    }

    return <>
        <button className="btn" style={btn} title="Edytuj" onClick={()=>setOpen(true)}>✎</button>
        <Modal open={open} onClose={()=>setOpen(false)}>
            <h3>Edytuj aktywność</h3>
            <input style={input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tytuł" />
            {activity.type==='CONTENT' && <textarea style={{...ta, marginTop:8}} rows={6} value={md} onChange={e=>setMd(e.target.value)} />}
            <div style={{display:'flex', gap:8, marginTop:10, justifyContent:'flex-end'}}>
                <button className="btn" style={btn} onClick={()=>setOpen(false)}>Anuluj</button>
                <button className="btn" style={{...btn, background:'#153d2a', borderColor:'#225f41'}} onClick={save}>Zapisz</button>
            </div>
        </Modal>
    </>
}

function DeleteActivity({ token, activity, onDone }:{ token:string; activity:LessonActivity; onDone:()=>void }) {
    const [open, setOpen] = React.useState(false)
    const [alsoTask, setAlsoTask] = React.useState(false)

    async function remove(){
        await api.deleteActivity(token, activity.id)
        if (alsoTask && activity.taskId) await api.deleteTask(token, activity.taskId)
        setOpen(false); onDone()
    }

    return <>
        <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} title="Usuń" onClick={()=>setOpen(true)}>🗑</button>
        <Modal open={open} onClose={()=>setOpen(false)}>
            <h3>Usunąć aktywność?</h3>
            {activity.type==='TASK' &&
                <label style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
                    <input type="checkbox" onChange={e=>setAlsoTask(e.target.checked)} />
                    <span>Usuń również powiązane zadanie</span>
                </label>
            }
            <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                <button className="btn" style={btn} onClick={()=>setOpen(false)}>Anuluj</button>
                <button className="btn" style={{...btn, background:'#471919', borderColor:'#6b1d1d'}} onClick={remove}>Usuń</button>
            </div>
        </Modal>
    </>
}

function TaskActivity({ token, role, activity, onChanged }:{
    token:string; role:Role; activity: LessonActivity; onChanged:()=>void;
}) {
    const [t, setT] = React.useState<PublicTask|null>(null)
    const [editOpen, setEditOpen] = React.useState(false)
    React.useEffect(() => { if (activity.taskId) api.getPublicTask(activity.taskId).then(setT).catch(()=>setT(null)) }, [activity.taskId])

    return (
        <div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                <h4 style={{margin:'6px 0'}}>{activity.title}</h4>
                {role==='TEACHER' && <button className="btn" style={btn} onClick={()=>setEditOpen(true)}>Edytuj zadanie</button>}
            </div>
            {t ? <p className="text-muted" style={{marginTop:0}}>{t.description} • max {t.maxPoints}p</p> : <p className="text-muted">Ładowanie zadania…</p>}
            {role === 'STUDENT'
                ? <StudentEditor token={token} taskId={activity.taskId!} />
                : <TeacherSubmissions token={token} taskId={activity.taskId!} />
            }
            <TaskEditModal open={editOpen} onClose={()=>setEditOpen(false)} token={token} taskId={activity.taskId!} onSaved={()=>{ setEditOpen(false); onChanged(); }} />
        </div>
    )
}

function TaskEditModal({ open, onClose, token, taskId, onSaved }:{
    open:boolean; onClose:()=>void; token:string; taskId:string; onSaved:()=>void;
}) {
    const [title, setTitle] = React.useState('')
    const [desc, setDesc] = React.useState('')
    const [maxPoints, setMaxPoints] = React.useState<number>(10)
    const [starter, setStarter] = React.useState('')
    const [language, setLanguage] = React.useState<string>('javascript')
    const [tab, setTab] = React.useState<'DETAILS'|'TESTS'>('DETAILS')
    const [testsList, setTestsList] = React.useState<any[]|null>(null)

    React.useEffect(()=>{
        if (!open) return
    api.getPublicTask(taskId).then(t=>{ setTitle(t.title); setDesc(t.description); setMaxPoints(t.maxPoints); setStarter(t.starterCode ?? ''); setLanguage(t.language ?? 'javascript') }).catch(()=>{})
        // load tests
        api.getTests(taskId).then(list=>setTestsList(list)).catch(()=>setTestsList([]))
    },[open, taskId])

    const toast = useToast()

    async function save(){
        if (!title || title.trim().length === 0) { toast.show('Tytuł zadania jest wymagany', 'error'); return }
        try{
            await api.updateTask(token, taskId, { title, description: desc, maxPoints, starterCode: starter, language });
            toast.show('Zapisano zadanie', 'success')
            onSaved()
        }catch(e:any){ toast.show(String(e), 'error') }
    }

    function addTest(){ setTestsList(l => (l||[]).concat([{ input:'', expected:'', points:0, visible:true }])) }
    async function saveTest(idx:number){
        const t = testsList![idx]
        if (!t.input || String(t.input).trim().length === 0 || !t.expected || String(t.expected).trim().length === 0) { toast.show('Wejście i oczekiwany wynik są wymagane dla testu', 'error'); return }
        try{
            if (t.id) {
                await api.updateTest(token, taskId, t.id, { input: t.input, expected: t.expected, points: t.points, visible: t.visible, ordering: idx })
                toast.show('Zapisano test', 'success')
            } else {
                const created = await api.createTest(token, taskId, { input: t.input, expected: t.expected, points: t.points, visible: t.visible, ordering: idx })
                setTestsList(l => l!.map((x,i)=> i===idx ? created : x))
                toast.show('Dodano test', 'success')
            }
        }catch(e:any){ toast.show(String(e), 'error') }
    }
    async function deleteTest(idx:number){ const t = testsList![idx]; try{ if (t?.id) await api.deleteTest(token, taskId, t.id); setTestsList(l => l!.filter((_,i)=>i!==idx)); toast.show('Usunięto test', 'success') }catch(e:any){ toast.show(String(e), 'error') } }

    return (
        <Modal open={open} onClose={onClose}>
            <h3>Edytuj zadanie</h3>
            <div style={{display:'flex', gap:8, marginBottom:8}}>
                <button className="btn" style={{...btn, background: tab==='DETAILS' ? '#0f171e' : '#0e1419'}} onClick={()=>setTab('DETAILS')}>Szczegóły</button>
                <button className="btn" style={{...btn, background: tab==='TESTS' ? '#0f171e' : '#0e1419'}} onClick={()=>setTab('TESTS')}>Testy</button>
            </div>
            {tab==='DETAILS' ? (
                <>
                    <input style={input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tytuł" />
                    <input style={{...input, marginTop:6}} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Opis" />
                    <input type="number" style={{...input, marginTop:6}} value={maxPoints} onChange={e=>setMaxPoints(Number(e.target.value))} placeholder="Maksymalna liczba punktów (limit)" />
                    <textarea style={{...ta, marginTop:6}} rows={5} value={starter} onChange={e=>setStarter(e.target.value)} />
                    <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8}}>
                        <label style={{display:'flex', gap:6, alignItems:'center'}}>
                            <span style={{fontSize:12}}>Język:</span>
                            <select className="select" value={language} onChange={e=>setLanguage(e.target.value)} style={{marginLeft:8}}>
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                            </select>
                        </label>
                    </div>
                </>
            ) : (
                <div>
                    <div className="text-muted" style={{fontSize:12, marginBottom:8}}>
                        Testy automatyczne porównują działanie rozwiązania z oczekiwanym wynikiem.
                        Punkty testu to jego waga; suma punktów zaliczonych testów daje wynik,
                        ale nie przekroczy „Maksymalnej liczby punktów” zadania.
                        Tryb IO – porównuje tekst wyjścia programu. (Tryb EVAL został usunięty.)
                    </div>
                    <div style={{display:'flex', gap:8}}>
                        <button className="btn" style={btn} onClick={addTest}>Dodaj test</button>
                    </div>
                    <div style={{marginTop:8}}>
                        {testsList === null ? (
                            <p className="text-muted">Ładowanie…</p>
                        ) : testsList.length === 0 ? (
                            <p className="text-muted">Brak testów.</p>
                        ) : (
                            testsList.map((t, idx) => (
                                <div key={t.id ?? idx} style={{border:'1px solid #1e2630', padding:8, borderRadius:8, marginBottom:6}}>
                                    <input style={input} value={t.input ?? ''} placeholder="Wejście" onChange={e=>setTestsList(l => l!.map((x,i)=> i===idx ? {...x, input: e.target.value} : x))} />
                                    <input style={{...input, marginTop:6}} value={t.expected ?? ''} placeholder="Oczekiwany wynik" onChange={e=>setTestsList(l => l!.map((x,i)=> i===idx ? {...x, expected: e.target.value} : x))} />
                                    <div style={{display:'flex', gap:8, marginTop:6}}>
                                        <input type="number" style={{...input, width:120}} value={t.points ?? 0} placeholder="Punkty testu" onChange={e=>setTestsList(l => l!.map((x,i)=> i===idx ? {...x, points: Number(e.target.value)||0} : x))} />
                                        <label style={{display:'flex', gap:6, alignItems:'center'}}><input type="checkbox" checked={!!t.visible} onChange={e=>setTestsList(l => l!.map((x,i)=> i===idx ? {...x, visible: e.target.checked} : x))} /> Widoczny dla ucznia</label>
                                        <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                            <span style={{fontSize:12}}>Tryb: IO</span>
                                        </label>
                                        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
                                            <button className="btn" style={btn} onClick={()=>saveTest(idx)}>Zapisz</button>
                                            <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={()=>deleteTest(idx)}>Usuń</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        {Array.isArray(testsList) && (
                            <div className="text-muted" style={{fontSize:12, marginTop:6, display:'flex', alignItems:'center', gap:8}}>
                                <span>Suma punktów w testach: <b>{testsList.reduce((s,t)=> s + (Number(t.points)||0), 0)}</b></span>
                                <button className="btn" style={btn} onClick={()=>setMaxPoints(testsList.reduce((s,t)=> s + (Number(t.points)||0), 0))}>Ustaw jako maks. punkty zadania</button>
                            </div>
                        )}
                        {language === 'javascript' && <LocalTestConsole starterCode={starter} />}
                    </div>
                </div>
            )}
            <div style={{display:'flex', gap:8, marginTop:10, justifyContent:'flex-end'}}>
                <button className="btn" style={btn} onClick={onClose}>Anuluj</button>
                <button className="btn" style={{...btn, background:'#153d2a', borderColor:'#225f41'}} onClick={save}>Zapisz</button>
            </div>
        </Modal>
    )
}

/* ---- uczniowie/nauczyciele ---- */

function StudentEditor({ token, taskId }:{ token:string; taskId:string }) {
    const [content, setContent] = React.useState('Moje rozwiązanie…')
    const [code, setCode] = React.useState('function solve(){ return 42 }')
    const [msg, setMsg] = React.useState('')
    const [editorLoaded, setEditorLoaded] = React.useState(false)
    const [EditorComponent, setEditorComponent] = React.useState<any>(null)
    const [taskMeta, setTaskMeta] = React.useState<PublicTask|null>(null)
    const [latestSubmission, setLatestSubmission] = React.useState<Submission|null>(null)
    const [loadingLatest, setLoadingLatest] = React.useState(false)
    const [editorLanguage, setEditorLanguage] = React.useState<string>('javascript')

    // dynamically try to load Monaco editor (@monaco-editor/react)
    React.useEffect(()=>{
        let mounted = true
        ;(async ()=>{
            try{
                const mod = await import('@monaco-editor/react')
                if (!mounted) return
                setEditorComponent(() => mod.default)
            }catch(e){
                // not installed or failed - we'll fallback to textarea
            } finally { if (mounted) setEditorLoaded(true) }
        })()
        return ()=>{ mounted = false }
    },[])

    // load task metadata (language, starter code)
    React.useEffect(()=>{
        let mounted = true
        api.getPublicTask(taskId).then(t => { if (!mounted) return; setTaskMeta(t); setEditorLanguage(t.language ?? 'javascript'); if (t.starterCode) setCode(t.starterCode) }).catch(()=>{})
        return ()=>{ mounted = false }
    },[taskId])

    const loadLatestSubmission = React.useCallback(async () => {
        if (!token) { setLatestSubmission(null); return }
        setLoadingLatest(true)
        try {
            const data = await api.mySubmissionForTask(token, taskId)
            setLatestSubmission(data)
        } catch (e:any) {
            const status = typeof e?.message === 'string' ? e.message : ''
            if (status && status.startsWith('404')) {
                setLatestSubmission(null)
            } else if (!(status && status.startsWith('401'))) {
                setMsg(String(e))
            }
        } finally {
            setLoadingLatest(false)
        }
    }, [taskId, token])

    React.useEffect(()=>{ loadLatestSubmission() }, [loadLatestSubmission])

    // disable actions when no token or attempt exhausted
    const attemptsUsed = latestSubmission?.attemptNumber ?? 0
    const rawMaxAttempts = latestSubmission?.maxAttempts ?? taskMeta?.maxAttempts ?? 1
    const maxAttempts = Math.max(1, rawMaxAttempts)
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed)
    const lockAfterSubmit = taskMeta?.lockAfterSubmit ?? true
    const allowRunBeforeSubmit = taskMeta?.allowRunBeforeSubmit ?? true
    const limitReached = attemptsUsed >= maxAttempts
    const runLocked = false // runs always allowed, even after submit

    const canSubmit = !!token && !limitReached
    const canRun = !!token && true

    const [runResult, setRunResult] = React.useState<any|null>(null)
    const [running, setRunning] = React.useState(false)
    const toast = useToast()
    const [confirmSubmit, setConfirmSubmit] = React.useState(false)

    async function run(){
        if (!canRun) {
            toast.show('Brak dostępnych prób uruchomienia', 'error')
            return
        }
        setRunning(true); setMsg('Uruchamianie...'); setRunResult(null)
        try{
            const res = await api.runTask(token, taskId, { code, language: editorLanguage })
            if (res && res.error) {
                // graceful handling when server cannot run code (500 / unsupported)
                setMsg('Uruchamianie nieobsługiwane na serwerze: ' + String(res.error))
                toast.show('Uruchamianie nieobsługiwane', 'error')
                setRunResult(null)
            } else {
                setRunResult(res)
                setMsg('Gotowe')
            }
        }catch(e:any){ setMsg(String(e)) }
        finally{ setRunning(false) }
    }

    async function submit(){
        setMsg('Wysyłam…')
        try{
            const res = await api.submit(token, taskId, { content, code })
            setLatestSubmission(res)
            setMsg(`Wysłano ✅ (próba ${res.attemptNumber ?? '?'}/${res.maxAttempts ?? maxAttempts})`)
            toast.show('Wysłano ✅','success')
        } catch(e:any){
            setMsg(String(e))
            toast.show(String(e), 'error')
        }
    }

    return (
        <div style={{ marginTop: 8, padding: 8, border:'1px solid #1e2630', borderRadius: 8 }}>
            <textarea rows={2} style={ta} value={content} onChange={e=>setContent(e.target.value)} />
            {editorLoaded && EditorComponent ? (
                <div style={{ marginTop:6 }}>
                    <EditorComponent
                        height="260px"
                        language={editorLanguage}
                        value={code}
                        onChange={(v:any)=>setCode(v||'')}
                        onMount={(editor:any, monaco:any)=>{
                            try{
                                monaco.languages.registerCompletionItemProvider('python', {
                                    provideCompletionItems: (model:any, position:any) => {
                                        const word = model.getWordUntilPosition(position)
                                        const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
                                        return {
                                            suggestions: [
                                                { label: 'solve', kind: monaco.languages.CompletionItemKind.Function, insertText: 'def solve(input):\n    # TODO\n    return input\n', range },
                                                { label: 'for-range', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'for i in range(10):\n    print(i)', range },
                                                { label: 'list-comp', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[x*x for x in range(10)]', range }
                                            ]
                                        }
                                    }
                                })
                            }catch{}
                        }}
                    />
                </div>
            ) : (
                <textarea rows={6} style={{...ta, marginTop: 6}} value={code} onChange={e=>setCode(e.target.value)} />
            )}
            {/* simple console area to show run output */}
            <div style={{marginTop:8, display:'grid', gap:6}}>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <div className="text-muted">Konsola ({editorLanguage})</div>
                    <div style={{marginLeft:'auto', display:'flex', gap:8, alignItems:'center'}}>
                        {taskMeta && <small className="text-muted">Próba {attemptsUsed}/{maxAttempts ?? 1} {limitReached ? '(limit osiągnięty)' : ''}</small>}
                        <button className="btn" style={btn} onClick={()=>{ setMsg(''); setRunResult(null) }}>Wyczyść</button>
                    </div>
                </div>
                {runResult && runResult.stdout && <pre style={{ padding:8, background:'#071018', borderRadius:6 }}>{runResult.stdout}</pre>}
            </div>
            <div style={{display:'flex', gap:8, marginTop:8, alignItems:'center'}}>
                <button
                    style={{...btn, opacity: canSubmit ? 1 : 0.6}}
                    onClick={() => {
                        if (!canSubmit) {
                            toast.show(limitReached ? 'Wykorzystano wszystkie próby' : 'Musisz być zalogowany', 'error')
                            return
                        }
                        setConfirmSubmit(true)
                    }}
                    disabled={!canSubmit}
                >Wyślij</button>
                <button
                    style={{...btn, opacity: canRun ? 1 : 0.6}}
                    onClick={() => {
                        if (!canRun) {
                            const reason = !token ? 'Musisz być zalogowany' : limitReached && lockAfterSubmit ? 'Zadanie zablokowane po oddaniu' : 'Uruchamianie wyłączone'
                            toast.show(reason, 'error')
                            return
                        }
                        run()
                    }}
                    disabled={!canRun || running}
                >{running ? 'Uruchamianie…' : 'Uruchom'}</button>
                {runResult && <div style={{color: runResult.failed === 0 ? '#9fd9a6' : '#f3b3b3', marginLeft:8}}>
                    <b>{runResult.score ?? 0} pkt</b> • {runResult.passed ?? 0}/{runResult.passed + (runResult.failed ?? 0)}
                </div>}
            </div>
            {taskMeta && (
                <div style={{marginTop:6}}>
                    <small className="text-muted">
                        Maks prób: {maxAttempts}. Pozostało: {attemptsRemaining}. Uruchamianie kodu: bez limitu.
                    </small>
                </div>
            )}
            {loadingLatest && <small className="text-muted" style={{display:'block', marginTop:4}}>Ładuję ostatnie zgłoszenie…</small>}
            {latestSubmission && (
                <div style={{marginTop:8, padding:8, border:'1px solid #243140', borderRadius:6, background:'#0b141d'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <strong>Ostatnia ocena</strong>
                        <small className="text-muted">Próba #{latestSubmission.attemptNumber}</small>
                    </div>
                    <div style={{marginTop:4}}>
                        <span>Wynik: <b>{latestSubmission.effectiveScore ?? latestSubmission.points ?? 0}</b> / {latestSubmission.maxPoints ?? taskMeta?.maxPoints ?? 0}</span>
                    </div>
                    {latestSubmission.teacherComment && <div className="text-muted" style={{marginTop:4}}>Komentarz nauczyciela: {latestSubmission.teacherComment}</div>}
                    {latestSubmission.feedback && latestSubmission.feedback !== latestSubmission.teacherComment && <div className="text-muted" style={{marginTop:4}}>Feedback: {latestSubmission.feedback}</div>}
                </div>
            )}
            {msg && <small style={{ marginLeft: 8, display:'block', marginTop:6 }}>{msg}</small>}
            {!editorLoaded && <small className="text-muted" style={{display:'block', marginTop:6}}>Tip: install @monaco-editor/react for enhanced editor (npm i -D @monaco-editor/react monaco-editor)</small>}

            <ConfirmModal
                open={confirmSubmit}
                title="Wyślij rozwiązanie?"
                description={`Ta akcja zużyje próbę (${attemptsUsed + 1}/${maxAttempts ?? 1}). Potwierdź wysyłkę.`}
                onCancel={() => setConfirmSubmit(false)}
                onConfirm={async ()=>{
                    setConfirmSubmit(false)
                    await submit()
                }}
                confirmLabel="Wyślij"
            />

            {runResult && (
                <div style={{ marginTop: 10 }}>
                    {runResult.tests && Array.isArray(runResult.tests) && (
                        <div style={{ display:'grid', gap:6 }}>
                            {runResult.tests.map((t:any, i:number) => (
                                <div key={i} style={{ padding:8, borderRadius:6, border:'1px solid #1e2630', background: t.passed ? '#07260a' : '#2b0b0b' }}>
                                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                                        <div>Test #{i+1} — {t.passed ? 'Zaliczony' : 'Niezaliczony'}</div>
                                        <div>{t.points ?? 0} pkt</div>
                                    </div>
                                    {t.error && <div className="text-muted">Błąd: {String(t.error)}</div>}
                                    {t.actual !== undefined && <div className="text-muted">Wynik: {JSON.stringify(t.actual)}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                    {runResult.stdout && <pre style={{ marginTop:8, padding:8, background:'#071018', borderRadius:6 }}>{runResult.stdout}</pre>}
                </div>
            )}

            {/* Visible tests for student */}
            <StudentVisibleTests taskId={taskId} />
        </div>
    )
}

function TeacherSubmissions({ token, taskId }:{ token:string; taskId:string }) {
    const [list, setList] = React.useState<Submission[]|null>(null)
    const [draft, setDraft] = React.useState<Record<string,{manualScore:string; teacherComment:string}>>({})
    const [msg, setMsg] = React.useState('')

    const load = React.useCallback(async () => {
        setMsg('Ładuję…')
        try{
            const data = await api.listSubmissions(token, taskId)
            setList(data)
            const init: Record<string,{manualScore:string; teacherComment:string}> = {}
            data.forEach(s => {
                init[s.id] = {
                    manualScore: s.manualScore != null ? String(s.manualScore) : '',
                    teacherComment: s.teacherComment ?? ''
                }
            })
            setDraft(init)
            setMsg(`OK (${data.length})`)
        }catch(e:any){
            setMsg(String(e))
            setList(null)
        }
    }, [taskId, token])

    React.useEffect(()=>{ load() }, [load])

    async function save(id:string){
        const d = draft[id]
        if (!d) return
        const normalized = d.manualScore.trim()
        const manualScore = normalized === '' ? null : Number(normalized)
        if (manualScore != null && Number.isNaN(manualScore)) {
            setMsg('Nieprawidłowa wartość punktów')
            return
        }
        setMsg('Zapisuję…')
        try {
            await api.gradeSubmission(token, id, { manualScore, teacherComment: d.teacherComment })
            await load()
        } catch(e:any) {
            setMsg(String(e))
        }
    }

    if (!list) return <p className="text-muted">Ładuję zgłoszenia…</p>
    if (list.length === 0) return <p className="text-muted">Brak zgłoszeń.</p>

    return (
        <div style={{ marginTop: 8 }}>
            {list.map(s => {
                const draftRow = draft[s.id] ?? { manualScore: '', teacherComment: '' }
                return (
                    <div key={s.id} style={{ border:'1px solid #1e2630', borderRadius: 8, padding: 8, marginBottom: 6 }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div>
                                <small className="time">{new Date(s.createdAt).toLocaleString()}</small>
                                {' '} {s.status && <span className="badge">{s.status}</span>}
                                {' '} <span className="text-muted">Próba #{s.attemptNumber ?? '?'}/{s.maxAttempts ?? '?'}</span>
                            </div>
                            <div className="text-muted" style={{display:'flex', gap:12}}>
                                <span>Auto: <b>{s.autoScore ?? '–'}</b></span>
                                <span>Manual: <b>{s.manualScore ?? '–'}</b></span>
                                <span>Końcowy wynik: <b>{s.effectiveScore ?? s.points ?? '–'}</b> / {s.maxPoints ?? '–'}</span>
                            </div>
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'140px 1fr auto', gap: 6, marginTop: 8 }}>
                            <input
                                type="number"
                                min={0}
                                style={input}
                                placeholder="Punkty"
                                value={draftRow.manualScore}
                                onChange={e => setDraft(p => ({...p, [s.id]: {...(p[s.id] ?? { teacherComment:'' }), manualScore: e.target.value }}))}
                            />
                            <input
                                style={input}
                                placeholder="Komentarz nauczyciela"
                                value={draftRow.teacherComment}
                                onChange={e => setDraft(p => ({...p, [s.id]: {...(p[s.id] ?? { manualScore:'' }), teacherComment: e.target.value }}))}
                            />
                            <button style={btn} onClick={()=>save(s.id)}>Zapisz</button>
                        </div>
                        {s.feedback && s.feedback !== s.teacherComment && (
                            <div className="text-muted" style={{marginTop:6}}>Feedback: {s.feedback}</div>
                        )}
                        {s.stdout && (
                            <details style={{marginTop:6}}>
                                <summary className="text-muted">Stdout</summary>
                                <pre style={{marginTop:4, padding:6, background:'#071018', borderRadius:6}}>{s.stdout}</pre>
                            </details>
                        )}
                    </div>
                )
            })}
            {msg && <small className="text-muted">Info: {msg}</small>}
        </div>
    )
}

// StudentResults moved to components/StudentResults

function StatusPill({ tone, children }:{ tone:'success'|'warning'|'info'|'muted'; children:React.ReactNode }){
    const palette: Record<'success'|'warning'|'info'|'muted', { bg:string; border:string }> = {
        success:{ bg:'#123522', border:'#1c4d33' },
        warning:{ bg:'#3a2b11', border:'#5c4317' },
        info:{ bg:'#1a2533', border:'#25354a' },
        muted:{ bg:'#1b232e', border:'#263040' }
    }
    const c = palette[tone]
    return <span style={{display:'inline-flex',alignItems:'center',padding:'2px 10px',borderRadius:999,background:c.bg,border:`1px solid ${c.border}`,color:'#e8eef4',fontSize:12,fontWeight:600}}>{children}</span>
}

function StudentVisibleTests({ taskId }:{ taskId:string }){
    const [tests, setTests] = React.useState<any[]|null>(null)
    React.useEffect(()=>{ let mounted=true; api.getTests(taskId).then(l=>{ if(mounted) setTests(l||[]) }).catch(()=> setTests([])); return ()=>{ mounted=false } }, [taskId])
    if (!tests) return null
    const vis = tests.filter(t=> t.visible)
    if (vis.length === 0) return null
    return (
        <div style={{marginTop:10}}>
            <h4>Widoczne testy</h4>
            {vis.map((t,idx)=> (
                <div key={t.id ?? idx} style={{border:'1px solid var(--line)', padding:8, borderRadius:6, marginTop:6}}>
                    <div><strong>Wejście</strong></div>
                    <pre style={{whiteSpace:'pre-wrap'}}>{t.input}</pre>
                    <div style={{marginTop:6}}><strong>Oczekiwany wynik</strong></div>
                    <pre style={{whiteSpace:'pre-wrap'}}>{t.expected}</pre>
                    <div className="text-muted">Punkty: {t.points}</div>
                </div>
            ))}
        </div>
    )
}

/* ------- Admin / Teacher UI helpers ------- */

function AttemptsModal({ open, onClose, token, activityId }:{ open:boolean; onClose:()=>void; token:string; activityId:string|null }){
    const [list, setList] = React.useState<any[]|null>(null)
    const [msg, setMsg] = React.useState('')
    React.useEffect(()=>{
        if (!open || !token || !activityId) return
        setMsg('Ładuję…'); api.getActivityAttempts(token, activityId).then(d=>{ setList(d); setMsg('OK') }).catch(e=>{ setMsg(String(e)); setList(null) })
    },[open, token, activityId])

    function downloadCSV(){
        if (!list) return
        const header = ['id','studentId','correct','total','points','createdAt']
        const rows = [header.join(',')].concat(list.map((r:any)=> header.map(h=>String(r[h] ?? '')).map(v=>`"${v.replace(/"/g,'""')}"`).join(',')))
        const csv = rows.join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `attempts_${activityId}.csv`; a.click(); URL.revokeObjectURL(url)
    }

    if (!open) return null
    return (
        <Modal open={open} onClose={onClose}>
            <h3>Próby</h3>
            {msg && <div className="text-muted">{msg}</div>}
            {list && list.length === 0 && <p className="text-muted">Brak prób.</p>}
            {list && list.length > 0 && (
                <div>
                    <button className="btn" style={btn} onClick={downloadCSV}>Pobierz CSV</button>
                    <ul className="list" style={{marginTop:8}}>
                        {list.map(l => (
                            <li key={l.id} style={{padding:6, border:'1px solid #1e2630', borderRadius:6}}>
                                <div style={{fontSize:12}}>{new Date(l.createdAt).toLocaleString()}</div>
                                <div>{l.correct}/{l.total} • {l.points} pkt • {l.studentId}</div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    )
}

// QuizBuilder był używany tylko w usuniętym kreatorze lekcji.
function QuizBuilder({ open, onClose, onSave }:{ open:boolean; onClose:()=>void; onSave:(activity:any)=>void }){
    const toast = useToast()
    const [title, setTitle] = React.useState('Nowy quiz')
    const [maxPoints, setMaxPoints] = React.useState(10)
    const [questions, setQuestions] = React.useState<any[]>([
        { text: 'Pytanie 1', choices: [ { text: 'Odp A', correct: true }, { text: 'Odp B' } ] }
    ])

    const qDraftKey = 'quizbuilder:draft'
    React.useEffect(()=>{
        if (open){
            try{ const raw = localStorage.getItem(qDraftKey); if (raw){ const obj = JSON.parse(raw); setTitle(obj.title ?? 'Nowy quiz'); setMaxPoints(obj.maxPoints ?? 10); setQuestions(obj.questions ?? questions); return } }catch(e){}
            setTitle('Nowy quiz'); setMaxPoints(10); setQuestions([{ text: 'Pytanie 1', choices:[{text:'Odp A', correct:true},{text:'Odp B'}]}])
        }
    },[open])

    React.useEffect(()=>{
        if (!open) return
        try{ localStorage.setItem(qDraftKey, JSON.stringify({ title, maxPoints, questions })) }catch(e){}
    },[title, maxPoints, questions, open])

    function addQuestion(){ setQuestions(q => [...q, { text: 'Nowe pytanie', choices: [{ text: 'Odp A' }] }]) }
    function removeQuestion(i:number){ setQuestions(q => q.filter((_,idx)=>idx!==i)) }
    function setQuestionText(i:number, v:string){ setQuestions(q => q.map((qq,idx)=> idx===i ? { ...qq, text: v } : qq)) }
    function addChoice(qi:number){ setQuestions(q => q.map((qq,idx)=> idx===qi ? { ...qq, choices: [...qq.choices, { text: 'Nowa' }] } : qq)) }
    function removeChoice(qi:number, ci:number){ setQuestions(q => q.map((qq,idx)=> idx===qi ? { ...qq, choices: qq.choices.filter((_: any, j: number)=> j!==ci) } : qq)) }
    function setChoiceText(qi:number, ci:number, v:string){ setQuestions(q => q.map((qq,idx)=> idx===qi ? { ...qq, choices: qq.choices.map((c:any,j:number)=> j===ci ? { ...c, text: v } : c) } : qq)) }
    function setChoiceCorrect(qi:number, ci:number, val:boolean){ setQuestions(q => q.map((qq,idx)=> idx===qi ? { ...qq, choices: qq.choices.map((c:any,j:number)=> j===ci ? { ...c, correct: val } : c) } : qq)) }

    function save(){
        if (!title || title.trim().length === 0) { toast.show('Tytuł quizu jest wymagany', 'error'); return }
        const body = JSON.stringify({ maxPoints, questions })
        try{ localStorage.removeItem(qDraftKey) }catch(e){}
        onSave({ type: 'QUIZ', title, body })
    }

    if (!open) return null
    return (
        <Modal open={open} onClose={onClose}>
            <h3>Quiz Builder</h3>
            <input style={input} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tytuł" />
            <input type="number" style={{...input, marginTop:6}} value={maxPoints} onChange={e=>setMaxPoints(Number(e.target.value)||0)} />
            <div style={{display:'grid', gap:8, marginTop:8}}>
                {questions.map((q,qi) => (
                    <div key={qi} style={{border:'1px solid #1e2630', padding:8, borderRadius:8}}>
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                            <input style={input} value={q.text} onChange={e=>setQuestionText(qi, e.target.value)} />
                            <div style={{display:'flex', gap:6}}>
                                <button className="btn" style={btn} onClick={()=>addChoice(qi)}>Dodaj odpowiedź</button>
                                <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={()=>removeQuestion(qi)}>Usuń pytanie</button>
                            </div>
                        </div>
                        <div style={{marginTop:6}}>
                            {q.choices.map((c:any,ci:number)=> (
                                <div key={ci} style={{display:'flex', gap:8, alignItems:'center', marginTop:6}}>
                                    <input type="checkbox" checked={!!c.correct} onChange={e=>setChoiceCorrect(qi,ci, e.target.checked)} />
                                    <input style={{...input, flex:1}} value={c.text} onChange={e=>setChoiceText(qi,ci, e.target.value)} />
                                    <button className="btn" style={{...btn, borderColor:'#6b1d1d'}} onClick={()=>removeChoice(qi,ci)}>Usuń</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <div style={{display:'flex', gap:8}}>
                    <button className="btn" style={btn} onClick={addQuestion}>Dodaj pytanie</button>
                    <button className="btn" style={{...btn, background:'#153d2a', borderColor:'#225f41'}} onClick={save}>Zapisz quiz</button>
                </div>
            </div>
        </Modal>
    )
}
