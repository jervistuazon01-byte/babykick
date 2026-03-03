@echo off
setlocal EnableDelayedExpansion

title GitHub Repository Sync Tool

echo ==========================================================
echo                 GitHub Auto-Sync Utility                
echo ==========================================================
echo Target: https://github.com/jervistuazon01-byte/babykick.git
echo.

:: 1. Verify Git Installation
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git is not installed or not found in system PATH.
    echo         Download and install from: https://git-scm.com/
    pause
    exit /b 1
)

:: 2. Verify Git Identity Configuration (Required for Commits)
git config user.name >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo [INFO] Git identity is not configured. Setting it up now...
    set /p "GIT_NAME=Enter your name (e.g., John Doe): "
    set /p "GIT_EMAIL=Enter your email (e.g., john@example.com): "
    git config --global user.name "!GIT_NAME!"
    git config --global user.email "!GIT_EMAIL!"
    echo [INFO] Git identity saved globally.
    echo.
)

:: 3. Repository Initialization / Remote Verification
if not exist ".git\" (
    echo [INFO] No Git repository found. Initializing...
    git init
    git branch -M main
    git remote add origin https://github.com/jervistuazon01-byte/babykick.git
) else (
    :: Ensure remote 'origin' points to the correct URL
    git remote get-url origin >nul 2>nul
    if !ERRORLEVEL! NEQ 0 (
        git remote add origin https://github.com/jervistuazon01-byte/babykick.git
    ) else (
        git remote set-url origin https://github.com/jervistuazon01-byte/babykick.git
    )
)

:: 4. Check for unstaged / uncommitted changes
echo.
echo [1/4] Checking local repository status...
set "HAS_CHANGES="
for /f "tokens=*" %%A in ('git status --porcelain') do (
    set "HAS_CHANGES=1"
)

if defined HAS_CHANGES (
    echo.
    echo Uncommitted changes found:
    git status --short
    echo.
    
    set "COMMIT_MSG="
    set /p "COMMIT_MSG=Enter commit message (Leave blank for auto-timestamp): "
    
    if "!COMMIT_MSG!"=="" (
        :: Use PowerShell for reliable timestamping (WMIC is deprecated on Win 11)
        for /f "usebackq tokens=*" %%I in (`powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'"`) do set "DATETIME=%%I"
        set "COMMIT_MSG=Auto-sync: !DATETIME!"
    )
    
    echo.
    echo [2/4] Staging and Committing changes...
    git add .
    git commit -m "!COMMIT_MSG!"
    if !ERRORLEVEL! NEQ 0 (
        echo.
        echo [ERROR] Commit failed. Please check the error message above.
        pause
        exit /b 1
    )
) else (
    echo.
    echo [2/4] Working directory is clean. No new files to commit.
)

:: 5. Pull Latest Changes to Prevent Push Conflicts
echo.
echo [3/4] Fetching and merging remote changes...
:: Identify if there's a remote tracking branch before pulling
git ls-remote --exit-code --heads origin main >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    git pull origin main --rebase
    if !ERRORLEVEL! NEQ 0 (
        echo.
        echo ==========================================================
        echo [ERROR] Pull/Rebase failed due to merge conflicts!
        echo         1. Resolve conflicts in your code editor.
        echo         2. Run "git add ."
        echo         3. Run "git rebase --continue"
        echo         (Or cancel with "git rebase --abort")
        echo ==========================================================
        pause
        exit /b 1
    )
) else (
    echo [INFO] Remote branch 'main' does not exist yet. Proceeding to push.
)

:: 6. Push Changes to Remote
echo.
echo [4/4] Pushing code to GitHub...
git push -u origin main
if !ERRORLEVEL! NEQ 0 (
    echo.
    echo ==========================================================
    echo [ERROR] Push failed! Common reasons:
    echo         - Missing GitHub authentication or credentials.
    echo         - Lack of internet connection.
    echo         - Remote repository does not exist yet!
    echo ==========================================================
    pause
    exit /b 1
)

echo.
echo ==========================================================
echo [SUCCESS] Code successfully synchronized with GitHub!
echo ==========================================================
timeout /t 5 >nul
exit /b 0
