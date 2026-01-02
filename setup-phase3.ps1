# Phase 3 Setup Script

Write-Host "🚀 Phase 3: Enterprise Features Setup" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Step 1: Install sync server dependencies
Write-Host "📦 Step 1: Installing sync server dependencies..." -ForegroundColor Yellow
Set-Location sync-server
if (Test-Path "node_modules") {
    Write-Host "   Dependencies already installed, skipping..." -ForegroundColor Gray
} else {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install sync server dependencies!" -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✅ Sync server dependencies installed" -ForegroundColor Green
}
Set-Location ..

# Step 2: Build Electron app
Write-Host "`n📦 Step 2: Building Electron app..." -ForegroundColor Yellow
npm run build:electron
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to build Electron app!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Electron app built" -ForegroundColor Green

# Step 3: Get local IP
Write-Host "`n🌐 Step 3: Network Configuration" -ForegroundColor Yellow
$localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*"} | Select-Object -First 1).IPAddress

if ($localIP) {
    Write-Host "   Your local IP: $localIP" -ForegroundColor Green
    Write-Host "   Sync Server URL: http://$($localIP):3001" -ForegroundColor Cyan
} else {
    Write-Host "   ⚠️  Could not detect local IP" -ForegroundColor Yellow
    $localIP = "localhost"
}

# Step 4: Create .env file
Write-Host "`n📝 Step 4: Creating environment configuration..." -ForegroundColor Yellow
$envContent = "SYNC_SERVER_URL=http://$($localIP):3001"
Set-Content -Path ".env" -Value $envContent
Write-Host "   ✅ Created .env with SYNC_SERVER_URL" -ForegroundColor Green

# Step 5: Instructions
Write-Host "`n✅ Setup Complete!" -ForegroundColor Green
Write-Host "==================`n" -ForegroundColor Green

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Start the sync server (in a new terminal):" -ForegroundColor Yellow
Write-Host "   cd sync-server" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣  Open the dashboard:" -ForegroundColor Yellow
Write-Host "   http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  Start the POS app:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "4️⃣  For additional terminals on the network:" -ForegroundColor Yellow
Write-Host "   Update .env with: SYNC_SERVER_URL=http://$($localIP):3001" -ForegroundColor White
Write-Host ""
Write-Host "📚 Read PHASE3_GUIDE.md for detailed documentation" -ForegroundColor Cyan
Write-Host ""
