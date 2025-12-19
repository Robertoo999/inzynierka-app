(async ()=>{
  const bases = ['http://localhost:8080','http://localhost:8081']
  let base = null
  for (const b of bases){ try { const h = await fetch(b + '/api/health'); if(h.ok){ base = b; break } } catch(e){} }
  if(!base){ console.error('No backend reachable'); process.exit(1) }
  async function post(path, token, body){ const headers = { 'Content-Type':'application/json' }; if(token) headers.Authorization = `Bearer ${token}`; const res = await fetch(base + path, { method:'POST', headers, body: JSON.stringify(body) }); return res.ok ? await res.json() : (await res.text()) }
  async function get(path, token){ const headers = token ? { Authorization:`Bearer ${token}` } : {}; const res = await fetch(base + path, { headers }); return res.ok ? await res.json() : (await res.text()) }

  const login = await post('/api/auth/login', null, { email:'teacher@test.local', password:'Test123!' })
  const token = login.token
  console.log('Teacher token len', token.length)
  const classes = await get('/api/classes/me', token)
  const cls = classes.find(c => c.name && c.name.startsWith('E2E Class')) || classes[0]
  console.log('Using class', cls.id, cls.name)
  const lessons = await get(`/api/classes/${cls.id}/lessons`, token)
  const lesson = lessons[0]
  console.log('Using lesson', lesson.id)
  const details = await get(`/api/lessons/${lesson.id}`, token)
  const act = (details.activities || []).find(a=> a.type === 'TASK')
  const taskId = act.taskId
  console.log('Task id', taskId)

  const tests = await get(`/api/tasks/${taskId}/tests`, token)
  console.log('Tests count', (tests && tests.length) || 0)

  const correct = `function solve(input) {
    const parts = String(input || '').trim().split(/\s+/).filter(Boolean).map(Number)
    return String(parts.reduce((a,b)=>a+b,0))
  }`

  console.log('Running demo with correct solution...')
  const res = await post(`/api/tasks/${taskId}/run-demo`, token, { code: correct, language: 'javascript' })
  console.log('Result:')
  console.log(JSON.stringify(res, null, 2))
})().catch(e=>{ console.error(e); process.exit(1) })
