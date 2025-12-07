$ErrorActionPreference = 'Stop'
$apiBase = 'http://localhost:8080'

function Login($email, $password){
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $res = Invoke-RestMethod -Method Post -Uri "$apiBase/api/auth/login" -Body $body -ContentType 'application/json'
    return $res
}

try{
    Write-Host "Logging in as teacher@test.local"
    $t = Login -email 'teacher@test.local' -password 'teacherpass'
    Write-Host "Token length:" ($t.token.Length)
    $hdr = @{ Authorization = "Bearer $($t.token)" }

    Write-Host "Fetching my classes"
    $classes = Invoke-RestMethod -Method Get -Uri "$apiBase/api/classes/me" -Headers $hdr
    $classes | ConvertTo-Json -Depth 5 | Write-Host

    if ($classes.Count -gt 0) {
        $cid = $classes[0].id
        Write-Host "Listing lessons for class id: $cid"
        $lessons = Invoke-RestMethod -Method Get -Uri "$apiBase/api/classes/$cid/lessons" -Headers $hdr
        $lessons | ConvertTo-Json -Depth 5 | Write-Host
        if ($lessons.Count -gt 0) {
            $lid = $lessons[0].id
            Write-Host "Fetching lesson detail id: $lid"
            $detail = Invoke-RestMethod -Method Get -Uri "$apiBase/api/lessons/$lid" -Headers $hdr
            $detail | ConvertTo-Json -Depth 10 | Write-Host
        }
    } else {
        Write-Host "No classes found for teacher"
    }
} catch {
    Write-Host "Error:" $_.Exception.Message
    if ($_.Exception.Response) { $_.Exception.Response.GetResponseStream() | New-Object System.IO.StreamReader | ForEach-Object { $_.ReadToEnd() } | Write-Host }
}
