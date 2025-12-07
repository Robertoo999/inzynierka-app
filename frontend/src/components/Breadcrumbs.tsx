import React from 'react'
import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items }:{ items: Array<{ label: string; to?: string }> }){
    if (!items || items.length === 0) return null
    return (
        <nav aria-label="Breadcrumb" style={{ marginTop:8, marginBottom:8 }}>
            <ol style={{ display:'flex', gap:8, listStyle:'none', padding:0, margin:0, alignItems:'center' }}>
                {items.map((it, idx) => (
                    <li key={idx} style={{ display:'inline-flex', alignItems:'center', gap:8 }}>
                        {it.to ? <Link to={it.to} className="text-muted">{it.label}</Link> : <span className="text-muted">{it.label}</span>}
                        {idx < items.length - 1 && <span className="text-muted">/</span>}
                    </li>
                ))}
            </ol>
        </nav>
    )
}
