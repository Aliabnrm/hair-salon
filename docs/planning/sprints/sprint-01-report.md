# گزارش اجرای اسپرینت ۱ — NestJS Foundation


یادداشت مسیر: API در اسپرینت ۳ به backend منتقل شد؛ فرمان‌ها و نتیجه‌های این گزارش مربوط به زمان همان اجرا هستند.

تاریخ: ۲۰۲۶-۱۰-۲۹، Asia/Tehran. وضعیت: **تکمیل‌شده** در محدوده [طرح مصوب](sprint-01-plan.md) و [پرامپت اجرایی](../../prompts/sprint-01.md). تمام بررسی‌های این گزارش واقعاً در همین پروژه اجرا شدند. اسپرینت بعد شروع نشده است.

## نتیجه و چرایی تغییر

یک API کوچک NestJS با TypeScript strict/ESM و ساختار feature-first در `apps/api` ایجاد شد. ماژول Health شامل Controller، Service و response DTO است. Controller قرارداد HTTP را می‌سازد و Service مستقل از request/response داده سلامت را برمی‌گرداند؛ constructor DI توسط Nest انجام می‌شود. Health ساده repository، domain یا لایه use-case اضافی ندارد.

رفتارهای زیر در `app.setup.ts` برای اجرا و تست یکسان تنظیم شدند:

- پیشوند `/api/v1` و `GET /api/v1/health/liveness` با `data.status=ok` و شناسه یکسان در header/meta.
- middleware برای شناسه معتبر تک‌مقداری یا UUID جایگزین؛ بررسی هدرهای تکراری و درخواست‌های هم‌زمان.
- filter خطای امن با پیام عمومی فارسی، قالب `error` و `retryable=false`؛ بدون exception خام، stack یا داده حساس در پاسخ و log عمومی.
- log ساختاری فقط از event، شناسه، method، status و مدت؛ لاگ خطای 500 نیز تنها metadata امن دارد.
- OpenAPI مبتنی بر DTO/decorator واقعی، UI و JSON فقط در development/test.
- fallback نهایی 404 برای مسیرهای خارج از prefix، پس از `app.init()`؛ دلیل نسخه‌ای در [ADR-003](../../architecture/adr/ADR-003-sprint-01-tooling.md) ثبت شده است.

تنظیمات PORT/NODE_ENV در startup بررسی می‌شوند؛ مقدار نامعتبر پیش از listen اجرای برنامه را ناموفق می‌کند. `.env.example` فقط مقدار بی‌خطر دارد و `.env` از تست و نسخه‌بندی جداست. یک npm workspace و یک lockfile ریشه داریم؛ دستورهای ریشه بررسی‌ها را به API واگذار می‌کنند.

## محیط، نصب و اصلاح سازگاری

محیط اجرای بررسی: macOS ARM، Node **24.22.2 LTS** و npm **11.19.1**. Node قبلی دستگاه 24.5.0 بود؛ نسخه global تغییر نکرد. آرشیو رسمی نسخه منتخب با SHA256 رسمی تطبیق داده و runtime محلی ignored ایجاد شد. راه قابل انتقال اجرا در [README](../../../README.md) با `.nvmrc` توضیح داده شده است.

Nest core/common/platform-express/testing هم‌نسخه **12.3.2**، config **12.0.1**، swagger **12.0.5**، CLI **12.0.11**، TypeScript **6.0.2** و Vitest **4.1.12** هستند. همه نسخه‌های مستقیم exact ثبت شده‌اند؛ جزئیات کامل در ADR-003 و package-lock است. نصب بدون force یا نادیده‌گرفتن peerها انجام شد.

دو هشدار moderate نصب اولیه مربوط به Vitest 4.1.2/mocker بودند؛ با patch سازگار 4.1.12 رفع شدند. `npm audit` نهایی در تاریخ اجرا **صفر آسیب‌پذیری شناخته‌شده** گزارش کرد. نتیجه به پایگاه advisory همان زمان وابسته است و تضمین امنیت کامل نیست. اسکریپت تحلیل نصب وابستگی گذرای Scarf صریحاً غیرفعال شد. npm ci درباره اجرا نشدن install script اختیاری fsevents هشدار داد؛ watch معمول Node در اجرای زنده توسعه موفق بود و نیازی به فعال‌کردن آن نبود.

تست اولیه همچنین خطای نوع در ارسال هدر تکراری و پاسخ Express برای مسیرهای خارج از prefix را آشکار کرد. هدر تکراری اکنون با کلاینت استاندارد Node و دو header واقعی ارسال می‌شود؛ fallback ریشه نیز اصلاح شد. boot واقعی با Vitest و metadata فعلی موفق بود و transformer یا runner دیگری اضافه نشد.

## فرمان‌ها و نتیجه واقعی

تمام فرمان‌های npm از ریشه پروژه، با runtime منتخب روی PATH اجرا شدند.

| فرمان / بررسی | نتیجه |
|---|---|
| `npm install` | نصب اولیه موفق؛ دو هشدار ابزار تست، سپس patch اصلاحی نصب شد |
| `npm ci` | نصب مجدد از lockfile موفق، exit 0 |
| `npm run build` | موفق؛ خروجی `apps/api/dist/main.js` |
| `npm run typecheck` | موفق؛ کد src و فایل‌های test/config بررسی شدند |
| `npm run lint` | موفق؛ بدون warning قابل قبول و بدون auto-fix |
| `npm run format:check` | موفق؛ بدون ویرایش |
| `npm test` | **۲۷ تست واحد** در یک فایل، همگی موفق |
| `npm run test:e2e` | **۱۹ تست** در چهار فایل، همگی موفق؛ build پیش از اجرا |
| `npm run check` پس از npm ci | تمام مراحل بالا موفق، exit 0؛ مجموع **۴۶ تست** |
| `npm audit --json` پس از اصلاح | موفق، exit 0؛ صفر هشدار شناخته‌شده |

تست‌ها از `@nestjs/testing`، providerهای واقعی و همان app.setup استفاده کردند. فقط logger برای ثبت شواهد و config برای انتخاب محیط تست جایگزین شده‌اند؛ خود HealthService، Controller و filter واقعی‌اند. Controller خطاساز صرفاً در `test/fixtures` قرار دارد و در برنامه ساخته‌شده ثبت نشده است. تست startup نیز فرایند واقعی `dist/main.js` را با env نامعتبر اجرا می‌کند.

شواهد خام محلی در مسیر ignored قرار دارند: `work/sprint-01-ci.log`، `work/sprint-01-check.log`، `work/sprint-01-audit.json` و `work/sprint-01-smoke.json`. این‌ها artifact محلی‌اند و منبع اجرای پروژه نیستند؛ نتایج curated همین گزارش‌اند.

## اجرای زنده و توقف

پس از گذر check، برنامه جدا از test runner در دو حالت روی پورت آزاد محلی بالا آمد:

| حالت / روش اجرا | Health | مسیر ناموجود ریشه | docs | OpenAPI JSON | توقف |
|---|---|---|---|---|---|
| development، `npm run dev` | 200، body/header صحیح | 404، قالب error صحیح | 200 | 200، مسیر Health صحیح | SIGINT؛ پورت بسته شد |
| production، `node apps/api/dist/main.js` | 200، body/header صحیح | 404، قالب error صحیح | 404 | 404 | SIGTERM؛ پورت بسته شد |

هر دو فرایند پس از بررسی متوقف شدند؛ سرور آزمایشی روشن باقی نماند. تست‌های HTTP نیز برنامه‌ها را در cleanup می‌بندند.

## نگاشت پذیرش

| معیار | شاهد / نتیجه |
|---|---|
| S1-AC-01 / S1-T01 | boot واقعی، Health با قرارداد کامل و اجرای زنده؛ پاس |
| S1-AC-02 / S1-T02 | ۲۷ تست validation و دو تست شکست startup ساخته‌شده؛ پاس |
| S1-AC-03 / S1-T03 | 404، شناسه غایب/معتبر/نامعتبر/تکراری، هم‌زمانی و fallback ریشه؛ پاس |
| S1-AC-04 / S1-T06 | check کامل پس از npm ci، cleanup و توقف زنده؛ پاس |
| S1-AC-05 | liveness فقط فرایند را بیان می‌کند؛ DB/SMS/readiness در کد و پاسخ وجود ندارد؛ پاس |
| S1-AC-06 | [درس اسپرینت](../../learning/sprint-01.md) با مسیر فایل واقعی و تمرین اختیاری؛ تحویل شد |
| S1-AC-07 / S1-T05 | UI/spec در dev/test، schema مطابق route و نبود docs در production؛ پاس |
| S1-AC-08 / S1-T04 | fixture خطای 500 خارج src؛ متن حساس در body و log ثبت‌شده وجود ندارد؛ پاس |

مرور دستی مرزها و importها انجام شد: Health به config/http middleware وابسته نیست، common به ماژول Health import ندارد، چرخه import بین قابلیت‌ها نداریم، ساخت دستی Service در Controller و abstraction بی‌مصرف ایجاد نشده است. context درخواست با افزودن صریح property و استنتاج نوع ساخته می‌شود؛ cast اجباری، any یا ts-ignore برای پنهان‌کردن خطای برنامه وارد نشده است.

## روش امتحان و محدودیت

با نسخه Node مشخص‌شده، `npm ci`، کپی env نمونه در صورت نیاز و `npm run dev` را طبق README اجرا کنید. درخواست زیر باید header و meta یکسان بدهد:

```sh
curl -i -H 'X-Request-Id: learning-01' http://127.0.0.1:3001/api/v1/health/liveness
curl -i http://127.0.0.1:3001/missing
```

بستن برنامه با `Ctrl+C` انجام می‌شود. OpenAPI توسعه در `/api/docs` در دسترس است.

این اسپرینت شامل دیتابیس/ORM، احراز هویت، رزرو، SMS، UI/فیگما یا استقرار نیست. benchmark بار، دسترسی شبکه ایران، readiness وابستگی‌ها و سخت‌سازی انتشار عمومی بررسی نشده‌اند. Git init/commit/push، سرویس بیرونی، نصب global و اسپرینت ۲ انجام نشدند.

گام پیشنهادی بعدی فقط برای مرور: طرح اسپرینت ۲، انتخاب ابزار دسترسی PostgreSQL، migration و readiness؛ اجرای آن به تأیید طرح همان اسپرینت وابسته است.
