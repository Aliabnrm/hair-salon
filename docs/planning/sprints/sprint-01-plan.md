# طرح اسپرینت ۱ — پایه NestJS و درک مسیر درخواست
وضعیت: **تکمیل‌شده در ۲۰۲۶-۱۰-۲۹**، مطابق درخواست صریح کارفرما برای اجرای پرامپت. کد API، نصب تکرارپذیر، تمام بررسی‌ها و اجرای زنده تکمیل شدند؛ [گزارش اجرا](sprint-01-report.md) و [درس](../../learning/sprint-01.md) مرجع شواهد و توضیح‌اند. [پرامپت اجرایی](../../prompts/sprint-01.md)؛ [قرارداد سازمان‌دهی](../../architecture/adr/ADR-002-code-organization.md)؛ [ابزارهای واقعی](../../architecture/adr/ADR-003-sprint-01-tooling.md). migration در این اسپرینت وجود ندارد.

## هدف
یک API کوچک، قابل اجرا و قابل فهم بسازیم که درخواست HTTP را از Controller به Service ببرد، تنظیماتش هنگام startup اعتبارسنجی شود و وضعیت زنده‌بودن برنامه را با قرارداد روشن برگرداند.

## داخل محدوده
- بررسی runtime و اجرای تصمیم ADR-003: Node 24 LTS با patch سازگار،Nest 12/ESM،TypeScript strict،npm workspaces،Vitest/Supertest،Oxlint/Prettier؛ exact versions در شروع اجرا بررسی/قفل و سازگاری با build/test اثبات شود. تغییر ابزار آزمون از پیشنهاد قدیمی Jest بر اساس مستندات و starter رسمی فعلی است.
- TypeScript با strict mode و بک‌اند در apps/api. فقط فایل‌ها و پوشه‌های لازم همان اسپرینت ایجاد شوند.
- bootstrap روشن، AppModule، HealthModule،HealthController و HealthService با constructor injection.
- تنظیمات مرکزی و اعتبارسنجی حداقلی PORT و NODE_ENV با توقف startup در پیکربندی نامعتبر؛ .env.example بدون secret.
- پیشوند /api/v1 و GET /api/v1/health/liveness با پاسخ کوچک و بدون اطلاعات حساس.
- قالب خطای استاندارد API و request_id برای ردگیری؛ پاسخ عمومی بدون stack trace و log پالایش‌شده. endpoint نمایشی ایجاد خطای ۵۰۰ در API منتشر نشود.
- مستند OpenAPI اولیه متناسب همین endpoint، فقط توسعه/آزمایش؛ روش اجرا و نمونه درخواست در README.
- دستورهای build،lint،format-check،type-check و تست HTTP/تنظیمات؛ تست و ابزار با مجموعه پیش‌فرض Nest شروع شوند مگر ناسازگاری اثبات شود.
- راهنمای آموزشی پایان اسپرینت با ارجاع به فایل‌های واقعی و یک تمرین اختیاری کوچک.

## خارج محدوده
DB/ORM/Docker اجباری، مدل نهایی داده، ثبت‌نام/ورود، داده مشتری، رزرو، فرانت، Redis،صف و اتصال سرویس بیرونی. .github workflow یا remote repo تا انتخاب میزبان کد ایجاد نمی‌شود؛ دستورهای محلیِ قابل استفاده در CI آماده‌اند. ساخت repository،Git commit یا push خودکار بخشی از این اسپرینت نیست.

## خلاصه ساختار پیاده‌شده
```text
apps/api/
  src/
    main.ts
    app.module.ts
    config/
    common/              # فقط رفتار مشترک واقعی مثل error/request-id
    modules/
      health/
        health.module.ts
        health.controller.ts
        health.service.ts
  test/
docs/
  learning/
```
درخت بالا خلاصه است؛ [ساختار دقیق مخزن](../../architecture/codebase-structure.md) مرجع نام فایل‌هاست.

لایه domain/repository برای health ساده ایجاد نشود. برای رزرو پیچیده بعداً domain و use-case مستقل لازم می‌شود؛ جداسازی متناسب مسئله است.

## معیار پذیرش و بررسی
| شناسه | رفتار قابل بررسی | شاهد |
|---|---|---|
| S1-AC-01 | با پیکربندی معتبر API طبق README اجرا و GET liveness با HTTP 200 و data.status=ok پاسخ دهد | تست HTTP واقعی برنامه و نمونه اجرای محلی |
| S1-AC-02 | PORT نامعتبر یا مقدار محیط غیرمجاز قبل listen باعث خطای قابل فهم شود، بدون نمایش secrets | تست config و اجرای کنترل‌شده |
| S1-AC-03 | مسیر API ناموجود با 404 و قالب خطای مستند و request_id برگردد؛ ورودی request-id نامعتبر با شناسه معتبر تولیدشده جایگزین شود | تست HTTP با شناسه معتبر/نامعتبر و بدون آن |
| S1-AC-04 | build،type-check،lint و بررسی format پاس شوند؛ شکست هر بررسی گزارش شود | خروجی اجرای واقعی، نه صرفاً تعریف script |
| S1-AC-05 | پاسخ liveness فقط سلامت فرایند را بیان کند؛ هیچ ادعای اتصال DB، SMS یا آمادگی production نداشته باشد | contract و README |
| S1-AC-06 | بتوان از مستند و کد مسیر Request→Controller→Service→Response را فهمید و نقش DI را توضیح داد | گزارش آموزشی با ارجاع فایل واقعی |
| S1-AC-07 | مستندات /api/docs و /api/openapi.json در dev/test قرارداد واقعی را نشان دهند و در production ثبت نشوند | تست HTTP و spec |
| S1-AC-08 | خطای ناشناخته با fixture فقط در تست،500 و پیام امن برگرداند و sentinel حساس را در پاسخ/log عمومی افشا نکند | S1-T04؛ بدون route نمایشی در src |

تست‌ها boot و قرارداد HTTP و شکست پیکربندی را بررسی کنند؛ تست صرفاً بازگرداندن ثابت یک تابع برای افزایش coverage لازم نیست. endpoint خطای داخلی فقط در fixture آزمون ساخته شود و به API اصلی وارد نشود.

## خروجی پایان
کد قابل اجرا + دستور اجرای محلی + شواهد checks + مستند تصمیم ابزارها + آموزش ۳ تا ۵ مفهوم کلیدی + گزارش محدودیت‌ها و پیشنهاد اسپرینت ۲. هیچ claim تست یا تکمیل قبل اجرا ثبت نشود.

ریسک‌ها: نسخه ناسازگار Node/Nest، مشکل دریافت پکیج و پیچیدگی زودهنگام؛ کنترل با بررسی محیط و نسخه، dependencies محدود و ساختار ساده. تأیید این طرح فقط محدوده همین اسپرینت را مجاز می‌کند.
