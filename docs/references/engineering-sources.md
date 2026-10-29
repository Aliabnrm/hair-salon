# منابع مهندسی و محدوده اقتباس
تاریخ بررسی: **۲۰۲۶-۱۰-۲۹** به وقت مرجع جلسه Asia/Tehran. منابع واقعاً دریافت و خوانده شده‌اند؛ دسترسی این محیط تضمین دسترسی ایران یا نتیجه اجرای کد نیست. «رسمی» اعتبار ناشر است، نه اثبات برتری یا سازگاری نهایی پروژه.

## راهنمای رسمی Codex / OpenAI
| شناسه | منبع دریافت‌شده | برداشت به کار رفته |
|---|---|---|
| O-01 | [Best practices](https://learn.chatgpt.com/guides/best-practices) | Goal،Context،Constraints،Done when؛ دستور پایدار کوتاه در AGENTS.md؛ اجرای بررسی و review |
| O-02 | [Prompting](https://learn.chatgpt.com/docs/prompting)؛ نسخه Markdown دریافت شد | هدف قابل مشاهده،context مرتبط،مرز روشن و خروجی قابل استفاده؛ تکرار نکردن تمام اسناد در prompt |
| O-03 | [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)؛ نسخه Markdown دریافت شد | راهنمای مخزن،setup/checkها،مرزها و تعریف Done؛ ارجاع به اسناد تخصصی برای کم‌کردن context |

مسیرهای developers.openai.com/codex/prompting/،guides/agents-md/ و learn/best-practices/ به صفحات رسمی learn.chatgpt.com بالا redirect شدند. مسیر حدسی /docs/best-practices.md و /guides/best-practices.md پاسخ 404 داد؛ ادعاهای O-01 از HTML صفحه رسمی خوانده‌شده‌اند، نه آن مسیرهای ناموجود. هیچ model خاص یا تنظیم Codex کارفرما از متن منبع به پروژه تحمیل نشده است.

## مستندات رسمی NestJS
صفحات docs.nestjs.com در دریافت HTTP 200 فقط shell برنامه را برگرداندند؛ محتوای واقعی از مخزن رسمی مستندات در commit `09cbf3880982d36ff1c43a3fd98917a7a922066b` خوانده شد. مسیر configuration پس از دو مسیر 404، از tree رسمی در content/application/configuration.md پیدا و دریافت شد.

| شناسه | متن دقیق در مخزن رسمی | کاربرد/مرز |
|---|---|---|
| N-01 | [First steps](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/first-steps.md) | CLI/runtime prerequisites،ESM+Vitest در برابر CJS+Jest،وظایف فایل‌های اولیه و Observe اختیاری |
| N-02 | [Modules](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/modules.md) | ماژول قابلیت،encapsulation و exports محدود |
| N-03 | [Providers](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/components.md) | constructor injection،runtime token و مسئولیت provider |
| N-04 | [Configuration](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/application/configuration.md) | validate در startup؛ تابعی که throw می‌کند مانع bootstrap می‌شود |
| N-05 | [Exception filters](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/exception-filters.md) | خطای یکپارچه و جلوگیری از افشای unrecognized exception؛ shape اختصاصی ما تصمیم پروژه است |
| N-06 | [Testing](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/fundamentals/unit-testing.md) | @nestjs/testing،Vitest/Supertest و تست boot واقعی |
| N-07 | [OpenAPI](https://github.com/nestjs/docs.nestjs.com/blob/09cbf3880982d36ff1c43a3fd98917a7a922066b/content/openapi/introduction.md) | تولید specification از قرارداد واقعی؛ تنظیم مستندات توسعه |

## مخازن GitHub بررسی‌شده
| شناسه | مخزن و snapshot | آنچه واقعاً خوانده و اقتباس شد |
|---|---|---|
| G-01 | [Nest TypeScript Starter](https://github.com/nestjs/typescript-starter/tree/da4aab8ea68d69b1974391958cf0f7ffd104be22)؛ commit `da4aab8ea68d69b1974391958cf0f7ffd104be22`، تاریخ commit ۲۰۲۶-۱۰-۲۷ | package.json،tsconfig.json،src/main.ts،test/app.e2e-spec.ts و دو vitest config؛ NodeNext/strict،Vitest 4.1.2،Oxlint،Prettier و Supertest؛ Observe/deploy بیرونی اقتباس نمی‌شود |
| G-02 | [Bulletproof React](https://github.com/alan2207/bulletproof-react/tree/9506629ed003a561c6627735480cce4994244bb4)؛ commit `9506629ed003a561c6627735480cce4994244bb4`، تاریخ commit ۲۰۲۶-۰۵-۱۴ | [project structure](https://github.com/alan2207/bulletproof-react/blob/9506629ed003a561c6627735480cce4994244bb4/docs/project-structure.md)،[components](https://github.com/alan2207/bulletproof-react/blob/9506629ed003a561c6627735480cce4994244bb4/docs/components-and-styling.md)،[API layer](https://github.com/alan2207/bulletproof-react/blob/9506629ed003a561c6627735480cce4994244bb4/docs/api-layer.md)؛ feature-first،colocation،اجزای کوچک و client مشترک API |

این‌ها منابع معتبر/نمونه‌اند؛ رتبه‌بندی «بهترین مخازن GitHub در ۲۰۲۶» انجام نشده است. تعداد ستاره یا تازگی commit دلیل تناسب معماری نیست. ساختار چهارلایه برای featureهای پیچیده و انتخاب monolith تصمیم مهندسی همین پروژه‌اند، نه الزام رسمی Nest یا Codex. کد کامل یا dependencyهای یک boilerplate به پروژه کپی نمی‌شوند؛ در صورت اقتباس کد،license و attribution آن بررسی شوند.

## زبان،runtime و metadata پکیج
| شناسه | منبع | نتیجه خواندن |
|---|---|---|
| T-01 | [TypeScript strict](https://www.typescriptlang.org/tsconfig/strict.html) | strict خانواده‌ای از بررسی‌هاست؛ upgrade می‌تواند خطای نوع جدید بدهد؛ خاموش‌کردن سراسری راهکار نیست |
| T-02 | [Node releases](https://nodejs.org/en/about/previous-releases) | Node 24 و 26 در زمان بررسی LTS هستند؛ انتخاب 24 آخرین patch سازگار برای شروع،نه ادعای جدیدترین major |
| T-03 | [Nest core metadata](https://registry.npmjs.org/@nestjs%2Fcore/latest) | نسخه snapshot 12.3.2 و peerهای خانواده 12 |
| T-04 | [Nest CLI metadata](https://registry.npmjs.org/@nestjs%2Fcli/latest) | نسخه snapshot 12.0.11؛ engine ابزار و runtime جدا بررسی شوند |
| T-05 | [Config metadata](https://registry.npmjs.org/@nestjs%2Fconfig/latest) و [Swagger metadata](https://registry.npmjs.org/@nestjs%2Fswagger/latest) | snapshot 12.0.1 و 12.0.5؛ peer/engine با نسخه انتخابی مقایسه شوند |
| T-06 | [Vitest metadata](https://registry.npmjs.org/vitest/latest) | latest snapshot 5.0.5 است ولی starter بررسی‌شده 4.1.2 دارد؛ latest به‌تنهایی دلیل ارتقا نیست |

جدول بالا snapshot پژوهش اولیه است. نسخه‌های واقعی نصب‌شده، lockfile و نتیجه سازگاری اسپرینت ۱ در [ADR-003](../architecture/adr/ADR-003-sprint-01-tooling.md) و [گزارش اجرا](../planning/sprints/sprint-01-report.md) ثبت شده‌اند. اگر اجرای بعدی در تاریخ دیگر باشد، پشتیبانی/امنیت نسخه‌ها دوباره بررسی شود. شواهد خام در work/ فایل واسط‌اند؛ این سند مرجع curated منابع است و آن فایل‌ها جزو راهنمای اجرایی نیستند.

در اجرای همین اسپرینت، metadata نسخه‌های exact از registry رسمی، [index انتشار Node](https://nodejs.org/dist/index.json) و [SHASUMS256 نسخه 24.22.2](https://nodejs.org/dist/v24.22.2/SHASUMS256.txt) بررسی شد. هشدارهای نسخه مبنای Vitest با patch 4.1.12 رفع شدند: [advisory مسیر فایل](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) و [advisory ثبت mock](https://github.com/advisories/GHSA-qxg6-89mg-rqv8)، ارجاع‌داده‌شده در خروجی واقعی npm audit. رفتار handler مربوط به 404 نیز از کد نصب‌شده @nestjs/core و @nestjs/platform-express نسخه 12.3.2 خوانده و با تست HTTP اثبات شد؛ این نتیجه به نسخه مشخص محدود است.

## نگاشت به تصمیم و prompt
O-01..03→AGENTS.md و قالب prompt؛ N-01/G-01/T→ADR-003؛ N-02/03→ADR-002 و backend-standards؛ G-02→frontend-standards؛ N-04..07→قرارداد دقیق config/error/tests/OpenAPI اسپرینت ۱. انتخاب منبع تازه یا تغییر معماری مهم همراه دلیل،تاریخ و اثر در سند مربوط ثبت شود.
