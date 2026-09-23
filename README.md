# ProcureFlow

**Web + Windows Offline · MVP 1.0.0**

[Қазақша](#kk) · [Русский](#ru) · [English](#en)

---

<a name="kk"></a>
## Қазақша

### 1. Өнім қандай мәселені шешеді?

**ProcureFlow — Excel деректерінен негізделген сатып алу жоспарын жасайтын әмбебап жұмыс құралы. Есептеу пайдаланушының құрылғысында орындалады, соңғы шешімді менеджер қабылдайды.**

Өнім техникалық тапсырмадағы **«Қойма қорын толықтыру үшін жеткізушілерге тапсырыстарды автоматты есептеу»** міндетін шешеді. Сатып алу менеджері сатылым, қойма қалдығы және жеткізілім туралы бірнеше Excel есебін қолмен біріктіреді. Мұндай есеп сирек жаңартылады: бір тауар артық жиналады, екіншісі жетіспейді. Бір клиенттің бір реттік ірі сатып алуы тұрақты сұраныс ретінде қабылданып, келесі тапсырысты негізсіз ұлғайтуы мүмкін.

ProcureFlow XLSX, CSV және олардың ZIP архивтерін жергілікті өңдеп, деректерді тауар мен жеткізуші бойынша біріктіреді. Есептеуде сатылым тарихы, маусымдылық, тұрақты өсім, жоспарлы өсім, тауар санаты, қойма, тауар болмаған кезеңдердегі сұраныс, қолдағы қор және жолдағы жеткізілімдер ескеріледі. Нәтиже — **не сатып алу керек, кімнен, қанша, қаншалықты шұғыл және неліктен** деген сұрақтарға жауап беретін кесте.

Есептеу көкжиегі — жеткізу мерзімі мен тапсырысты қайта қарау кезеңінің қосындысы:

```text
Қажеттілік = max(0, болжамды сұраныс + сақтандыру қоры − қалдық − уақтылы жеткізілімдер)
Қажеттілік = 0 болса, тапсырыс = 0
Қажеттілік > 0 болса, тапсырыс = ceil(max(қажеттілік, MOQ) / еселік) × еселік
```

MOQ — тапсырыстың ең аз көлемі. Қалдық белгісіз немесе қайшы болса, жүйе оны нөл деп қабылдамайды: деректі нақтылауды сұрайды. Есептеу көкжиегінен кейін келетін және мерзімі өтіп кеткен жеткізілімдер тапсырыстан шегерілмейді.

Бір реттік ірі сатылымдарды табу үшін күн және клиент бойынша топталған көлемдердің медианасы мен медианадан абсолюттік ауытқулардың медианасы (MAD) қолданылады. Клиент көрсетілмесе, құжат нөмірі пайдаланылады. Кемінде сегіз топ болғанда шек — `max(8 × median, median + 8 × MAD, 10)`. Тазалау қосылғанда шектен асқан топтар тұрақты сұраныс есебінен алынып тасталады, бірақ менеджерге көрсетіледі. Толық емес егжей-тегжейлі деректер айлық шарықтауларды қосымша тексеруді өшірмейді.

**Тәсіліміздің ерекшелігі:** түсіндірілетін есептеу, коммерциялық деректерді міндетті түрде бұлтқа жібермеу, автономды Windows қолданбасы және Web пен Windows арасында `.pfproject` арқылы жұмысты жалғастыру мүмкіндігі. Әмбебаптық кез келген Excel-ді автоматты тану дегенді білдірмейді: IEK / Systeme Electric форматтарына бейімделген импорт және басқа компанияларға арналған бірыңғай шаблон бар.

**Құпиялылық шекарасы.** Сыртқы AI API немесе файлдарды қабылдайтын backend жоқ. Танылған клиент өрістері есептеуге дейін жергілікті HMAC-SHA256 идентификаторларымен алмастырылады; еркін мәтіндегі барлық жеке деректің жойылуына кепілдік берілмейді. `.pfproject` шифрланбайды және коммерциялық көрсеткіштерді қамтиды. Бастапқы кесте парақтары жобаға сақталмайды. Жоба файлдары мен коммерциялық Excel-ді ашық репозиторийге жүктемеңіз. Тапсырыс жеткізушіге автоматты жіберілмейді, ал жергілікті растау электрондық қолтаңба емес.

### 2. Қалай іске қосуға болады?

Архивті толық ашыңыз. Репозиторийде екі дербес қолданба бар:

```text
main-web/     — браузер нұсқасы
main win/     — Windows қолданбасы және EXE құрастыру құралдары
```

Бастапқы кодтан іске қосу үшін **Node.js 22.12 немесе одан жаңа нұсқа және npm** қажет. Төмендегі командалардың әр блогын репозиторийдің түбірінен бөлек бастаңыз. Түбірдің өзінде `package.json` жоқ.

**Web — ең жылдам іске қосу**

```sh
cd main-web
npm start
```

Браузерде `http://127.0.0.1:8000/` мекенжайын ашыңыз. Терминалды жаппаңыз; тоқтату — `Ctrl+C`. Бұл нұсқаны іске қосуға `npm install` қажет емес. Windows жүйесінде `main-web/START-WEB.cmd` файлын екі рет басуға болады. Порт бос болмаса: `npm start -- --port 8001`; браузердегі мекенжайдың портын да `8001` деп өзгертіңіз.

Интерфейсті Chrome немесе Edge арқылы localhost/HTTPS мекенжайында ашыңыз; `index.html` файлын екі рет басу негізгі іске қосу жолы емес. GitHub Pages не басқа статикалық хостингке 4-бөлімдегі құрастырудан кейінгі `main-web/_site/` **ішіндегісін** жариялаңыз. Сайтты алғаш желіден ашуға интернет керек; Service Worker арқылы кепілді офлайн-кэш жасалмаған.

**Windows — бастапқы кодтан іске қосу**

```sh
cd "main win"
npm ci
npm start
```

Балама жол — `main win/START-WINDOWS.cmd`. Алғашқы тәуелділіктерді жүктеу интернетті қажет етеді. Қолданба интерфейсі жарияланған сайттан емес, жергілікті файлдардан ашылады.

**Дайын EXE жасау:** `main win/BUILD-WINDOWS.cmd` файлын іске қосыңыз. Скрипт тәуелділіктерді орнатады, тесттерді орындайды және `npm run dist:win` арқылы мына файлдарды жасайды:

```text
main win/dist/ProcureFlow-Portable-1.0.0-x64.exe
main win/dist/ProcureFlow-Setup-1.0.0-x64.exe
```

Portable орнатусыз ашылады; Setup — орнатқыш. Дайын EXE үшін Node.js қажет емес. Бұл архивте дайын EXE және GitHub Actions workflow файлдары жоқ: нұсқаулық жергілікті іске қосу мен құрастыруға арналған.

### 3. Қандай технологиялар қолданылады?

| Қабат | Технология және қызметі |
|---|---|
| Интерфейс | HTML5, CSS3, фреймворксіз JavaScript және SVG графиктері. |
| Деректер және есептеу | Жергілікті `xlsx.js` модулі XLSX/CSV/ZIP оқиды және XLSX экспорттайды; `engine.js` пен `planner.js` деректерді таниды, біріктіреді және тапсырысты есептейді. |
| Фондық импорт және құпиялылық | Web Workers; клиент идентификаторларына арналған Web Crypto / HMAC-SHA256. |
| Web іске қосу және жариялау | Node.js стандартты кітапханасындағы HTTP сервері; жарияланатын файлдарды `_site/` ішіне жинау. Сервер Excel қабылдамайды және есептемейді. |
| Windows | `package.json` ішінде бекітілген Electron **44.4.5**; electron-builder **26.16.1**, Portable және NSIS орнатқышы. |
| Жоба және тесттер | JSON негізіндегі `.pfproject`; Node.js `assert`, есептеу, жоба, HTTP және desktop тексерулері. |

Екі нұсқада есептеу мен жоба форматының бірдей модульдері көшірме ретінде орналасқан; ортақ орнатылған пакетке тәуелділік жоқ. Алгоритм өзгерсе, түзетуді екі нұсқаға да енгізу керек. Генеративті модель сатып алу санын есептемейді; нәтиже деректер мен баптаулардан алынады.

Қауіпсіздік шаралары: CSP `connect-src 'none'`, жергілікті интерфейс ресурстары және Electron ішінде `contextIsolation`, `sandbox`, өшірілген `nodeIntegration`. Бұл шаралар тәуелсіз қауіпсіздік аудитін алмастырмайды.

Техникалық негіз: [Web package.json](main-web/package.json), [Windows package.json](main%20win/package.json), [есептеу әдістемесі](main-web/docs/METHODOLOGY.md), [Windows нұсқаулығы](main%20win/docs/DESKTOP.md). Қосымша техникалық құжаттар орыс тілінде.

### 4. Шешімді қалай тексеруге болады?

**Автоматты тексерулер**

Берілген ZIP ішінде құрастырушы күтетін `main-web/.nojekyll` қызметтік файлы жоқ. Төмендегі команда тесттер мен құрастыру алдында оны жасайды. Бұл — архивке қатысты нақты дайындық қадамы.

Web үшін, репозиторий түбірінен:

```sh
cd main-web
node -e "require('node:fs').writeFileSync('.nojekyll', '')"
npm test
npm run check:offline
npm run build
```

Windows үшін, репозиторий түбірінен бөлек терминалда:

```sh
cd "main win"
npm ci
npm test
npm run check:offline
npm run test:desktop
```

`npm test` әр нұсқада 60 тексеруді орындайды; ортақ сценарийлер қайталанады, бұлар 120 бөлек функция емес. Сценарийлерге маусымдылық, тұрақты өсім, stockout өтемі, бір клиенттің бірнеше құжатқа бөлінген ірі тапсырысы, қойма бойынша есеп, MOQ, дубльдер және жобаны қалпына келтіру кіреді. `check:offline` — ресурстар мен кодтың статикалық тексеруі; ол желісіз қолмен сынауды алмастырмайды. `test:desktop` Windows жүйесінде орнатылған тәуелділіктермен интерфейсті қосымша іске қосады.

**Қазыларға немесе менеджерге арналған тексеру сценарийі**

MVP интерфейсі орыс тілінде. Батырма атаулары төменде интерфейстегідей берілген.

| Қадам | Әрекет және күтілетін нәтиже |
|---|---|
| 1. Демо | Қолданбаны ашыңыз. «ДЕМО» белгісі және ұсыныстар көрінуі керек; көрсеткіштер компанияның нақты деректері ретінде берілмейді. |
| 2. Импорт | «Загрузка данных» → «Скачать шаблон». Үлгіні сақтап, жүктеңіз немесе келісілген XLSX/CSV/ZIP пайдаланыңыз. Дереккөздердің түрлерін, ескертулерді, есеп күнін, жеткізуші мен қойманы тексеріңіз. Коммерциялық файлдар архивке кірмейді. |
| 3. Есептің түсіндірмесі | «Рекомендации» → «Почему?». Оң қажеттілігі бар тауарда қалдықты, жолдағы уақтылы жеткізілімді, жеткізу мерзімін, санат коэффициентін және жоспарлы өсімді кезекпен өзгертіңіз. Болжамды, қажеттілікті және формуланы салыстырыңыз. Еселіктен кейінгі тапсырыс саны бірден өзгермеуі мүмкін. |
| 4. Дерек сапасы | Шаблонда қалдықты бос қалдырыңыз: жүйе нөлдік қорды ойдан қоспай, нақтылауды сұрауы керек. Кейін нақты `0` енгізіп, нәтижені салыстырыңыз. |
| 5. Бекіту және экспорт | «Поставщики» бөлімінде позицияларды тексеріңіз, жауапты адамды көрсетіп, «Подтвердить и выгрузить» басыңыз. «Экспорт для 1С» арқылы XLSX/CSV жасаңыз: тек бекітілген оң көлемдер шығуы керек. Файлды қайта ашып, кодтар мен санды салыстырыңыз. Автоматты жіберілім болмауы тиіс. |
| 6. Жұмысты жалғастыру | «Сохранить проект» арқылы `.pfproject` сақтап, қолданбаны қайта ашыңыз және «Открыть» басыңыз. Деректер, баптаулар және қолмен өзгертілген көлемдер сақталады; тапсырысты қайта бекіту керек. Үйлесімді Web/Windows нұсқаларында да тексеріңіз. |
| 7. Офлайн режим | Құрастырылған Portable EXE-ні жабыңыз, интернетті өшіріп, қайта ашыңыз. Импорт, есептеу, жобаны сақтау және экспорт серверге қосылмай жұмыс істеуі керек. |

**Тексеру шекарасы:** нақты stockout кезеңдері мен клиент бойынша ірі сатылымдарды тексеру үшін тиісті кіріс өрістері қажет; автоматты тесттер синтетикалық сценарийлерді қолданады. Болжамның дәлдігі мен экономикалық әсерді компания тарихында бөлек өлшеу керек. 1С экспорты — әмбебап кестелік алмасу, нақты базаға дайын тікелей интеграция емес; бағандарды сәйкестендіріп, сынақ базасында тексеріңіз. Windows орнатқышын орнату/жою және ұйымның қауіпсіздік талаптарына сәйкестік бөлек тексеріледі.

Алдыңғы тексерулердің шекарасы мен нәтижелері: [Web есебі](main-web/docs/VERIFICATION.md), [Windows есебі](main%20win/docs/VERIFICATION.md). Бұл есептер жаңа ортадағы тексеруді алмастырмайды.

[Қазақша](#kk) · [Русский](#ru) · [English](#en)

---

<a name="ru"></a>
## Русский

### 1. Что решает продукт

**ProcureFlow — универсальное рабочее место закупщика: от Excel к обоснованному заказу поставщику. Расчёт выполняется на устройстве пользователя, окончательное решение остаётся за менеджером.**

Продукт решает задачу из ТЗ **«Автоматический расчёт заказов поставщикам для пополнения склада»**. Менеджер вручную объединяет несколько Excel с продажами, остатками и поставками. Такой расчёт обновляется нечасто: одни товары накапливаются, других не хватает. Разовая крупная покупка одного клиента может ошибочно выглядеть как регулярный спрос и завысить следующую закупку.

ProcureFlow локально обрабатывает XLSX, CSV и ZIP-архивы с ними, объединяет данные по товарам и поставщикам. Расчёт учитывает историю продаж, сезонность, устойчивый и плановый рост, категорию, склад, упущенный спрос при отсутствии товара, доступный остаток и ожидаемые поставки. Результат — таблица, которая отвечает: **что заказать, у кого, сколько, насколько срочно и почему**.

Горизонт расчёта — срок поставки плюс цикл пересмотра заказа:

```text
Потребность = max(0, прогноз спроса + страховой запас − остаток − своевременные поставки)
Если потребность = 0, заказ = 0
Если потребность > 0, заказ = ceil(max(потребность, MOQ) / кратность) × кратность
```

MOQ — минимальная партия заказа. Неизвестный или противоречивый остаток не подменяется нулём: система требует уточнения. Поставки после горизонта и просроченные поставки не вычитаются из потребности.

Разовые крупные продажи выявляются по медиане и медианному абсолютному отклонению (MAD) объёмов, сгруппированных по дате и клиенту. Без клиента используется номер документа. При наличии хотя бы восьми групп порог — `max(8 × median, median + 8 × MAD, 10)`. При включённой очистке группы выше порога исключаются из регулярной потребности, но остаются видны менеджеру. Неполная детализация не отключает дополнительную проверку месячных пиков.

**Отличие нашего подхода:** объяснимый расчёт без обязательной передачи коммерческих данных в облако, автономная Windows-версия и перенос работы между Web и Windows через `.pfproject`. Универсальность не означает распознавание любого Excel: предусмотрены адаптеры форматов IEK / Systeme Electric и единый шаблон для других компаний.

**Границы приватности.** Внешний AI API и backend для загрузки файлов не используются. Распознанные клиентские поля до расчёта заменяются локальными HMAC-SHA256 идентификаторами; это не гарантирует удаления персональных сведений из любого свободного текста. `.pfproject` не шифруется и содержит коммерческие показатели. Исходные листы в проект не сохраняются. Не публикуйте проекты и коммерческие Excel в открытом репозитории. Заказы не отправляются поставщикам автоматически, а локальное подтверждение не является электронной подписью.

### 2. Как запустить

Полностью распакуйте архив. В репозитории две самостоятельные версии:

```text
main-web/     — браузерная версия
main win/     — Windows-приложение и инструменты сборки EXE
```

Для запуска исходников нужны **Node.js 22.12 или новее и npm**. Каждый блок команд ниже начинайте отдельно из корня репозитория. В самом корне `package.json` нет.

**Web — самый быстрый запуск**

```sh
cd main-web
npm start
```

Откройте `http://127.0.0.1:8000/` в браузере. Терминал оставьте открытым; остановка — `Ctrl+C`. Для запуска этой версии `npm install` не нужен. На Windows можно дважды нажать `main-web/START-WEB.cmd`. Занят порт: `npm start -- --port 8001`; в адресе браузера также замените порт на `8001`.

Используйте Chrome или Edge через localhost/HTTPS; двойной клик по `index.html` не является основным способом запуска. Для GitHub Pages или другого статического хостинга публикуйте **содержимое** `main-web/_site/` после сборки из раздела 4. Первое открытие опубликованного сайта требует интернета; гарантированный офлайн-кэш через Service Worker не реализован.

**Windows — запуск из исходников**

```sh
cd "main win"
npm ci
npm start
```

Альтернатива — `main win/START-WINDOWS.cmd`. Первое скачивание зависимостей требует интернета. Приложение открывает локальные файлы интерфейса, а не опубликованный сайт.

**Чтобы получить готовый EXE**, запустите `main win/BUILD-WINDOWS.cmd`. Скрипт установит зависимости, выполнит тесты и через `npm run dist:win` создаст:

```text
main win/dist/ProcureFlow-Portable-1.0.0-x64.exe
main win/dist/ProcureFlow-Setup-1.0.0-x64.exe
```

Portable запускается без установки; Setup — установщик. Готовому EXE Node.js не нужен. В этом архиве нет готовых EXE и workflow GitHub Actions: инструкция рассчитана на локальный запуск и сборку.

### 3. Какие технологии используются

| Слой | Технология и назначение |
|---|---|
| Интерфейс | HTML5, CSS3, JavaScript без фреймворка и графики SVG. |
| Данные и расчёт | Собственный локальный `xlsx.js` читает XLSX/CSV/ZIP и экспортирует XLSX; `engine.js` и `planner.js` распознают, объединяют данные и рассчитывают заказ. |
| Фоновый импорт и приватность | Web Workers; Web Crypto / HMAC-SHA256 для клиентских идентификаторов. |
| Запуск Web и публикация | HTTP-сервер на стандартной библиотеке Node.js; сборка публичных файлов в `_site/`. Сервер не принимает Excel и не выполняет расчёт. |
| Windows | Electron **44.4.5**, закреплённый в `package.json`; electron-builder **26.16.1**, Portable и установщик NSIS. |
| Проект и тесты | `.pfproject` на основе JSON; Node.js `assert`, расчётные, проектные, HTTP- и desktop-проверки. |

В обеих версиях находятся копии одинаковых модулей расчёта и формата проекта; зависимости от общего установленного пакета нет. При изменении алгоритма исправления нужно переносить в обе версии. Количество закупки рассчитывает не генеративная модель: результат определяется данными и настройками.

Меры защиты: CSP `connect-src 'none'`, локальные ресурсы интерфейса, `contextIsolation` и `sandbox` в Electron при отключённом `nodeIntegration`. Эти меры не заменяют независимый аудит безопасности.

Техническая основа: [Web package.json](main-web/package.json), [Windows package.json](main%20win/package.json), [методология расчёта](main-web/docs/METHODOLOGY.md), [инструкция Windows](main%20win/docs/DESKTOP.md). Дополнительные технические документы — на русском языке.

### 4. Какие шаги нужны для проверки решения

**Автоматические проверки**

В переданном ZIP отсутствует служебный файл `main-web/.nojekyll`, который ожидает сборщик. Команда ниже создаёт его перед тестами и сборкой. Это обязательный подготовительный шаг именно для данного архива.

Для Web, из корня репозитория:

```sh
cd main-web
node -e "require('node:fs').writeFileSync('.nojekyll', '')"
npm test
npm run check:offline
npm run build
```

Для Windows, из корня репозитория в отдельном терминале:

```sh
cd "main win"
npm ci
npm test
npm run check:offline
npm run test:desktop
```

`npm test` выполняет по 60 проверок в каждой версии; общие сценарии повторяются, это не 120 разных функций. Проверяются сезонность, устойчивый рост, компенсация stockout, крупный заказ одного клиента, разбитый на документы, расчёт по складу, MOQ, дубли и восстановление проекта. `check:offline` — статическая проверка ресурсов и кода, а не замена ручному испытанию без сети. `test:desktop` дополнительно запускает интерфейс на Windows с установленными зависимостями.

**Сценарий проверки для жюри или менеджера**

Интерфейс MVP — на русском языке. Ниже указаны реальные названия кнопок.

| Шаг | Действие и ожидаемый результат |
|---|---|
| 1. Демо | Откройте приложение. Должны появиться пометка «ДЕМО» и рекомендации; показатели не выдаются за реальные данные компании. |
| 2. Импорт | «Загрузка данных» → «Скачать шаблон». Сохраните и загрузите пример либо используйте согласованные XLSX/CSV/ZIP. Проверьте типы источников, предупреждения, дату среза, поставщика и склад. Коммерческие файлы не входят в архив. |
| 3. Объяснение расчёта | «Рекомендации» → «Почему?». У товара с положительной потребностью по очереди измените остаток, своевременную поставку в пути, срок поставки, коэффициент категории и плановый рост. Сравните прогноз, потребность и формулу. Итоговое количество может не измениться сразу из-за кратности. |
| 4. Качество данных | Оставьте остаток пустым в шаблоне: система должна запросить уточнение, а не придумать нулевой запас. Затем введите подтверждённый `0` и сравните результат. |
| 5. Подтверждение и экспорт | В разделе «Поставщики» проверьте позиции, укажите ответственного и нажмите «Подтвердить и выгрузить». Через «Экспорт для 1С» сформируйте XLSX/CSV: в него должны попасть только утверждённые положительные количества. Откройте файл и сверьте коды и количества. Автоматической отправки быть не должно. |
| 6. Продолжение работы | Нажмите «Сохранить проект», сохраните `.pfproject`, перезапустите приложение и нажмите «Открыть». Данные, параметры и ручные количества сохраняются; заказ требуется утвердить заново. Проверьте также перенос между совместимыми Web/Windows-версиями. |
| 7. Офлайн | Закройте собранный Portable EXE, отключите интернет и откройте приложение снова. Импорт, расчёт, сохранение проекта и экспорт должны работать без подключения к серверу. |

**Границы проверки:** для проверки точных stockout и крупных продаж по клиенту нужны соответствующие входные поля; автоматические тесты используют синтетические сценарии. Точность прогноза и экономический эффект необходимо отдельно измерить на истории компании. Экспорт для 1С — универсальный табличный обмен, а не готовая прямая интеграция с любой базой: сопоставьте колонки и проверьте загрузку в тестовой базе. Установку/удаление Windows-установщика и соответствие требованиям безопасности организации проверяют отдельно.

Результаты и границы предыдущих проверок: [отчёт Web](main-web/docs/VERIFICATION.md), [отчёт Windows](main%20win/docs/VERIFICATION.md). Эти отчёты не заменяют проверку в новой среде.

[Қазақша](#kk) · [Русский](#ru) · [English](#en)

---

<a name="en"></a>
## English

### 1. What problem does the product solve?

**ProcureFlow is a procurement workspace that turns Excel data into explainable supplier orders. Calculations run on the user's device; the manager makes the final decision.**

The product addresses the case requirement **“Automatic calculation of supplier orders for warehouse replenishment.”** Procurement managers manually consolidate spreadsheets covering sales, stock and incoming deliveries. Because this is time-consuming, calculations are refreshed infrequently: some items become overstocked while others run out. A single large purchase by one customer can look like recurring demand and inflate the next order.

ProcureFlow processes XLSX, CSV and ZIP archives containing them locally, matching data by product and supplier. Calculations account for sales history, seasonality, persistent and planned growth, category, warehouse, demand lost during stockouts, available stock and incoming deliveries. The output answers **what to buy, from whom, how much, how urgently and why**.

The planning horizon is the supplier lead time plus the order review cycle:

```text
Net need = max(0, forecast demand + safety stock − available stock − eligible incoming stock)
If net need = 0, order = 0
If net need > 0, order = ceil(max(net need, MOQ) / order multiple) × order multiple
```

MOQ is the minimum order quantity. Unknown or conflicting stock is not treated as zero: the application requests clarification. Deliveries arriving beyond the horizon and overdue deliveries are not deducted from demand.

One-off large sales are detected using the median and median absolute deviation (MAD) of volumes grouped by date and customer. Without a customer identifier, the document number is used. With at least eight groups, the threshold is `max(8 × median, median + 8 × MAD, 10)`. When outlier cleaning is enabled, groups above this threshold are excluded from recurring demand but remain visible to the manager. Incomplete transaction detail does not disable the additional monthly-spike check.

**What distinguishes our approach:** explainable calculations without mandatory cloud transfer of commercial data, an offline Windows application, and a `.pfproject` file for continuing work between Web and Windows. “Universal” does not mean automatic understanding of every spreadsheet: the application includes IEK / Systeme Electric format adapters and a standard template for other companies.

**Privacy boundaries.** There is no external AI API or backend receiving uploaded files. Recognized customer fields are replaced with local HMAC-SHA256 identifiers before calculation; this does not guarantee removal of personal information from arbitrary free text. `.pfproject` is not encrypted and contains commercial metrics. Original worksheet data is not saved in the project. Do not publish projects or commercial spreadsheets in a public repository. Orders are never sent to suppliers automatically, and local approval is not an electronic signature.

### 2. How to run it

Extract the entire archive. The repository contains two independent applications:

```text
main-web/     — browser application
main win/     — Windows application and EXE build tools
```

Running from source requires **Node.js 22.12 or later and npm**. Start each command block below separately from the repository root. There is no `package.json` at the root itself.

**Web — quickest start**

```sh
cd main-web
npm start
```

Open `http://127.0.0.1:8000/` in a browser. Keep the terminal running; stop with `Ctrl+C`. This version does not require `npm install` to start. On Windows, double-clicking `main-web/START-WEB.cmd` is an alternative. If the port is busy, use `npm start -- --port 8001` and change the browser URL to port `8001`.

Use Chrome or Edge through localhost/HTTPS; double-clicking `index.html` is not the primary startup method. For GitHub Pages or another static host, publish the **contents** of `main-web/_site/` after the build in section 4. Opening the hosted site for the first time requires internet access; guaranteed offline caching through a Service Worker is not implemented.

**Windows — run from source**

```sh
cd "main win"
npm ci
npm start
```

Alternatively, run `main win/START-WINDOWS.cmd`. The initial dependency download requires internet access. The application loads local interface files, not the hosted website.

**To create an EXE**, run `main win/BUILD-WINDOWS.cmd`. The script installs dependencies, runs tests and invokes `npm run dist:win` to produce:

```text
main win/dist/ProcureFlow-Portable-1.0.0-x64.exe
main win/dist/ProcureFlow-Setup-1.0.0-x64.exe
```

Portable runs without installation; Setup is an installer. A built EXE does not require Node.js. This archive does not include built EXEs or GitHub Actions workflows: these instructions use local execution and builds.

### 3. Technologies used

| Layer | Technology and purpose |
|---|---|
| Interface | HTML5, CSS3, framework-free JavaScript and SVG charts. |
| Data and calculation | The local custom `xlsx.js` module reads XLSX/CSV/ZIP and exports XLSX; `engine.js` and `planner.js` recognize, consolidate and calculate procurement data. |
| Background import and privacy | Web Workers; Web Crypto / HMAC-SHA256 for customer identifiers. |
| Web execution and publishing | An HTTP server using the Node.js standard library; public-file packaging into `_site/`. The server neither receives spreadsheets nor performs calculations. |
| Windows | Electron **44.4.5**, pinned in `package.json`; electron-builder **26.16.1**, Portable and the NSIS installer. |
| Projects and testing | JSON-based `.pfproject`; Node.js `assert`, calculation, project, HTTP and desktop checks. |

Both versions contain copies of the same calculation and project-format modules; neither depends on a shared installed package. Algorithm changes must be applied to both versions. A generative model does not determine purchase quantities: results follow from input data and settings.

Implemented protections include CSP `connect-src 'none'`, local interface assets, and Electron `contextIsolation` and `sandbox` with `nodeIntegration` disabled. These measures do not replace an independent security audit.

Technical references: [Web package.json](main-web/package.json), [Windows package.json](main%20win/package.json), [calculation methodology](main-web/docs/METHODOLOGY.md), [Windows guide](main%20win/docs/DESKTOP.md). Supplementary technical documents are in Russian.

### 4. Steps to verify the solution

**Automated checks**

The supplied ZIP is missing the `main-web/.nojekyll` marker expected by the build script. The command below creates it before testing and building. This preparation step is necessary for this particular archive.

For Web, starting at the repository root:

```sh
cd main-web
node -e "require('node:fs').writeFileSync('.nojekyll', '')"
npm test
npm run check:offline
npm run build
```

For Windows, starting at the repository root in a separate terminal:

```sh
cd "main win"
npm ci
npm test
npm run check:offline
npm run test:desktop
```

`npm test` runs 60 checks per version; shared scenarios are repeated, so this does not represent 120 distinct features. Coverage includes seasonality, persistent growth, stockout compensation, one customer's large order split across documents, warehouse scope, MOQ, duplicates and project restoration. `check:offline` is a static check of assets and code, not a substitute for a manual disconnected test. `test:desktop` additionally launches the interface on Windows with dependencies installed.

**Review scenario for judges or procurement managers**

The MVP interface is in Russian. The actual button labels are retained below, with explanations in English.

| Step | Action and expected outcome |
|---|---|
| 1. Demo | Open the application. The «ДЕМО» label and recommendations should appear; synthetic figures must not be presented as company results. |
| 2. Import | Open «Загрузка данных» → «Скачать шаблон» (Data upload → Download template). Save and upload the example, or use approved XLSX/CSV/ZIP files. Check source types, warnings, calculation date, supplier and warehouse. Commercial input files are not included in the archive. |
| 3. Explain the calculation | Open «Рекомендации» → «Почему?» (Recommendations → Why?). For an item with positive net need, change stock, an on-time incoming delivery, lead time, category multiplier and planned growth one at a time. Compare the forecast, net need and formula. The final quantity may remain unchanged because of order multiples. |
| 4. Data quality | Leave stock blank in the template: the application should request clarification rather than invent zero stock. Then enter a confirmed `0` and compare the result. |
| 5. Approval and export | Under «Поставщики» (Suppliers), review items, identify the responsible person and click «Подтвердить и выгрузить» (Confirm and export). Use «Экспорт для 1С» (Export for 1C) to produce XLSX/CSV containing only approved positive quantities. Reopen the file and compare product codes and quantities. No automatic transmission should occur. |
| 6. Resume work | Use «Сохранить проект» (Save project) to save `.pfproject`, restart the application and select «Открыть» (Open). Data, settings and manual quantities should be restored; the order must be approved again. Also check transfer between compatible Web/Windows versions. |
| 7. Offline | Close the built Portable EXE, disconnect from the internet and reopen it. Import, calculations, project saving and export should work without a server connection. |

**Verification boundaries:** exact stockout and customer-level bulk-sale checks require the relevant input fields; automated tests use synthetic scenarios. Forecast accuracy and financial impact require separate measurement on company history. The 1C export is a generic tabular exchange, not a ready-made direct integration with every installation: map columns and validate imports in a test database. Windows installer installation/uninstallation and organizational security compliance require separate checks.

Previous verification results and their limits: [Web report](main-web/docs/VERIFICATION.md), [Windows report](main%20win/docs/VERIFICATION.md). These reports do not replace testing in a new environment.

[Қазақша](#kk) · [Русский](#ru) · [English](#en)
