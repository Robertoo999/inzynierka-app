$ErrorActionPreference = 'Stop'

$token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhNDUwNzZjNS0zYTYzLTRlNTEtYjkxYS1hNWZjOTQzNDJiZTIiLCJpYXQiOjE3NjI3MTQ2MzgsImV4cCI6MTc2MjcyMTgzOCwicm9sZSI6IlRFQUNIRVIiLCJlbWFpbCI6InRlYWNoZXJAdGVzdC5sb2NhbCJ9.jUDOrIgez5z4BUqtT8EBvudK3w6Gs2XRrCMLO4LNZsI'
$hdr = @{ Authorization = "Bearer $token" }

Write-Output "GET /api/classes/me"
$classes = Invoke-RestMethod -Uri 'http://localhost:8081/api/classes/me' -Method Get -Headers $hdr -ErrorAction Stop
Write-Output ($classes | ConvertTo-Json -Compress)

if ($classes -and $classes.Count -gt 0) {
    $cid = $classes[0].id
    Write-Output "Using class id: $cid"
    Write-Output "GET /api/classes/$cid/lessons"
    $less = Invoke-RestMethod -Uri "http://localhost:8081/api/classes/$cid/lessons" -Method Get -Headers $hdr -ErrorAction Stop
    Write-Output ($less | ConvertTo-Json -Compress)

    if ($less -and $less.Count -gt 0) {
        $lid = $less[0].id
        Write-Output "Using lesson id: $lid"
        Write-Output "GET /api/lessons/$lid/summary"
        $summary = Invoke-RestMethod -Uri "http://localhost:8081/api/lessons/$lid/summary" -Method Get -Headers $hdr -ErrorAction Stop
        Write-Output ($summary | ConvertTo-Json -Compress)
    }
} else {
    Write-Output "No classes found for teacher"
}
