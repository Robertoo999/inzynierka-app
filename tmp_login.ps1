$ErrorActionPreference = 'Stop'

Function Post-Login($email, $password){
    try{
        $body = @{ email = $email; password = $password } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
        Write-Output "LOGIN_RESULT $email => $($r | ConvertTo-Json -Compress)"
    } catch {
        Write-Output "LOGIN_ERROR $email => $($_.Exception.Message)"
    }
}

Post-Login -email 'teacher@test.local' -password 'teacherpass'
Post-Login -email 'student@test.local' -password 'studentpass'
