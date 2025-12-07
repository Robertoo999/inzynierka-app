$ErrorActionPreference = 'Stop'

# Teacher login
$b = @{ email='teacher@test.local'; password='teacherpass' } | ConvertTo-Json
$t = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $b -ErrorAction Stop
$teacherToken = $t.token
Write-Output "Teacher token obtained"

# list teacher classes
$hdr = @{ Authorization = "Bearer $teacherToken" }
$classes = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes/me' -Method Get -Headers $hdr -ErrorAction Stop
Write-Output "CLASSES => $($classes | ConvertTo-Json -Compress)"

# find class id 3 or pick first
$cls = $classes | Where-Object { $_.id -eq 3 } 
if (-not $cls) { $cls = $classes[0] }
$classId = $cls.id
Write-Output "Using classId: $classId"

# get lessons in class
$lessons = Invoke-RestMethod -Uri "http://localhost:8080/api/classes/$classId/lessons" -Method Get -Headers $hdr -ErrorAction Stop
Write-Output "LESSONS => $($lessons | ConvertTo-Json -Compress)"
$lessonId = $lessons[0].id
Write-Output "Using lessonId: $lessonId"

# get lesson detail
$ld = Invoke-RestMethod -Uri "http://localhost:8080/api/lessons/$lessonId" -Method Get -ErrorAction Stop
Write-Output "LESSON_DETAIL => $($ld | ConvertTo-Json -Compress)"
$taskId = $ld.tasks[0].id
Write-Output "Found taskId: $taskId"

# get joinCode for class: need to GET classes/me shows joinCode earlier; if not included, take from earlier class creation
$joinCode = $cls.joinCode
Write-Output "joinCode = $joinCode"

# Student login
$bs = @{ email='student@test.local'; password='studentpass' } | ConvertTo-Json
$s = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $bs -ErrorAction Stop
$studentToken = $s.token
Write-Output "Student token obtained"

# student join class
$hdrs = @{ Authorization = "Bearer $studentToken" }
$jbody = @{ code = $joinCode } | ConvertTo-Json
$jres = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes/join' -Method Post -Headers $hdrs -ContentType 'application/json' -Body $jbody -ErrorAction Stop
Write-Output "JOIN_RESP => $($jres | ConvertTo-Json -Compress)"

# student run
$rbody = @{ code = "function solve(){ return 42 }" } | ConvertTo-Json
$run = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/$taskId/run" -Method Post -Headers $hdrs -ContentType 'application/json' -Body $rbody -ErrorAction Stop
Write-Output "RUN_RESP => $($run | ConvertTo-Json -Compress)"

# get my submission
$me = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/$taskId/submissions/me" -Method Get -Headers $hdrs -ErrorAction Stop
Write-Output "MY_SUBMISSION => $($me | ConvertTo-Json -Compress)"

# teacher list submissions
$sublist = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/$taskId/submissions" -Method Get -Headers $hdr -ErrorAction Stop
Write-Output "TASK_SUBMISSIONS => $($sublist | ConvertTo-Json -Compress)"

# lesson summary
$summary = Invoke-RestMethod -Uri "http://localhost:8080/api/lessons/$lessonId/summary" -Method Get -Headers $hdr -ErrorAction Stop
Write-Output "LESSON_SUMMARY => $($summary | ConvertTo-Json -Compress)"

Write-Output 'CONTINUE_E2E_DONE'