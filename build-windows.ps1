# Build and Package Requesto for Windows
# Run this script from the project root: .\build-windows.ps1

Write-Host "Building Requesto for Windows..." -ForegroundColor Green

# Step 1: Build all components
Write-Host "`n[1/2] Building backend, frontend, and electron..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Package electron app
Write-Host "`n[2/2] Packaging Electron application..." -ForegroundColor Yellow
Set-Location "apps\electron"
npm run package:win

if ($LASTEXITCODE -ne 0) {
    Write-Host "Packaging failed!" -ForegroundColor Red
    Set-Location "..\..\"
    exit 1
}

Set-Location "..\..\"

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "`nYour installers are in the 'dist' folder:" -ForegroundColor Cyan
Write-Host "  - Requesto Setup 0.1.0.exe (Installer)" -ForegroundColor White
Write-Host "  - Requesto 0.1.0.exe (Portable)" -ForegroundColor White

# List the dist folder contents
Write-Host "`nDist folder contents:" -ForegroundColor Cyan
Get-ChildItem -Path "dist" -Filter "*.exe" | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "  $($_.Name) - $size MB" -ForegroundColor White
}
