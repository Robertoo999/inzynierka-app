import React from 'react'
import { api, type LessonSummaryDto, type LessonActivity } from '../../api'
import { useToast } from '../../components/Toasts'

export default function LessonStudentSummary({ token, lessonId, lessonTitle, summary, onRefresh }:{
    token:string;
    lessonId:string;
    lessonTitle:string;
    summary: LessonSummaryDto | null;
    onRefresh?: ()=>void;
}){
    const toast = useToast()
    const [loadingDetailsFor, setLoadingDetailsFor] = React.useState<string|null>(null)
    const [detailOpenFor, setDetailOpenFor] = React.useState<{ studentId:string; email?:string }|null>(null)
    const [studentTasks, setStudentTasks] = React.useState<Array<{ title:string; lastRun?:string; points?:number|null }>|null>(null)

    async function openDetails(studentId:string, email?:string){
        setDetailOpenFor({ studentId, email })
        setStudentTasks(null)
        setLoadingDetailsFor(studentId)
        try{
            // fetch lesson activities and then for each activity fetch attempts and pick latest for this student
            const lesson = await api.getLesson(lessonId)
            const tasks: Array<{ title:string; lastRun?:string; points?:number|null }> = []
            for (const a of lesson.activities || []){
                if (a.type !== 'TASK') continue
                try{
                    const attempts = await api.getActivityAttempts(token, a.id)
                    // attempts is array of { id, studentId, correct, total, points, createdAt }
                    const mine = (attempts || []).filter((t:any) => String(t.studentId) === String(studentId))
                    if (mine.length === 0) {
                        tasks.push({ title: a.title, lastRun: undefined, points: null })
                        continue
                    }
                    mine.sort((x:any,y:any)=> new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime())
                    const last = mine[0]
                    tasks.push({ title: a.title, lastRun: last.createdAt, points: last.points ?? null })
                }catch(e:any){
                    // ignore per-activity errors but continue
                    tasks.push({ title: a.title, lastRun: undefined, points: null })
                }
            }
            setStudentTasks(tasks)
        }catch(e:any){ toast.show(String(e),'error'); setStudentTasks([]) }
        finally{ setLoadingDetailsFor(null) }
    }

    if (!summary) return <div style={{padding:8}} className="card"><p className="text-muted">Brak danych podsumowania.</p></div>

    return (
        <div className="card" style={{padding:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                    <h3 style={{margin:0}}>{lessonTitle}</h3>
                    <div className="text-muted">{summary.totalTasks} zadań • maks. {summary.totalMaxPoints} pkt</div>
                </div>
                <div style={{display:'flex', gap:8}}>
                    <button className="btn" onClick={() => onRefresh && onRefresh()}>Odśwież</button>
                </div>
            </div>

            <div style={{marginTop:12, overflowX:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                        <tr>
                            <th style={{textAlign:'left', padding:8}}>Uczeń</th>
                            <th style={{textAlign:'center', padding:8}}>Zadania zaliczone</th>
                            <th style={{textAlign:'center', padding:8}}>Punkty</th>
                            <th style={{textAlign:'center', padding:8}}>Max punkty</th>
                            <th style={{textAlign:'center', padding:8}}>Procent</th>
                            <th style={{textAlign:'center', padding:8}}>Ostatnia aktywność</th>
                            <th style={{textAlign:'center', padding:8}}>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.students.map(s => {
                            const percent = s.maxPoints ? Math.round((s.totalPoints || 0) / s.maxPoints * 100) : 0
                            return (
                                <tr key={s.studentId} style={{borderTop:'1px solid rgba(255,255,255,0.03)'}}>
                                    <td style={{padding:8}}>{s.email ?? s.studentId}</td>
                                    <td style={{padding:8, textAlign:'center'}}>{s.tasksCompleted} / {summary.totalTasks}</td>
                                    <td style={{padding:8, textAlign:'center'}}>{s.totalPoints ?? 0}</td>
                                    <td style={{padding:8, textAlign:'center'}}>{s.maxPoints ?? summary.totalMaxPoints}</td>
                                    <td style={{padding:8, textAlign:'center'}}>{percent}%</td>
                                    <td style={{padding:8, textAlign:'center'}}>{/* unknown - show '-' for now */}-</td>
                                    <td style={{padding:8, textAlign:'center'}}>
                                        <button className="btn" onClick={() => openDetails(s.studentId, s.email ?? undefined)}>Szczegóły</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Details modal */}
            {detailOpenFor && (
                <div role="dialog" aria-modal="true" aria-labelledby="student-details-title" aria-describedby="student-details-subtitle" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'grid', placeItems:'center', zIndex:60}}>
                    <div style={{minWidth:360, maxWidth:900, width:'92%', background:'var(--panel)', border:'1px solid var(--line)', borderRadius:12, padding:16, maxHeight:'80vh', overflow:'auto'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                            <div>
                                <h3 id="student-details-title" style={{margin:0}}>Szczegóły — {detailOpenFor.email ?? detailOpenFor.studentId}</h3>
                                <div id="student-details-subtitle" className="text-muted">Zadania i ostatnie próby</div>
                            </div>
                            <div>
                                <button className="btn" type="button" aria-label="Zamknij okno" title="Zamknij"
                                        onClick={() => { setDetailOpenFor(null); setStudentTasks(null) }}>✕</button>
                            </div>
                        </div>

                        <div style={{marginTop:8}}>
                            {loadingDetailsFor ? <p className="text-muted">Ładowanie szczegółów…</p> : (
                                studentTasks === null ? (
                                    <div style={{display:'flex', gap:8}}>
                                        <button className="btn" onClick={() => openDetails(detailOpenFor.studentId)}>Pobierz szczegóły</button>
                                    </div>
                                ) : studentTasks.length === 0 ? (
                                    <p className="text-muted">Brak zadań.</p>
                                ) : (
                                    <div style={{display:'grid', gap:8}}>
                                        {studentTasks.map((t, i) => (
                                            <div key={i} style={{padding:8, border:'1px solid var(--line)', borderRadius:8, background:'transparent'}}>
                                                <div style={{display:'flex', justifyContent:'space-between'}}>
                                                    <div><b>{t.title}</b></div>
                                                    <div className="text-muted">{t.points != null ? `${t.points} pkt` : '—'}</div>
                                                </div>
                                                <div className="text-muted">{t.lastRun ? new Date(t.lastRun).toLocaleString() : 'Brak prób'}</div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
