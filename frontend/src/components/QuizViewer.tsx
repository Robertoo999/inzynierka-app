import React from 'react'
import { useToast } from '../components/Toasts'
import { api, type LessonActivity } from '../api'

type QuizResultSummary = { correct:number; total:number; points:number; percent:number }

export default function QuizViewer({ token, activity, onSubmitted }:{ token:string; activity: LessonActivity; onSubmitted?:(result:QuizResultSummary)=>void }){
    const toast = useToast()
    const [answers, setAnswers] = React.useState<number[]>([])
    const [result, setResult] = React.useState<QuizResultSummary|null>(null)
    let body:any = null
    try { body = activity.body ? JSON.parse(activity.body) : null } catch { body = null }
    if (!body || !Array.isArray(body.questions)) return <p className="text-muted">Nieprawidłowy quiz.</p>

    function select(qidx:number, choice:number){
        setAnswers(a => { const c = a.slice(); c[qidx]=choice; return c })
    }

    async function submit(){
        try{
            const res = await api.submitQuiz(token || null, activity.id, { answers })
            setResult(res)
            if (onSubmitted) onSubmitted(res)
            if (token) {
                try {
                    const refreshed = await api.getMyAttempts(token, activity.id)
                    setMyAttempts(refreshed)
                } catch (err) {
                    console.warn('Nie udało się odświeżyć prób quizu', err)
                }
            }
        }catch(e:any){ toast.show(String(e), 'error') }
    }

    const [myAttempts, setMyAttempts] = React.useState<any[]|null>(null)
    React.useEffect(()=>{
        if (!token) return
        api.getMyAttempts(token, activity.id).then(setMyAttempts).catch(()=>setMyAttempts(null))
    },[token, activity.id])

    React.useEffect(() => {
        if (result || !myAttempts || myAttempts.length === 0) return
        const latest = [...myAttempts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
        if (!latest) return
        const percent = latest.total > 0 ? (latest.correct / Math.max(1, latest.total)) * 100 : 0
        setResult({ correct: latest.correct, total: latest.total, points: latest.points, percent })
    }, [myAttempts, result])

    const alreadyAttempted = (myAttempts && myAttempts.length > 0) || Boolean(result)

    const computedResult = React.useMemo<QuizResultSummary | null>(() => {
        if (result) return result
        if (myAttempts && myAttempts.length > 0) {
            const latest = [...myAttempts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            if (!latest) return null
            const percent = latest.total > 0 ? (latest.correct / Math.max(1, latest.total)) * 100 : 0
            return { correct: latest.correct, total: latest.total, points: latest.points, percent }
        }
        return null
    }, [result, myAttempts])

    return (
        <div>
            <h4 style={{margin:'6px 0'}}>{activity.title}</h4>
            <div style={{display:'grid', gap:12}}>
                {body.questions.map((q:any, qi:number)=> (
                    <fieldset key={qi} style={{border:'1px solid var(--line)', padding:8, borderRadius:8}}>
                        <legend style={{padding:'0 6px'}}><b>{qi+1}. {q.text}</b></legend>
                        <div style={{display:'grid', gap:6}}>
                            {q.choices.map((ch:any, ci:number)=> (
                                <label key={ci} style={{display:'flex', gap:8, alignItems:'center'}}>
                                    <input type="radio" name={`q${qi}`} checked={answers[qi]===ci} onChange={()=>select(qi,ci)} aria-describedby={`quiz-q${qi}-help`} />
                                    <span>{ch.text}</span>
                                </label>
                            ))}
                            <span id={`quiz-q${qi}-help`} className="text-muted" style={{fontSize:12}}>Zaznacz jedną odpowiedź.</span>
                        </div>
                    </fieldset>
                ))}
                <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
                    <button className="btn" onClick={submit} disabled={alreadyAttempted}>Wyślij odpowiedzi</button>
                    {computedResult && (
                        <div className="text-muted">Wynik: {computedResult.correct}/{computedResult.total} • {computedResult.points}pkt ({Math.round(computedResult.percent)}%)</div>
                    )}
                    {alreadyAttempted && (
                        <span className="badge" style={{
                            background: 'color-mix(in oklab, var(--success) 12%, transparent)',
                            border: '1px solid ' + 'color-mix(in oklab, var(--success) 38%, var(--line))'
                        }}>Quiz ukończony</span>
                    )}
                </div>
            </div>
        </div>
    )
}
