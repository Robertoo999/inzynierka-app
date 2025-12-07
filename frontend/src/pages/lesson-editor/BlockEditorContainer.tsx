import React from 'react'
import { api, type LessonActivity, type ActivityBody, type PublicTask, LANG_CAPS } from '../../api'
import ImageUploader from '../../components/ImageUploader'
import LocalTestConsole from '../../components/LocalTestConsole'
import QuizViewer from '../../components/QuizViewer'
import { useToast } from '../../components/Toasts'

// Parsed representation of a single test result (normalized for frontend views)
type ParsedTestResult = {
    index: number
    id?: string | number
    input?: string
    expected?: string
    actual?: string
    passed?: boolean | null
    points?: number | null
    maxPoints?: number | null
    message?: string
}

function shortText(s: any, maxLines = 3, maxChars = 300) {
    if (s == null) return ''
    const str = String(s)
    const lines = str.split(/\r?\n/)
    let out = lines.slice(0, maxLines).join('\n')
    if (out.length > maxChars) out = out.slice(0, maxChars) + '…'
    if (lines.length > maxLines) out += '\n…'
    return out
}

function parseRunResult(result: any): ParsedTestResult[] {
    // Handle common shapes: { tests: [...] } or { results: [...] } or array
    const out: ParsedTestResult[] = []
    if (!result) return out

    let arr = result.tests ?? result.results ?? (Array.isArray(result) ? result : null)
    // Some backends may return tests as a JSON string — parse if needed
    if (typeof arr === 'string') {
        try { const parsed = JSON.parse(arr); if (Array.isArray(parsed)) arr = parsed } catch {}
    }
    if (arr && Array.isArray(arr)) {
        for (let i = 0; i < arr.length; i++) {
            const it = arr[i]
            // try to read common fields
            let passed: boolean | null = null
            if (it.passed != null) passed = Boolean(it.passed)
            else if (it.success != null) passed = Boolean(it.success)
            else if (it.status) passed = (it.status === 'PASS' || it.status === 'OK' || it.status === 'SUCCESS')
            const actual = it.actual ?? it.output ?? it.stdout ?? it.result ?? it.answer
            const expected = it.expected ?? it.expectedOutput ?? it.expect
            const input = it.input ?? it.stdin ?? it.args
            const points = (it.points != null ? Number(it.points) : (it.score != null ? Number(it.score) : null))
            const maxPoints = (it.maxPoints != null ? Number(it.maxPoints) : (it.weight != null ? Number(it.weight) : null))
            out.push({
                index: i + 1,
                id: it.id ?? it.testId ?? i,
                input: input ?? undefined,
                expected: expected ?? undefined,
                actual: actual ?? undefined,
                passed: (passed === undefined ? null : Boolean(passed)),
                points: points ?? null,
                maxPoints: maxPoints ?? null,
                message: it.message ?? it.error ?? undefined,
            })
        }
        return out
    }

    // If result has top-level fields like stdout or score, expose a single entry
    const single: ParsedTestResult = {
        index: 1,
        id: result.id ?? result.testId ?? 1,
        input: result.input ?? undefined,
        expected: result.expected ?? undefined,
        actual: result.stdout ?? result.output ?? result.result ?? undefined,
        passed: result.passed != null ? Boolean(result.passed) : (result.error ? false : null),
        points: result.points ?? result.score ?? null,
        maxPoints: result.maxPoints ?? null,
        message: result.message ?? result.error ?? undefined,
    }
    return [single]
}

function ContentEditor({ token, activity, onSaved }:{ token:string; activity: LessonActivity; onSaved:()=>void }){
    const [title, setTitle] = React.useState(activity.title)
    // Parse existing body once for initial values
    const initial = React.useMemo(() => {
        try { return activity.body ? JSON.parse(activity.body) : { blocks: [] } } catch { return { blocks: [] } }
    }, [activity.body])
    const initialMd = React.useMemo(() => {
        const m = (initial.blocks || []).find((x:any)=> x.type === 'markdown')
        return m?.md ?? ''
    }, [initial])
    const initialImg = React.useMemo(() => {
        const i = (initial.blocks || []).find((x:any)=> x.type === 'image')
        return { src: i?.src || '', alt: i?.alt || '' }
    }, [initial])
    const initialCode = React.useMemo(() => {
        const c = (initial.blocks || []).find((x:any)=> x.type === 'code')
        return String(c?.code ?? '')
    }, [initial])

    const [md, setMd] = React.useState<string>(initialMd)
    const [imgUrl, setImgUrl] = React.useState<string>(initialImg.src)
    const [imgAlt, setImgAlt] = React.useState<string>(initialImg.alt || 'Ilustracja do treści bloku')
    const [code, setCode] = React.useState<string>(initialCode)

    const [saving, setSaving] = React.useState(false)
    const [titleErr, setTitleErr] = React.useState<string|undefined>()
    const toast = useToast()
    const formRef = React.useRef<HTMLDivElement|null>(null)

    async function save(){
        setTitleErr(undefined)
        if (!String(title).trim()) {
            setTitleErr('Podaj tytuł bloku.')
            const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            firstInvalid?.focus()
            return
        }
        setSaving(true)
        try{
            // Build blocks in a11y-friendly order: image → text → code
            const blocks: any[] = []
            if (imgUrl && imgUrl.trim()) blocks.push({ type:'image', src: imgUrl.trim(), alt: (imgAlt || 'Ilustracja do treści bloku').trim() })
            blocks.push({ type:'markdown', md })
            if (code && code.trim()) blocks.push({ type:'code', lang:'python', code })
            const bodyObj: ActivityBody = { blocks }
            await api.updateActivity(token, activity.id, { title, body: JSON.stringify(bodyObj) })
            toast.show('Zapisano blok', 'success')
            onSaved()
        }catch(e:any){ toast.show(String(e),'error') }
        finally{ setSaving(false) }
    }

    return (
        <div ref={formRef} style={{display:'grid', gap:8}}>
            <label htmlFor="content-title">Tytuł</label>
            <input id="content-title" className="input" value={title} onChange={e=>setTitle(e.target.value)} aria-describedby="content-title-hint content-title-err" aria-invalid={!!titleErr} />
            <span id="content-title-hint" className="text-muted" style={{fontSize:12}}>Krótki tytuł bloku.</span>
            {titleErr && <span id="content-title-err" className="text-danger" style={{fontSize:12}}>Błąd: {titleErr}</span>}

            <label style={{marginTop:4}}>Treść (Markdown)</label>
            <textarea className="textarea" rows={8} value={md} onChange={e=>setMd(e.target.value)} />

            <div style={{marginTop:8}}>
                <h4 style={{margin:'6px 0'}}>Ilustracja (opcjonalnie)</h4>
                {/* a11y: using a composed control with label and helper text; uploader handles paste/drag */}
                <ImageUploader value={imgUrl} onChange={setImgUrl} placeholder="Wklej URL obrazu lub wybierz plik…" />
                <label htmlFor="img-alt" style={{marginTop:6}}>Tekst alternatywny (alt)</label>
                <input id="img-alt" className="input" value={imgAlt} onChange={e=>setImgAlt(e.target.value)} aria-describedby="img-alt-hint" />
                <span id="img-alt-hint" className="text-muted" style={{fontSize:12}}>Krótki opis obrazu (dla czytników ekranu).</span>
            </div>

            <div style={{marginTop:8}}>
                <h4 style={{margin:'6px 0'}}>Przykład kodu (opcjonalnie)</h4>
                <div className="text-muted" style={{fontSize:12, marginBottom:4}}>Zostanie pokazany jako blok <code>&lt;pre&gt;&lt;code&gt;</code>. Domyślnie Python.</div>
                <textarea
                    className="textarea"
                    rows={8}
                    spellCheck={false}
                    style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace'}}
                    value={code}
                    onChange={e=>setCode(e.target.value)}
                    aria-describedby="code-hint"
                />
                <span id="code-hint" className="text-muted" style={{fontSize:12}}>Przydaje się jako przykład dla uczniów.</span>
            </div>

            <div style={{display:'flex',gap:8,marginTop:8}}>
                <button className="btn primary" onClick={save} disabled={saving}>{saving?'Zapisuję…':'Zapisz zmiany'}</button>
            </div>
        </div>
    )
}


function TaskEditor({ token, activity, onSaved }:{ token:string; activity: LessonActivity; onSaved:()=>void }){
    const [task, setTask] = React.useState<PublicTask|null>(null)
    const [loading, setLoading] = React.useState(true)
    const [title, setTitle] = React.useState(activity.title)
    const [desc, setDesc] = React.useState('')
    const [starter, setStarter] = React.useState('')
    const [teacherSolution, setTeacherSolution] = React.useState('')
    const [useDemoSolution, setUseDemoSolution] = React.useState<boolean>(true)
    const [language, setLanguage] = React.useState('javascript')
    const [saving, setSaving] = React.useState(false)
    const [ioOnly, setIoOnly] = React.useState(false)
    const [preferredMode, setPreferredMode] = React.useState<'EVAL'|'IO'>('IO')
    const toast = useToast()
    const [titleErr, setTitleErr] = React.useState<string|undefined>()
    const [maxErr, setMaxErr] = React.useState<string|undefined>()
    const formRef = React.useRef<HTMLDivElement|null>(null)

    // optional Monaco editor (dynamically loaded)
    const [EditorComp, setEditorComp] = React.useState<any>(null)
    const [editorLoaded, setEditorLoaded] = React.useState(false)
    const metaSaveTimerRef = React.useRef<any>(null)
    const [pendingMetaSave, setPendingMetaSave] = React.useState(false)

    React.useEffect(()=>{
        let mounted=true
        ;(async ()=>{ try{ const mod = await import('@monaco-editor/react'); if (mounted) setEditorComp(() => mod.default) }catch{} finally { if (mounted) setEditorLoaded(true) } })()
        return ()=>{ mounted=false }
    }, [])

    React.useEffect(()=>{
        let mounted=true
        if (activity.taskId){
            // fetch teacher view (includes hidden solution)
            api.getTeacherTask(token, activity.taskId).then(t=>{ if (!mounted) return;
                setTask(t);
                const st = t.starterCode ?? ''
                const sol = (t.teacherSolution ?? '').trim()
                setTitle(t.title);
                setDesc(t.description ?? '');
                setStarter(st);
                setLanguage(t.language ?? 'javascript');
                // Prefill solution from starter when empty
                if (!sol && st) {
                    setTeacherSolution(st);
                    setUseDemoSolution(true);
                } else {
                    setTeacherSolution(sol);
                    setUseDemoSolution(!!sol);
                }
            }).catch(async ()=>{
                // fallback to public task (should not contain solution) if teacher endpoint fails
                try { const t = await api.getPublicTask(activity.taskId!, token); if (!mounted) return;
                    setTask(t); setTitle(t.title); setDesc(t.description ?? ''); const st = t.starterCode ?? '';
                    setStarter(st); setLanguage(t.language ?? 'javascript');
                    // default to enabled + prefill from starter
                    setTeacherSolution(st); setUseDemoSolution(!!st);
                }
                catch {}
            }).finally(()=> setLoading(false))
        } else { setLoading(false) }
        return ()=>{ mounted=false }
    },[activity.taskId, token])

    // Pozwól globalnemu przyciskowi "Zapisz lekcję" wywołać zapis zadania (starter code itp.)
    React.useEffect(()=>{
        function onLessonSave(){ try{ save() }catch{} }
        window.addEventListener('lesson:save-active', onLessonSave)
        return ()=> window.removeEventListener('lesson:save-active', onLessonSave)
    }, [activity.taskId, title, desc, starter, language])

    // adjust preferred mode based on language capabilities
    const prevLangRef = React.useRef(language)
    React.useEffect(()=>{
        const caps: any = (LANG_CAPS as any)[language] || { eval:false, io:true }
        if (caps.eval) { setPreferredMode('EVAL'); setIoOnly(false) }
        else { setPreferredMode('IO'); setIoOnly(true) }
        // always switch starter code to language+mode sample
        const defaultSample = (caps && preferredMode === 'EVAL') ? caps.sample : (caps && caps.sampleIO) ? caps.sampleIO : caps.sample
        setStarter(() => (defaultSample || ''))
        prevLangRef.current = language
        setTestsList(list => list ? list.map(t => {
            if (!t.mode) return { ...t, mode: (caps.eval ? 'EVAL' : 'IO') }
            if (caps.eval && t.mode === 'IO') {
                const blank = (!t.input || String(t.input).trim()==='') && (!t.expected || String(t.expected).trim()==='')
                if (blank) return { ...t, mode:'EVAL' }
            }
            return t
        }) : list)
    }, [language])

    // when preferredMode changes, apply it globally (teacher-level) and update starter
    React.useEffect(()=>{
        if (!testsInitializedRef.current) return
        // update tests list to use the chosen mode
        setTestsList(list => list ? list.map(t => ({ ...t, mode: preferredMode, _dirty: true })) : list)
        // update starter to matching sample
        const caps: any = (LANG_CAPS as any)[language] || { eval:false, io:true }
        const sample = preferredMode === 'EVAL' ? caps.sample : (caps.sampleIO || caps.sample)
        setStarter(() => sample || '')
        // bez autozapisu testów
    }, [preferredMode])

    // when enabling demo solution, initialize from current starter code
    React.useEffect(()=>{
        if (useDemoSolution) {
            setTeacherSolution(starter || '')
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useDemoSolution])

    async function save(){
        if (!activity.taskId) return toast.show('Brak zadania', 'error')
        setTitleErr(undefined); setMaxErr(undefined)
        const maxPoints = task?.maxPoints ?? 10
        if (!String(title).trim()) {
            setTitleErr('Podaj tytuł zadania.')
        }
        if (maxPoints == null || isNaN(Number(maxPoints)) || Number(maxPoints) < 0) {
            setMaxErr('Maks. punkty muszą być liczbą ≥ 0.')
        }
        // Walidacja pustych testów (oba pola jednocześnie puste) – blokujemy zapis
        const hasEmptyTests = Array.isArray(testsList) && testsList.some(t => {
            const inputBlank = !t.input || String(t.input).trim()===''
            const expectedBlank = !t.expected || String(t.expected).trim()===''
            return inputBlank && expectedBlank
        })
        if (hasEmptyTests) {
            toast.show('Uzupełnij wszystkie testy – Wejście i Oczekiwany wynik nie mogą być jednocześnie puste.', 'error')
            return
        }
        if (titleErr || maxErr) {
            const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            firstInvalid?.focus()
            return
        }
        setSaving(true)
        try{
            // include maxPoints when saving task
            const maxPoints = task?.maxPoints ?? 10
            // EVAL signature validation when needed
            const caps: any = (LANG_CAPS as any)[language]
            const hasEvalTests = Array.isArray(testsList) && testsList.some((tt:any) => (tt.mode ?? preferredMode) === 'EVAL')
            if (caps?.eval && hasEvalTests) {
                const src = String(starter || '')
                const ok = (language === 'javascript') ? /function\s+solve\s*\(/.test(src) : (language === 'python') ? /def\s+solve\s*\(/.test(src) : true
                if (!ok) { toast.show('Dodaj funkcję solve(input) albo przełącz testy na IO', 'error'); setSaving(false); return }
            }
            await api.updateTaskWithSolution(token, activity.taskId, { title, description: desc, starterCode: starter, language, maxPoints, teacherSolution: useDemoSolution ? teacherSolution : undefined })
            // ręczny zapis testów
            await (async () => {
                if (!activity.taskId || !Array.isArray(testsList)) return
                for (let i=0;i<testsList.length;i++){
                    const t = testsList[i]
                    const inputBlank = !t.input || String(t.input).trim()===''
                    const expectedBlank = !t.expected || String(t.expected).trim()===''
                    if (inputBlank && expectedBlank) continue
                    if (t.id) {
                        await api.updateTest(token, activity.taskId!, t.id, { input: t.input, expected: t.expected, points: Number(t.points)||0, visible: !!t.visible, ordering: i, mode: (t.mode ?? preferredMode) })
                    } else {
                        const created = await api.createTest(token, activity.taskId!, { input: t.input, expected: t.expected, points: Number(t.points)||0, visible: !!t.visible, ordering: i, mode: (t.mode ?? preferredMode) })
                        setTestsList(l => l ? l.map((x,xi)=> xi===i ? created : x) : l)
                    }
                }
                setTestsList(l => l ? l.map(t => ({...t, _dirty: undefined, _draft: undefined})) : l)
            })()
            toast.show('Zapisano zadanie i testy', 'success')
            onSaved()
        }catch(e:any){ toast.show(String(e),'error') }
        finally{ setSaving(false) }
    }

    function scheduleMetaSave(){
        if (!activity.taskId) return
        setPendingMetaSave(true)
        if (metaSaveTimerRef.current) clearTimeout(metaSaveTimerRef.current)
        metaSaveTimerRef.current = setTimeout(async () => {
            try{
                const maxPoints = task?.maxPoints ?? 10
                await api.updateTaskWithSolution(token, activity.taskId!, { title, description: desc, starterCode: starter, language, maxPoints, teacherSolution: useDemoSolution ? teacherSolution : undefined })
            }catch(e:any){ /* show silent toasts sparingly */ }
            finally{ setPendingMetaSave(false) }
        }, 900)
    }

    // ---- Test cases CRUD ----
    const [testsList, setTestsList] = React.useState<any[]|null>(null)
    const [sumPoints, setSumPoints] = React.useState<number>(0)
    const [testsLoading, setTestsLoading] = React.useState(false)
    const [pendingAutoSave, setPendingAutoSave] = React.useState(false)
    const autoSaveTimerRef = React.useRef<any>(null)
    const testsInitializedRef = React.useRef(false)

    function recomputeSumPoints(list: any[] | null) {
        if (!list) { setSumPoints(0); return }
        const sum = list.reduce((s,t)=> s + (Number(t.points)||0), 0)
        setSumPoints(sum)
    }

    async function loadTests(){
        if (!activity.taskId) { setTestsList(null); return }
        setTestsLoading(true)
        try{
            // include token for authenticated access to tests
            const list = await api.getTests(activity.taskId, token)
            // ensure ordering is present
            list.sort((a:any,b:any)=> (a.ordering ?? 0) - (b.ordering ?? 0))
            setTestsList(list)
            testsInitializedRef.current = true
            recomputeSumPoints(list)
        }catch(e:any){ toast.show(String(e),'error'); setTestsList([]) }
        finally{ setTestsLoading(false) }
    }

    React.useEffect(()=>{ loadTests() }, [activity.taskId])

    async function addTest(){
        if (!activity.taskId) { toast.show('Brak zadania', 'error'); return }
        // Dodaj lokalny szkic testu bez zapisu na backendzie; zapis nastąpi dopiero gdy pola nie będą puste.
        const draft = { input:'', expected:'', points:0, visible:false, ordering:(testsList?.length ?? 0), mode: preferredMode, _dirty:true, _draft:true }
        setTestsList(l => { const nl = (l||[]).concat([draft]); recomputeSumPoints(nl); return nl })
        toast.show('Dodano test (uzupełnij pola przed zapisem)', 'info')
    }

    async function saveTest(idx:number){
        if (!testsList) return
        const t = testsList[idx]
        if (!t) return
        if ((!t.input || String(t.input).trim().length===0) && (!t.expected || String(t.expected).trim().length===0)) { toast.show('Wejście i oczekiwany wynik nie mogą być puste', 'error'); return }
        if (t.points == null || Number(t.points) < 0) { toast.show('Punkty muszą być >= 0', 'error'); return }
        try{
            if (t.id) {
                await api.updateTest(token, activity.taskId!, t.id, { input: t.input, expected: t.expected, points: Number(t.points)||0, visible: !!t.visible, ordering: idx, mode: (t.mode ?? preferredMode) })
                toast.show('Zapisano test', 'success')
            } else {
                const created = await api.createTest(token, activity.taskId!, { input: t.input, expected: t.expected, points: Number(t.points)||0, visible: !!t.visible, ordering: idx, mode: (t.mode ?? preferredMode) })
                setTestsList(l => {
                    const nl = l!.map((x,i)=> i===idx ? created : x)
                    recomputeSumPoints(nl)
                    return nl
                })
                toast.show('Dodano test', 'success')
            }
            await loadTests()
        }catch(e:any){ toast.show(String(e),'error') }
    }

    async function deleteTest(idx:number){
        if (!testsList) return
        const t = testsList[idx]
        if (!t) return
        try{
            if (t.id) await api.deleteTest(token, activity.taskId!, t.id)
            setTestsList(l => { const nl = l!.filter((_,i)=>i!==idx); recomputeSumPoints(nl); return nl })
            toast.show('Usunięto test', 'success')
        }catch(e:any){ toast.show(String(e),'error') }
    }

    async function moveTest(idx:number, dir:number){
        if (!testsList) return
        const to = idx + dir
        if (to < 0 || to >= (testsList.length)) return
        const arr = testsList.slice()
        const [item] = arr.splice(idx,1)
        arr.splice(to,0,item)
        setTestsList(arr.map((t,i)=> ({...t, ordering:i, _dirty:true})))
        recomputeSumPoints(arr)
    }

    function scheduleAutoSave(){
        if (!testsInitializedRef.current) return
        setPendingAutoSave(true)
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = setTimeout(async () => {
            try{
                if (!testsList) return
                for (let i=0;i<testsList.length;i++){
                    const t = testsList[i]
                    if (!t || !t._dirty) continue
                    if (t.id) {
                        await api.updateTest(token, activity.taskId!, t.id, { input: t.input, expected: t.expected, points: Number(t.points)||0, visible: !!t.visible, ordering: i, mode: (t.mode ?? preferredMode) })
                    } else {
                        // Pomijaj zapisy pustych szkiców – wymagamy wypełnienia obu pól
                        const inputBlank = !t.input || String(t.input).trim()===''
                        const expectedBlank = !t.expected || String(t.expected).trim()===''
                        if (inputBlank && expectedBlank) continue
                        const created = await api.createTest(token, activity.taskId!, { input: t.input, expected: t.expected, points: Number(t.points)||0, visible: !!t.visible, ordering: i, mode: (t.mode ?? preferredMode) })
                        setTestsList(l => l ? l.map((x,xi)=> xi===i ? created : x) : l)
                    }
                }
                // clear dirty flags
                setTestsList(l => l ? l.map(t => ({...t, _dirty: undefined, _draft: undefined})) : l)
            }catch(e:any){ toast.show(String(e),'error') }
            finally{
                setPendingAutoSave(false)
            }
        }, 800)
    }


    return (
        <div>
            {loading ? <p className="text-muted">Ładowanie…</p> : (
                <div ref={formRef} style={{display:'grid',gap:8}}>
                    <label htmlFor="task-title">Tytuł zadania</label>
                    <input id="task-title" className="input" value={title} onChange={e=>{ setTitle(e.target.value); scheduleMetaSave(); }} aria-describedby="task-title-hint task-title-err" aria-invalid={!!titleErr} />
                    <span id="task-title-hint" className="text-muted" style={{fontSize:12}}>Krótki, zrozumiały tytuł.</span>
                    {titleErr && <span id="task-title-err" className="text-danger" style={{fontSize:12}}>Błąd: {titleErr}</span>}
                    <label>Opis</label>
                    <input className="input" value={desc} onChange={e=>{ setDesc(e.target.value); scheduleMetaSave(); }} />
                    <label>Język</label>
                    <select className="select" value={language} onChange={e=>{ setLanguage(e.target.value); scheduleMetaSave(); }}>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                    </select>
                    <label style={{marginTop:8}}>Tryb zadania (globalny)</label>
                    {!ioOnly ? (
                        <div style={{display:'flex', gap:8, alignItems:'center'}}>
                            <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                <input type="radio" checked={preferredMode === 'EVAL'} onChange={() => { setPreferredMode('EVAL'); }} /> EVAL
                            </label>
                            <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                <input type="radio" checked={preferredMode === 'IO'} onChange={() => { setPreferredMode('IO'); }} /> IO
                            </label>
                            <div className="text-muted" style={{marginLeft:12, fontSize:12}}>{(LANG_CAPS as any)[language]?.evalSignatureHint || ''}</div>
                        </div>
                    ) : (
                        <div className="text-muted">Tryb: IO (tylko)</div>
                    )}
                    {/* Opisy trybów testowania */}
                    {!ioOnly && (
                        <div style={{display:'grid', gap:4, fontSize:12, marginTop:4}} aria-live="polite">
                            <div><strong>EVAL:</strong> Wywołuje funkcję <code>solve(input)</code> i porównuje wartość zwracaną z oczekiwanym wynikiem.</div>
                            <div><strong>IO:</strong> Podaje dane przez standardowe wejście (stdin) i porównuje tekst wypisany na wyjściu (stdout).</div>
                        </div>
                    )}
                    {ioOnly && (
                        <div style={{fontSize:12, marginTop:4}} aria-live="polite">
                            <strong>IO:</strong> Ten język wspiera wyłącznie tryb wejście/wyjście: czytaj dane ze <code>stdin</code>, wypisz odpowiedź na <code>stdout</code>.
                        </div>
                    )}
                    <label htmlFor="task-max" style={{marginTop:8}}>Maksymalna liczba punktów</label>
                    <input id="task-max" className="input" type="number" value={task?.maxPoints ?? 10} onChange={e=> { setTask(t => t ? ({ ...t, maxPoints: Number(e.target.value) || 0 }) : t); scheduleMetaSave(); }} aria-describedby="task-max-hint task-max-err" aria-invalid={!!maxErr} />
                    <span id="task-max-hint" className="text-muted" style={{fontSize:12}}>Wpisz liczbę ≥ 0.</span>
                    {maxErr && <span id="task-max-err" className="text-danger" style={{fontSize:12}}>Błąd: {maxErr}</span>}
                    <label>Kod startowy</label>
                    { EditorComp ? (
                        <EditorComp
                            key={language}
                            height="200px"
                            defaultLanguage={language}
                            language={language}
                            value={starter}
                            onMount={(editor:any, monaco:any)=>{
                                try{
                                    monaco.languages.registerCompletionItemProvider('python', {
                                        provideCompletionItems: (model:any, position:any) => {
                                            const word = model.getWordUntilPosition(position)
                                            const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
                                            return {
                                                suggestions: [
                                                    { label: 'solve', kind: monaco.languages.CompletionItemKind.Function, insertText: 'def solve(input):\n    # TODO: przetwórz input\n    return input\n', range },
                                                    { label: 'print-debug', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'print(f"DBG: {variable}")', range },
                                                    { label: 'list-comp', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[x for x in range(10)]', range }
                                                ]
                                            }
                                        }
                                    })
                                }catch{}
                            }}
                            onChange={(v:any)=> { setStarter(v ?? ''); scheduleMetaSave(); }}
                            options={{ minimap: { enabled: false }, fontSize: 12 }}
                        />
                    ) : (
                        <textarea className="textarea" rows={8} value={starter} onChange={e=>{ setStarter(e.target.value); scheduleMetaSave(); }} />
                    ) }
                    {/* EVAL helper actions */}
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        {!ioOnly && (LANG_CAPS as any)[language]?.sample && (
                            <button className="btn" onClick={()=> setStarter((LANG_CAPS as any)[language].sample)}>Wstaw przykładowy kod (EVAL)</button>
                        )}
                    </div>
                    <div style={{display:'flex', gap:12, alignItems:'center', marginTop:12}}>
                        <label style={{display:'flex', gap:6, alignItems:'center'}}>
                            <input type="checkbox" checked={useDemoSolution} onChange={e=> setUseDemoSolution(e.target.checked)} /> Użyj rozwiązania demonstracyjnego
                        </label>
                        {useDemoSolution && (
                            <button className="btn" onClick={()=> setTeacherSolution(starter || '')}>Zsynchronizuj ze starterem</button>
                        )}
                    </div>
                    {useDemoSolution && (
                        <>
                            <label style={{marginTop:8}}>Rozwiązanie demonstracyjne (ukryte)</label>
                            <div className="text-muted" style={{fontSize:12, marginBottom:4}}>To rozwiązanie służy tylko do weryfikacji testów. Uczniowie nie mają do niego dostępu.</div>
                            { EditorComp ? (
                                <EditorComp
                                    key={'teacher-'+language}
                                    height="180px"
                                    defaultLanguage={language}
                                    language={language}
                                    value={teacherSolution}
                                    onChange={(v:any)=> { setTeacherSolution(v ?? ''); scheduleMetaSave(); }}
                                    options={{ minimap: { enabled: false }, fontSize: 12 }}
                                />
                            ) : (
                                <textarea className="textarea" rows={6} value={teacherSolution} onChange={e=>{ setTeacherSolution(e.target.value); scheduleMetaSave(); }} />
                            ) }
                        </>
                    )}
                    
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <div className="text-muted">Testy: {task ? (task.maxPoints ? 'konfiguracja testów' : '—') : 'brak'}</div>
                        <div className="text-muted">Zmiany testów zapisują się po „Zapisz zadanie”.</div>
                        {useDemoSolution && (
                            <div style={{marginLeft:'auto'}}>
                                <RunTestsButton token={token} activity={activity} codeGetter={() => starter} testsMeta={testsList || []} language={language} teacherMode={true} teacherSolution={teacherSolution} />
                            </div>
                        )}
                    </div>
                    {/* actions row (save + run demo) */}
                    
                    <hr style={{borderColor:'var(--line)', margin:'12px 0'}} />
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h4 style={{margin:0}}>Testy automatyczne</h4>
                        <div style={{display:'flex', gap:8}}>
                            <button className="btn" onClick={addTest}>Dodaj test</button>
                        </div>
                    </div>
                    {testsLoading ? <p className="text-muted">Ładowanie testów…</p> : (
                        <div style={{display:'grid', gap:8, marginTop:8}}>
                            {(!testsList || testsList.length === 0) && <p className="text-muted">Brak testów.</p>}
                            {Array.isArray(testsList) && testsList.length > 0 && (
                                <div className="text-muted" style={{fontSize:12, display:'flex', alignItems:'center', gap:8}}>
                                    <span>Suma punktów w testach: <b>{sumPoints}</b></span>
                                    <button className="btn" onClick={()=> setTask(t => t ? ({ ...t, maxPoints: sumPoints }) : t)}>Ustaw jako maks. punkty zadania</button>
                                    {task?.maxPoints ? <span style={{marginLeft:8}}>Limit zadania: <b>{task.maxPoints}</b> • Pozostało: <b>{Math.max(0, (task.maxPoints||0) - sumPoints)}</b></span> : null}
                                </div>
                            )}
                            {testsList && testsList.map((t, idx) => (
                                <div key={t.id ?? ('tmp-'+idx)} style={{border:'1px solid var(--line)', padding:8, borderRadius:8, display:'grid', gap:8}}>
                                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                                        <div>
                                            <label>{(t.mode ?? preferredMode) === 'EVAL' ? 'Argument dla solve(input)' : 'Wejście'}</label>
                                            <textarea
                                                className="textarea"
                                                rows={3}
                                                spellCheck={false}
                                                style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace'}}
                                                value={t.input ?? ''}
                                                onChange={e=> { setTestsList(l => { const nl = l!.map((x,i)=> i===idx ? {...x, input: e.target.value, _dirty: true} : x); return nl }) }}
                                                onBlur={e=> { const v = e.target.value.trim(); setTestsList(l => { const nl = l!.map((x,i)=> i===idx ? {...x, input: v, _dirty: true} : x); return nl }) }}
                                            />
                                            <div style={{fontSize:10, color:'#8898a7', marginTop:2}}>Podgląd: {(t.input ?? '').replace(/\n/g,'␤').replace(/\t/g,'⇥')}</div>
                                        </div>
                                        <div>
                                            <label>{(t.mode ?? preferredMode) === 'EVAL' ? 'Oczekiwany wynik funkcji (return)' : 'Oczekiwany wynik'}</label>
                                            <textarea
                                                className="textarea"
                                                rows={3}
                                                spellCheck={false}
                                                style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace'}}
                                                value={t.expected ?? ''}
                                                onChange={e=> { setTestsList(l => { const nl = l!.map((x,i)=> i===idx ? {...x, expected: e.target.value, _dirty: true} : x); return nl }) }}
                                                onBlur={e=> { const v = e.target.value.trim(); setTestsList(l => { const nl = l!.map((x,i)=> i===idx ? {...x, expected: v, _dirty: true} : x); return nl }) }}
                                            />
                                            <div style={{fontSize:10, color:'#8898a7', marginTop:2}}>Podgląd: {(t.expected ?? '').replace(/\n/g,'␤').replace(/\t/g,'⇥')}</div>
                                        </div>
                                    </div>
                                    <div style={{display:'flex', gap:16, alignItems:'center'}}>
                                        {ioOnly ? (
                                            <div className="text-muted">Tryb: IO (tylko)</div>
                                        ) : (
                                            <div className="text-muted">Tryb: {(t.mode ?? preferredMode)}</div>
                                        )}
                                        <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                            <span style={{fontSize:12}}>Punkty testu</span>
                                            {(() => {
                                                const totalCap = task?.maxPoints ?? 0
                                                const unlimited = !totalCap || totalCap <= 0
                                                const sumOther = (testsList||[]).reduce((s,x,i)=> s + (i===idx ? 0 : (Number(x.points)||0)), 0)
                                                const maxAllowed = unlimited ? Number.MAX_SAFE_INTEGER : Math.max(0, totalCap - sumOther)
                                                const current = Number(t.points)||0
                                                return (
                                                    <>
                                                        <input
                                                            type="number"
                                                            className="input"
                                                            style={{width:120}}
                                                            min={0}
                                                            max={unlimited ? undefined : maxAllowed}
                                                            value={current}
                                                            onChange={e=> {
                                                                const raw = Number(e.target.value)||0
                                                                const val = unlimited ? raw : Math.min(Math.max(0, raw), maxAllowed)
                                                                setTestsList(l => { const nl = l!.map((x,i)=> i===idx ? {...x, points: val, _dirty: true} : x); recomputeSumPoints(nl); return nl })
                                                            }}
                                                        />
                                                        {!unlimited && <span className="text-muted" style={{fontSize:11}}>pozostało łącznie {Math.max(0, maxAllowed)}</span>}
                                                    </>
                                                )
                                            })()}
                                        </label>
                                        <label style={{display:'flex', gap:6, alignItems:'center'}}>
                                            <input type="checkbox" checked={!!t.visible} onChange={e=> { setTestsList(l => { const nl = l!.map((x,i)=> i===idx ? {...x, visible: e.target.checked, _dirty: true} : x); return nl }) }} /> Widoczny dla ucznia
                                        </label>
                                        <div style={{marginLeft:'auto', display:'flex', gap:6}}>
                                            <button className="btn" onClick={()=> moveTest(idx, -1)} title="Przesuń w górę">↑</button>
                                            <button className="btn" onClick={()=> moveTest(idx, +1)} title="Przesuń w dół">↓</button>
                                            <button className="btn" style={{borderColor:'#6b1d1d'}} onClick={()=> deleteTest(idx)}>Usuń</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// Run tests button (used by teacher to run demo runs)
function RunTestsButton({ token, activity, codeGetter, testsMeta, language, teacherMode, teacherSolution }:{ token:string; activity: LessonActivity; codeGetter:()=>string; testsMeta?: any[]; language: string; teacherMode?: boolean; teacherSolution?: string }){
    const toast = useToast()
    const [running, setRunning] = React.useState(false)
    const [parsed, setParsed] = React.useState<ParsedTestResult[] | null>(null)
    const [expanded, setExpanded] = React.useState<Record<string|number, boolean>>({})
    const [showErrorDetails, setShowErrorDetails] = React.useState(false)

    function miniDiff(a?: string, b?: string){
        if (a == null || b == null) return ''
        const aa = String(a)
        const bb = String(b)
        const len = Math.min(aa.length, bb.length)
        for (let i=0;i<len;i++){
            if (aa[i] !== bb[i]) {
                const ctxA = aa.slice(Math.max(0,i-10), i+10)
                const ctxB = bb.slice(Math.max(0,i-10), i+10)
                return `Różnica na pozycji ${i}: oczekiwano "${aa[i]}" vs otrzymano "${bb[i]}"\n…${ctxA}…\n…${ctxB}…`
            }
        }
        if (aa.length !== bb.length) return `Różna długość: oczekiwano ${aa.length}, otrzymano ${bb.length}`
        return ''
    }

    async function run(){
        if (!activity.taskId) return toast.show('Brak zadania', 'error')
        if (!token) return toast.show('Musisz być zalogowany', 'error')
        if (teacherMode && (!teacherSolution || teacherSolution.trim().length === 0)) return toast.show('Dodaj rozwiązanie wzorcowe aby uruchomić testy', 'error')
        setRunning(true)
        try{
            const res = teacherMode ? await api.runTaskDemo(token, activity.taskId!) : await api.runTask(token, activity.taskId!, { code: codeGetter(), language })
            if (res?.error) {
                const msg = String(res.error)
                const denied = /403|forbidden|access denied/i.test(msg)
                toast.show(denied ? 'Brak uprawnień do uruchamiania testów (demo).' : ('Uruchamianie nieobsługiwane: '+msg), 'error')
                setParsed([])
            } else {
                const parsedRes = parseRunResult(res)
                // Helpful hint when backend indicates Judge0 not configured
                if (parsedRes.some(p => String(p.message || '').includes('Python execution unavailable'))) {
                    toast.show('Wykonywanie Python IO niedostępne na serwerze. Skonfiguruj JUDGE0_URL (lub uruchom backend przez docker-compose, gdzie JUDGE0_URL jest ustawione).', 'error')
                }
                setParsed(parsedRes)
            }
        }catch(e:any){ toast.show(String(e),'error'); setParsed([]) }
        finally{ setRunning(false) }
    }

    return (
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <div style={{display:'flex', justifyContent:'flex-end'}}>
                <button
                    className="btn"
                    onClick={run}
                    disabled={running || (teacherMode && (!teacherSolution || teacherSolution.trim().length === 0))}
                    title={teacherMode && (!teacherSolution || teacherSolution.trim().length === 0) ? 'Dodaj rozwiązanie wzorcowe, aby uruchomić testy' : undefined}
                >{running ? 'Uruchamianie…' : 'Uruchom testy (demo)'}</button>
            </div>

            <div style={{width:'100%', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace'}}>
                <h4 style={{margin:'6px 0'}}>Wyniki testów (demo){parsed && parsed.length>0 ? ` — Zaliczono ${parsed.filter(p=>p.passed).length}/${parsed.length}` : ''}</h4>
                {!parsed && <div className="text-muted">Brak wyników – uruchom testy.</div>}
                {parsed && parsed.length === 0 && <div className="text-muted">Brak wyników – uruchom testy.</div>}
                        {parsed && parsed.length > 0 && (
                    <div style={{display:'flex', flexDirection:'column', gap:6}}>
                                {/* Aggregated error summary */}
                                        {(() => {
                                            const fails = parsed.filter(p => p.passed === false || p.passed === null || (p.message && String(p.message).trim()))
                                            if (fails.length === 0) return null
                                            const msgs = fails.slice(0,5).map(p => (p.message && String(p.message).split(/\r?\n/)[0]) || miniDiff(p.expected, p.actual) || `Test #${p.index}: NIEZALICZONY`)
                                            return (
                                                <div style={{background:'#3a2a08', border:'1px solid #b4881a', padding:8, borderRadius:6, color:'#f3e1b0', cursor:'pointer'}} onClick={()=> setShowErrorDetails(s=>!s)}>
                                                    <div>{`Błędy (${fails.length}): `} {msgs.join(' • ')}{fails.length>5?' …':''} <span style={{marginLeft:8, fontSize:12, opacity:0.9}}>{showErrorDetails?'(ukryj szczegóły)':'(pokaż szczegóły)'}</span></div>
                                                    {showErrorDetails && (
                                                        <div style={{marginTop:6, background:'#2f240a', border:'1px dashed #b4881a', padding:8, borderRadius:6}}>
                                                            {fails.slice(0,5).map((p,i)=> (
                                                                <div key={i} style={{marginBottom:6, fontSize:12}}>
                                                                    <div><strong>Test #{p.index}</strong></div>
                                                                    {p.input!=null && <div><em>Wejście:</em> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.input,3,200)}</pre></div>}
                                                                    {p.expected!=null && <div><em>Oczekiwany:</em> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.expected,3,200)}</pre></div>}
                                                                    {p.actual!=null && <div><em>Wynik:</em> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.actual,3,200)}</pre></div>}
                                                                    {p.message && <div style={{color:'#e7b95a'}}>{shortText(p.message,3,200)}</div>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })()}
                        {parsed.map(p => {
                            const vis = !testsMeta || (testsMeta.find(tm => String(tm.id) === String(p.id))?.visible ?? true)
                            const isExp = expanded[p.id ?? p.index]
                            const canExpand = !!vis
                            const toggle = () => setExpanded(e=> ({...e, [p.id ?? p.index]: !isExp }))
                            return (
                                <div key={p.id ?? p.index} style={{border:'1px solid var(--line)', borderRadius:6}}>
                                    <div
                                        style={{display:'flex', alignItems:'center', gap:12, padding:6, cursor: canExpand ? 'pointer' : 'default'} }
                                        onClick={canExpand ? toggle : undefined}
                                    >
                                        <div style={{width:28, fontWeight:600}}>{p.index}</div>
                                        <div style={{width:60, fontWeight:600, color: p.passed ? 'var(--success)' : (p.passed === false ? 'var(--danger)' : 'inherit')}}>{p.passed === null ? 'ERR' : (p.passed ? '✔' : '✘')}</div>
                                        <div style={{fontSize:12, flex:'1 1 auto'}}>{(p.points != null ? p.points : '—')}{p.maxPoints != null ? ` / ${p.maxPoints}` : ''}</div>
                                        {canExpand ? (
                                            <button className="btn ghost" style={{padding:'4px 8px', fontSize:12}}>{isExp ? 'Ukryj' : 'Pokaż'}</button>
                                        ) : null}
                                    </div>
                                    {canExpand && isExp && (
                                        <div style={{padding:'4px 10px', display:'grid', gap:4, fontSize:12}}>
                                            <div><strong>Wejście:</strong> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.input,5,400)}</pre></div>
                                            <div><strong>Oczekiwany:</strong> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.expected,5,400)}</pre></div>
                                            <div><strong>Wynik:</strong> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.actual,5,400)}</pre></div>
                                            {p.message && <div style={{color:'#e7b95a'}}>Błąd: {shortText(p.message,3,300)}</div>}
                                            <div className="text-muted" style={{whiteSpace:'pre-wrap'}}>{miniDiff(p.expected, p.actual)}</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// Student-facing code exercise view
function StudentCodeExerciseView({ token, activity }:{ token:string; activity: LessonActivity }){
    const toast = useToast()
    const [task, setTask] = React.useState<PublicTask|null>(null)
    const [tests, setTests] = React.useState<any[]|null>(null)
    const [code, setCode] = React.useState('')
    const [loading, setLoading] = React.useState(true)
    const [running, setRunning] = React.useState(false)
    const [result, setResult] = React.useState<any|null>(null)
    const [parsedResults, setParsedResults] = React.useState<ParsedTestResult[]|null>(null)
    const [EditorComp, setEditorComp] = React.useState<any>(null)
    const [submission, setSubmission] = React.useState<import('../../api').Submission | null>(null)
    const [showErrorDetails, setShowErrorDetails] = React.useState(false)

    React.useEffect(()=>{
        let mounted=true
        ;(async ()=>{ try{ const mod = await import('@monaco-editor/react'); if (mounted) setEditorComp(() => mod.default) }catch{} })()
        return ()=>{ mounted=false }
    }, [])

    React.useEffect(()=>{
        let mounted=true
        if (!activity.taskId) { setLoading(false); return }
        (async ()=>{
            try{
                const t = await api.getPublicTask(activity.taskId!)
                const list = await api.getTests(activity.taskId!)
                if (!mounted) return
                setTask(t)
                setTests(list || [])
                setCode(t.starterCode ?? '')
                // load existing submission for this student (if token provided)
                try{
                    if (token) {
                        const sub = await api.mySubmissionForTask(token, activity.taskId!)
                        if (mounted) setSubmission(sub as any)
                    }
                }catch(e:any){ /* ignore if no submission */ }
            }catch(e:any){ toast.show(String(e),'error') }
            finally{ if (mounted) setLoading(false) }
        })()
        return ()=>{ mounted=false }
    }, [activity.taskId])

    async function run(){
        if (!activity.taskId) return toast.show('Brak zadania', 'error')
        if (!token) return toast.show('Musisz być zalogowany', 'error')
        // clear previous results to avoid stale display
        setResult(null); setParsedResults(null)
        setRunning(true)
        try{
            const res = await api.runTask(token, activity.taskId!, { code })
            setResult(res)
            if (res?.error) {
                const msg = String(res.error)
                const denied = /403|forbidden|access denied/i.test(msg)
                toast.show(denied ? 'Brak uprawnień do uruchamiania testów.' : ('Uruchamianie nieobsługiwane: '+msg), 'error')
                setParsedResults([])
            } else {
                setParsedResults(parseRunResult(res))
                const parsed = parseRunResult(res)
                if (parsed.some(p => String(p.message || '').includes('Python execution unavailable'))) {
                    toast.show('Wykonywanie Python IO niedostępne na serwerze. Skonfiguruj JUDGE0_URL lub uruchom backend via docker-compose gdzie jest skonfigurowane.', 'error')
                }
            }
            // refresh submission info (run now persists submission on backend)
            try{
                const sub = await api.mySubmissionForTask(token, activity.taskId!)
                setSubmission(sub as any)
            }catch(e:any){ /* ignore */ }
        }catch(e:any){ toast.show(String(e),'error') }
        finally{ setRunning(false) }
    }

    return (
        <div>
            {loading ? <p className="text-muted">Ładowanie…</p> : (
                <div style={{display:'grid', gap:8}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                            <strong>{task?.title ?? activity.title}</strong>
                            <div className="text-muted">{task?.description}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                            <div className="text-muted">Status: {submission ? submission.status : 'nie rozpoczęte'}</div>
                            <div className="text-muted">Punkty: {submission && submission.points != null ? `${submission.points} / ${task?.maxPoints ?? '—'}` : `— / ${task?.maxPoints ?? '—'}`}</div>
                        </div>
                    </div>
                    <label>Kod</label>
                    { EditorComp ? (
                        <EditorComp
                            height="240px"
                            defaultLanguage={task?.language ?? 'javascript'}
                            language={task?.language ?? 'javascript'}
                            value={code}
                            onChange={(v:any)=> setCode(v ?? '')}
                            onMount={(editor:any, monaco:any)=>{
                                try{
                                    monaco.languages.registerCompletionItemProvider('python', {
                                        provideCompletionItems: (model:any, position:any) => {
                                            const word = model.getWordUntilPosition(position)
                                            const range = { startLineNumber: position.lineNumber, endLineNumber: position.lineNumber, startColumn: word.startColumn, endColumn: word.endColumn }
                                            return {
                                                suggestions: [
                                                    {
                                                        label: 'solve',
                                                        kind: monaco.languages.CompletionItemKind.Function,
                                                        insertText: 'def solve(input):\n    # TODO: przetwórz dane\n    return input\n',
                                                        range
                                                    },
                                                    {
                                                        label: 'print',
                                                        kind: monaco.languages.CompletionItemKind.Snippet,
                                                        insertText: 'print(f"Debug: {variable}")',
                                                        range
                                                    }
                                                ]
                                            }
                                        }
                                    })
                                }catch{}
                            }}
                            options={{minimap:{enabled:false}, fontSize:12}}
                        />
                    ) : (
                        <textarea className="textarea" rows={12} value={code} onChange={e=>setCode(e.target.value)} />
                    ) }
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <button className="btn primary" onClick={run} disabled={running}>{running ? 'Uruchamianie…' : 'Uruchom testy'}</button>
                        <div className="text-muted">Dostępne testy: {tests ? tests.filter(t=>t.visible).length : '—'}</div>
                    </div>
                    <div style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>
                        <h4 style={{margin:'6px 0'}}>Wyniki testów{parsedResults && parsedResults.length>0 ? ` — Zaliczono ${parsedResults.filter(p=>p.passed).length}/${parsedResults.length}` : ''}</h4>
                        {!parsedResults && <div className="text-muted">Brak wyników – uruchom testy.</div>}
                        {parsedResults && parsedResults.length === 0 && <div className="text-muted">Brak wyników – uruchom testy.</div>}
                        {parsedResults && parsedResults.length > 0 && (
                            <div style={{display:'flex', flexDirection:'column', gap:6}}>
                                {/* Error summary above stdout/results */}
                                {(() => {
                                    const fails = parsedResults.filter(p => p.passed === false || p.passed === null || (p.message && String(p.message).trim()))
                                    if (fails.length === 0) return null
                                    const msgs = fails.slice(0,5).map(p => (p.message && String(p.message).split(/\r?\n/)[0]) || ((p.expected!=null || p.actual!=null) ? `#${p.index}: oczekiwano ${JSON.stringify(p.expected)} vs otrzymano ${JSON.stringify(p.actual)}` : `#${p.index}: NIEZALICZONY`))
                                    return (
                                        <div style={{background:'#3a2a08', border:'1px solid #b4881a', padding:8, borderRadius:6, color:'#f3e1b0', cursor:'pointer'}} onClick={()=> setShowErrorDetails(s=>!s)}>
                                            <div>{`Błędy (${fails.length}): `} {msgs.join(' • ')}{fails.length>5?' …':''} <span style={{marginLeft:8, fontSize:12, opacity:0.9}}>{showErrorDetails?'(ukryj szczegóły)':'(pokaż szczegóły)'}</span></div>
                                            {showErrorDetails && (
                                                <div style={{marginTop:6, background:'#2f240a', border:'1px dashed #b4881a', padding:8, borderRadius:6}}>
                                                    {fails.slice(0,5).map((p,i)=> (
                                                        <div key={i} style={{marginBottom:6, fontSize:12}}>
                                                            <div><strong>Test #{p.index}</strong></div>
                                                            {p.input!=null && <div><em>Wejście:</em> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.input,3,200)}</pre></div>}
                                                            {p.expected!=null && <div><em>Oczekiwany:</em> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.expected,3,200)}</pre></div>}
                                                            {p.actual!=null && <div><em>Wynik:</em> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.actual,3,200)}</pre></div>}
                                                            {p.message && <div style={{color:'#e7b95a'}}>{shortText(p.message,3,200)}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })()}
                                {parsedResults.map(p => {
                                    const meta = tests?.find(t => String(t.id) === String(p.id) || (t.ordering != null && Number(t.ordering) === (p.index-1)))
                                    const visible = meta ? !!meta.visible : true
                                    const expKey = `stu-${p.id ?? p.index}`
                                    const isExpanded = (window as any)[expKey] === true
                                    function toggle(){ (window as any)[expKey] = !isExpanded; setParsedResults(r=> r ? r.slice() : r) }
                                    return (
                                        <div key={p.id ?? p.index} style={{border:'1px solid var(--line)', borderRadius:6}}>
                                            <div style={{display:'flex', alignItems:'center', gap:12, padding:6, cursor:'pointer'}} onClick={toggle}>
                                                <div style={{width:32, fontWeight:600}}>#{p.index}</div>
                                                <div style={{width:60, fontWeight:600, color: p.passed ? 'var(--success)' : (p.passed === false ? 'var(--danger)' : 'inherit')}}>{p.passed === null ? 'ERR' : (p.passed ? '✔' : '✘')}</div>
                                                <div style={{fontSize:12}}>Punkty: {(p.points != null ? p.points : '—')}{p.maxPoints != null ? ` / ${p.maxPoints}` : ''}</div>
                                                <div style={{marginLeft:'auto', fontSize:12}}>{isExpanded ? 'Ukryj' : 'Pokaż'}</div>
                                            </div>
                                            {isExpanded && (
                                                <div style={{padding:'4px 10px', fontSize:12}}>
                                                    {visible ? (
                                                        <div style={{display:'grid', gap:6}}>
                                                            <div><strong>{meta?.mode === 'EVAL' ? 'Argument' : 'Wejście'}:</strong> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.input,5,400)}</pre></div>
                                                            <div><strong>{meta?.mode === 'EVAL' ? 'Oczekiwany wynik' : 'Oczekiwany'}:</strong> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.expected,5,400)}</pre></div>
                                                            <div><strong>{meta?.mode === 'EVAL' ? 'Wynik' : 'Wynik'}:</strong> <pre style={{whiteSpace:'pre-wrap', margin:0}}>{shortText(p.actual,5,400)}</pre></div>
                                                        </div>
                                                    ) : <div className="text-muted">Test ukryty – {p.passed ? 'zaliczony' : 'niezaliczony'}</div>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    <hr />
                    <div>
                        <h4>Widoczne testy</h4>
                        {(!tests || tests.length===0) && <p className="text-muted">Brak testów.</p>}
                        {tests && tests.filter(t=>t.visible).map((t,idx)=> (
                            <div key={t.id ?? idx} style={{border:'1px solid var(--line)', padding:8, borderRadius:6, marginBottom:8}}>
                                <div><strong>Wejście</strong></div>
                                <pre style={{whiteSpace:'pre-wrap'}}>{t.input}</pre>
                                <div style={{marginTop:6}}><strong>Oczekiwany</strong></div>
                                <pre style={{whiteSpace:'pre-wrap'}}>{t.expected}</pre>
                                <div className="text-muted">Punkty: {t.points}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function BlockEditorContainer({ token, role, activity, onSaved }:{ token:string; role:string; activity: LessonActivity | null; onSaved:()=>void }){
    if (!activity) return <div className="editor-empty"><p className="text-muted">Wybierz blok aby edytować.</p></div>
    return (
        <div className="editor-pane">
            <div style={{marginBottom:8}}><strong>{activity.title}</strong> <span className="text-muted">{activity.type}</span></div>
            {activity.type === 'CONTENT' ? <ContentEditor token={token} activity={activity} onSaved={onSaved} /> : (
                activity.type === 'TASK' ? (role === 'TEACHER' ? <TaskEditor token={token} activity={activity} onSaved={onSaved} /> : <StudentCodeExerciseView token={token} activity={activity} />) : (
                    activity.type === 'QUIZ' ? (role === 'TEACHER' ? <QuizEditor token={token} activity={activity} onSaved={onSaved} /> : <QuizViewer token={token} activity={activity} onSubmitted={onSaved} />) : <div>Nieznany typ aktywności.</div>
                )
            )}
        </div>
    )
}

function QuizEditor({ token, activity, onSaved }:{ token:string; activity: LessonActivity; onSaved:()=>void }){
    const [title, setTitle] = React.useState(activity.title)
    const [body, setBody] = React.useState<any>(()=>{ try { return activity.body ? JSON.parse(activity.body) : { maxPoints:10, questions:[] } } catch { return { maxPoints:10, questions:[] } } })
    const [saving, setSaving] = React.useState(false)
    const toast = useToast()
    const [titleErr, setTitleErr] = React.useState<string|undefined>()
    const [maxErr, setMaxErr] = React.useState<string|undefined>()
    const formRef = React.useRef<HTMLDivElement|null>(null)

    function updateQuestion(idx:number, q:any){
        setBody((b:any)=>{ const copy = {...b, questions: (b.questions||[]).slice() }; copy.questions[idx] = q; return copy })
    }

    function addQuestion(){
        setBody((b:any)=> ({ ...b, questions: (b.questions||[]).concat([{ text: 'Nowe pytanie', choices: [{ text: 'Odp A', correct: true }, { text: 'Odp B' }], points: 1 }]) }))
    }

    function removeQuestion(idx:number){ setBody((b:any)=>{ const q = (b.questions||[]).slice(); q.splice(idx,1); return {...b, questions: q } }) }

    function addChoice(qidx:number){ setBody((b:any)=>{ const q = (b.questions||[]).slice(); q[qidx].choices.push({ text: 'Nowa odpowiedź', correct: false }); return {...b, questions: q } }) }

    function toggleCorrect(qidx:number, choiceIdx:number){ setBody((b:any)=>{ const q = (b.questions||[]).slice(); q[qidx].choices = q[qidx].choices.map((c:any,ci:number)=> ({ ...c, correct: ci===choiceIdx })); return {...b, questions: q } }) }

    async function save(){
        setTitleErr(undefined); setMaxErr(undefined)
        if (!String(title).trim()) setTitleErr('Podaj tytuł quizu.')
        const total = (body.questions||[]).reduce((s:number,q:any)=> s + (Number(q.points)||0), 0)
        const max = Number(body.maxPoints)||0
        if (max < 0 || Number.isNaN(max)) setMaxErr('Maks. punkty muszą być liczbą ≥ 0.')
        if (titleErr || maxErr) {
            const firstInvalid = formRef.current?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            firstInvalid?.focus()
            return
        }
        setSaving(true)
        try{
            // normalize body: ensure choices arrays and fields
            const normalizedQuestions = (body.questions||[]).map((q:any)=> ({ text: q.text||'', choices: (q.choices||[]).map((c:any)=> ({ text: c.text||'', correct: !!c.correct })), points: Number(q.points)||1 }))
            const sum = normalizedQuestions.reduce((s:number,q:any)=> s + (Number(q.points)||0), 0)
            const max = Number(body.maxPoints)||0
            if (max > 0 && sum !== max) {
                throw new Error(`Suma punktów pytań (${sum}) musi równać się maksymalnej liczbie punktów quizu (${max}).`)
            }
            const pbody = { ...body, questions: normalizedQuestions }
            await api.updateActivity(token, activity.id, { title, body: JSON.stringify(pbody) })
            toast.show('Zapisano quiz', 'success')
            onSaved()
        }catch(e:any){ toast.show(String(e),'error') }
        finally{ setSaving(false) }
    }

    return (
        <div ref={formRef}>
            <label htmlFor="quiz-title">Tytuł quizu</label>
            <input id="quiz-title" className="input" value={title} onChange={e=>setTitle(e.target.value)} aria-describedby="quiz-title-hint quiz-title-err" aria-invalid={!!titleErr} />
            <span id="quiz-title-hint" className="text-muted" style={{fontSize:12}}>Krótki tytuł testu.</span>
            {titleErr && <span id="quiz-title-err" className="text-danger" style={{fontSize:12}}>Błąd: {titleErr}</span>}
            <label htmlFor="quiz-max" style={{marginTop:8}}>Maksymalna liczba punktów</label>
            <input id="quiz-max" className="input" value={body.maxPoints ?? 10} onChange={e=> setBody((b:any)=> ({ ...b, maxPoints: Number(e.target.value)||0 }))} aria-describedby="quiz-max-hint quiz-max-err" aria-invalid={!!maxErr} />
            <span id="quiz-max-hint" className="text-muted" style={{fontSize:12}}>Suma punktów pytań powinna równać się limitowi.</span>
            {maxErr && <span id="quiz-max-err" className="text-danger" style={{fontSize:12}}>Błąd: {maxErr}</span>}
            <div className="text-muted" style={{fontSize:12, marginTop:4}}>
                Suma punktów pytań: <b>{(body.questions||[]).reduce((s:number,q:any)=> s + (Number(q.points)||0), 0)}</b> / {Number(body.maxPoints)||0}
            </div>

            <div style={{marginTop:12}}>
                <h4>Pytania</h4>
                {(body.questions||[]).map((q:any,qi:number)=> (
                    <div key={qi} style={{border:'1px solid var(--line)', padding:8, borderRadius:8, marginBottom:8}}>
                        <div style={{display:'flex', gap:8}}>
                            <input className="input" value={q.text} onChange={e=> updateQuestion(qi, {...q, text: e.target.value})} />
                            <button className="btn" onClick={()=> removeQuestion(qi)}>Usuń pytanie</button>
                        </div>
                        <div style={{marginTop:8, display:'grid', gap:6}}>
                            {(q.choices||[]).map((c:any,ci:number)=> (
                                <label key={ci} style={{display:'flex', gap:8, alignItems:'center'}}>
                                    <input type="radio" name={`correct-${qi}`} checked={!!c.correct} onChange={()=> toggleCorrect(qi,ci)} />
                                    <input className="input" value={c.text} onChange={e=> { const copy = (body.questions||[]).slice(); copy[qi].choices[ci].text = e.target.value; setBody({...body, questions: copy}) }} />
                                </label>
                            ))}
                            <div style={{display:'flex', gap:8}}>
                                <button className="btn" onClick={()=> addChoice(qi)}>Dodaj odpowiedź</button>
                                <div style={{marginLeft:'auto'}}>Punkty: <input className="input" style={{width:80, display:'inline-block'}} value={q.points ?? 1} onChange={e=> updateQuestion(qi, {...q, points: Number(e.target.value)||1})} /></div>
                            </div>
                        </div>
                    </div>
                ))}
                <div style={{display:'flex', gap:8}}>
                    <button className="btn" onClick={addQuestion}>Dodaj pytanie</button>
                    <button className="btn primary" onClick={save} disabled={saving} style={{marginLeft:'auto'}}>{saving ? 'Zapisuję…' : 'Zapisz quiz'}</button>
                </div>
            </div>
        </div>
    )
}
