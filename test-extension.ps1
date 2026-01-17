# Chrome Extension Quick Test Script
Write-Host "=== Chrome Extension File Check ===" -ForegroundColor Cyan

$errors = @()
$warnings = @()

# Check required files
$requiredFiles = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup/popup.html",
    "popup/popup.js",
    "popup/popup.css",
    "utils/database.js",
    "utils/scraper.js",
    "lib/sql-wasm.js",
    "lib/sql-wasm.wasm",
    "icons/icon16.png",
    "icons/icon48.png",
    "icons/icon128.png"
)

Write-Host "`nChecking required files..." -ForegroundColor Yellow
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  OK: $file" -ForegroundColor Green
    } else {
        Write-Host "  MISSING: $file" -ForegroundColor Red
        $errors += $file
    }
}

# Check manifest.json
Write-Host "`nChecking manifest.json..." -ForegroundColor Yellow
try {
    $manifest = Get-Content manifest.json -Raw | ConvertFrom-Json
    Write-Host "  OK: manifest.json syntax is valid" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: manifest.json syntax error: $_" -ForegroundColor Red
    $errors += "manifest.json syntax error"
}

# Summary
Write-Host "`n=== Summary ===" -ForegroundColor Cyan
if ($errors.Count -eq 0) {
    Write-Host "SUCCESS: All required files exist" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Open Chrome browser" -ForegroundColor White
    Write-Host "2. Go to: chrome://extensions/" -ForegroundColor White
    Write-Host "3. Enable 'Developer mode'" -ForegroundColor White
    Write-Host "4. Click 'Load unpacked'" -ForegroundColor White
    Write-Host "5. Select this directory: $PWD" -ForegroundColor White
    exit 0
} else {
    Write-Host "ERROR: Found $($errors.Count) errors" -ForegroundColor Red
    exit 1
}
