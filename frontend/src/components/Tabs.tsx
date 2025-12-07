import React from 'react'

type Tab = { key: string; label: string }

export default function Tabs({ tabs, active, onChange }:{ tabs:Tab[]; active:string; onChange:(k:string)=>void }){
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Keyboard navigation (WCAG): Left/Right arrows move focus & change active tab
    function onKeyDown(e: React.KeyboardEvent){
        const idx = tabs.findIndex(t => t.key === active)
        if (idx < 0) return
        if (e.key === 'ArrowRight'){
            const next = (idx + 1) % tabs.length
            onChange(tabs[next].key); e.preventDefault()
        } else if (e.key === 'ArrowLeft'){
            const prev = (idx - 1 + tabs.length) % tabs.length
            onChange(tabs[prev].key); e.preventDefault()
        }
    }

    return (
        <div ref={containerRef} style={{display:'flex',gap:8}} role="tablist" aria-label="Zakładki" onKeyDown={onKeyDown}>
            {tabs.map((t, i) => (
                <button
                    key={t.key}
                    className={t.key===active? 'tab active' : 'tab'}
                    role="tab"
                    aria-selected={t.key===active}
                    tabIndex={t.key===active ? 0 : -1}
                    aria-controls={`panel-${t.key}`}
                    id={`tab-${t.key}`}
                    onClick={()=>onChange(t.key)}
                >
                    {t.label}
                </button>
            ))}
        </div>
    )
}
