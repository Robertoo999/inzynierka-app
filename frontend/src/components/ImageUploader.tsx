import React from 'react'

const container: React.CSSProperties = { display: 'grid', gap: 8 }
const previewStyle: React.CSSProperties = { maxWidth: '100%', borderRadius: 8, border: '1px solid var(--line)' }
const smallRow: React.CSSProperties = { display: 'flex', gap: 8, alignItems: 'center' }
const dropZoneStyle: React.CSSProperties = { padding: 10, borderRadius: 8 }

async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
            try {
                let w = img.width
                let h = img.height
                if (w > maxWidth) {
                    h = Math.round(h * (maxWidth / w))
                    w = maxWidth
                }
                const canvas = document.createElement('canvas')
                canvas.width = w
                canvas.height = h
                const ctx = canvas.getContext('2d')
                if (!ctx) return reject('no-canvas')
                ctx.drawImage(img, 0, 0, w, h)
                canvas.toBlob((blob) => {
                    if (!blob) return reject('compress-failed')
                    const reader = new FileReader()
                    reader.onload = () => resolve(String(reader.result || ''))
                    reader.onerror = () => reject('read-failed')
                    reader.readAsDataURL(blob)
                }, 'image/jpeg', quality)
            } catch (e) { reject(e) }
            finally { URL.revokeObjectURL(url) }
        }
        img.onerror = (e) => { URL.revokeObjectURL(url); reject('load-error') }
        img.src = url
    })
}

export default function ImageUploader({ value, onChange, placeholder }:{ value?:string; onChange:(v:string)=>void; placeholder?:string }){
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string| null>(null)
    const maxFileSize = 5 * 1024 * 1024 // 5MB
    // Backend body has a 50k char limit; keep buffer for JSON/other blocks
    const maxDataUrlLength = 48000

    async function handleFileObj(file: File | null){
        setError(null)
        if (!file) return
        if (!file.type.startsWith('image/')) { setError('Nieobsługiwany typ pliku'); return }
        setLoading(true)
        try{
            // Attempt to compress large files
            let dataUrl: string
            if (file.size > maxFileSize) {
                dataUrl = await compressImage(file, 1200, 0.75)
            } else {
                // still compress for consistent output
                dataUrl = await compressImage(file, 1600, 0.9)
            }
            // If still too big, try progressively stronger compression
            if (dataUrl.length > maxDataUrlLength) {
                const attempts: Array<[number, number]> = [
                    [1000, 0.75],
                    [800, 0.7],
                    [640, 0.65],
                    [512, 0.6],
                    [420, 0.55],
                ]
                for (const [w,q] of attempts) {
                    dataUrl = await compressImage(file, w, q)
                    if (dataUrl.length <= maxDataUrlLength) break
                }
            }
            if (dataUrl.length > maxDataUrlLength) {
                setError('Obraz jest zbyt duży do zapisania w treści. Użyj mniejszego pliku lub wklej publiczny URL.');
                return
            }
            onChange(dataUrl)
        }catch(e:any){
            // fallback to reading raw file
            try{
                const r = new FileReader()
                r.onload = () => onChange(String(r.result || ''))
                r.onerror = () => setError('Błąd czytania pliku')
                r.readAsDataURL(file)
            }catch(_){ setError('Nie udało się wczytać obrazu') }
        }finally{ setLoading(false) }
    }

    function handleFile(e: React.ChangeEvent<HTMLInputElement>){
        const f = e.target.files?.[0] ?? null
        handleFileObj(f)
    }

    function handleDrop(e: React.DragEvent<HTMLElement>){
        e.preventDefault(); e.stopPropagation()
        const f = e.dataTransfer.files?.[0] ?? null
        handleFileObj(f)
    }

    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>){
        const items = e.clipboardData.items
        if (!items) return
        for (let i = 0; i < items.length; i++){
            const it = items[i]
            if (it.kind === 'file' && it.type.startsWith('image/')){
                const file = it.getAsFile()
                handleFileObj(file)
                e.preventDefault(); return
            }
        }
    }

    return (
        <div style={container}>
            <div style={{...smallRow}}>
                <label className="card" style={dropZoneStyle} onDragOver={e=>{ e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }} onDrop={handleDrop} tabIndex={0} aria-label="Przeciągnij obraz tutaj">
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                        <input id="iu-file" type="file" accept="image/*" onChange={handleFile} style={{display:'none'}} />
                        <button className="btn" onClick={() => document.getElementById('iu-file')?.click()}>Wybierz plik</button>
                        <input className="input" style={{flex:1}} value={value ?? ''}
                               onChange={e=>onChange(e.target.value)}
                               onPaste={handlePaste}
                               placeholder={placeholder ?? 'Wklej URL obrazu lub wybierz plik...'} />
                    </div>
                </label>
            </div>
            {loading && <div className="text-muted">Wczytywanie obrazu…</div>}
            {error && <div className="text-muted" style={{color:'#f08'}}>{error}</div>}
            {value && <img src={value} alt="Podgląd obrazu" style={previewStyle} />}
            {value && <div style={{display:'flex', justifyContent:'flex-end'}}><button className="btn ghost" onClick={()=>onChange('')}>Usuń</button></div>}
        </div>
    )
}
