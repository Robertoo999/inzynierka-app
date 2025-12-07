import React from 'react'

const ta: React.CSSProperties = { padding: 8, borderRadius: 8, border: '1px solid #2a3645', width: '100%', background:'#0b0f13', color:'#e8eef4', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Courier New", monospace' }
const btn: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid #2a3645', background: '#0e1419', cursor: 'pointer', color:'#e8eef4' }

/** Simple local console for authoring IO tests quickly (JS only). It executes solve(input) in-browser. */
export default function LocalTestConsole({ starterCode }:{ starterCode:string }) {
  const [inputSample, setInputSample] = React.useState('')
  const [output, setOutput] = React.useState<string>('')
  const [error, setError] = React.useState<string>('')
  function runLocal(){
      setError(''); setOutput('')
      try {
          const code = starterCode || ''
          // sandboxed-ish eval: create a function scope then return solve
          const fn = new Function(code + '\nreturn (typeof solve === "function") ? solve : null;')
          const solve = fn()
          if (!solve) { setError('Brak funkcji solve()'); return }
          const res = solve(inputSample)
          setOutput(String(res))
      } catch(e:any){ setError(String(e?.message || e)) }
  }
  return (
      <div style={{marginTop:12, padding:8, border:'1px solid #1e2630', borderRadius:8}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <b>Konsola testowa (lokalna, JS)</b>
              <button className="btn" style={btn} onClick={runLocal}>Uruchom solve()</button>
          </div>
          <textarea style={{...ta, marginTop:6}} rows={3} placeholder="Przykładowe wejście" value={inputSample} onChange={e=>setInputSample(e.target.value)} />
          {output && <div style={{marginTop:6}}><span className="text-muted">Wyjście:</span> <code>{output}</code></div>}
          {error && <div style={{marginTop:6, color:'#d97d7d'}}><span className="text-muted">Błąd:</span> {error}</div>}
          <small className="text-muted" style={{display:'block', marginTop:6}}>Tylko lokalna symulacja JS – nie zastępuje uruchomienia na serwerze.</small>
      </div>
  )
}
