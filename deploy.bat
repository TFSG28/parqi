@echo off
REM Use: deploy.bat "commit message" target_branch
REM runs on current directory

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: %0 "commit-message" target_branch
    exit /b 1
)

if "%~2"=="" (
    echo Usage: %0 "commit-message" target_branch
    exit /b 1
)

set "MSG=%~1"
set "TARGET_BRANCH=%~2"

REM Get current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

REM Get repo name
for /f "tokens=*" %%i in ('git rev-parse --show-toplevel') do set REPO_PATH=%%i
for %%i in ("%REPO_PATH%") do set REPO_NAME=%%~nxi

echo Repo: %REPO_NAME%
echo Current branch: %CURRENT_BRANCH%
echo Target branch: %TARGET_BRANCH%

git add .
git commit -m "%MSG%"
git push origin "%CURRENT_BRANCH%"

if /i "%CURRENT_BRANCH%"=="%TARGET_BRANCH%" (
    echo Current branch is the same as target branch, we do not need checkout or merge
    echo %CURRENT_BRANCH% updated
    exit /b 0
)

git checkout "%TARGET_BRANCH%"
git pull origin "%TARGET_BRANCH%"
git merge --no-edit "%CURRENT_BRANCH%"
git push origin "%TARGET_BRANCH%"
git checkout "%CURRENT_BRANCH%"

echo %TARGET_BRANCH% has been updated

endlocal
