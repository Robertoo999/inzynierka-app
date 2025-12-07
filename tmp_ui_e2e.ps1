$ErrorActionPreference = 'Stop'

Function Login($email,$password){
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "LOGIN_OK $email => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function CreateClass($token,$name){
    $hdr = @{ Authorization = "Bearer $token" }
    $body = @{ name = $name } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes' -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "CREATE_CLASS => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function CreateLessonWithTask($token,$classId){
    $hdr = @{ Authorization = "Bearer $token" }
    $activity1 = @{ type = 'CONTENT'; title = 'Wprowadzenie'; body = '{"blocks":[{"type":"markdown","md":"Test lesson"}]}' }
    $taskReq = @{ title = 'E2E zadanie'; description = 'Zadanie testowe e2e'; maxPoints = 10; starterCode = "function solve(){ return 42 }"; tests = "" }
    $activity2 = @{ type = 'TASK'; title = 'Ćwiczenie E2E'; task = $taskReq }
    $req = @{ title = 'E2E Lesson'; content = 'E2E content'; activities = @($activity1,$activity2) }
    $body = $req | ConvertTo-Json -Compress
    $r = Invoke-RestMethod -Uri "http://localhost:8080/api/classes/$classId/lessons/with-activities" -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "CREATE_LESSON => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function GetLessonsInClass($token,$classId){
    $hdr = @{ Authorization = "Bearer $token" }
    $r = Invoke-RestMethod -Uri "http://localhost:8080/api/classes/$classId/lessons" -Method Get -Headers $hdr -ErrorAction Stop
    Write-Output "LESSONS_IN_CLASS => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function GetLessonDetail($lessonId){
    $r = Invoke-RestMethod -Uri "http://localhost:8080/api/lessons/$lessonId" -Method Get -ErrorAction Stop
    Write-Output "LESSON_DETAIL => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function JoinClass($token,$code){
    $hdr = @{ Authorization = "Bearer $token" }
    $body = @{ code = $code } | ConvertTo-Json
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes/join' -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "JOINED_CLASS => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function StudentRun($token,$taskId,$code){
    $hdr = @{ Authorization = "Bearer $token" }
    $body = @{ code = $code } | ConvertTo-Json
    try{
        $r = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/$taskId/run" -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
        Write-Output "RUN_OK => $($r | ConvertTo-Json -Compress)"
        return $r
    } catch {
        Write-Output "RUN_ERROR => $($_.Exception.Message)"
        if ($_.Exception.Response -ne $null) { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $txt=$sr.ReadToEnd(); $sr.Close(); Write-Output "RUN_ERROR_BODY => $txt" }
        throw $_
    }
}

Function GetMySubmission($token,$taskId){
    $hdr = @{ Authorization = "Bearer $token" }
    $r = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/$taskId/submissions/me" -Method Get -Headers $hdr -ErrorAction Stop
    Write-Output "MY_SUBMISSION => $($r | ConvertTo-Json -Compress)"
    return $r
}

Function GetTaskSubmissionsTeacher($token,$taskId){
    $hdr = @{ Authorization = "Bearer $token" }
    $r = Invoke-RestMethod -Uri "http://localhost:8080/api/tasks/$taskId/submissions" -Method Get -Headers $hdr -ErrorAction Stop
    Write-Output "TASK_SUBMISSIONS => $($r | ConvertTo-Json -Compress)"
    return $r
}

# Start E2E
$tTeacher = Login 'teacher@test.local' 'teacherpass'
$teacherToken = $tTeacher.token

# create class
$c = CreateClass $teacherToken 'E2E API Class'
$classId = $c.id
$joinCode = $c.joinCode

# create lesson with task
$l = CreateLessonWithTask $teacherToken $classId

# find lesson and task id
$less = GetLessonsInClass $teacherToken $classId
$lessonId = $less[0].id
$ld = GetLessonDetail $lessonId
$task = $ld.tasks | Select-Object -First 1
$taskId = $task.id
Write-Output "Picked taskId: $taskId"

# login student and join class
$tStudent = Login 'student@test.local' 'studentpass'
$studentToken = $tStudent.token
JoinClass $studentToken $joinCode

# student runs the task
StudentRun $studentToken $taskId "function solve(){ return 42 }"
GetMySubmission $studentToken $taskId

# teacher lists submissions and lesson summary
GetTaskSubmissionsTeacher $teacherToken $taskId
$summary = Invoke-RestMethod -Uri "http://localhost:8080/api/lessons/$lessonId/summary" -Method Get -Headers @{ Authorization = "Bearer $teacherToken" } -ErrorAction Stop
Write-Output "LESSON_SUMMARY => $($summary | ConvertTo-Json -Compress)"

Write-Output 'E2E_DONE'
