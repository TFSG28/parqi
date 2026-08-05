@echo off
REM Use: deploy.bat "commit message" [target_branch]
REM If target is not specified or not "main", defaults to merging through master to production

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: %0 "commit-message" [target_branch]
    echo Default: merges to master, then production
    exit /b 1
)

set "MSG=%~1"
set "TARGET_BRANCH=%~2"

REM If no target specified or target is not "main", use production
if "%TARGET_BRANCH%"=="" set "TARGET_BRANCH=production"
if /i not "%TARGET_BRANCH%"=="main" set "TARGET_BRANCH=production"

REM Get current branch
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i

REM Get repo name
for /f "tokens=*" %%i in ('git rev-parse --show-toplevel') do set REPO_PATH=%%i
for %%i in ("%REPO_PATH%") do set REPO_NAME=%%~nxi

echo Repo: %REPO_NAME%
echo Current branch: %CURRENT_BRANCH%
echo Target: %TARGET_BRANCH%

REM Commit and push current branch if there are changes
git add .
git diff-index --quiet HEAD
if errorlevel 1 (
    echo Committing changes on %CURRENT_BRANCH%...
    git commit -m "%MSG%"
    git push origin "%CURRENT_BRANCH%"
) else (
    echo No changes to commit on %CURRENT_BRANCH%
)

REM If already on master and target is production, just update master and merge to production
if /i "%CURRENT_BRANCH%"=="master" (
    if /i "%TARGET_BRANCH%"=="production" (
        echo Already on master, merging to production...
        goto MERGE_TO_PRODUCTION
    )
    echo Already on master, nothing to do
    exit /b 0
)

REM If current branch is production, we're done
if /i "%CURRENT_BRANCH%"=="production" (
    echo Already on production, updated
    exit /b 0
)

REM Merge current branch to master
echo Merging %CURRENT_BRANCH% to master...
git checkout master
git pull origin master
git merge --no-edit "%CURRENT_BRANCH%"
git push origin master

:MERGE_TO_PRODUCTION
REM If target is production, merge master to production
if /i "%TARGET_BRANCH%"=="production" (
    echo Merging master to production...
    git checkout production
    git pull origin production
    git merge --no-edit master
    git push origin production
    git checkout "%CURRENT_BRANCH%"
    echo Production updated from master
) else (
    git checkout "%CURRENT_BRANCH%"
    echo Master updated
)

endlocal
