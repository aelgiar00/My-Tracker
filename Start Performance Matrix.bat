@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Performance Matrix
set "PORT=8083"
set "URL=http://localhost:%PORT%"

echo ========================================
echo      Performance Matrix - STARTING
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is not installed or not in PATH.
  echo Install Node.js LTS, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
  echo Dependencies are missing. Installing them...
  call npm install
  if errorlevel 1 (
    echo.
    echo npm install failed.
    pause
    exit /b 1
  )
)

rem If the new app is already running on 8083, just open it.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$x=Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if($x){exit 0}else{exit 1}" >nul 2>&1
if not errorlevel 1 (
  echo Performance Matrix is already running on %URL%
  start "" "%URL%"
  exit /b 0
)

echo Starting the new version on port %PORT%...
start "Performance Matrix Server" cmd /k "cd /d ""%~dp0"" && npm run dev"

echo Waiting for the server...
for /l %%i in (1,1,30) do (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$x=Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue; if($x){exit 0}else{exit 1}" >nul 2>&1
  if not errorlevel 1 goto :OPEN
  timeout /t 1 /nobreak >nul
)

echo.
echo The server did not start within 30 seconds.
echo Check the server window for the error message.
pause
exit /b 1

:OPEN
echo Opening %URL% ...
start "" "%URL%"
exit /b 0
