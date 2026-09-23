# ProcureFlow для Windows

Это самостоятельный репозиторий procureflow-windows. Он не требует соседней папки веб-версии. Интерфейс и расчётное ядро поставляются внутри Electron-приложения.

## Пользователю готового приложения

Получите Portable или Setup из артефакта GitHub Actions либо локальной сборки.

- ProcureFlow-Portable-1.0.0-x64.exe запускает приложение без установки.
- ProcureFlow-Setup-1.0.0-x64.exe устанавливает приложение для текущего пользователя.
- Node.js и интернет для работы готового приложения не нужны.
- Сохраняйте рабочий проект вручную через «Сохранить проект». Он хранится в выбранном файле .pfproject; автосохранения нет.
- После открытия проекта требуется повторное утверждение заказов.

EXE без настроенного сертификата сборки не подписаны. Не отключайте защиту Windows для запуска неизвестного файла; проверяйте происхождение сборки. GitHub Actions дополнительно создаёт SHA256SUMS.txt.

## Разработчику

Потребуются Windows x64 и Node.js 22.12+; workflow использует Node.js 24. Откройте PowerShell в корне репозитория:

~~~powershell
npm ci
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm start
~~~

START-WINDOWS.cmd выполняет проверки окружения и устанавливает зависимости только при их отсутствии. Если файл package-lock.json изменился, выполните npm ci заново.

Чтобы собрать обе версии EXE:

~~~powershell
npm ci
npm test
npm run check:offline
npm run dist:win
~~~

BUILD-WINDOWS.cmd делает те же шаги с проверкой ошибок. Интернет нужен для скачивания Electron и инструментов первой сборки. Папки node_modules и dist не добавляются в Git.

## GitHub Actions

Единственный workflow: .github/workflows/build-windows.yml. Он работает в Windows runner, использует npm ci и не требует секретов. Сборка запускается на main/master, в pull request и вручную.

В GitHub откройте Actions → Build Windows EXE → нужный успешный запуск → Artifacts → ProcureFlow-Windows-x64. В архиве находятся Portable, Setup, SHA256SUMS.txt и отчёт desktop-smoke.json. При неуспехе доступны диагностические файлы, если они успели появиться.

Срок хранения артефактов — 14 дней. При необходимости повторите Run workflow. GitHub Pages не включайте: этот репозиторий выпускает Windows-приложение.

## Проверка приложения

Из исходников:

~~~powershell
npm run test:desktop
~~~

Из сборки:

~~~powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
$env:PF_SMOKE_OUTPUT = Join-Path $PWD 'dist/desktop-smoke.json'
$app = Join-Path $PWD 'dist/win-unpacked/ProcureFlow.exe'
$process = Start-Process -FilePath $app -ArgumentList '--smoke-test' -WindowStyle Hidden -PassThru -Wait
if ($process.ExitCode -ne 0) { throw 'Desktop smoke test failed' }
Get-Content $env:PF_SMOKE_OUTPUT
~~~

Не меняйте пути вручную внутри desktop/smoke.cjs. Для своих тестовых архивов задайте переменную PF_REAL_ARCHIVES:

~~~powershell
$env:PF_REAL_ARCHIVES = @('C:\Data\IEK.zip', 'C:\Data\Systeme electric.zip') | ConvertTo-Json -Compress
npm run test:desktop
Remove-Item Env:PF_REAL_ARCHIVES -ErrorAction SilentlyContinue
~~~

## Совместимость и конфиденциальность

Формат .pfproject одинаков в выделенных версиях 1.0.0. Проект можно передать между Windows и Web через файл; автоматической синхронизации нет. После изменения схемы формата в одном репозитории проверьте совместимость второго.

При работе приложения сетевые запросы интерфейса запрещены. Проект и экспорт содержат коммерческие показатели и не зашифрованы приложением. Не добавляйте их в GitHub. Импорт должен поступать из согласованной обезличенной выгрузки.

Методология, ограничения прогноза, параметры поставщиков и обмен с 1С описаны в README.md. Универсальный XLSX/CSV требует сопоставления полей с вашей обработкой загрузки в 1С.
