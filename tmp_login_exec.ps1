$ErrorActionPreference = 'Stop'
$body = @{ email = 'student@test.local'; password = 'studentpass' } | ConvertTo-Json
try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8081/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
    $r | ConvertTo-Json -Depth 5
} catch {
    Write-Output "ERROR: $($_.Exception.Message)"
}
