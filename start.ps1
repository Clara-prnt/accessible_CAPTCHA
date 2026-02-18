# Script pour démarrer le CAPTCHA - Windows PowerShell
# Usage: .\start.ps1

$projectPath = "C:\Users\clara\OneDrive\Documents\ISFATES\captcha_vite"

Write-Host "=====================================`n" -ForegroundColor Cyan
Write-Host "🚀 Démarrage du CAPTCHA Accessible`n" -ForegroundColor Green
Write-Host "=====================================`n" -ForegroundColor Cyan

Write-Host "✅ Projet: $projectPath" -ForegroundColor Green

# Vérifier que le répertoire existe
if (-not (Test-Path $projectPath)) {
    Write-Host "❌ Erreur: Le chemin du projet n'existe pas!" -ForegroundColor Red
    exit 1
}

Set-Location $projectPath

# Vérifier que PHP est installé
Write-Host "`n📋 Vérification des prérequis..." -ForegroundColor Yellow
try {
    $phpVersion = php --version | Select-Object -First 1
    Write-Host "✅ PHP: $phpVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ PHP n'est pas installé!" -ForegroundColor Red
    Write-Host "   Téléchargez-le depuis: https://www.php.net/downloads" -ForegroundColor Yellow
    exit 1
}

# Vérifier npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm n'est pas installé!" -ForegroundColor Red
    exit 1
}

# Démarrer le serveur PHP
Write-Host "`n🔧 Démarrage du serveur PHP sur le port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$projectPath'; php -S localhost:8000`""

# Attendre un peu que PHP démarre
Start-Sleep -Seconds 3

# Démarrer Vite
Write-Host "⚡ Démarrage de Vite sur le port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$projectPath'; npm run dev`""

Write-Host "`n=====================================`n" -ForegroundColor Cyan
Write-Host "✅ Les serveurs démarrent dans d'autres fenêtres" -ForegroundColor Green
Write-Host "🌐 Ouvrez votre navigateur à: http://localhost:5173" -ForegroundColor Cyan
Write-Host "✅ PHP Server: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`n=====================================`n" -ForegroundColor Cyan

Write-Host "⏳ En attente de lancement des serveurs..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Ouvrir le navigateur
Write-Host "🌐 Ouverture du navigateur..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

Write-Host "`n✅ Démarrage terminé!" -ForegroundColor Green

