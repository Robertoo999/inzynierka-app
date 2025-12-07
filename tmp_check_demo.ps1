$ErrorActionPreference = 'Stop'
try{
    $body = @{ email = 'student@test.local'; password = 'studentpass' } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
    Write-Output "Logged in as: $($login.email) role=$($login.role)"
    $token = $login.token
    $headers = @{ Authorization = "Bearer $token" }
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes/me' -Method Get -Headers $headers -ErrorAction Stop
    Write-Output ($r | ConvertTo-Json -Depth 4)
}catch{
    Write-Output "ERROR: $($_.Exception.Message)"
}
