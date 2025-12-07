$ErrorActionPreference = 'Stop'

# Login teacher
$b = @{ email='teacher@test.local'; password='teacherpass' } | ConvertTo-Json
$r = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $b -ErrorAction Stop
$token = $r.token
Write-Output "TOKEN: $token"

$classId = 3
$hdr = @{ Authorization = "Bearer $token" }
$activity1 = @{ type = 'CONTENT'; title = 'Introduction'; body = '{"blocks":[{"type":"markdown","md":"Test lesson"}]}' }
$taskReq = @{ title = 'E2E task'; description = 'E2E test task'; maxPoints = 10; starterCode = "function solve(){ return 42 }"; tests = "" }
$activity2 = @{ type = 'TASK'; title = 'Exercise E2E'; task = $taskReq }
$req = @{ title = 'E2E Lesson ASCII'; content = 'E2E content'; activities = @($activity1,$activity2) }
$body = $req | ConvertTo-Json -Compress

try{
    $res = Invoke-RestMethod -Uri "http://localhost:8080/api/classes/$classId/lessons/with-activities" -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "CREATE_LESSON_OK => $($res | ConvertTo-Json -Compress)"
} catch {
    Write-Output "CREATE_LESSON_FAILED => $($_.Exception.Message)"
    if ($_.Exception.Response -ne $null) {
        $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $txt = $sr.ReadToEnd(); $sr.Close(); Write-Output "BODY => $txt"
    }
}
