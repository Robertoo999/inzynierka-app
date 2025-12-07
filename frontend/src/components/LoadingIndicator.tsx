import React from 'react'

export default function LoadingIndicator(){
    const [count, setCount] = React.useState(0)
    React.useEffect(()=>{
        const onStart = ()=> setCount(c=>c+1)
        const onEnd = ()=> setCount(c=>Math.max(0,c-1))
        window.addEventListener('api:loading:start', onStart as EventListener)
        window.addEventListener('api:loading:end', onEnd as EventListener)
        return ()=>{
            window.removeEventListener('api:loading:start', onStart as EventListener)
            window.removeEventListener('api:loading:end', onEnd as EventListener)
        }
    },[])

    if (count <= 0) return null
    return (
        <div style={{position:'fixed', inset:0, display:'grid', placeItems:'center', zIndex:9999, pointerEvents:'none'}} aria-hidden>
            <div style={{pointerEvents:'auto', padding:12, borderRadius:8, background:'rgba(11,15,19,0.95)', border:'1px solid #2a3645', color:'#e8eef4', display:'flex', gap:10, alignItems:'center'}}>
                <svg width="20" height="20" viewBox="0 0 50 50" style={{animation:'spin 1s linear infinite'}}>
                    <circle cx="25" cy="25" r="20" stroke="#2a3645" strokeWidth="5" fill="none" />
                    <path d="M45 25a20 20 0 0 0-6-14" stroke="#9bd" strokeWidth="5" strokeLinecap="round" fill="none" />
                </svg>
                <div>Ładowanie…</div>
            </div>
            <style>{`@keyframes spin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }`}</style>
        </div>
    )
}
