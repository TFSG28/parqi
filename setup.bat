@echo off
REM Perfect Template Setup Script (Windows Batch)
REM This script installs and updates all dependencies for both backend and frontend

echo ==========================================
echo   Perfect Template - Initial Setup
echo ==========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js 20+ from https://nodejs.org/
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js version: %NODE_VERSION%
echo.

REM Backend Setup
echo ==========================================
echo   Setting up Backend
echo ==========================================
echo.

cd backend

REM Check if .env exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env >nul
    echo [OK] .env file created
    echo [WARNING] Please edit backend\.env with your configuration
) else (
    echo [OK] .env file already exists
)

echo.
echo Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Dependency conflict detected. Attempting to fix...
    echo.
    
    REM Try with legacy peer deps
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install backend dependencies
        echo.
        echo Common fixes:
        echo 1. Delete node_modules and package-lock.json
        echo 2. Run: npm install --legacy-peer-deps
        echo 3. Check package.json for incompatible versions
        cd ..
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed with legacy peer deps
) else (
    echo [OK] Dependencies installed successfully
)

echo.
echo [OK] Backend setup complete!

cd ..

REM Frontend Setup
echo.
echo ==========================================
echo   Setting up Frontend
echo ==========================================
echo.

cd frontend

REM Check if .env.development exists
if not exist .env.development (
    echo Creating .env.development file from .env.example...
    copy .env.example .env.development >nul
    echo [OK] .env.development file created
) else (
    echo [OK] .env.development file already exists
)

echo.
echo Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Dependency conflict detected. Attempting to fix...
    echo.
    
    REM Try with legacy peer deps
    call npm install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install frontend dependencies
        echo.
        echo Common fixes:
        echo 1. Delete node_modules and package-lock.json
        echo 2. Run: npm install --legacy-peer-deps
        echo 3. Check package.json for incompatible versions
        cd ..
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed with legacy peer deps
) else (
    echo [OK] Dependencies installed successfully
)

echo.
echo [OK] Frontend setup complete!

cd ..

REM Final Instructions
echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Configure your environment variables:
echo    - backend\.env
echo    - frontend\.env.development
echo.
echo 2. Setup your database:
echo    cd backend
echo    npm run db-update
echo.
echo 3. Start development servers:
echo    Backend:  cd backend ^&^& npm run dev
echo    Frontend: cd frontend ^&^& npm run dev
echo.
echo For updating dependencies safely:
echo    Run: npm run update-deps (in backend or frontend)
echo.
echo Happy coding!

pause
