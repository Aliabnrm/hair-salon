# ADR-003 — ابزار و قرارداد اجرای اسپرینت ۱

> تصمیم تاریخی npm در این ADR با [ADR-006](ADR-006-pnpm-workspace.md) و دستور کارفرما در ۲۰۲۶-۱۰-۳۱ جایگزین شد؛ نسخه‌ها و نتایج اجرای اولیه پایین بدون بازنویسی نگه داشته شده‌اند.
تاریخ: ۲۰۲۶-۱۰-۲۹. وضعیت: **اجرا و بررسی‌شده در اسپرینت ۱**. نسخه‌های مستقیم exact و وابستگی‌های گذرا در lockfile ریشه قفل شده‌اند. `npm ci` و `npm run check` موفق بودند؛ [گزارش اجرا](../../planning/sprints/sprint-01-report.md) مرجع شواهد است. این بررسی برای API پایه و محیط فعلی است و تضمین سازگاری تمام قابلیت‌های آینده نیست.

## نسخه‌های واقعی اجرا

| جزء | نسخه انتخاب‌شده |
|---|---|
| Node.js / npm | 24.22.2 LTS / 11.19.1 |
| @nestjs/common،core،platform-express،testing | 12.3.2 |
| @nestjs/cli | 12.0.11، فقط محلی برای build/watch |
| @nestjs/config / swagger | 12.0.1 / 12.0.5 |
| TypeScript | 6.0.2 |
| Vitest | 4.1.12 |
| Supertest / @types/supertest | 7.3.1 / 7.2.1 |
| Oxlint / Prettier | 1.90.0 / 3.9.10 |
| @types/node / @types/express | 24.19.2 / 5.0.6 |
| reflect-metadata / rxjs | 0.2.2 / 7.8.2 |

Node قبلی دستگاه 24.5.0 بود؛ نسخه global تغییر نکرد. آرشیو رسمی macOS ARM مربوط به 24.22.2 دریافت، SHA256 آن با SHASUMS256 رسمی مقایسه و در مسیر ignored محلی `work/runtime/` استخراج شد. این runtime پیش‌نیاز عمومی مخزن نیست؛ روی دستگاه دیگر نسخه `.nvmrc` با مدیر نسخه فعال شود. npm همراه runtime منتخب استفاده شد.

peerDependencies و engines پیش از نصب کنترل شدند؛ نصب بدون `--force` و `--legacy-peer-deps` انجام شد. نسخه مبنای Vitest، یعنی 4.1.2، در نصب اولیه دو هشدار moderate در Vitest/mocker داشت. patch سازگار 4.1.12 طبق advisoryهای [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9) و [GHSA-qxg6-89mg-rqv8](https://github.com/advisories/GHSA-qxg6-89mg-rqv8) انتخاب شد؛ major 5 وارد نشد. بررسی پس از اصلاح، صفر هشدار شناخته‌شده گزارش کرد؛ این نتیجه مقطعی است و جای ارزیابی امنیت محصول را نمی‌گیرد.

Vitest این نسخه با تنظیمات فعلی، decorator/metadata لازم را حفظ کرد و boot واقعی constructor DI در تست HTTP موفق بود؛ transformer یا runner دوم لازم نشد. برای startup test از build واقعی استفاده می‌شود؛ `pretest:e2e` آن را آماده می‌کند تا اجرای مستقل این دستور به خروجی قدیمی وابسته نباشد.

CLI generator اجرا نشد؛ ساختار کوچک با فایل‌های صریح ساخته شد. اتصال Observe یا سرویس تحلیل انجام نشد. Swagger یک وابستگی گذرای `@scarf/scarf` دارد؛ اسکریپت نصب آن در `allowScripts` ریشه غیرفعال و `scarfSettings.enabled=false` ثبت شد. اسکریپت اختیاری fsevents در npm ci اجرا نشد؛ watch توسعه با مسیر معمول Node در اجرای زنده بررسی شد.

## اصلاح سازگاری رفتار HTTP

در Nest 12.3.2، handler پیش‌فرض 404 با global prefix محدود می‌شود. تست واقعی نشان داد مسیر ریشه و آدرس docs غیرفعال، پاسخ Express را می‌گیرند. `app.setup.ts` پس از ثبت routeهای Nest با `app.init()`، یک fallback پایانی برای مسیرهای باقی‌مانده ثبت می‌کند. این fallback همان `createApiError` را مصرف می‌کند؛ prefix، middleware و filter همچنان یک‌بار تعریف می‌شوند. سرور در این پروژه متعلق به همین API است؛ در صورت میزبانی چند app روی Express مشترک، این تصمیم باید بازبینی شود. runtime و تست هر دو setup غیرهم‌زمان را await می‌کنند.

## انتخاب
| جزء | مبنا برای اجرا | دلیل/مرز |
|---|---|---|
| Node.js | آخرین patch سازگار 24.x LTS، حداقل 24.15 طبق مستند CLI بررسی‌شده | نسخه LTS با سابقه بیشتر نسبت به 26 که تازه LTS شده؛ exact version در .nvmrc و engines سازگار ثبت شود |
| NestJS | خانواده پایدار 12.x با patch هم‌نسخه core/common/platform-express/testing | منابع فعلی و registry بررسی شدند؛ peerها قبل نصب کنترل شوند؛ pre-release انتخاب نشود |
| زبان/module | TypeScript 6.x سازگار با Nest/ابزار، ESM و NodeNext، strict | مطابق starter رسمی فعلی؛ importهای runtime با پسوند .js مطابق build واقعی |
| package manager | npm همراه Node انتخاب‌شده، workspaces و یک lockfile ریشه | زیرساخت کم برای یک API و فرانت آینده؛ npm version دقیق در packageManager ثبت شود |
| HTTP adapter | Express مطابق starter | تغییر به Fastify بدون نیاز/benchmark این اسپرینت توجیه ندارد |
| آزمون | Vitest از major سازگار starter، Supertest و @nestjs/testing | پیشنهاد قدیمی Jest جایگزین شد؛ Vitest 4.x در starter بررسی‌شده، وجود 5.x در registry دلیل ارتقای خودکار نیست |
| lint/format | Oxlint مطابق starter و Prettier | یک linter برای API؛ typecheck با TypeScript جداست؛ ESLint دوم بدون نیاز اضافه نشود |
| config | @nestjs/config با validate تابع کوچک typed برای PORT/NODE_ENV | وابستگی validation اضافی برای دو متغیر لازم نیست؛ خواندن env متمرکز و شکست قبل listen |
| OpenAPI | @nestjs/swagger سازگار | مستند endpointهای واقعی، مسیر docs فقط dev/test |

مبنای پژوهش اولیه: @nestjs/core=12.3.2، @nestjs/cli=12.0.11، @nestjs/config=12.0.1، @nestjs/swagger=12.0.5 و TypeScript 6.0.2؛ Vitest 4.1.2 در starter بود و مطابق توضیح بالا به patch اصلاح‌شده ارتقا یافت. جدول ابتدای سند و lockfile، مرجع نسخه اجرا هستند. CLI prerequisites و peerDependencies پکیج دو بررسی جدا هستند.

از scaffold فقط ساختار ضروری اقتباس شود؛ deploy command، Observe SDK،telemetry،اتصال حساب،مخزن remote و secrets نمونه در دامنه نیستند. اگر CLI استفاده شد، رفتار گزینه‌ها از help همان نسخه بررسی و Observe خاموش شود؛ generator نباید مستندات موجود را overwrite کند یا lockfile دوم بسازد. نصب global CLI نیاز نیست.

Nest Module و constructor injection باید در تست واقعی boot شوند. اگر Vitest transformer متادیتای لازم DI را تولید نکرد، تنظیم compiler/transformer سازگار را اصلاح و ثبت کنید؛ با ساخت دستی provider در Controller یا حذف strict/metadata خطا پنهان نشود. اقتباس starter اثبات سازگاری نهایی پروژه نیست.

تست‌ها و runtime یک app.setup مشترک دارند تا prefix،middleware و filter در تست گم نشوند. unit/test از state محیط محلی مستقل‌اند و server یا handle باز باقی نگذارند. tsconfig برای build و test متناسب scope تنظیم و هر دو typecheck شوند. قواعد دقیق در پرامپت اسپرینت ۱ است.

گزینه جایگزین: CommonJS+Jest طبق مستند رسمی هنوز گزینه معتبر است؛ برای همسویی با پیش‌فرض فعلی ESM انتخاب نشد. تغییر اگر مشکل سازگاری واقعی اثبات شد با دلیل و همین ADR انجام شود، نه نصب هم‌زمان دو runner.
