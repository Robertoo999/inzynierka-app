import React from 'react'
import { api } from '../api'

export default function ClassProgressOverview({ open, onClose, token, classId }:{ open:boolean; onClose:()=>void; token:string; classId:number }){
    const [data, setData] = React.useState<any|null>(null)
    const [msg, setMsg] = React.useState('')

    React.useEffect(()=>{
        if (!open) return
        if (!token) { setMsg('Brak tokena'); return }
        setMsg('Ładuję…')
        api.classProgressOverview(token, classId).then(d=>{ setData(d); setMsg('OK') }).catch(e=>{ setMsg(String(e)); setData(null) })
    },[open, token, classId])

    if (!open) return null

    function aggregateStatus(row:{ tasksCompleted:number; totalTasks:number; pointsEarned:number; maxPoints:number }){
        const total = row.totalTasks || 0
        const done = row.tasksCompleted || 0
        const pts = row.pointsEarned || 0
        if (total === 0) return { text: 'Brak zadań', color: 'var(--muted)' }
        if (done >= total) return { text: 'Oddano', color: 'var(--success-strong)' }
        if (done > 0 || pts > 0) return { text: 'W toku', color: 'var(--warning-strong)' }
        return { text: 'Brak prób', color: 'var(--muted)' }
    }
    return (
        <div role="dialog" aria-modal="true" aria-labelledby="progress-overview-title" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', zIndex:60}}>
            <div style={{width:'95%', maxWidth:1100, maxHeight:'90vh', overflow:'auto', background:'var(--panel)', border:'1px solid var(--line)', borderRadius:12, padding:12}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                    <h3 id="progress-overview-title" style={{margin:0}}>Przegląd postępu — uczniowie × lekcje</h3>
                    <div style={{display:'flex', gap:8}}>
                        <button className="btn" type="button" onClick={onClose}>Zamknij</button>
                    </div>
                </div>
                {msg && <div className="text-muted">{msg}</div>}
                {!data && msg === 'OK' && <div className="text-muted">Brak danych.</div>}
                {data && (
                    <div style={{overflowX:'auto'}}>
                        <table style={{width:'100%', borderCollapse:'collapse', background:'var(--panel)'}}>
                            <thead>
                                <tr>
                                    <th style={{position:'sticky', left:0, background:'var(--panel)', zIndex:2, borderBottom:'1px solid var(--line)', padding:8}}>Uczeń</th>
                                    {data.lessons.map((l:any)=> (
                                        <th key={l.lessonId} style={{borderBottom:'1px solid var(--line)', padding:8, textAlign:'center'}}>
                                            {l.title}
                                            <div style={{fontSize:12,color:'var(--muted)'}}>{l.totalTasks} zadań • {l.totalMaxPoints}p</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.students.map((s:any)=> (
                                    <tr key={s.studentId}>
                                        <td style={{position:'sticky', left:0, background:'var(--bg)', padding:8, borderTop:'1px solid var(--line)'}}>
                                            <div style={{fontWeight:700}}>{(s.firstName || s.lastName) ? `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() : (s.email ?? s.studentId)}</div>
                                            {(s.firstName || s.lastName) && s.email && (
                                                <div className="text-muted" style={{fontSize:12}}>{s.email}</div>
                                            )}
                                        </td>
                                        {data.lessons.map((l:any)=> {
                                            const r = data.results.find((x:any) => x.studentId === s.studentId && x.lessonId === l.lessonId)
                                            const tasksCompleted = r ? r.tasksCompleted : 0
                                            const total = r ? r.totalTasks : 0
                                            const pts = r ? r.pointsEarned : 0
                                            const max = r ? r.maxPoints : 0
                                            const pct = total > 0 ? Math.round((tasksCompleted/total)*100) : 0
                                            const aggr = aggregateStatus({ tasksCompleted, totalTasks: total, pointsEarned: pts, maxPoints: max })
                                            return (
                                                <td key={l.lessonId} style={{padding:8, textAlign:'center', borderTop:'1px solid var(--line)'}}>
                                                    <div style={{fontWeight:700}}>{total>0 ? `${pct}%` : '—'}</div>
                                                    <div style={{fontSize:12, color:'var(--muted)'}}>{tasksCompleted}/{total} • {pts}/{max}p</div>
                                                    <div style={{fontSize:12, color: aggr.color, marginTop:4}}>{aggr.text}</div>
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
