import React from 'react'
import { type LessonListItem } from '../../api'
import { useToast } from '../../components/Toasts'

export default function LessonHeader({ lesson, onSave, onPreview, onDelete, saving }:{
    lesson: LessonListItem
    onSave: ()=>Promise<void>
    onPreview?: ()=>void
    onDelete?: ()=>void
    saving?: boolean
}){
    const toast = useToast()
    return (
        <div className="lesson-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div>
                <h2 style={{margin:0}}>{lesson.title}</h2>
                <div className="time" style={{marginTop:4}}>{new Date(lesson.createdAt).toLocaleString()}</div>
            </div>
            <div style={{display:'flex', gap:8}}>
                {onPreview && <button className="btn" onClick={onPreview}>Podgląd jako uczeń</button>}
                {onDelete && <button className="btn" style={{borderColor:'var(--danger-strong)'}} onClick={onDelete}>Usuń</button>}
            </div>
        </div>
    )
}
