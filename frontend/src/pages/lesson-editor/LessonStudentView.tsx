import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, type LessonDetail, type LessonActivity, type PublicTask, type Submission, type Task } from '../../api'
import { useToast } from '../../components/Toasts'
import QuizViewer from '../../components/QuizViewer'
import StudentResults from '../../components/StudentResults'
import { useAuth } from '../../hooks/useAuth'
import Tabs from '../../components/Tabs'

const btn: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', color:'var(--text)' }

type QuizAttemptSummary = { correct: number; total: number; points: number; percent?: number; createdAt?: string }

export default function LessonStudentView(){
    const { classId, lessonId } = useParams()
    const [detail, setDetail] = React.useState<LessonDetail | null>(null)
    const [activeId, setActiveId] = React.useState<string|undefined>(undefined)
    // track visited content & quiz activities for progress (content counts when opened once)
    const [visitedContent, setVisitedContent] = React.useState<Set<string>>(new Set())
    const [completedQuizzes, setCompletedQuizzes] = React.useState<Set<string>>(new Set())
    const toast = useToast()
    const nav = useNavigate()

    const { auth } = useAuth()
    const token = auth?.token ?? ''
    const [loadError, setLoadError] = React.useState<string | null>(null)

    React.useEffect(()=>{
        if (!lessonId) return
        api.getLesson(lessonId!)
            .then(d=>{
                const normalizedActivities = Array.isArray(d.activities) ? d.activities : []
                const normalizedDetail: LessonDetail = { ...d, activities: normalizedActivities }
                setDetail(normalizedDetail)
                setActiveTab('lesson')
                // defensively set activeId to first activity if not already set
                setActiveId(prev => prev ?? (normalizedActivities[0] ? normalizedActivities[0].id : undefined))
                setLoadError(null)
            })
            .catch(e=>{
                const msg = String(e)
                console.error('Nie udało się wczytać lekcji', e)
                setLoadError(msg)
                toast.show(msg,'error')
            })
        // fetch class name for header if possible (no-op here; we already use useAuth above)
    }, [lessonId])

    // Persist visited content across sessions (localStorage per lesson)
    React.useEffect(() => {
        if (!lessonId) return
        try {
            const raw = localStorage.getItem(`pl:visitedContent:${lessonId}`)
            if (raw) {
                const arr = JSON.parse(raw)
                if (Array.isArray(arr)) setVisitedContent(new Set(arr))
            }
        } catch {}
    }, [lessonId])
    React.useEffect(() => {
        if (!lessonId) return
        try {
            localStorage.setItem(`pl:visitedContent:${lessonId}` , JSON.stringify(Array.from(visitedContent)))
        } catch {}
    }, [lessonId, visitedContent])

    // debug helper: if URL contains ?debug=1, show raw lesson JSON to help diagnose blank-screen issues
    const qs = new URLSearchParams(window.location.search)
    const debugMode = qs.get('debug') === '1'

    // compute my submissions map (keep hooks at top-level to preserve hook order)
    const [taskSubmissions, setTaskSubmissions] = React.useState<Record<string, Submission>>({})
    const [quizSummaries, setQuizSummaries] = React.useState<Record<string, QuizAttemptSummary>>({})
    const [activeTab, setActiveTab] = React.useState<'lesson'|'results'>('lesson')
    React.useEffect(()=>{
        let mounted = true
        if (!token) {
            setTaskSubmissions({})
            return () => { mounted = false }
        }
        api.mySubmissions(token).then(list => {
            if (!mounted) return
            const map: Record<string, Submission> = {}
            const arr = Array.isArray(list) ? list : []
            for (const entry of arr) {
                if (!entry || !entry.taskId) continue
                const existing = map[entry.taskId]
                if (!existing) {
                    map[entry.taskId] = entry
                    continue
                }
                const prevTime = existing.createdAt ? new Date(existing.createdAt).getTime() : 0
                const nextTime = entry.createdAt ? new Date(entry.createdAt).getTime() : 0
                if (nextTime >= prevTime) {
                    map[entry.taskId] = entry
                }
            }
            setTaskSubmissions(map)
        }).catch(() => {
            if (mounted) setTaskSubmissions({})
        })
        return ()=>{ mounted = false }
    }, [token, lessonId])

    React.useEffect(() => {
        if (!token || !detail) { setQuizSummaries({}); return }
        let cancelled = false
        const quizActivities = Array.isArray(detail.activities)
            ? detail.activities.filter(a => a.type === 'QUIZ')
            : []
        if (quizActivities.length === 0) { setQuizSummaries({}); return }
        ;(async () => {
            const entries: Record<string, QuizAttemptSummary> = {}
            for (const act of quizActivities) {
                try {
                    const attempts = await api.getMyAttempts(token, act.id)
                    if (attempts && attempts.length > 0) {
                        const latest = [...attempts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
                        entries[act.id] = {
                            correct: latest.correct,
                            total: latest.total,
                            points: latest.points,
                            createdAt: latest.createdAt,
                            percent: latest.total > 0 ? (latest.correct / Math.max(1, latest.total)) * 100 : undefined
                        }
                    }
                } catch (err) {
                    console.warn('Nie udało się pobrać prób quizu', err)
                }
            }
            if (!cancelled) {
                setQuizSummaries(entries)
                // Mark quizzes with attempts as completed
                const done = new Set<string>()
                Object.keys(entries).forEach(id => done.add(id))
                setCompletedQuizzes(done)
            }
        })()
        return () => { cancelled = true }
    }, [token, detail])

    const handleTaskSubmitted = React.useCallback((submission: Submission | null) => {
        if (!submission || !submission.taskId) return
        setTaskSubmissions(prev => {
            const next = { ...prev }
            const previous = prev[submission.taskId]
            const prevTime = previous?.createdAt ? new Date(previous.createdAt).getTime() : 0
            const nextTime = submission.createdAt ? new Date(submission.createdAt).getTime() : Date.now()
            if (!previous || nextTime >= prevTime) {
                next[submission.taskId] = submission
            }
            return next
        })
    }, [])

    // Always derive activities early so hooks below remain unconditional
    const activities = Array.isArray(detail?.activities) ? detail!.activities : []
    const active = activities.find(a=>a.id === activeId)
    const isTaskActive = active?.type === 'TASK'
    const layoutColumns = isTaskActive
        ? 'minmax(220px,260px) minmax(520px, 1fr)'
        : 'minmax(220px,260px) 1fr minmax(300px,380px)'

    // count TASK activities only for progress (fixes the 1/3 vs 1 task mismatch)
    const totalTasks = activities.filter(a => a.type === 'TASK').length
    // progress counts: tasks completed (submission exists), quizzes completed (attempt exists), content visited
    const taskTotal = activities.filter(a => a.type === 'TASK').length
    const taskCompleted = activities.filter(a => a.type === 'TASK' && a.taskId && taskSubmissions[a.taskId]).length
    const quizTotal = activities.filter(a => a.type === 'QUIZ').length
    const quizCompleted = completedQuizzes.size
    const contentTotal = activities.filter(a => a.type === 'CONTENT').length
    const contentCompleted = visitedContent.size
    const overallTotal = taskTotal + quizTotal + contentTotal
    const overallCompleted = taskCompleted + quizCompleted + contentCompleted
    const progressPct = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0

    // mark visited content / completed quizzes (unconditional hook placement)
    React.useEffect(() => {
        if (!activeId) return
        const current = activities.find(a => a.id === activeId)
        if (!current) return
        if (current.type === 'CONTENT' && !visitedContent.has(current.id)) {
            setVisitedContent(prev => new Set([...prev, current.id]))
        }
        if (current.type === 'QUIZ' && quizSummaries[current.id] && !completedQuizzes.has(current.id)) {
            setCompletedQuizzes(prev => new Set([...prev, current.id]))
        }
    }, [activeId, activities, quizSummaries, visitedContent, completedQuizzes])

    // Conditional rendering AFTER all hooks
    if (!detail) {
        if (loadError) {
            return (
                <div className="card" style={{padding:12}}>
                    <h3 className="section-title">Błąd ładowania lekcji</h3>
                    <div style={{whiteSpace:'pre-wrap', color:'#f3b3b3'}}>{loadError}</div>
                    <div style={{marginTop:12}}>
                        <button className="btn" onClick={() => { setLoadError(null); window.location.reload() }}>Spróbuj ponownie</button>
                    </div>
                </div>
            )
        }
        return <div className="card"><p className="text-muted">Ładowanie lekcji…</p></div>
    }

    if (debugMode) {
        return (
            <div className="card" style={{padding:12}}>
                <h3>DEBUG: lesson detail</h3>
                <pre style={{whiteSpace:'pre-wrap', maxHeight: '60vh', overflow:'auto'}}>{JSON.stringify(detail, null, 2)}</pre>
            </div>
        )
    }

    return (
        <div className="card" style={{padding:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center', gap:12}}>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <button className="btn back" style={btn} onClick={() => nav(-1)}>&larr; Wróć</button>
                </div>
                <div style={{flex:1}}>
                    <h3 style={{margin:0}}>{detail.title}</h3>
                    <div className="text-muted">{detail.content}</div>
                    <div style={{marginTop:8}}>
                        <div style={{height:8, background:'var(--input-bg)', borderRadius:8, overflow:'hidden'}}>
                            <div style={{height:'100%', background:'linear-gradient(90deg,var(--brand),var(--brand-2))', width: `${progressPct}%`}} />
                        </div>
                        <div className="text-muted" style={{fontSize:12, marginTop:6}}>
                            {overallCompleted}/{overallTotal} aktywności ukończonych • Zadania {taskCompleted}/{taskTotal} • Quizy {quizCompleted}/{quizTotal} • Treść {contentCompleted}/{contentTotal}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{marginTop:16}}>
                <Tabs
                    tabs={[{ key: 'lesson', label: 'Materiały' }, { key: 'results', label: 'Moje wyniki' }]}
                    active={activeTab}
                    onChange={(key) => setActiveTab(key === 'results' ? 'results' : 'lesson')}
                />
            </div>

            {activeTab === 'lesson' ? (
                <div
                    style={{
                        display:'grid',
                        gridTemplateColumns: layoutColumns,
                        gap:16,
                        marginTop:12,
                        alignItems:'start'
                    }}
                    className="lesson-editor-grid"
                >
                    <div className="card" style={{gridColumn:'1 / -1', marginBottom:8, padding:8}} aria-live="polite">
                        <strong>Co dalej?</strong>
                        <div className="text-muted" style={{marginTop:4, fontSize:13}}>
                            1) Wybierz blok po lewej. 2) Przeczytaj lub rozwiąż zadanie. 3) Użyj „Uruchom”, aby sprawdzić wynik. 4) Gdy jesteś gotowy, kliknij „Wyślij”.
                        </div>
                    </div>
                    <aside className="lesson-sidebar">
                        <ul className="list">
                            {activities.map(a => {
                                const taskDone = a.type === 'TASK' && a.taskId && Boolean(taskSubmissions[a.taskId])
                                const quizCompleted = a.type === 'QUIZ' && Boolean(quizSummaries[a.id])
                                const contentVisited = a.type === 'CONTENT' && visitedContent.has(a.id)
                                const completed = Boolean(taskDone || quizCompleted || contentVisited)
                                return (
                                    <li key={a.id} className="module-item" style={{alignItems:'center'}}>
                                        <button className="btn" style={{...btn, width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center'}} onClick={() => setActiveId(a.id)} aria-label={`Otwórz blok: ${a.title}`}>
                                            <span style={{display:'inline-flex',alignItems:'center',gap:8}}>
                                                <span className="badge">{a.type}</span>
                                                <span style={{fontWeight:700}}>{a.title}</span>
                                            </span>
                                            <span style={{marginLeft:8}}>{completed ? '✓' : ''}</span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    </aside>

                    <main>
                        {!active ? <p className="text-muted">Wybierz aktywność.</p> : (
                            <div style={{display:'grid', gap:12}}>
                                <h4 style={{margin:'6px 0'}}>{active.title}</h4>
                                {active.type === 'CONTENT' && <ContentView activity={active} />}
                                {active.type === 'QUIZ' && (
                                    <QuizViewer
                                        token={token}
                                        activity={active}
                                        onSubmitted={(summary) => setQuizSummaries(prev => ({ ...prev, [active.id]: { ...summary, createdAt: new Date().toISOString() } }))}
                                    />
                                )}
                                {active.type === 'TASK' && (
                                    <TaskStudent
                                        token={token}
                                        activity={active}
                                        onSubmitted={handleTaskSubmitted}
                                    />
                                )}
                                <div style={{display:'flex', justifyContent:'space-between', marginTop:12}}>
                                    {(() => {
                                        const idx = activities.findIndex(x=>x.id===active.id)
                                        const prev = idx>0 ? activities[idx-1] : null
                                        const next = idx < activities.length-1 ? activities[idx+1] : null
                                        return (
                                            <>
                                                <button
                                                    className="btn"
                                                    style={{...btn, opacity: prev ? 1 : 0.6}}
                                                    disabled={!prev}
                                                    aria-label={prev ? `Poprzedni blok: ${prev.title}` : 'Brak poprzedniego bloku'}
                                                    title={prev ? `Poprzedni: ${prev.title}` : 'Brak poprzedniego bloku'}
                                                    onClick={() => { if (prev) setActiveId(prev.id) }}
                                                >
                                                    {prev ? `← Poprzedni: ${prev.title}` : '← Poprzedni'}
                                                </button>
                                                <button
                                                    className="btn"
                                                    style={btn}
                                                    aria-label={next ? `Następny blok: ${next.title}` : 'To był ostatni blok'}
                                                    title={next ? `Następny: ${next.title}` : 'Koniec lekcji'}
                                                    onClick={() => {
                                                        if (next) setActiveId(next.id)
                                                        else { toast.show('Lekcja ukończona!','success') }
                                                    }}
                                                >
                                                    {next ? `Następny: ${next.title} →` : 'Zakończone →'}
                                                </button>
                                            </>
                                        )
                                    })()}
                                </div>
                            </div>
                        )}
                    </main>

                    {!isTaskActive && (
                        <aside className="lesson-sidebar">
                            {/* Placeholder removed: dodatkowe materiały/zadania */}
                        </aside>
                    )}
                </div>
            ) : (
                <div style={{marginTop:8}}>
                    <h3 className="section-title">Moje wyniki</h3>
                    {classId ? (
                        <StudentResults token={token} classId={Number(classId)} initialLessonId={lessonId!} />
                    ) : (
                        <p className="text-muted">Brak identyfikatora klasy w adresie URL.</p>
                    )}
                </div>
            )}
        </div>
    )
}

function ContentView({ activity }:{ activity: LessonActivity }){
    let body: any = null
    try { body = activity.body ? JSON.parse(activity.body) : null } catch { body = null }
    if (!body || !body.blocks?.length) return <p className="text-muted">Brak treści.</p>

    // Render with preferred order: image → markdown → code, regardless of save order.
    const blocks = Array.isArray(body.blocks) ? body.blocks : []
      type ImageBlock = { type: 'image'; src: string; alt?: string }
    const img = blocks.find(
        (b: any): b is ImageBlock => b && b.type === 'image'
    )
    const texts = blocks.filter((b:any)=> b && b.type === 'markdown')
    const codes = blocks.filter((b:any)=> b && b.type === 'code')

    // minimal HTML escape
    const esc = (s:string) => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c] as string))
    // very simple Python highlighter (keywords/numbers/comments/strings)
    function highlightPython(src:string): string {
        let out = esc(src)
        // strings
        out = out.replace(/("[^"]*"|'[^']*')/g, '<span style="color:#e6d06c">$1<\/span>')
        // comments
        out = out.replace(/(#.*)$/gm, '<span style="color:#6aa3d9">$1<\/span>')
        // keywords
        const kw = ['def','return','if','elif','else','for','while','in','and','or','not','import','from','as','class','try','except','finally','with','yield','lambda','True','False','None','print','range']
        const kwRe = new RegExp('\\b(' + kw.join('|') + ')\\b','g')
        out = out.replace(kwRe, '<span style="color:#9fe0d6">$1<\/span>')
        // numbers
        out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span style="color:#c5a5c5">$1<\/span>')
        return out
    }

    return (
        <div style={{display:'grid', gap:10}}>
            {img ? (
                // a11y: non-interactive image; fixed viewport to keep visual consistency
                <div style={{width:'100%', height:360, maxWidth:860, margin:'0 auto', background:'var(--panel)', border:'1px solid var(--line)', borderRadius:12, overflow:'hidden'}}>
                    <img src={img.src} alt={img.alt || 'Ilustracja do treści bloku'} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                </div>
            ) : null}
            {texts.map((t:any,i:number)=> (
                <div key={'md-'+i} style={{whiteSpace:'pre-wrap'}}>{t.md}</div>
            ))}
            {codes.length > 0 && (
                <div>
                    <div style={{marginBottom:6,fontWeight:700}}>Przykład kodu</div>
                    {codes.map((c:any, i:number)=> (
                        <pre key={'code-'+i} style={{margin:0, padding:10, background:'var(--input-bg)', border:'1px solid var(--line)', borderRadius:8, overflowX:'auto'}}>
                            <code dangerouslySetInnerHTML={{__html: (c.lang && String(c.lang).toLowerCase().startsWith('py')) ? highlightPython(String(c.code||'')) : esc(String(c.code||''))}} />
                        </pre>
                    ))}
                </div>
            )}
        </div>
    )
}

// Removed local StudentResultsPanel in favor of shared StudentResults component

function formatDateTime(value?: string | null){
    if (!value) return null
    try {
        const dt = new Date(value)
        if (Number.isNaN(dt.getTime())) return null
        return dt.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch {
        return null
    }
}

function resolveTaskStatus(submission?: Submission, earned = 0, maxPoints = 0): { label: string; tone: 'success'|'warning'|'info'|'muted' } {
    if (!submission) return { label: 'Nie rozpoczęto', tone: 'muted' }
    const status = String(submission.status ?? '').toUpperCase()
    if (maxPoints > 0 && earned >= maxPoints) {
        return { label: 'Zaliczone', tone: 'success' }
    }
    if (status === 'REJECTED') {
        return { label: 'Odrzucone', tone: 'warning' }
    }
    if (status === 'GRADED') {
        return { label: 'Ocenione', tone: earned > 0 ? 'success' : 'info' }
    }
    if (status === 'SUBMITTED') {
        return { label: 'Wysłane', tone: 'warning' }
    }
    return { label: submission.status ?? 'Wysłane', tone: 'info' }
}

function getQuizMaxPoints(activity: LessonActivity){
    const fallback = 10
    if (!activity || !activity.body) return fallback
    try {
        const data = JSON.parse(activity.body)
        if (data && typeof data.maxPoints === 'number') {
            return Math.max(0, data.maxPoints)
        }
    } catch {
        // ignore invalid JSON
    }
    return fallback
}

function StatusPill({ tone, children }:{ tone: 'success'|'warning'|'info'|'muted'; children: React.ReactNode }){
    const palette: Record<'success'|'warning'|'info'|'muted', { bg: string; border: string }> = {
        success: { bg: 'color-mix(in oklab, var(--success) 12%, transparent)', border: 'color-mix(in oklab, var(--success) 38%, var(--line))' },
        warning: { bg: 'color-mix(in oklab, var(--warning) 12%, transparent)', border: 'color-mix(in oklab, var(--warning) 38%, var(--line))' },
        info: { bg: 'color-mix(in oklab, var(--brand) 12%, transparent)', border: 'color-mix(in oklab, var(--brand) 38%, var(--line))' },
        muted: { bg: 'var(--input-bg)', border: 'var(--line)' }
    }
    const colors = palette[tone]
    return (
        <span style={{
            display:'inline-flex',
            alignItems:'center',
            padding:'2px 10px',
            borderRadius:999,
            background:colors.bg,
            border:`1px solid ${colors.border}`,
            color:'var(--text)',
            fontSize:12,
            fontWeight:600
        }}>
            {children}
        </span>
    )
}

function TaskStudent({ token, activity, onSubmitted }:{ token:string|null; activity: LessonActivity; onSubmitted?:(submission: Submission|null)=>void }){
    const [task, setTask] = React.useState<PublicTask|null>(null)
    const [code, setCode] = React.useState('')
    const [editorLoaded, setEditorLoaded] = React.useState(false)
    const [EditorComponent, setEditorComponent] = React.useState<any>(null)
    // Konsola: tylko wynik stdout lub przyjazny komunikat błędu – nigdy surowe JSON
    const [consoleText, setConsoleText] = React.useState<string|undefined>(undefined)
    const [consoleError, setConsoleError] = React.useState<string|undefined>(undefined)
    // Testy po wysłaniu: przechowujemy oczyszczony model
    const [testSummary, setTestSummary] = React.useState<null | { passed: number; total: number; rows: Array<{ ok: boolean; text: string }> }>(null)
    // Szczegóły testów dla widocznych przypadków
    const [testDetails, setTestDetails] = React.useState<Array<{ index:number; visible:boolean; input?:string; expected?:string; actual?:string; error?:string }>>([])
    const [testsMeta, setTestsMeta] = React.useState<any[]|null>(null)
    // Linia informacyjna zamiast dużego paska
    const [infoLine, setInfoLine] = React.useState<string|undefined>(undefined)
    const [lastAction, setLastAction] = React.useState<null | 'run' | 'submit'>(null)
    const [running, setRunning] = React.useState(false)
    const [latestSubmission, setLatestSubmission] = React.useState<Submission|null>(null)
    const [loadingLatest, setLoadingLatest] = React.useState(false)
    const toast = useToast()

    React.useEffect(()=>{
        let mounted = true
        if (activity.taskId) api.getPublicTask(activity.taskId).then(t => { if (!mounted) return; setTask(t); setCode(t.starterCode || '') }).catch(()=>{})
        ;(async ()=>{ try{ const mod = await import('@monaco-editor/react'); if (mounted) setEditorComponent(() => mod.default) }catch{} finally { if (mounted) setEditorLoaded(true) } })()
        return ()=>{ mounted = false }
    }, [activity.taskId])

    // Załaduj metadane testów (widoczność) dla uczniów
    React.useEffect(()=>{
        let alive = true
        if (!activity.taskId) { setTestsMeta(null); return }
        api.getTests(activity.taskId).then(list => { if (!alive) return; setTestsMeta(Array.isArray(list) ? list : []) }).catch(()=> setTestsMeta([]))
        return () => { alive = false }
    }, [activity.taskId])

    const normalizeError = React.useCallback((value: unknown): string => {
        const raw = typeof value === 'string'
            ? value
            : value && typeof value === 'object' && 'message' in value
                ? String((value as any).message)
                : String(value ?? '')
        const trimmed = raw.replace(/^Error:\s*/i, '').replace(/^\d+\s*/, '').trim()
        const lower = trimmed.toLowerCase()
        if (lower.includes('no submission attempts remaining')) return 'Wykorzystano wszystkie próby dla tego zadania.'
        if (lower.includes('task is locked after submissions')) return 'Zadanie jest zablokowane po oddaniu.'
        if (lower.includes('run is disabled') || lower.includes('run not supported')) return 'Uruchamianie tego zadania jest niedostępne.'
        if (lower.includes('unauthorized') || lower.startsWith('401')) return 'Musisz być zalogowany, aby wykonać to działanie.'
        return trimmed || 'Wystąpił nieznany błąd.'
    }, [])

    React.useEffect(()=>{
        if (!token || !activity.taskId) { setLatestSubmission(null); return }
        let active = true
        setLoadingLatest(true)
        api.mySubmissionForTask(token, activity.taskId)
            .then(res => {
                if (!active) return
                setLatestSubmission(res)
                onSubmitted?.(res)
            })
            .catch(err => {
                const raw = String(err?.message ?? err ?? '')
                const low = raw.toLowerCase()
                // Ignore typical "not found"/unauthorized cases on initial load
                const benign = low.startsWith('404') || low.startsWith('401') || low.includes('not found') || low.includes('nie znaleziono') || low.includes('brak')
                if (!benign) setStatus({ kind: 'error', text: normalizeError(raw) })
                if (active) setLatestSubmission(null)
            })
            .finally(() => { if (active) setLoadingLatest(false) })
        return () => { active = false }
    }, [token, activity.taskId, normalizeError])

    const attemptsUsed = latestSubmission?.attemptNumber ?? 0
    const maxAttempts = Math.max(1, latestSubmission?.maxAttempts ?? task?.maxAttempts ?? 1)
    const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed)
    const lockAfterSubmit = task?.lockAfterSubmit ?? true
    const allowRunBeforeSubmit = task?.allowRunBeforeSubmit ?? true
    const limitReached = attemptsUsed >= maxAttempts
    const canSubmit = !!token && !limitReached
    const canRun = !!token && allowRunBeforeSubmit && !(limitReached && lockAfterSubmit)

    async function run(){
        if (!canRun) {
            const msg = !token ? 'Musisz być zalogowany.' : limitReached && lockAfterSubmit ? 'Zadanie jest zablokowane po oddaniu.' : 'Uruchamianie tego zadania jest niedostępne.'
            setInfoLine(msg)
            toast.show(msg, 'error')
            return
        }
        setRunning(true)
        setLastAction('run')
        setConsoleText(undefined)
        setConsoleError(undefined)
        // NIE czyścimy testSummary aby student mógł nadal zobaczyć poprzednie wyniki wysłania poniżej
        try{
            const res = await api.runTask(token ?? '', activity.taskId!, { code, language: (task?.language ?? 'javascript') })
            // Wyciągamy tylko stdout – ignorujemy potencjalne pola tests/results
            const rawStdout = typeof res?.stdout === 'string' ? res.stdout : ''
            // Blokada surowego JSON: jeśli stdout wygląda jak JSON array/object, nie pokazuj go dosłownie
            const isJsonLike = /^\s*[\[{]/.test(rawStdout.trim()) && /[}\]]\s*$/.test(rawStdout.trim())
            setConsoleText(isJsonLike ? '' : rawStdout)
            const err = res?.error ? normalizeError(res.error) : undefined
            setConsoleError(err)
            setInfoLine(err ? `Błąd wykonania: ${err}` : 'Program uruchomiony pomyślnie.')
        }catch(e:any){
            const msg = normalizeError(e)
            setConsoleError(msg)
            setConsoleText('')
            setInfoLine(`Błąd wykonania: ${msg}`)
            toast.show(msg, 'error')
        } finally {
            setRunning(false)
        }
    }

    function summarizeTests(res: any): { passed: number; total: number; rows: Array<{ ok: boolean; text: string }> } {
        const rows: Array<{ ok: boolean; text: string }> = []
        const testsSrc = Array.isArray(res?.tests) ? res.tests : (Array.isArray(res?.results) ? res.results : [])
        let passed = 0
        const details: Array<{ index:number; visible:boolean; input?:string; expected?:string; actual?:string; error?:string }> = []
        testsSrc.forEach((t:any, i:number) => {
            const idx = i + 1
            if (t && (t.passed || t.success === true)) {
                rows.push({ ok: true, text: `✔ Test ${idx} — OK` })
                passed++
            } else {
                let fragment = 'Oczekiwano: ? otrzymano: ?'
                const expected = t?.expected ?? t?.expectedOutput ?? t?.expect
                const actual = t?.actual ?? t?.output ?? t?.stdout ?? t?.answer
                if (expected !== undefined || actual !== undefined) {
                    const expStr = typeof expected === 'string' ? expected : JSON.stringify(expected)
                    const actStr = typeof actual === 'string' ? actual : JSON.stringify(actual)
                    fragment = `Oczekiwano: ${expStr}, otrzymano: ${actStr}`
                } else if (t?.error) {
                    fragment = `Błąd: ${normalizeError(t.error)}`
                }
                rows.push({ ok: false, text: `✖ Test ${idx} — ${fragment}` })
            }
            const meta = testsMeta?.[i] || (Array.isArray(testsMeta) ? testsMeta.find(m => String(m.id) === String(t?.id)) : null)
            const visible = meta ? !!meta.visible : true
            details.push({ index: idx, visible, input: String(t?.input ?? t?.stdin ?? ''), expected: String(t?.expected ?? t?.expectedOutput ?? ''), actual: String(t?.actual ?? t?.output ?? t?.stdout ?? ''), error: t?.error ? normalizeError(t.error) : undefined })
        })
        setTestDetails(details)
        return { passed, total: testsSrc.length, rows }
    }

    async function submit(){
        if (!canSubmit) {
            const msg = limitReached ? 'Wyczerpano limit prób.' : 'Musisz być zalogowany.'
            setInfoLine(msg)
            toast.show(msg, 'error')
            return
        }
        if (!confirm(`Wyślij rozwiązanie? Próba ${attemptsUsed + 1}/${maxAttempts}`)) return
        setLastAction('submit')
        setInfoLine('Wysyłam rozwiązanie i pobieram testy…')
        // NIE czyścimy konsoli – konsola pozostaje wynikiem ostatniego uruchomienia
        setTestSummary(null)
        try{
            // Uruchamiamy testy (endpoint run zwraca strukturę testów) i tworzymy podsumowanie
            let preview: any = null
            try { preview = await api.runTask(token ?? '', activity.taskId!, { code, language: (task?.language ?? 'javascript') }) } catch {}
            if (preview) setTestSummary(summarizeTests(preview))
            const res = await api.submit(token ?? '', activity.taskId!, { content: '', code })
            setLatestSubmission(res)
            toast.show('Wysłano','success')
            setInfoLine('Rozwiązanie wysłane. Podsumowanie testów poniżej.')
            onSubmitted?.(res)
        }catch(e:any){
            const msg = normalizeError(e)
            setInfoLine(msg)
            toast.show(msg, 'error')
        }
    }

    const consolePanelStyle: React.CSSProperties = {
        border: '1px solid var(--line)',
        borderRadius: 12,
        background: 'var(--panel)',
        padding: 12,
        minHeight: 100,
        display: 'grid',
        gap: 10
    }

    const editorHeight = 340

    return (
        <div style={{
            padding: 12,
            border: '1px solid var(--line)',
            borderRadius: 12,
            background: 'var(--panel)',
            display: 'grid',
            gap: 12
        }}>
            <div style={{marginBottom:2}} className="text-muted">{task?.description}</div>
            {/* 1) Code editor */}
            <div aria-describedby="editor-help" role="region" aria-label="Edytor kodu">
                {editorLoaded && EditorComponent ? (
                    <EditorComponent height={`${editorHeight}px`} language={task?.language ?? 'javascript'} value={code} onChange={(v:any)=>setCode(v||'')} />
                ) : (
                    <textarea rows={12} style={{width:'100%', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace'}} value={code} onChange={e=>setCode(e.target.value)} />
                )}
            </div>
            <small id="editor-help" className="text-muted">Użyj „Uruchom”, aby zobaczyć wynik programu. „Wyślij” sprawdza w testach i zapisuje wynik.</small>
            {/* 2) Buttons */}
            <div style={{display:'flex', flexWrap:'wrap', gap:10, alignItems:'center'}}>
                <button
                    className="btn"
                    style={{...btn, opacity: canRun ? 1 : 0.6}}
                    onClick={run}
                    disabled={!canRun || running}
                    aria-label="Uruchamia Twój program i pokazuje wynik."
                    title="Uruchamia Twój program i pokazuje wynik."
                >
                    {running && lastAction==='run' ? 'Uruchamianie…' : 'Uruchom'}
                </button>
                <button
                    className="btn"
                    style={{...btn, opacity: canSubmit ? 1 : 0.6}}
                    onClick={submit}
                    disabled={!canSubmit}
                    aria-label="Sprawdza Twój program w testach i zapisuje wynik."
                    title="Sprawdza Twój program w testach i zapisuje wynik."
                >
                    Wyślij
                </button>
                <div style={{marginLeft:'auto'}} className="text-muted">
                    Próba {attemptsUsed}/{maxAttempts} • pozostało {attemptsRemaining}
                </div>
            </div>
            {infoLine && (
                <div role="status" aria-live="polite" style={{fontSize:12, marginTop:-4}}>{infoLine}</div>
            )}
            {/* Konsola – zawsze renderujemy panel (czysty stdout / błąd) */}
            <section style={consolePanelStyle} aria-live="polite">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <strong>Konsola — wynik działania programu</strong>
                    {running && lastAction==='run' && <span className="text-muted">Uruchamianie…</span>}
                </div>
                {!consoleText && !consoleError && <div className="text-muted">Brak wyjścia programu.</div>}
                {consoleText && consoleText.length>0 && (
                    <pre style={{margin:0, padding:10, background:'var(--input-bg)', border:'1px solid var(--line)', borderRadius:8, overflowX:'auto'}}>{consoleText}</pre>
                )}
                {consoleError && (
                    <div style={{padding:10, border:'1px solid var(--line)', borderRadius:8, background:'color-mix(in oklab, var(--danger) 12%, transparent)'}}>
                        <strong>Błąd wykonania:</strong> {consoleError}
                    </div>
                )}
            </section>
            {/* Testy – podsumowanie oddzielone (po wysłaniu) */}
            {lastAction === 'submit' && (
                <section style={{...consolePanelStyle, minHeight:0}} aria-live="polite">
                    <strong>Testy — podsumowanie{testSummary ? ` (Zaliczone ${testSummary.passed} z ${testSummary.total})` : ''}</strong>
                    {!testSummary && <div className="text-muted">Przetwarzanie…</div>}
                    {testSummary && (
                        <ul style={{listStyle:'none', margin:0, padding:0, display:'grid', gap:6}}>
                            {testSummary.rows.map((row,i)=>(
                                <li key={i} tabIndex={0} style={{
                                    padding:8,
                                    borderRadius:8,
                                    border:'1px solid var(--line)',
                                    background: row.ok ? 'color-mix(in oklab, var(--success) 12%, transparent)' : 'color-mix(in oklab, var(--danger) 12%, transparent)'
                                }}>
                                    <span aria-hidden="true" style={{marginRight:6}}>{row.ok ? '✔' : '✖'}</span>
                                    {row.text}
                                </li>
                            ))}
                        </ul>
                    )}
                    {testSummary && testDetails && testDetails.some(d => d.visible) && (
                        <div style={{marginTop:10, display:'grid', gap:8}}>
                            <div style={{fontWeight:700}}>Szczegóły widocznych testów</div>
                            {testDetails.filter(d=>d.visible).map(d => (
                                <div key={d.index} style={{border:'1px solid var(--line)', borderRadius:8, padding:8}}>
                                    <div style={{fontWeight:600, marginBottom:6}}>Test {d.index}</div>
                                    {d.input !== undefined && <div><strong>Wejście:</strong><pre style={{whiteSpace:'pre-wrap', margin:0}}>{d.input}</pre></div>}
                                    {d.expected !== undefined && <div style={{marginTop:6}}><strong>Oczekiwany:</strong><pre style={{whiteSpace:'pre-wrap', margin:0}}>{d.expected}</pre></div>}
                                    {d.actual !== undefined && <div style={{marginTop:6}}><strong>Wynik:</strong><pre style={{whiteSpace:'pre-wrap', margin:0}}>{d.actual}</pre></div>}
                                    {d.error && <div style={{marginTop:6, color:'var(--danger)'}}><strong>Błąd:</strong> {d.error}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}
            {loadingLatest && <small className="text-muted" style={{display:'block'}}>Ładuję ostatnią ocenę…</small>}
            {latestSubmission && (
                <div style={{padding:10, border:'1px solid var(--line)', borderRadius:10}}>
                    <div><strong>Ostatnia ocena:</strong> {latestSubmission.effectiveScore ?? latestSubmission.points ?? 0} / {latestSubmission.maxPoints ?? task?.maxPoints ?? 0}</div>
                    {latestSubmission.teacherComment && <div className="text-muted">Komentarz: {latestSubmission.teacherComment}</div>}
                </div>
            )}
        </div>
    )
}
