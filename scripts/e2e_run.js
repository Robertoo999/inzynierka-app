(async ()=>{
  const bases = ['http://localhost:8080','http://localhost:8081']
  let base = null
  for (const b of bases){ try { const h = await fetch(b + '/api/health',{method:'GET'}); if(h.ok){ base = b; break } } catch(e){} }
  if(!base){ console.error('No reachable backend on localhost:8080 or :8081'); process.exit(1) }
  console.log('Using backend', base)

  async function jpost(path, token, body){
    const url = `${base}${path}`
    const headers = {'Content-Type':'application/json'}
    if(token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(url,{ method:'POST', headers, body: JSON.stringify(body) })
    const txt = await res.text()
    try{ return JSON.parse(txt) }catch{ return txt }
  }
  async function jget(path, token){ const url = `${base}${path}`; const headers = token ? { Authorization:`Bearer ${token}` } : {}; const res = await fetch(url,{ headers }); const txt = await res.text(); try{ return JSON.parse(txt) }catch{ return txt } }

  console.log('Teacher login')
  const tlogin = await jpost('/api/auth/login', null, { email:'teacher@test.local', password:'Test123!' })
  const ttoken = tlogin.token
  console.log('Teacher token len', ttoken.length)

  console.log('Create class')
  const cls = await jpost('/api/classes', ttoken, { name: `E2E Class ${Date.now()}` })
  console.log('Class id', cls.id)

  console.log('Create lesson with task')
  const lesson = await jpost(`/api/classes/${cls.id}/lessons/with-activities`, ttoken, { title: 'E2E Lesson', activities:[{ type:'TASK', title:'E2E Sum Task', task: { title:'Suma E2E', description:'E2E sum task', maxPoints:6, starterCode: 'function solve(input){ const p=String(input||"\").trim().split(/\s+/).map(Number); return String(p.reduce((a,b)=>a+b,0)); }', language:'javascript' } }]})
  console.log('Lesson id', lesson.id)

  const lessonDetails = await jget(`/api/lessons/${lesson.id}`, ttoken)
  const act = (lessonDetails.activities || []).find(a=> a.type === 'TASK')
  const taskId = act.taskId
  console.log('Task id', taskId)

  console.log('Create tests')
  const t1 = await jpost(`/api/tasks/${taskId}/tests`, ttoken, { input:'2 3', expected:'5', points:2, visible:true, ordering:0, mode:'EVAL' })
  const t2 = await jpost(`/api/tasks/${taskId}/tests`, ttoken, { input:'10 -4', expected:'6', points:3, visible:true, ordering:1, mode:'EVAL' })
  const t3 = await jpost(`/api/tasks/${taskId}/tests`, ttoken, { input:'0 0', expected:'0', points:1, visible:true, ordering:2, mode:'EVAL' })
  console.log('Tests created', t1.id, t2.id, t3.id)

  console.log('Demo run correct')
  const correct = `function solve(input){ const parts=String(input||"\").trim().split(/\s+/).filter(Boolean).map(Number); return String(parts.reduce((a,b)=>a+b,0)); }`
  const resCorr = await jpost(`/api/tasks/${taskId}/run-demo`, ttoken, { code: correct, language:'javascript' })
  console.log('Demo correct score', resCorr.score)

  console.log('Demo run wrong')
  const wrong = `function solve(input){ const p=String(input||"\").trim().split(/\s+/).map(Number); return String(p[0]-p[1]); }`
  const resWrong = await jpost(`/api/tasks/${taskId}/run-demo`, ttoken, { code: wrong, language:'javascript' })
  console.log('Demo wrong score', resWrong.score)

  console.log('Student login')
  const slog = await jpost('/api/auth/login', null, { email:'student@test.local', password:'Test123!' })
  const stoken = slog.token
  console.log('Student token len', stoken.length)

  console.log('Student run (not submit)')
  const stuRun = await jpost(`/api/tasks/${taskId}/run`, stoken, { code: wrong, language:'javascript' })
  console.log('Student run result keys', Object.keys(stuRun || {}))

  console.log('Student submit')
  const submit = await jpost(`/api/tasks/${taskId}/submissions`, stoken, { content:'E2E submit', code: wrong })
  console.log('Submitted id', submit.id, 'autoScore', submit.autoScore)

  console.log('Teacher view class submissions')
  const classSubs = await jget(`/api/classes/${cls.id}/submissions`, ttoken)
  console.log('Class submissions count', classSubs.length)
  if(classSubs.length>0){ console.log('First submission id', classSubs[0].submission.id, 'autoScore', classSubs[0].submission.autoScore) }

  if(classSubs.length>0){
    const sid = classSubs[0].submission.id
    console.log('Teacher grading submission', sid)
    const graded = await jpost(`/api/submissions/${sid}/grade`, ttoken, { manualScore:4, teacherComment:'E2E grade' })
    console.log('Graded points', graded.points)
  }

  console.log('E2E finished')
})().catch(e=>{ console.error('E2E error', e); process.exit(1) })
