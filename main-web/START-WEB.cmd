@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Install Node.js 24 LTS, then restart this file.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)
echo Open the URL printed below in Chrome or Edge.
node scripts\serve.cjs
if errorlevel 1 pause
