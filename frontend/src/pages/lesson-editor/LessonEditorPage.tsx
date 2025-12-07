import React from 'react'
import LessonHeader from './LessonHeader'
import BlockListSidebar from './BlockListSidebar'
import BlockEditorContainer from './BlockEditorContainer'
import LessonStudentSummary from './LessonStudentSummary'
import { api, LANG_CAPS, type LessonListItem, type LessonDetail, type LessonActivity } from '../../api'
import type { LessonSummaryDto } from '../../api'
import { useToast } from '../../components/Toasts'
import Tabs from '../../components/Tabs'

export type LessonEditorHandle = {
    save: () => Promise<void>
    reload: () => Promise<void>
}

const LessonEditorPage = React.forwardRef<LessonEditorHandle, { token:string; role:string; klass:any; lesson: LessonListItem; onChanged:()=>void; showHeader?: boolean }>(function LessonEditorPage({ token, role, klass, lesson, onChanged, showHeader }, ref){
    const [detail, setDetail] = React.useState<LessonDetail | null>(null)
    const [selectedId, setSelectedId] = React.useState<string|undefined>(undefined)
    const [saving, setSaving] = React.useState(false)
    const [summary, setSummary] = React.useState<LessonSummaryDto | null>(null)
    // Always show structure/editor pane; student summary is available from class overview/progress
    const toast = useToast()

    async function load(){
        try{
            const d = await api.getLesson(lesson.id)
            // deduplicate activities by id (preserve first occurrence order) to avoid rendering duplicates
            if (d && Array.isArray(d.activities) && d.activities.length > 0) {
                const seen = new Set<string>()
                const uniq: typeof d.activities = []
                for (const a of d.activities) {
                    if (!a || !a.id) continue
                    if (seen.has(a.id)) continue
                    seen.add(a.id)
                    uniq.push(a)
                }
                d.activities = uniq
            }
            setDetail(d)
            if (!selectedId && d.activities && d.activities[0]) setSelectedId(d.activities[0].id)
            // load teacher summary when appropriate
            try{ if (role === 'TEACHER' && token) { const s = await api.lessonSummary(token, lesson.id); setSummary(s) } }catch(e:any){ /* ignore */ }
        }catch(e:any){ toast.show(String(e),'error') }
    }

    React.useEffect(()=>{ load() }, [lesson.id])

    async function saveLesson(){
        if (!detail) return
        setSaving(true)
        try{
            // allow active editors (np. TaskEditor) zareagować i zapisać swoje zmiany
            try{ window.dispatchEvent(new CustomEvent('lesson:save-active')) }catch{}
            await api.updateLessonInClass(token, klass.id, lesson.id, { title: detail.title, content: detail.content })
            toast.show('Zapisano lekcję', 'success')
            onChanged()
        }catch(e:any){ toast.show(String(e),'error') }
        finally{ setSaving(false) }
    }

    React.useImperativeHandle(ref, () => ({
        save: async () => { await saveLesson() },
        reload: async () => { await load() }
    }))

    function findActivity(id?:string){ if (!detail) return null; return detail.activities.find(a=>a.id===id) ?? null }

    // Emituj zmianę aktywnego bloku, aby nadrzędny widok mógł zmienić etykietę zapisu
    React.useEffect(()=>{
        const a = findActivity(selectedId || (detail && detail.activities[0]?.id))
        try { (window as any).dispatchEvent(new CustomEvent('lesson:active-changed', { detail: { type: a?.type || null, id: a?.id || null } })) } catch {}
    }, [selectedId, detail?.activities?.length])

    async function handleReorder(from:number, to:number){
        if (!detail) return
        try{
            const arr = detail.activities
            const A = arr[from]
            const updated = await api.moveActivity(token, lesson.id, A.id, { newIndex: to })
            setDetail(d => d ? { ...d, activities: updated } : d)
        }catch(e:any){ toast.show(String(e),'error'); await load() }
    }

    async function handleAdd(type:'CONTENT'|'TASK'|'QUIZ'){
        try{
            let created: any = null
            if (type === 'CONTENT'){
                created = await api.createActivity(token, String(lesson.id), { type:'CONTENT', title: 'Nowy blok', body: JSON.stringify({ blocks: [{ type:'markdown', md: 'Nowa treść' }] }) })
            } else if (type === 'TASK') {
                // Domyślnie JavaScript + starter dopasowany do EVAL/IO (preferuj EVAL dla JS)
                const jsCaps: any = (LANG_CAPS as any).javascript || { sample: 'function solve(input){ return input }' }
                const starter = jsCaps.sample || 'function solve(input){ return input }'
                created = await api.createActivityWithTask(token, String(lesson.id), { type:'TASK', title: 'Nowe zadanie', task: { title: 'Nowe zadanie', description: '', maxPoints: 10, starterCode: starter, language: 'javascript', tests: '' } })
            } else if (type === 'QUIZ') {
                // create a default simple quiz activity. api.createActivity is typed to accept CONTENT|TASK,
                // so cast to any to call the endpoint with type 'QUIZ'. Backend stores quiz in activity.body as JSON.
                // Ustal punkty pytania == maxPoints aby suma była równa limitowi od startu
                const defaultQuiz = { maxPoints: 10, questions: [ { text: 'Pytanie 1', choices: [ { text: 'Odp A', correct: true }, { text: 'Odp B' } ], points: 10 } ] }
                created = await (api as any).createActivity(token, String(lesson.id), { type: 'QUIZ', title: 'Nowy quiz', body: JSON.stringify(defaultQuiz) })
            }
            await load()
            if (created && created.id) setSelectedId(created.id)
        }catch(e:any){ toast.show(String(e),'error') }
    }

    async function handleDeleteActivity(id:string){
        try{ await api.deleteActivity(token, id); await load(); }catch(e:any){ toast.show(String(e),'error') }
    }

    async function handleSaveActivity(){ await load() }

    if (!detail) return <div className="card"><p className="text-muted">Ładowanie lekcji…</p></div>

    return (
        <div className="lesson-editor card" style={{padding:12}}>
            { showHeader !== false && (
                <LessonHeader lesson={lesson} onSave={saveLesson} onPreview={undefined} onDelete={async ()=>{ if (!confirm('Usuń lekcję?')) return; await api.deleteLessonInClass(token, klass.id, lesson.id); onChanged() }} saving={saving} />
            ) }

            <div className="lesson-editor-grid" style={{marginTop:12}}>
                <BlockListSidebar
                    activities={detail.activities}
                    selectedId={selectedId}
                    onSelect={(id)=>setSelectedId(id)}
                    onMoveUp={(idx)=> idx>0 && handleReorder(idx, idx-1)}
                    onMoveDown={(idx)=> idx < (detail.activities.length-1) && handleReorder(idx, idx+1)}
                    onEdit={(id)=> setSelectedId(id)}
                    onDelete={(id)=> handleDeleteActivity(id)}
                    onAdd={(type)=> handleAdd(type)}
                />

                <div className="lesson-editor-main">
                    <div style={{marginTop:8}}>
                        <div id="lesson-editor-structure">
                            <BlockEditorContainer token={token} role={role} activity={findActivity(selectedId)} onSaved={handleSaveActivity} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})

export default LessonEditorPage


