import React from 'react'
import { api, type Submission } from '../api'

function StatusPill({ tone, children }:{ tone:'success'|'warning'|'info'|'muted'; children:React.ReactNode }){
  const palette: Record<'success'|'warning'|'info'|'muted', { bg:string; border:string }> = {
    success:{
      bg: 'color-mix(in oklab, var(--success) 12%, transparent)',
      border: 'color-mix(in oklab, var(--success) 38%, var(--line))'
    },
    warning:{
      bg: 'color-mix(in oklab, var(--warning) 12%, transparent)',
      border: 'color-mix(in oklab, var(--warning) 38%, var(--line))'
    },
    info:{
      bg: 'color-mix(in oklab, var(--brand) 12%, transparent)',
      border: 'color-mix(in oklab, var(--brand) 38%, var(--line))'
    },
    muted:{ bg:'var(--input-bg)', border:'var(--line)' }
  }
  const c = palette[tone]
  return <span style={{display:'inline-flex',alignItems:'center',padding:'2px 10px',borderRadius:999,background:c.bg,border:`1px solid ${c.border}` ,color:'var(--text)',fontSize:12,fontWeight:600}}>{children}</span>
}

function statusPL(st:string|undefined){
  const s=(st||'').toUpperCase()
  return s==='GRADED'?'Ocenione':s==='SUBMITTED'?'Wysłane':s==='REJECTED'?'Odrzucone':st||'—'
}

export default function StudentResults({ token, classId, initialLessonId }:{ token:string; classId:number; initialLessonId?:string }){
  const [list, setList] = React.useState<Submission[]|null>(null)
  const [taskMeta, setTaskMeta] = React.useState<Record<string, { title:string; lessonTitle:string; lessonId:string; maxPoints?:number|null }>>({})
  const [quizSummaries, setQuizSummaries] = React.useState<Array<{ id:string; title:string; lessonTitle:string; lessonId:string; correct:number; total:number; points:number; maxPoints:number; createdAt?:string }>|null>(null)
  const [lessonsList, setLessonsList] = React.useState<Array<{ id:string; title:string }>>([])
  const [lessonFilter, setLessonFilter] = React.useState<string>(initialLessonId ?? 'ALL')
  const [typeFilter, setTypeFilter] = React.useState<'ALL'|'TASKS'|'QUIZZES'>('ALL')
  const [msg, setMsg] = React.useState('')

  React.useEffect(()=>{
    let mounted = true
    ;(async ()=>{
      try{
        const [mySubs, classLessons] = await Promise.all([
          api.mySubmissions(token),
          api.listLessonsInClass(token, Number(classId))
        ])
        if (!mounted) return
        setLessonsList(classLessons.map(l=>({ id:l.id, title:l.title })))
        const lessonIds = classLessons.map(l=>l.id)
        const details = await Promise.all(lessonIds.map(id=> api.getLesson(id).catch(()=>null)))
        const taskIdSet = new Set<string>()
        const metaMap: Record<string,{ title:string; lessonTitle:string; lessonId:string; maxPoints?:number|null }> = {}
        const quizzes: Array<{ activityId:string; title:string; lessonTitle:string; lessonId:string; maxPoints:number }>=[]
        for (const d of details){
          if (!d) continue
          for (const t of d.tasks||[]){
            taskIdSet.add(t.id)
            metaMap[t.id] = { title: t.title, lessonTitle: d.title, lessonId: d.id, maxPoints: t.maxPoints }
          }
          for (const a of d.activities||[]){
            if (a.type === 'QUIZ'){
              let max=10
              try{ const b:any = a.body? JSON.parse(a.body):null; if (b && typeof b.maxPoints==='number') max = Math.max(0,b.maxPoints) }catch{}
              quizzes.push({ activityId:a.id, title:a.title, lessonTitle:d.title, lessonId:d.id, maxPoints:max })
            }
          }
        }
        const filtered = mySubs.filter(s => taskIdSet.has(s.taskId))
        setList(filtered)
        setTaskMeta(metaMap)
        setMsg('')

        // load my latest attempts per quiz in this class
        const quizData: Array<{ id:string; title:string; lessonTitle:string; lessonId:string; correct:number; total:number; points:number; maxPoints:number; createdAt?:string }>=[]
        for (const q of quizzes){
          try{
            const attempts = await api.getMyAttempts(token, q.activityId)
            if (Array.isArray(attempts) && attempts.length>0){
              const latest = [...attempts].sort((a,b)=> new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0]
              quizData.push({ id:q.activityId, title:q.title, lessonTitle:q.lessonTitle, lessonId:q.lessonId, correct:latest.correct, total:latest.total, points:latest.points, maxPoints:q.maxPoints, createdAt: latest.createdAt })
            }
          }catch{}
        }
        setQuizSummaries(quizData)
      }catch(e:any){ setMsg(String(e)); setList([]) }
    })()
    return ()=>{ mounted=false }
  }, [token, classId])

  if (!list) return <p className="text-muted">Ładowanie…</p>

  // derive filtered + sorted views
  const tasksToShow = (list||[])
    .filter(s => lessonFilter==='ALL' ? true : (taskMeta[s.taskId]?.lessonId===lessonFilter))
    .sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const quizzesToShow = (quizSummaries||[])
    .filter(q => lessonFilter==='ALL' ? true : q.lessonId===lessonFilter)
    .sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime())

  // row structures
  const taskRows = tasksToShow.map(s => {
    const meta = taskMeta[s.taskId]
    const earned = s.effectiveScore ?? s.points ?? s.autoScore ?? 0
    const maxPoints = s.maxPoints ?? meta?.maxPoints ?? 0
    const status = statusPL(s.status)
    const attemptsUsed = s.attemptNumber ?? 0
    const attemptsMax = s.maxAttempts === 0 ? null : s.maxAttempts ?? null
    const updatedAt = s.createdAt ? new Date(s.createdAt).toLocaleString() : null
    return { id:s.id, title: meta?.title ?? s.taskId, lessonTitle: meta?.lessonTitle, earned, maxPoints, status, attemptsUsed, attemptsMax, updatedAt, teacherComment: (s as any).teacherComment ?? null }
  })
  const quizRows = quizzesToShow.map(q => ({ id:q.id, title:q.title, lessonTitle:q.lessonTitle, earned:q.points, maxPoints:q.maxPoints, correct:q.correct, total:q.total, updatedAt: q.createdAt ? new Date(q.createdAt).toLocaleString() : null }))

  const taskEarned = taskRows.reduce((s,r)=> s + r.earned,0)
  const taskMax = taskRows.reduce((s,r)=> s + r.maxPoints,0)
  const quizEarned = quizRows.reduce((s,r)=> s + r.earned,0)
  const quizMax = quizRows.reduce((s,r)=> s + r.maxPoints,0)
  const overallEarned = taskEarned + quizEarned
  const overallMax = taskMax + quizMax
  const progressPct = overallMax>0 ? Math.round((overallEarned/overallMax)*100) : 0

  function pillTone(status:string){
    const u = status.toLowerCase()
    if (u.includes('zalic') || u.includes('ocene') || u.includes('ukoń')) return 'success'
    if (u.includes('odrzu')) return 'warning'
    if (u.includes('wysł')) return 'info'
    return 'muted'
  }

  const filteredTaskRows = typeFilter==='ALL' || typeFilter==='TASKS' ? taskRows : []
  const filteredQuizRows = typeFilter==='ALL' || typeFilter==='QUIZZES' ? quizRows : []

  return (
    <div style={{display:'grid', gap:18}}>
      <div style={{display:'flex', gap:12, alignItems:'center', flexWrap:'wrap'}}>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label style={{fontSize:12}} htmlFor="lessonFilter">Filtr lekcji:</label>
          <select id="lessonFilter" className="select" value={lessonFilter} onChange={e=>setLessonFilter(e.target.value)}>
            <option value="ALL">Wszystkie lekcje</option>
            {lessonsList.map(l=> <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <label style={{fontSize:12}}>Typ:</label>
          <select className="select" value={typeFilter} onChange={e=> setTypeFilter(e.target.value as any)}>
            <option value="ALL">Wszystko</option>
            <option value="TASKS">Zadania</option>
            <option value="QUIZZES">Quizy</option>
          </select>
        </div>
      </div>

      <section style={{border:'1px solid var(--line)', background:'var(--panel)', borderRadius:12, padding:16, display:'grid', gap:12}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h4 style={{margin:0}}>Podsumowanie wyników</h4>
          <div style={{fontWeight:700}}>{overallEarned} / {overallMax} pkt</div>
        </div>
        <div style={{height:8, background:'var(--input-bg)', borderRadius:999, overflow:'hidden'}}>
          <div style={{height:'100%', width:`${progressPct}%`, background:'linear-gradient(90deg,var(--brand),var(--brand-2))'}} />
        </div>
        <div className="text-muted" style={{display:'flex', gap:16, flexWrap:'wrap'}}>
          <span>Zadania: {taskEarned}/{taskMax} pkt</span>
          <span>Quizy: {quizEarned}/{quizMax} pkt</span>
        </div>
      </section>

      {(typeFilter==='ALL' || typeFilter==='TASKS') && (
        <section style={{display:'grid', gap:12}}>
          <h4 style={{margin:'4px 0'}}>Zadania</h4>
          {filteredTaskRows.length === 0 ? (
            <div className="text-muted">Brak zadań / zgłoszeń.</div>
          ) : (
            <div style={{display:'grid', gap:10}}>
              {filteredTaskRows.map(row => (
                <div key={row.id} style={{border:'1px solid var(--line)', background:'var(--panel)', borderRadius:12, padding:14, display:'grid', gap:8}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                    <div style={{fontWeight:700}}>{row.title} {row.lessonTitle && <span className="badge" style={{marginLeft:8}}>Lekcja: {row.lessonTitle}</span>}</div>
                    <div>{row.earned} / {row.maxPoints} pkt</div>
                  </div>
                  <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:13, alignItems:'center'}}>
                    <StatusPill tone={pillTone(row.status)}>{row.status}</StatusPill>
                    <span className="text-muted">Próby: {row.attemptsUsed}{row.attemptsMax!=null?`/${row.attemptsMax}`:''}</span>
                    {row.updatedAt && <span className="text-muted">Ostatnia: {row.updatedAt}</span>}
                    {row.teacherComment && <span className="text-muted" style={{background:'var(--input-bg)', padding:'2px 8px', borderRadius:6}}>{row.teacherComment}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(typeFilter==='ALL' || typeFilter==='QUIZZES') && (
        <section style={{display:'grid', gap:12}}>
          <h4 style={{margin:'4px 0'}}>Quizy</h4>
          {filteredQuizRows.length === 0 ? (
            <div className="text-muted">Brak ukończonych quizów.</div>
          ) : (
            <div style={{display:'grid', gap:10}}>
              {filteredQuizRows.map(row => (
                <div key={row.id} style={{border:'1px solid var(--line)', background:'var(--panel)', borderRadius:12, padding:14, display:'grid', gap:8}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                    <div style={{fontWeight:700}}>{row.title} {row.lessonTitle && <span className="badge" style={{marginLeft:8}}>Lekcja: {row.lessonTitle}</span>}</div>
                    <div>{row.earned} / {row.maxPoints} pkt</div>
                  </div>
                  <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:13, alignItems:'center'}}>
                    <StatusPill tone={row.earned>=row.maxPoints && row.maxPoints>0 ? 'success':'info'}>{row.earned>0? 'Ukończono':'Brak podejścia'}</StatusPill>
                    <span className="text-muted">Poprawne: {row.correct}/{row.total}</span>
                    {row.updatedAt && <span className="text-muted">Ostatnia: {row.updatedAt}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {msg && <small className="text-muted">Info: {msg}</small>}
    </div>
  )
}
