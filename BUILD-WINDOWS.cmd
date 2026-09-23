@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or newer is required ONLY on the build computer.
  echo See docs\DESKTOP.md for the GitHub Actions build without local installation.
  pause
  exit /b 1
)
set CSC_IDENTITY_AUTO_DISCOVERY=false
if exist package-lock.json (call npm ci --no-audit --no-fund) else (call npm install --no-audit --no-fund)
if errorlevel 1 goto fail
call npm test
if errorlevel 1 goto fail
call npm run check:offline
if errorlevel 1 goto fail
call npm run dist:win
if errorlevel 1 goto fail
echo Build completed. See the dist folder.
start "" "%cd%\dist"
pause
exit /b 0
:fail
echo Build failed. Copy the error text to the development team.
pause
exit /b 1
