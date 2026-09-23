@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 goto node_missing
where npm >nul 2>&1
if errorlevel 1 goto npm_missing
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||v[0]===22&&v[1]>=12?0:1)"
if errorlevel 1 goto node_old
if not exist package-lock.json goto lock_missing
if not exist node_modules\electron\dist\electron.exe (
  echo Первый запуск: скачиваем зависимости. Требуется интернет.
  call npm ci --no-audit --no-fund
  if errorlevel 1 goto fail
)
set ELECTRON_RUN_AS_NODE=
call npm start
if errorlevel 1 goto fail
exit /b 0

:node_missing
echo Node.js не найден. Установите Node.js 22.12 или новее ^(рекомендуется 24^).
echo Закройте это окно и повторите запуск после установки.
goto stop
:npm_missing
echo npm не найден. Установите Node.js вместе с npm.
goto stop
:node_old
echo Версия Node.js слишком старая. Нужен Node.js 22.12 или новее.
goto stop
:lock_missing
echo Не найден package-lock.json. Распакуйте полный исходный репозиторий.
goto stop
:fail
echo Не удалось запустить приложение. Смотрите сообщение об ошибке выше.
echo После обновления исходников выполните npm ci в этой папке.
:stop
pause
exit /b 1
