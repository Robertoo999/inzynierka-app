import React from 'react'

// AccessibilityBar: provides font-size scaling (3 levels) and theme (light/dark)
// Adds classes to <html> element so the whole app inherits styles.
// This improves accessibility (WCAG 2.1: 1.4.4 Resize text, 1.4.3 Contrast, 1.4.1 Use of color) by
// allowing users (including children) to increase text size and switch to a theme with higher contrast.

function applyRootClasses(theme: 'dark'|'light', scale: '100'|'112'|'125'){
  const root = document.documentElement
  root.classList.remove('theme-dark','theme-light','fs-100','fs-112','fs-125')
  root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark')
  root.classList.add(scale === '125' ? 'fs-125' : scale === '112' ? 'fs-112' : 'fs-100')
}

function loadPref<T>(key:string, fallback:T): T {
  try{ const v = localStorage.getItem(key); if (!v) return fallback as T; return JSON.parse(v) as T }catch{ return fallback as T }
}

function savePref<T>(key:string, value:T){ try{ localStorage.setItem(key, JSON.stringify(value)) }catch{} }

export default function AccessibilityBar(){
  const [theme, setTheme] = React.useState<'dark'|'light'>(()=> loadPref<'dark'|'light'>('a11y:theme','dark'))
  const [scale, setScale] = React.useState<'100'|'112'|'125'>(()=> loadPref<'100'|'112'|'125'>('a11y:scale','100'))

  React.useEffect(()=>{ applyRootClasses(theme, scale) }, [])
  React.useEffect(()=>{ applyRootClasses(theme, scale); savePref('a11y:theme', theme) }, [theme])
  React.useEffect(()=>{ applyRootClasses(theme, scale); savePref('a11y:scale', scale) }, [scale])

  return (
    <div role="group" aria-label="Ustawienia dostępności" style={{display:'inline-flex', gap:6, alignItems:'center'}}>
      {/* Font size controls: A- A A+ */}
      <div style={{display:'inline-flex', border:'1px solid var(--line)', borderRadius:8, overflow:'hidden'}} aria-label="Rozmiar czcionki">
        <button className="btn ghost" aria-label="Zmniejsz czcionkę"
          onClick={()=> setScale('100')} style={{padding:'6px 8px', fontWeight: scale==='100'?700:500}}>A-</button>
        <button className="btn ghost" aria-label="Średnia czcionka"
          onClick={()=> setScale('112')} style={{padding:'6px 8px', fontWeight: scale==='112'?700:500}}>A</button>
        <button className="btn ghost" aria-label="Powiększ czcionkę"
          onClick={()=> setScale('125')} style={{padding:'6px 8px', fontWeight: scale==='125'?700:500}}>A+</button>
      </div>
      {/* Theme toggle */}
      <button className="btn" aria-label={theme==='dark'?'Przełącz na tryb jasny':'Przełącz na tryb ciemny'}
        onClick={()=> setTheme(t => t==='dark'?'light':'dark')}>
        {theme==='dark' ? '🌙 Ciemny' : '☀️ Jasny'}
      </button>
    </div>
  )
}
