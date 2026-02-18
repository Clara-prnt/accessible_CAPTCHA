# Script pour démarrer le CAPTCHA - Windows PowerShell
# Usage: .\start.ps1

$projectPath = "C:\Users\clara\OneDrive\Documents\ISFATES\captcha_vite"

Write-Host "=====================================`n" -ForegroundColor Cyan
Write-Host "Staring CAPTCHA-Project`n" -ForegroundColor Green
Write-Host "=====================================`n" -ForegroundColor Cyan

Write-Host "Project: $projectPath" -ForegroundColor Green

# Vérifier que le répertoire existe
if (-not (Test-Path $projectPath)) {
    Write-Host "Error: The project path does not exist!" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath

# Vérifier que PHP est installé
Write-Host "Verification of prerequisites..." -ForegroundColor Yellow
try {
    $phpVersion = php --version | Select-Object -First 1
    Write-Host "PHP: $phpVersion" -ForegroundColor Green
} catch {
    Write-Host "PHP not installed!" -ForegroundColor Red
    Write-Host "To download it: https://www.php.net/downloads" -ForegroundColor Yellow
    exit 1
}

# Vérifier npm
try {
    $npmVersion = npm --version
    Write-Host "npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "npm not installed!" -ForegroundColor Red
    exit 1
}

# Démarrer le serveur PHP
Write-Host "Starting the PHP server on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$projectPath'; php -S localhost:8000`""

# Attendre un peu que PHP démarre
Start-Sleep -Seconds 3

# Démarrer Vite
Write-Host "Starting Vite on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$projectPath'; npm run dev`""

Write-Host "`n=====================================`n" -ForegroundColor Cyan
Write-Host "Open your browser: http://localhost:5173" -ForegroundColor Cyan
Write-Host "PHP Server: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`n=====================================`n" -ForegroundColor Cyan

Write-Host "Waiting for servers to launch..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Ouvrir le navigateur
Write-Host "Opening the browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host "Startup complete!" -ForegroundColor Green

