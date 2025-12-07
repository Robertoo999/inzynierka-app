import React from 'react'
import ReactDOM from 'react-dom'
import { type LessonActivity } from '../../api'

export default function BlockListSidebar({ activities, selectedId, onSelect, onMoveUp, onMoveDown, onEdit, onDelete, onAdd }:{
    activities: LessonActivity[]
    selectedId?: string | undefined
    onSelect: (id:string)=>void
    onMoveUp: (idx:number)=>void
    onMoveDown: (idx:number)=>void
    onEdit: (id:string)=>void
    onDelete: (id:string)=>void
    onAdd: (type:'CONTENT'|'TASK'|'QUIZ')=>void
}){
    const [addOpen, setAddOpen] = React.useState(false)
    const addBtnRef = React.useRef<HTMLButtonElement|null>(null)
    const menuRef = React.useRef<HTMLDivElement|null>(null)

    React.useEffect(()=>{
        if (!addOpen) return
        function onDoc(e:MouseEvent){
            if (!menuRef.current || !addBtnRef.current) return setAddOpen(false)
            if (!menuRef.current.contains(e.target as any) && !addBtnRef.current.contains(e.target as any)) {
                setAddOpen(false)
            }
        }
        document.addEventListener('mousedown', onDoc)
        return ()=> document.removeEventListener('mousedown', onDoc)
    }, [addOpen])

    return (
        <aside className="lesson-sidebar">
            <div className="sidebar-header" style={{gap:8}}>
                <h4 style={{margin:0}}>Bloki</h4>
                <div style={{marginLeft:'auto', position:'relative'}}>
                    <button ref={addBtnRef} className="btn" onClick={()=> setAddOpen(o=>!o)} title="Dodaj" style={{padding:'7px 12px'}}>Dodaj ▾</button>
                    {addOpen && (
                        <div ref={menuRef} style={{position:'absolute', top:'calc(100% + 6px)', right:0, background:'var(--panel)', border:'1px solid var(--line)', borderRadius:8, padding:8, display:'grid', gap:6, minWidth:160, boxShadow:'var(--shadow)', zIndex:40}}>
                            <button className="btn ghost" onClick={()=>{ setAddOpen(false); onAdd('CONTENT') }}>➕ Nowy blok</button>
                            <button className="btn ghost" onClick={()=>{ setAddOpen(false); onAdd('TASK') }}>🧪 Nowe zadanie</button>
                            <button className="btn ghost" onClick={()=>{ setAddOpen(false); onAdd('QUIZ') }}>❓ Nowy quiz</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="blocks-list" style={{paddingTop:4}}>
                {activities.map((a, idx)=> (
                    <div key={a.id} className={"block-card" + (a.id===selectedId? ' selected' : '')}>
                        <div className="block-main" onClick={()=>onSelect(a.id)}>
                            <div className="block-title" title={a.title}>{a.title}</div>
                            <div className="block-sub text-muted">{a.type} {a.type==='TASK' && a.taskId ? '• zadanie' : ''}</div>
                        </div>

                        <div className="block-controls">
                            <BlockOptionsMenu
                                onMoveUp={()=> onMoveUp(idx)}
                                onMoveDown={()=> onMoveDown(idx)}
                                onEdit={()=> onEdit(a.id)}
                                onDelete={()=> onDelete(a.id)}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    )
}

function BlockOptionsMenu({ onMoveUp, onMoveDown, onEdit, onDelete }:{ onMoveUp:()=>void; onMoveDown:()=>void; onEdit:()=>void; onDelete:()=>void }){
    const [open, setOpen] = React.useState(false)
    const btnRef = React.useRef<HTMLButtonElement|null>(null)
    const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties|undefined>(undefined)
    const menuRef = React.useRef<HTMLDivElement|null>(null)

    React.useEffect(()=>{
        if (!open) return
        function onDocClick(){ setOpen(false) }
        document.addEventListener('click', onDocClick)
        return ()=> document.removeEventListener('click', onDocClick)
    },[open])

    function toggle(e:React.MouseEvent){
        e.stopPropagation()
        const b = btnRef.current
        if (!b) { setOpen(o=>!o); return }
        const r = b.getBoundingClientRect()
        // position menu under the button using fixed coordinates so it doesn't affect sidebar scroll
        const menuWidth = 160
        const spacing = 8
        const viewportW = window.innerWidth
        const viewportH = window.innerHeight
        let left = r.right - menuWidth
        if (left < 8) left = 8
        if (left + menuWidth > viewportW - 8) left = Math.max(8, viewportW - menuWidth - 8)
        // initially prefer below; after render we'll measure actual menu height and flip if needed
        let top = r.bottom + spacing
        setMenuStyle({ position: 'fixed', left, top, zIndex: 9999 })
        setOpen(o=>!o)
    }

    // After menu is opened and rendered in the portal, measure its height and reposition if needed
    React.useLayoutEffect(()=>{
        if (!open) return
        const btn = btnRef.current
        const menu = menuRef.current
        if (!btn || !menu) return
        const r = btn.getBoundingClientRect()
        const m = menu.getBoundingClientRect()
        const spacing = 8
        const viewportH = window.innerHeight
        const spaceBelow = viewportH - r.bottom
        const spaceAbove = r.top
        let top = parseFloat(String(menu.style.top)) || r.bottom + spacing
        // if not enough space below and enough above, open above
        if (spaceBelow < m.height && spaceAbove > m.height) {
            top = r.top - m.height - spacing
        }
        // adjust horizontal if needed
        let left = parseFloat(String(menu.style.left)) || (r.right - m.width)
        const viewportW = window.innerWidth
        if (left + m.width > viewportW - 8) left = Math.max(8, viewportW - m.width - 8)
        if (left < 8) left = 8
        setMenuStyle(s => ({ ...(s||{}), left, top }))
    }, [open])

    return (
        <div className="options-wrap" style={{position:'relative'}}>
            <button ref={btnRef} className="btn options-btn" onClick={toggle} title="Opcje">⋯</button>
            {open && btnRef.current && ReactDOM.createPortal(
                <div ref={menuRef} className="options-menu" style={menuStyle} onClick={e=>e.stopPropagation()}>
                    <button className="btn ghost" onClick={()=>{ setOpen(false); onMoveUp() }}>Góra</button>
                    <button className="btn ghost" onClick={()=>{ setOpen(false); onMoveDown() }}>Dół</button>
                    <button className="btn ghost" onClick={()=>{ setOpen(false); onEdit() }}>Edytuj</button>
                    <button className="btn" style={{borderColor:'#6b1d1d'}} onClick={()=>{ setOpen(false); onDelete() }}>Usuń</button>
                </div>
            , document.body)}
        </div>
    )
}
