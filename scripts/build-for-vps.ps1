# PowerShell script to prepare app for VPS deployment
# Run with: ./scripts/build-for-vps.ps1

Write-Host "🚀 Preparing Finova Workspace for VPS Deployment" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Host "1️⃣  Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Step 2: Check npm
Write-Host ""
Write-Host "2️⃣  Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "   ✅ npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ npm not found!" -ForegroundColor Red
    exit 1
}

# Step 3: Check environment file
Write-Host ""
Write-Host "3️⃣  Checking environment configuration..." -ForegroundColor Yellow
if (Test-Path ".env.production") {
    Write-Host "   ✅ .env.production found" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  .env.production not found!" -ForegroundColor Yellow
    Write-Host "      Creating from example..." -ForegroundColor Yellow
    
    if (Test-Path ".env.production.example") {
        Copy-Item ".env.production.example" ".env.production"
        Write-Host "   ⚠️  Please edit .env.production with your actual values!" -ForegroundColor Yellow
        Write-Host "      Press Enter to continue after editing, or Ctrl+C to abort..."
        Read-Host
    } else {
        Write-Host "   ❌ No .env.production.example found. Create .env.production manually." -ForegroundColor Red
        exit 1
    }
}

# Step 4: Clean previous builds
Write-Host ""
Write-Host "4️⃣  Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "   ✅ Removed .next directory" -ForegroundColor Green
}
if (Test-Path "out") {
    Remove-Item -Recurse -Force "out"
    Write-Host "   ✅ Removed out directory" -ForegroundColor Green
}

# Step 5: Install dependencies
Write-Host ""
Write-Host "5️⃣  Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Dependencies installed" -ForegroundColor Green

# Step 6: Build application
Write-Host ""
Write-Host "6️⃣  Building application for production..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✅ Build successful!" -ForegroundColor Green

# Step 7: Test build
Write-Host ""
Write-Host "7️⃣  Build verification..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Write-Host "   ✅ .next directory created" -ForegroundColor Green
    
    # Get build size
    $buildSize = (Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   📦 Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan
} else {
    Write-Host "   ❌ .next directory not found after build" -ForegroundColor Red
    exit 1
}

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ BUILD COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Test locally: npm start" -ForegroundColor White
Write-Host "   2. Upload to VPS via Git, FTP, or SCP" -ForegroundColor White
Write-Host "   3. On VPS, run: npm install && npm run build" -ForegroundColor White
Write-Host "   4. Start with PM2: pm2 start npm --name finova -- start" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full deployment guide: HOSTINGER_DEPLOYMENT_COMPLETE.md" -ForegroundColor Yellow
Write-Host ""
