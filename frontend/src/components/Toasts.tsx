import React from 'react'

type Toast = { id: number; message: string; kind?: 'info'|'success'|'error' }

const ToastContext = React.createContext<{ show: (m:string, k?:Toast['kind'])=>void } | null>(null)

export function ToastProvider({ children }:{ children:React.ReactNode }){
    const [toasts, setToasts] = React.useState<Toast[]>([])
    const counter = React.useRef(1)

    const show = React.useCallback((message:string, kind:Toast['kind']='info')=>{
        const id = counter.current++
        setToasts(t => [...t, { id, message, kind }])
        setTimeout(()=> setToasts(t => t.filter(x=>x.id!==id)), 4500)
    },[])

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            {/* a11y: aria-live region for announcements (status and alerts) */}
            <div style={{ position:'fixed', right:16, top:16, zIndex:9999, display:'grid', gap:8 }} aria-live="polite" aria-atomic="true">
                {toasts.map(t => {
                    const icon = t.kind==='error' ? '❌' : t.kind==='success' ? '✅' : 'ℹ️'
                    const role = t.kind==='error' ? 'alert' : 'status'
                    return (
                        <div key={t.id} role={role as any}
                             style={{ minWidth:240, padding:10, borderRadius:8, boxShadow:'0 6px 18px rgba(0,0,0,0.45)',
                                      background: t.kind==='error'? '#3b0b0b' : t.kind==='success'? '#07260a' : '#0f1720', color:'#fff', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <span aria-hidden="true" style={{marginRight:8}}>{icon}</span>
                            <span>{t.message}</span>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast(){
    const ctx = React.useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used inside ToastProvider')
    return ctx
}

export default ToastProvider
