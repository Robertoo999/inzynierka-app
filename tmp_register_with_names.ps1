$ErrorActionPreference = 'Stop'
$email = 'user' + ([guid]::NewGuid().ToString('N').Substring(0,6)) + '@test.local'
$regBodyObj = @{ email = $email; password = 'Haslo123!'; role = 'STUDENT'; firstName = 'Jan'; lastName = 'Kowalski' }
$loginBodyObj = @{ email = $email; password = 'Haslo123!' }
$regBody = $regBodyObj | ConvertTo-Json
$loginBody = $loginBodyObj | ConvertTo-Json

try {
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/register' -Method Post -ContentType 'application/json' -Body $regBody -ErrorAction Stop
    Write-Output ("REGISTER_OK " + ($r | ConvertTo-Json -Compress))
    $r2 = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody -ErrorAction Stop
    Write-Output ("LOGIN_OK " + ($r2 | ConvertTo-Json -Compress))
} catch {
    Write-Output ("REGISTER_OR_LOGIN_ERROR " + $_.Exception.Message)
}