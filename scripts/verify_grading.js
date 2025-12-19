(async ()=>{
  const bases = ['http://localhost:8080','http://localhost:8081']
  let base = null
  for (const b of bases){ try { const h = await fetch(b + '/api/health'); if(h.ok){ base = b; break } } catch(e){} }
  if(!base){ console.error('No backend reachable'); process.exit(1) }
  console.log('Using backend', base)

  async function jpost(path, token, body){ const url = `${base}${path}`; const headers = {'Content-Type':'application/json'}; if(token) headers['Authorization'] = `Bearer ${token}`; const res = await fetch(url,{ method:'POST', headers, body: JSON.stringify(body) }); const txt = await res.text(); try{ return JSON.parse(txt) }catch{ // if server returned empty body for create, try to fetch created resource when posting to submissions
    if((!txt || (typeof txt === 'string' && txt.trim().length === 0)) && path.startsWith('/api/tasks/') && path.endsWith('/submissions')){
      const m = path.match(/^\/api\/tasks\/(.*?)\/submissions$/)
      if(m){ const taskId = m[1]; return await jget(`/api/tasks/${taskId}/submissions/me`, token) }
    }
    return txt
  }
  }
  async function jget(path, token){ const url = `${base}${path}`; const headers = token ? { Authorization:`Bearer ${token}` } : {}; const res = await fetch(url,{ headers }); const txt = await res.text(); try{ return JSON.parse(txt) }catch{ return txt } }

  const tlogin = await jpost('/api/auth/login', null, { email:'teacher@test.local', password:'Test123!' })
  const ttoken = tlogin.token
  console.log('Teacher token len', ttoken.length)
  const classes = await jget('/api/classes/me', ttoken)
  const cls = classes.find(c => c.name && c.name.startsWith('E2E Class')) || classes[0]
  console.log('Using class', cls.id, cls.name)
  const lessons = await jget(`/api/classes/${cls.id}/lessons`, ttoken)
  const lesson = lessons[0]
  console.log('Using lesson', lesson.id)
  const details = await jget(`/api/lessons/${lesson.id}`, ttoken)
  const act = (details.activities || []).find(a=> a.type === 'TASK')
  const taskId = act.taskId
  console.log('Task id', taskId)

  const tests = await jget(`/api/tasks/${taskId}/tests`, ttoken)
  console.log('Tests count', tests.length)
  tests.forEach((t,i)=> console.log(i, t.id, 'visible=',t.visible, 'input=', JSON.stringify(t.input), 'expected=', JSON.stringify(t.expected), 'points=', t.points))

  // prepare codes
  const correct = `function solve(input){ const nums = (String(input||'').match(/-?\\d+/g) || []).map(Number); return String(nums.reduce((a,b)=>a+b,0)); }`
  const wrong = `function solve(input){ const parts=String(input||'').trim().split(/\\s+/).map(Number); return String(parts[0]-parts[1]); }`
  const partial = `function solve(input){ const parts=String(input||'').trim().split(/\\s+/).map(Number); return String(parts[0]||0); }`

  // teacher demo-run correct
  console.log('\nTeacher demo-run (correct)')
  const demoGood = await jpost(`/api/tasks/${taskId}/run-demo`, ttoken, { code: correct, language: 'javascript' })
  console.log(JSON.stringify(demoGood, null, 2))

  console.log('\nTeacher demo-run (wrong)')
  const demoWrong = await jpost(`/api/tasks/${taskId}/run-demo`, ttoken, { code: wrong, language: 'javascript' })
  console.log(JSON.stringify(demoWrong, null, 2))

  console.log('\nTeacher demo-run (partial)')
  const demoPart = await jpost(`/api/tasks/${taskId}/run-demo`, ttoken, { code: partial, language: 'javascript' })
  console.log(JSON.stringify(demoPart, null, 2))

  // student login
  const slog = await jpost('/api/auth/login', null, { email:'student@test.local', password:'Test123!' })
  const stoken = slog.token
  console.log('\nStudent token len', stoken.length)

  // run (preview) as student
  console.log('\nStudent run (correct)')
  const runGood = await jpost(`/api/tasks/${taskId}/run`, stoken, { code: correct, language: 'javascript' })
  console.log(JSON.stringify(runGood, null, 2))

  console.log('\nStudent run (wrong)')
  const runWrong = await jpost(`/api/tasks/${taskId}/run`, stoken, { code: wrong, language: 'javascript' })
  console.log(JSON.stringify(runWrong, null, 2))

  console.log('\nStudent submit (wrong)')
  let submitWrong = await jpost(`/api/tasks/${taskId}/submissions`, stoken, { content:'Wrong submit', code: wrong })
  if(!submitWrong || typeof submitWrong !== 'object' || !submitWrong.id) submitWrong = await jget(`/api/tasks/${taskId}/submissions/me`, stoken)
  console.log('Submitted id', submitWrong.id, 'autoScore', submitWrong.autoScore)
  console.log('Submission testReport:', submitWrong.testReport)

  console.log('\nStudent submit (correct)')
  let submitGood = await jpost(`/api/tasks/${taskId}/submissions`, stoken, { content:'Good submit', code: correct })
  if(!submitGood || typeof submitGood !== 'object' || !submitGood.id) submitGood = await jget(`/api/tasks/${taskId}/submissions/me`, stoken)
  console.log('Submitted id', submitGood.id, 'autoScore', submitGood.autoScore)
  console.log('Submission testReport:', submitGood.testReport)

  console.log('\nManual check: fetch latest my submission (student)')
  const mySub = await jget(`/api/tasks/${taskId}/submissions/me`, stoken)
  console.log(JSON.stringify(mySub, null, 2))

  console.log('\nDone')
})().catch(e=>{ console.error('ERR', e); process.exit(1) })