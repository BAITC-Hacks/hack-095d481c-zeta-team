# ProcureFlow для Windows

Windows-приложение находится в main-windows объединённого репозитория. Общая инструкция выбора версии, публикации и работы с данными: [README в корне](../../README.md). [Методология расчёта](METHODOLOGY.md).

## Готовое приложение

Portable запускается без установки, Setup устанавливает приложение для текущего пользователя. Для готового EXE не нужны Node.js или интернет. Сохраняйте рабочий проект вручную через «Сохранить проект». После повторного открытия проекта требуется заново утвердить заказ.

## Разработка

Из папки main-windows, с Windows x64 и Node.js 24:

~~~powershell
npm.cmd ci
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm.cmd start
~~~

Для проверки и сборки:

~~~powershell
npm.cmd test
npm.cmd run check:offline
npm.cmd run test:desktop
npm.cmd run dist:win
~~~

Артефакты появляются в dist. Workflow расположен в корне репозитория: .github/workflows/build-windows.yml. На GitHub откройте Actions → Build Windows EXE → успешный запуск → Artifacts → ProcureFlow-Windows-x64.

## Проверка упакованного приложения

Из папки main-windows после сборки:

~~~powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:PF_SMOKE_OUTPUT = Join-Path $PWD 'dist/desktop-smoke.json'
$app = Join-Path $PWD 'dist/win-unpacked/ProcureFlow.exe'
$process = Start-Process -FilePath $app -ArgumentList '--smoke-test' -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Desktop smoke test failed' }
Get-Content $env:PF_SMOKE_OUTPUT
~~~

Свои архивы можно передать через PF_REAL_ARCHIVES как JSON-массив абсолютных путей. Не добавляйте их в GitHub:

~~~powershell
$env:PF_REAL_ARCHIVES = @('C:\Data\IEK.zip', 'C:\Data\Systeme electric.zip') | ConvertTo-Json -Compress
npm.cmd run test:desktop
Remove-Item Env:PF_REAL_ARCHIVES -ErrorAction SilentlyContinue
~~~
