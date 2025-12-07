$ErrorActionPreference = 'Stop'

Function Login($email,$password){
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    try{
        $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body $body -ErrorAction Stop
        Write-Output "LOGIN_OK $email => $($r | ConvertTo-Json -Compress)"
        return $r
    } catch {
        Write-Output "LOGIN_FAILED $email => $($_.Exception.Message)"
        if ($_.Exception.Response -ne $null) {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Output $sr.ReadToEnd(); $sr.Close()
        }
        exit 2
    }
}

Function CreateClass($token,$name){
    $hdr = @{ Authorization = "Bearer $token" }
    $body = @{ name = $name } | ConvertTo-Json
    try{
        $r = Invoke-RestMethod -Uri 'http://localhost:8080/api/classes' -Method Post -Headers $hdr -ContentType 'application/json' -Body $body -ErrorAction Stop
        Write-Output "CREATE_OK => $($r | ConvertTo-Json -Compress)"
    } catch {
        Write-Output "CREATE_FAILED => $($_.Exception.Message)"
        if ($_.Exception.Response -ne $null) {
            $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            Write-Output $sr.ReadToEnd(); $sr.Close()
        }
    }
}

$r = Login 'teacher@test.local' 'teacherpass'
$token = $r.token
CreateClass $token 'API Test Class'
