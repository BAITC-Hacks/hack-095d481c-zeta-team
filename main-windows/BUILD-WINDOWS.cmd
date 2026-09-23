@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto node_missing
where npm >nul 2>&1
if errorlevel 1 goto node_missing
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||v[0]===22&&v[1]>=12?0:1)"
if errorlevel 1 goto node_missing
if not exist package-lock.json goto lock_missing
set CSC_IDENTITY_AUTO_DISCOVERY=false
set ELECTRON_RUN_AS_NODE=
echo Устанавливаем закреплённые зависимости. Требуется интернет.
call npm ci --no-audit --no-fund
if errorlevel 1 goto fail
call npm test
if errorlevel 1 goto fail
call npm run check:offline
if errorlevel 1 goto fail
call npm run dist:win
if errorlevel 1 goto fail
echo Сборка завершена. Portable и установщик находятся в папке dist.
start "" "%cd%\dist"
pause
exit /b 0

:node_missing
echo Для сборки нужны Node.js 22.12 или новее ^(рекомендуется 24^) и npm.
echo Альтернатива: сборка через GitHub Actions; см. ..\README.md.
goto stop
:lock_missing
echo Не найден package-lock.json. Распакуйте полный исходный репозиторий.
goto stop
:fail
echo Сборка не завершена. Смотрите сообщение об ошибке выше.
:stop
pause
exit /b 1
