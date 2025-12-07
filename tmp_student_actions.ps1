$ErrorActionPreference='Stop'
try{
  $loginBody = @{ email='student@test.local'; password='studentpass' } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri 'http://localhost:8081/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody
  $token = $login.token
  Write-Output "LOGGED_IN token length: $($token.Length)"

  $hdr = @{ Authorization = "Bearer $token" }
  $classes = Invoke-RestMethod -Uri 'http://localhost:8081/api/classes/me' -Method GET -Headers $hdr
  Write-Output "CLASSES: $($classes | ConvertTo-Json -Depth 3)"
  if ($classes.Length -gt 0) {
    $cid = $classes[0].id
    Write-Output "First class id: $cid"
    $members = Invoke-RestMethod -Uri "http://localhost:8081/api/classes/$cid/members" -Method GET -Headers $hdr
    Write-Output "MEMBERS: $($members | ConvertTo-Json -Depth 3)"
    Write-Output "Calling DELETE /api/classes/$cid/members/me"
    Invoke-RestMethod -Uri "http://localhost:8081/api/classes/$cid/members/me" -Method DELETE -Headers $hdr
    Write-Output "Left class. Refreshing my classes..."
    $classes2 = Invoke-RestMethod -Uri 'http://localhost:8081/api/classes/me' -Method GET -Headers $hdr
    Write-Output "CLASSES_AFTER_LEAVE: $($classes2 | ConvertTo-Json -Depth 3)"
  } else { Write-Output 'No classes to test.' }
}catch{ Write-Output "ERROR: $($_.Exception.Message)" }
