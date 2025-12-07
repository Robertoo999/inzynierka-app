$ErrorActionPreference = 'Stop'
try{
    $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/health' -Method Get -ErrorAction Stop
    Write-Output "HEALTH => $($r | ConvertTo-Json -Compress)"
}catch{
    Write-Output "HEALTH_ERROR => $($_.Exception.Message)"
}
