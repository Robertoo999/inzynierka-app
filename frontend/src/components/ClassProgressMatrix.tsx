import React from 'react'
import { api, ClassProgressDto, ClassProgressResult, ClassProgressTask } from '../api'

type Props = { open: boolean; onClose: () => void; token: string; classId: number; lessonId?: string }

const statusLabel: Record<string, { text: string; color: string }> = {
    DONE: { text: 'Oddano', color: 'var(--success-strong)' },
    IN_PROGRESS: { text: 'W toku', color: 'var(--warning-strong)' },
    NOT_STARTED: { text: 'Brak prób', color: 'var(--muted)' },
}

export default function ClassProgressMatrix({ open, onClose, token, classId, lessonId }: Props) {
    const [data, setData] = React.useState<ClassProgressDto | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (!open) return
        if (!token) {
            setError('Brak tokena uwierzytelniającego')
            setData(null)
            return
        }
        let ignore = false
        setLoading(true)
        setError(null)
        api.classProgress(token, classId, lessonId)
            .then((response) => {
                if (ignore) return
                setData(response)
            })
            .catch((err) => {
                if (ignore) return
                const msg = err instanceof Error ? err.message : String(err)
                setError(msg)
                setData(null)
            })
            .finally(() => {
                if (!ignore) setLoading(false)
            })
        return () => { ignore = true }
    }, [open, token, classId, lessonId])

    const cellMap = React.useMemo(() => {
        if (!data) return new Map<string, ClassProgressResult>()
        const map = new Map<string, ClassProgressResult>()
        for (const result of data.results) {
            map.set(`${result.studentId}|${result.taskId}`, result)
        }
        return map
    }, [data])

    const renderStatus = (status: string) => {
        const fallback = statusLabel[status] ?? { text: status, color: 'var(--muted)' }
        return <span style={{ color: fallback.color, fontSize: 12 }}>{fallback.text}</span>
    }

    if (!open) return null

    const titleSuffix = data && data.lessonId ? '' : ' (cała klasa)'
    const columns: ClassProgressTask[] = data?.tasks ?? []

    return (
        <div role="dialog" aria-modal="true" aria-labelledby="progress-matrix-title" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'grid', placeItems: 'center', zIndex: 60 }}>
            <div style={{ width: '95%', maxWidth: 1100, maxHeight: '90vh', overflow: 'auto', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 id="progress-matrix-title" style={{ margin: 0 }}>Mapa postępu{titleSuffix}</h3>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn" type="button" onClick={onClose}>Zamknij</button>
                    </div>
                </div>
                {loading && <div className="text-muted">Ładuję…</div>}
                {!loading && error && <div style={{ color: 'var(--danger-strong)' }}>Błąd: {error}</div>}
                {!loading && !error && !data && <div className="text-muted">Brak danych.</div>}
                {!loading && !error && data && (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={{ position: 'sticky', left: 0, background: 'var(--panel)', zIndex: 2, borderBottom: '1px solid var(--line)', padding: 8 }}>Uczeń</th>
                                    {columns.map((task) => {
                                        const max = typeof task.maxPoints === 'number' ? task.maxPoints : 0
                                        const subtitle = `${task.type === 'QUIZ' ? 'Quiz' : 'Zadanie'} • ${max}p`
                                        return (
                                            <th key={task.taskId} style={{ borderBottom: '1px solid var(--line)', padding: 8, textAlign: 'center', minWidth: 140 }}>
                                                <div style={{ fontWeight: 600 }}>{task.title}</div>
                                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{task.lessonTitle}</div>
                                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{subtitle}</div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {data.students.map((student) => (
                                    <tr key={student.studentId}>
                                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg)', padding: 8, borderTop: '1px solid var(--line)' }}>
                                            <div style={{ fontWeight: 700 }}>{(student.firstName || student.lastName) ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() : (student.email ?? student.studentId)}</div>
                                            {(student.firstName || student.lastName) && student.email && (
                                                <div className="text-muted" style={{ fontSize: 12 }}>{student.email}</div>
                                            )}
                                        </td>
                                        {columns.map((task) => {
                                            const key = `${student.studentId}|${task.taskId}`
                                            const result = cellMap.get(key)
                                            const status = result?.status ?? 'NOT_STARTED'
                                            const max = typeof task.maxPoints === 'number' ? task.maxPoints : 0
                                            const points = result?.points
                                            const display = points != null ? `${points} / ${max}` : '—'
                                            return (
                                                <td key={task.taskId} style={{ padding: 8, textAlign: 'center', borderTop: '1px solid var(--line)' }}>
                                                    <div style={{ fontWeight: 600 }}>{display}</div>
                                                    {renderStatus(status)}
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
