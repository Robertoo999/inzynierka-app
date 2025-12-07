$ErrorActionPreference = 'Stop'

# Resolve repo root and paths
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

Write-Host 'Starting Postgres (docker compose)'
docker compose -f (Join-Path $root 'docker-compose.yml') up -d db

# Start backend (Spring Boot dev) in a new PowerShell window
Write-Host 'Starting backend (Spring Boot dev with devtools)'
Start-Process -FilePath "powershell" -ArgumentList @('-NoExit','-Command', "Push-Location '$backendDir'; $env:JUDGE0_URL='https://ce.judge0.com'; .\\mvnw.cmd spring-boot:run") -WorkingDirectory $backendDir

# Start frontend (Vite dev) in a new PowerShell window
Write-Host 'Starting frontend (Vite dev)'
$npm = Join-Path $env:ProgramFiles 'nodejs\\npm.cmd'
if (-not (Test-Path $npm)) { $npm = 'npm' }
Start-Process -FilePath "powershell" -ArgumentList @('-NoExit','-Command', "Push-Location '$frontendDir'; & '$npm' install; & '$npm' run dev") -WorkingDirectory $frontendDir

Write-Host ''
Write-Host 'Dev environment starting:'
Write-Host '  - Backend API:    http://localhost:8080 (GET /api/health)'
Write-Host '  - Frontend (Vite): http://localhost:5173 (or next available port)'
