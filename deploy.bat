@echo off
REM ============================================================
REM  Deploy: commit + push the current branch, then merge it into
REM  the target branch. Pushing to "quality"/"production" triggers
REM  the GitHub Actions workflow that performs the actual deploy
REM  (cPanel backend/frontend, APK release).
REM
REM  Usage:   deploy.bat "commit message" [target]
REM  target:  quality (default) | production | main
REM ============================================================

setlocal

if "%~1"=="" (
    echo Usage: %0 "commit-message" [target]
    echo   target: quality ^(default^), production, main
    exit /b 1
)

set "MSG=%~1"
set "TARGET=%~2"
if "%TARGET%"=="" set "TARGET=quality"

REM Validar target
if /i not "%TARGET%"=="quality" if /i not "%TARGET%"=="production" if /i not "%TARGET%"=="main" (
    echo [ERRO] Target invalido: "%TARGET%". Usa: quality, production ou main.
    exit /b 1
)

for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

echo.
echo Branch atual: %CURRENT_BRANCH%
echo Target:       %TARGET%

REM ------------------------------------------------------------
REM 1. Commit + push a branch atual
REM ------------------------------------------------------------
git add -A
git diff --cached --quiet
if errorlevel 1 (
    echo A commitar e publicar %CURRENT_BRANCH%...
    git commit -m "%MSG%"
    if errorlevel 1 (
        echo [ERRO] Falha no commit.
        exit /b 1
    )
    git push origin "%CURRENT_BRANCH%"
    if errorlevel 1 (
        echo [ERRO] Falha no push de %CURRENT_BRANCH%.
        exit /b 1
    )
) else (
    echo Sem alteracoes para commit em %CURRENT_BRANCH%.
)

REM ------------------------------------------------------------
REM 2. Se a branch atual ja e o target, terminou (o push acima ja
REM    disparou o deploy).
REM ------------------------------------------------------------
if /i "%CURRENT_BRANCH%"=="%TARGET%" (
    echo %TARGET% atualizado - o workflow vai deployar.
    exit /b 0
)

REM ------------------------------------------------------------
REM 3. Merge para o target
REM ------------------------------------------------------------
echo A fazer merge de %CURRENT_BRANCH% para %TARGET%...

git checkout "%TARGET%"
if errorlevel 1 (
    echo [ERRO] Nao foi possivel trocar para "%TARGET%". A branch existe?
    echo         Cria-a com:  git push origin %CURRENT_BRANCH%:%TARGET%
    exit /b 1
)

git pull origin "%TARGET%"
if errorlevel 1 (
    echo [ERRO] Falha no pull de %TARGET%.
    exit /b 1
)

git merge --no-edit "%CURRENT_BRANCH%"
if errorlevel 1 (
    echo [ERRO] Conflitos no merge para %TARGET%. Resolve e repete o push.
    exit /b 1
)

git push origin "%TARGET%"
if errorlevel 1 (
    echo [ERRO] Falha no push de %TARGET%.
    exit /b 1
)

git checkout "%CURRENT_BRANCH%"
if errorlevel 1 (
    echo [AVISO] Merge publicado em %TARGET%, mas nao consegui voltar a %CURRENT_BRANCH%.
    exit /b 1
)

echo.
echo Feito - %TARGET% publicado. O workflow vai deployar.
endlocal
