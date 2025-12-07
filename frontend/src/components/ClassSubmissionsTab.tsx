import React from 'react'
import { api, type ClassSubmission } from '../api'
import { useToast } from './Toasts'

const containerStyle: React.CSSProperties = { display: 'grid', gap: 12 }
const controlsStyle: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }
const btn: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', cursor: 'pointer', color: 'var(--text)' }
const input: React.CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--input-bg)', color: 'var(--text)' }

export default function ClassSubmissionsTab({ token, classId }: { token: string; classId: number }) {
    const toast = useToast()
    const [items, setItems] = React.useState<ClassSubmission[] | null>(null)
    const [drafts, setDrafts] = React.useState<Record<string, { manualScore: string; teacherComment: string }>>({})
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, { manualScore?: string; teacherComment?: string }>>({})
    const [loading, setLoading] = React.useState(false)
    const [lessonFilter, setLessonFilter] = React.useState<string>('ALL')
    const [search, setSearch] = React.useState('')
    const [savingId, setSavingId] = React.useState<string | null>(null)
    const containerRef = React.useRef<HTMLDivElement | null>(null)

    const load = React.useCallback(async () => {
        if (!token || !classId) return
        setLoading(true)
        try {
            const data = await api.classSubmissions(token, classId)
            setItems(data)
            const initialDrafts: Record<string, { manualScore: string; teacherComment: string }> = {}
            data.forEach(item => {
                const submission = item.submission
                initialDrafts[submission.id] = {
                    manualScore: submission.manualScore != null ? String(submission.manualScore) : '',
                    teacherComment: submission.teacherComment ?? ''
                }
            })
            setDrafts(initialDrafts)
        } catch (err: any) {
            toast.show(String(err), 'error')
            setItems([])
        } finally {
            setLoading(false)
        }
    }, [token, classId, toast])

    React.useEffect(() => {
        load()
    }, [load])

    const lessonOptions = React.useMemo(() => {
        if (!items) return []
        const map = new Map<string, { id: string | null; title: string | null }>()
        items.forEach(item => {
            const key = item.lessonId ?? 'NONE'
            if (!map.has(key)) {
                map.set(key, { id: item.lessonId, title: item.lessonTitle })
            }
        })
        return Array.from(map.values())
    }, [items])

    const filteredItems = React.useMemo(() => {
        if (!items) return []
        const query = search.trim().toLowerCase()
        return items.filter(item => {
            const matchesLesson = lessonFilter === 'ALL'
                ? true
                : (lessonFilter === 'NONE' ? !item.lessonId : item.lessonId === lessonFilter)
            if (!matchesLesson) return false
            if (!query) return true
            const haystack = [
                item.studentEmail ?? '',
                (item.studentFirstName ?? '') + ' ' + (item.studentLastName ?? ''),
                item.taskTitle ?? '',
                item.lessonTitle ?? ''
            ].join(' ').toLowerCase()
            return haystack.includes(query)
        })
    }, [items, lessonFilter, search])

    function validate(submissionId: string): { ok: boolean; manualScore: number | null } {
        const submission = items?.find(i => i.submission.id === submissionId)?.submission
        const draft = drafts[submissionId]
        if (!draft) return { ok: true, manualScore: null }
        const trimmed = draft.manualScore.trim()
        let manualScore: number | null = null
        let err: { manualScore?: string } = {}
        if (trimmed !== '') {
            const parsed = Number(trimmed)
            if (Number.isNaN(parsed)) {
                err.manualScore = 'Podaj liczbę.'
            } else if (parsed < 0) {
                err.manualScore = 'Liczba nie może być ujemna.'
            } else if (typeof submission?.maxPoints === 'number' && parsed > submission.maxPoints) {
                err.manualScore = `Maksymalna liczba punktów to ${submission.maxPoints}.`
            } else {
                manualScore = parsed
            }
        }
        setFieldErrors(prev => ({ ...prev, [submissionId]: { ...prev[submissionId], ...err } }))
        return { ok: !err.manualScore, manualScore }
    }

    async function save(submissionId: string) {
        const check = validate(submissionId)
        if (!check.ok) {
            // move focus to first invalid field inside this submission card
            const root = containerRef.current
            const card = root?.querySelector(`[data-submission="${submissionId}"]`)
            const invalid = card?.querySelector('[aria-invalid="true"]') as HTMLElement | null
            invalid?.focus()
            toast.show('Popraw zaznaczone pola.', 'error')
            return
        }
        setSavingId(submissionId)
        try {
            const updated = await api.gradeSubmission(token, submissionId, {
                manualScore: check.manualScore,
                teacherComment: drafts[submissionId]?.teacherComment
            })
            setItems(prev => prev ? prev.map(item => item.submission.id === submissionId ? { ...item, submission: updated } : item) : prev)
            setDrafts(prev => ({
                ...prev,
                [submissionId]: {
                    manualScore: updated.manualScore != null ? String(updated.manualScore) : '',
                    teacherComment: updated.teacherComment ?? ''
                }
            }))
            setFieldErrors(prev => ({ ...prev, [submissionId]: {} }))
            toast.show('Zapisano ocenę', 'success')
        } catch (err: any) {
            toast.show(String(err), 'error')
        } finally {
            setSavingId(null)
        }
    }

    const total = items?.length ?? 0
    const visible = filteredItems.length

    return (
        <div style={containerStyle} ref={containerRef}>
            <div style={controlsStyle}>
                <button className="btn" style={btn} onClick={load} disabled={loading}>{loading ? 'Ładuję…' : 'Odśwież'}</button>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>Lekcja:</span>
                    <select
                        value={lessonFilter}
                        onChange={e => setLessonFilter(e.target.value)}
                        style={{ ...input, minWidth: 160 }}
                    >
                        <option value="ALL">Wszystkie</option>
                        {lessonOptions.map(opt => (
                            <option key={opt.id ?? 'NONE'} value={opt.id ?? 'NONE'}>{opt.title ?? 'Brak przypisania'}</option>
                        ))}
                    </select>
                </label>
                <input
                    type="search"
                    placeholder="Szukaj po uczniu lub zadaniu"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ ...input, minWidth: 220, flex: '1 1 200px' }}
                />
                <span className="text-muted" style={{ marginLeft: 'auto' }}>Widoczne: {visible} / {total}</span>
            </div>

            {!loading && total === 0 && <p className="text-muted">Brak zgłoszeń w tej klasie.</p>}
            {loading && <p className="text-muted">Ładowanie zgłoszeń…</p>}

            {visible === 0 && total > 0 && !loading && (
                <p className="text-muted">Brak wyników dla wybranych filtrów.</p>
            )}

            {filteredItems.map(item => {
                const submission = item.submission
                const draft = drafts[submission.id] ?? { manualScore: '', teacherComment: '' }
                const errors = fieldErrors[submission.id] ?? {}
                const effective = submission.effectiveScore ?? submission.points ?? submission.autoScore ?? null
                return (
                    <div key={submission.id} data-submission={submission.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, display: 'grid', gap: 8, background:'transparent' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                            <div>
                                <div><strong>{item.taskTitle ?? 'Zadanie'}</strong></div>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    {item.lessonTitle ?? 'Bez lekcji'} • {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}
                                </div>
                                <div className="text-muted" style={{ fontSize: 12 }}>
                                    Próba #{submission.attemptNumber ?? '–'} / {submission.maxAttempts ?? '–'}
                                </div>
                                <div style={{display:'grid'}}>
                                    <div style={{ fontWeight: 600 }}>
                                        {(item.studentFirstName || item.studentLastName) ? `${item.studentFirstName ?? ''} ${item.studentLastName ?? ''}`.trim() : (item.studentEmail ?? submission.studentId)}
                                    </div>
                                    {(item.studentFirstName || item.studentLastName) && item.studentEmail && (
                                        <div className="text-muted" style={{ fontSize: 12 }}>{item.studentEmail}</div>
                                    )}
                                </div>
                            </div>
                            <div className="text-muted" style={{ display: 'flex', gap: 12 }}>
                                <span>Ocena automatyczna: <b>{submission.autoScore ?? '–'}</b></span>
                                <span>Ocena nauczyciela: <b>{submission.manualScore ?? '–'}</b></span>
                                <span>Ocena końcowa: <b>{effective ?? '–'}</b> / {submission.maxPoints ?? '–'}</span>
                            </div>
                        </div>
                        {typeof submission.code === 'string' && submission.code.trim().length > 0 && (
                            <section style={{display:'grid', gap:6}}>
                                <h4 style={{margin:'6px 0'}}>Kod ucznia</h4>
                                <pre aria-label="Kod źródłowy przesłany przez ucznia" style={{margin:0, padding:10, background:'var(--input-bg)', borderRadius:8, overflow:'auto', maxHeight:300, fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize:13}}>
<code>{submission.code}</code>
                                </pre>
                            </section>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr auto', gap: 8, alignItems: 'start' }}>
                            <label htmlFor={`score-${submission.id}`} style={{display:'grid', gap:4}}>
                                <span className="text-muted" style={{fontSize:12}}>Punkty przyznane przez nauczyciela</span>
                                {/* a11y: aria-invalid marks the field for SR; aria-describedby links hint and error text */}
                                <input
                                    id={`score-${submission.id}`}
                                    type="number"
                                    placeholder="Punkty przyznane przez nauczyciela"
                                    value={draft.manualScore}
                                    onChange={e => setDrafts(prev => ({ ...prev, [submission.id]: { ...(prev[submission.id] ?? { teacherComment: '' }), manualScore: e.target.value } }))}
                                    aria-describedby={`score-${submission.id}-hint${errors.manualScore ? ` score-${submission.id}-error` : ''}`}
                                    aria-invalid={errors.manualScore ? true : false}
                                    style={input}
                                />
                                <span id={`score-${submission.id}-hint`} className="text-muted" style={{fontSize:12}}>Wpisz liczbę z zakresu 0–{submission.maxPoints ?? 'maks.'}.</span>
                                {errors.manualScore && (
                                    <span id={`score-${submission.id}-error`} style={{fontSize:12, color:'var(--danger)'}}>Błąd: {errors.manualScore}</span>
                                )}
                            </label>
                            <label htmlFor={`comment-${submission.id}`} style={{display:'grid', gap:4}}>
                                <span className="text-muted" style={{fontSize:12}}>Komentarz nauczyciela</span>
                                <input
                                    id={`comment-${submission.id}`}
                                    placeholder="Komentarz nauczyciela"
                                    value={draft.teacherComment}
                                    onChange={e => setDrafts(prev => ({ ...prev, [submission.id]: { ...(prev[submission.id] ?? { manualScore: '' }), teacherComment: e.target.value } }))}
                                    style={input}
                                />
                            </label>
                            <button
                                className="btn"
                                style={{ ...btn, opacity: savingId === submission.id ? 0.6 : 1 }}
                                onClick={() => save(submission.id)}
                                disabled={savingId === submission.id}
                            >
                                {savingId === submission.id ? 'Zapisuję…' : 'Zapisz'}
                            </button>
                        </div>
                        {submission.feedback && submission.feedback !== submission.teacherComment && (
                            <div className="text-muted" style={{ fontSize: 12 }}>Feedback: {submission.feedback}</div>
                        )}
                        {submission.stdout && (
                            <details>
                                <summary className="text-muted">Stdout</summary>
                                <pre style={{ marginTop: 6, padding: 8, background: 'var(--input-bg)', borderRadius: 6, overflowX: 'auto' }}>{submission.stdout}</pre>
                            </details>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
