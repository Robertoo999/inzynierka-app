$ErrorActionPreference = 'Stop'
$token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxYTM3MGM4MC1iM2M4LTRiODItYTM1NS1mNjlmZDI2OWRhZWQiLCJpYXQiOjE3NjI3MTQ2MzksImV4cCI6MTc2MjcyMTgzOSwicm9sZSI6IlNUVURFTlQiLCJlbWFpbCI6InN0dWRlbnRAdGVzdC5sb2NhbCJ9.0QbtjCNX9gHxw0zuk5WfjNaYJgU82mX4IVlMvm1gHZU'
$hdr = @{ Authorization = "Bearer $token" }
$taskId = '59e8f816-310b-4e25-9aa5-79e5a3250b08'
$body = @{ code = "function solve(){ return 42 }" } | ConvertTo-Json
Write-Output "POST /api/tasks/$taskId/run"
try{
    $res = Invoke-RestMethod -Uri "http://localhost:8081/api/tasks/$taskId/run" -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output ($res | ConvertTo-Json -Compress)
} catch {
    Write-Output "RUN_ERROR => $($_.Exception.Message)"
}

# try to fetch my submission for the task
Write-Output "GET /api/tasks/$taskId/submissions/me"
try{
    $me = Invoke-RestMethod -Uri "http://localhost:8081/api/tasks/$taskId/submissions/me" -Method Get -Headers $hdr -ErrorAction Stop
    Write-Output ($me | ConvertTo-Json -Compress)
} catch {
    Write-Output "MY_SUBMISSION_ERROR => $($_.Exception.Message)"
}
