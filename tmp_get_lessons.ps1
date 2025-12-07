param([string]$token)
$ErrorActionPreference='Stop'
try{
  $list = Invoke-RestMethod -Uri 'http://localhost:8081/api/lessons' -Method GET
  Write-Output "LESSONS_COUNT: $($list.Length)"
  if ($list.Length -gt 0) {
    $id = $list[0].id
    Write-Output "First lesson id: $id"
    $detail = Invoke-RestMethod -Uri "http://localhost:8081/api/lessons/$id" -Method GET
    $detail | ConvertTo-Json -Depth 6
  }
}catch{
  Write-Output "ERROR: $($_.Exception.Message)"
}
