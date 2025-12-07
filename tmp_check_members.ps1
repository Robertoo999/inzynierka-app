$login = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/auth/login' -Body (ConvertTo-Json @{ email='teacher@test.local'; password='teacherpass' }) -ContentType 'application/json'
$token = $login.token
Write-Host "Got token: $token"
$classes = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes/me' -Headers @{ Authorization = "Bearer $token" }
Write-Host "Classes:"
$classes | ConvertTo-Json -Depth 5
if ($classes -and $classes.Length -gt 0) { $cid = $classes[0].id } else { $cid = 3 }
Write-Host "Using class id: $cid"
try {
    $members = Invoke-RestMethod -Uri "http://localhost:8080/api/classes/$cid/members" -Headers @{ Authorization = "Bearer $token" }
    Write-Host "Members:"
    $members | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Members request failed:`n" $_.Exception.Message
    if ($_.Exception.Response -ne $null) {
        try { $_.Exception.Response.GetResponseStream() | % { [System.IO.StreamReader]::new($_).ReadToEnd() } | Write-Host } catch {}
    }
}
