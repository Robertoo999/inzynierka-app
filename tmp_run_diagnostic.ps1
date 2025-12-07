$ErrorActionPreference = 'Stop'
$token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxYTM3MGM4MC1iM2M4LTRiODItYTM1NS1mNjlmZDI2OWRhZWQiLCJpYXQiOjE3NjI3MTQ2MzksImV4cCI6MTc2MjcyMTgzOSwicm9sZSI6IlNUVURFTlQiLCJlbWFpbCI6InN0dWRlbnRAdGVzdC5sb2NhbCJ9.0QbtjCNX9gHxw0zuk5WfjNaYJgU82mX4IVlMvm1gHZU'
$hdr = @{ Authorization = "Bearer $token" }
$body = @{ code = "class X{ public static void main(String[]a){ System.out.println(42); } }" } | ConvertTo-Json

try{
    $r = Invoke-WebRequest -Uri 'http://localhost:8081/api/tasks/59e8f816-310b-4e25-9aa5a3250b08/run' -Method Post -Headers $hdr -Body $body -ContentType 'application/json' -ErrorAction Stop
    Write-Output "Status: $($r.StatusCode)"
    Write-Output $r.Content
} catch {
    if ($_.Exception.Response -ne $null) {
        $resp = $_.Exception.Response
        $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $txt = $sr.ReadToEnd(); $sr.Close()
        Write-Output "ERROR RESPONSE: $txt"
    } else {
        Write-Output "ERROR: $($_.Exception.Message)"
    }
}
