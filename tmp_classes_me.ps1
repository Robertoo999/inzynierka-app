Param(
    [string]$token
)

$ErrorActionPreference = 'Stop'
try{
    $headers = @{ Authorization = "Bearer $token" }
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes/me' -Method Get -Headers $headers -ErrorAction Stop
    $r | ConvertTo-Json -Depth 4
}catch{
    Write-Output "ERROR: $($_.Exception.Message)"
}
