@echo off
setlocal
set "PORT=8083"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT% .*LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)
echo Performance Matrix on port %PORT% has been stopped.
pause
