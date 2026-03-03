@echo off
title Baby Movement Tracker
echo ==========================================
echo       Starting Baby Movement Tracker      
echo ==========================================
echo.

:: Check if node_modules directory exists. If not, it means dependencies aren't installed yet.
if not exist "node_modules\" (
    echo [INFO] First time setup detected. Installing dependencies...
    call npm install
    echo.
    echo [INFO] Dependencies installed successfully.
    echo.
)

:: Start the local development server and open the application in the default browser
echo [INFO] Starting local server and opening your browser...
call npm run dev -- --open

:: Keep the command window open if the server crashes or is stopped
pause
