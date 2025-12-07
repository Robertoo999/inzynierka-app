$ErrorActionPreference = 'Stop'
$token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhNDUwNzZjNS0zYTYzLTRlNTEtYjkxYS1hNWZjOTQzNDJiZTIiLCJpYXQiOjE3NjI3MTQ2MzgsImV4cCI6MTc2MjcyMTgzOCwicm9sZSI6IlRFQUNIRVIiLCJlbWFpbCI6InRlYWNoZXJAdGVzdC5sb2NhbCJ9.jUDOrIgez5z4BUqtT8EBvudK3w6Gs2XRrCMLO4LNZsI'
$hdr = @{ Authorization = "Bearer $token" }
$lessonId = 'c710423c-7804-40a9-a83f-9f98f7d7b021'
Write-Output "GET /api/lessons/$lessonId/summary"
try{
    $s = Invoke-RestMethod -Uri "http://localhost:8081/api/lessons/$lessonId/summary" -Method Get -Headers $hdr -ErrorAction Stop
    Write-Output ($s | ConvertTo-Json -Compress)
} catch {
    Write-Output "SUMMARY_ERROR => $($_.Exception.Message)"
}
