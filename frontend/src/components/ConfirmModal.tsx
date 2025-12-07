import React from 'react'

export default function ConfirmModal({ open, title, description, confirmLabel = 'Tak', cancelLabel = 'Anuluj', onConfirm, onCancel }:{
    open:boolean
    title?:string
    description?:string
    confirmLabel?:string
    cancelLabel?:string
    onConfirm:()=>void
    onCancel:()=>void
}){
    if (!open) return null
    return (
        <div role="dialog" aria-modal="true" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'grid', placeItems:'center', zIndex:9999}}>
            <div style={{minWidth:320, maxWidth:720, width:'90%', maxHeight:'90vh', overflow:'auto', background:'#0f1419', border:'1px solid #2a3645', borderRadius:10, padding:16}}>
                <div style={{marginBottom:8}}>
                    <h3 style={{margin:0}}>{title || 'Potwierdź'}</h3>
                    {description && <div className="text-muted" style={{marginTop:6}}>{description}</div>}
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end', marginTop:12}}>
                    <button className="btn" style={{padding:8, borderRadius:8}} onClick={onCancel}>{cancelLabel}</button>
                    <button className="btn" style={{padding:8, borderRadius:8, background:'#471919', borderColor:'#6b1d1d'}} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>
    )
}
