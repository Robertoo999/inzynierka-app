$ErrorActionPreference = 'Stop'
$token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhNDUwNzZjNS0zYTYzLTRlNTEtYjkxYS1hNWZjOTQzNDJiZTIiLCJpYXQiOjE3NjI3MTQ2MzgsImV4cCI6MTc2MjcyMTgzOCwicm9sZSI6IlRFQUNIRVIiLCJlbWFpbCI6InRlYWNoZXJAdGVzdC5sb2NhbCJ9.jUDOrIgez5z4BUqtT8EBvudK3w6Gs2XRrCMLO4LNZsI'
$hdr = @{ Authorization = "Bearer $token" }
Write-Output "GET /api/classes/7/lessons"
$less = Invoke-RestMethod -Uri 'http://localhost:8081/api/classes/7/lessons' -Method Get -Headers $hdr -ErrorAction Stop
Write-Output ($less | ConvertTo-Json -Compress)

if ($less -and $less.Count -gt 0) { Write-Output "First lesson id: $($less[0].id)" }
