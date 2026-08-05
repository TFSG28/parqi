# Perfect Template Setup Script (PowerShell)
# This script installs and updates all dependencies for both backend and frontend

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Perfect Template - Initial Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "Error: Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
}

Write-Host ""

# Backend Setup
Write-Host "==========================================" -ForegroundColor Blue
Write-Host "  Setting up Backend" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""

Set-Location backend

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✓ .env file created" -ForegroundColor Green
    Write-Host "⚠ Please edit backend/.env with your configuration" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Updating backend dependencies to latest versions..." -ForegroundColor Blue
npx npm-check-updates -u

Write-Host ""
Write-Host "Installing backend dependencies..." -ForegroundColor Blue
npm install

Write-Host ""
Write-Host "✓ Backend setup complete!" -ForegroundColor Green

Set-Location ..

# Frontend Setup
Write-Host ""
Write-Host "==========================================" -ForegroundColor Blue
Write-Host "  Setting up Frontend" -ForegroundColor Blue
Write-Host "==========================================" -ForegroundColor Blue
Write-Host ""

Set-Location frontend

# Check if .env.development exists
if (-not (Test-Path .env.development)) {
    Write-Host "Creating .env.development file from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env.development
    Write-Host "✓ .env.development file created" -ForegroundColor Green
} else {
    Write-Host "✓ .env.development file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "Updating frontend dependencies to latest versions..." -ForegroundColor Blue
npx npm-check-updates -u

Write-Host ""
Write-Host "Installing frontend dependencies..." -ForegroundColor Blue
npm install

Write-Host ""
Write-Host "✓ Frontend setup complete!" -ForegroundColor Green

Set-Location ..

# Final Instructions
Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Configure your environment variables:"
Write-Host "   - backend/.env"
Write-Host "   - frontend/.env.development"
Write-Host ""
Write-Host "2. Setup your database:"
Write-Host "   cd backend"
Write-Host "   npm run db-update"
Write-Host ""
Write-Host "3. Start development servers:"
Write-Host "   Backend:  cd backend && npm run dev"
Write-Host "   Frontend: cd frontend && npm run dev"
Write-Host ""
Write-Host "Happy coding! 🚀" -ForegroundColor Green
