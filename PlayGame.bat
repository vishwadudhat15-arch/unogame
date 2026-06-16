@echo off
title Uno Game Launcher
cd /d "%~dp0"
if not exist node_modules (
    echo node_modules not found. Installing dependencies...
    call npm install
)
echo Building the game for direct double-click play...
call npm run build
echo.
echo Starting development server...
start cmd /k "npm run dev"
echo Waiting 4 seconds for server to start...
timeout /t 4 >nul
echo Opening browser...
start http://localhost:5178
exit
