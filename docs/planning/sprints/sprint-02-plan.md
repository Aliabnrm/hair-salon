# طرح اسپرینت ۲ — اتصال PostgreSQL و آمادگی دیتابیس

تاریخ: ۲۰۲۶-۱۰-۲۹. وضعیت: **محدوده توسط کارفرما تأیید شده؛ طرح دقیق و پرامپت آماده؛ اجرا هنوز شروع نشده**. همین پیام کارفرما، روند commit/push/PR را نیز مجاز کرد. این سند و [پرامپت](../../prompts/sprint-02.md) ادعای نصب دیتابیس یا موفقیت تست DB ندارند.

## هدف و نتیجه قابل نمایش

API با دیتابیس واقعی ارتباط داشته باشد؛ راه‌اندازی محلی و migration تکرارپذیر شوند. هنگام قطع DB، liveness همچنان 200 و readiness با خطای امن 503 برگردد؛ با برگشت DB، readiness همان فرایند دوباره 200 شود. آزمون واقعی PostgreSQL و CI باید این رفتار را اثبات کنند.

## تصمیم‌های اجرا

- PostgreSQL 17.x و Drizzle/node-postgres مطابق [ADR-004](../../architecture/adr/ADR-004-database-foundation.md)؛ نسخه نهایی و سازگاری پیش از نصب بررسی و exact ثبت شوند.
- محیط معمول توسعه Docker Compose با image رسمی، healthcheck، volume نام‌دار و اتصال محدود به localhost است. `down` عادی داده توسعه را حذف نمی‌کند؛ پاک‌کردن volume دستور مستقل و صریح دارد.
- preflight این دستگاه: Docker CLI موجود است ولی daemon در زمان بررسی پاسخ نداد؛ PostgreSQL 17.11 محلی نیز موجود است. هنگام اجرا اول وضعیت دوباره بررسی شود؛ سرویس یا دیتابیس شخصی موجود دستکاری نشود. استفاده از یک دیتابیس محلی اختصاصی در نبود Docker مجاز است، مشروط به همان نسخه و تست واقعی؛ compose/CI نیز باید قابل اجرا باقی بمانند.
- schema اولیه فقط `app`، journal ابزار و extension `btree_gist` است. جدول‌های محصول به اسپرینت خود تعلق دارند. [مدل داده](../../architecture/data-model.md) برای قابلیت آینده مرجع پیشنهاد است و تمام آن اکنون migrate نمی‌شود.

## کارها به ترتیب

1. بررسی baseline Git و طرح/ADR؛ ساخت branch اجرایی `feat/sprint-02-database` از مبنای مرورشده. اگر PR پایه باز است، مبنای دقیق و وابستگی PRها روشن باشد؛ main مستقیم تغییر نکند.
2. انتخاب نسخه‌های exact، compose و نمونه env بی‌خطر؛ متغیر `DATABASE_URL` مرکزی و معتبر، بدون چاپ مقدار در خطا.
3. DatabaseModule با مالکیت واحد Pool، DI روشن، مدیریت خطای idle، timeout و cleanup. Health فقط قرارداد probe را مصرف کند.
4. migration اولیه و دستور اجرای جدا از startup؛ اثبات اعمال روی DB خالی و اجرای دوباره بدون تغییر تکراری.
5. endpoint readiness با قرارداد زیر، حفظ رفتارهای اسپرینت ۱ و به‌روزرسانی OpenAPI.
6. تست integration با PostgreSQL اختصاصی و افزودن آن به CI؛ گزارش واقعی، درس و PR قابل مرور.

## قرارداد readiness

`GET /api/v1/health/readiness` عمومی، بی‌اثر و با request-id استاندارد است.

در دسترس بودن DB، HTTP 200:

```json
{"data":{"status":"ok"},"meta":{"request_id":"same-as-header"}}
```

قطع/عدم دسترسی/timeout، HTTP 503:

```json
{"error":{"code":"SERVICE_UNAVAILABLE","message":"سرویس موقتاً آماده پاسخ‌گویی نیست.","request_id":"same-as-header","retryable":false}}
```

retryable طبق قرارداد عمومی فعلاً false می‌ماند و معنای آن ادعای دائمی‌بودن اختلال نیست. این probe فقط وابستگی DB فعلی را می‌سنجد؛ اثبات migration کامل آینده، سلامت SMS یا آمادگی انتشار عمومی نیست. request-id و log امن برای هر دو مسیر 200/503 یکسان اعمال شوند. docs فقط dev/test باقی بمانند.

## ساختار مورد انتظار — هنوز ایجاد نشده

```text
compose.yml
apps/api/
  drizzle.config.ts
  drizzle/                   # SQL و metadata واقعی همان نسخه ابزار
  src/
    config/environment.ts    # توسعه validation موجود، بدون مرجع موازی env
    database/
      database.module.ts
      database.provider.ts   # ساخت/مالکیت Pool و دسترسی typed به Drizzle
      database-health.port.ts
      postgres-health-check.ts
      schema.ts              # namespace مصرف‌شده app؛ فعلاً بدون جدول محصول
      migrate.ts             # اجرای runner رسمی و بستن منابع
    modules/health/
      ...                    # افزودن readiness به همین قابلیت
  test/
    database.integration-spec.ts
    readiness.integration-spec.ts
  vitest.config.integration.ts
```

فایل جدا فقط وقتی مسئولیت واقعی دارد ساخته شود؛ تقسیم جزئی lifecycle بین provider/service مجاز است و درخت نهایی به‌روز شود. schema/query دامنه آینده در همین پوشه انباشته نشود.

## بررسی و معیار پذیرش

| شناسه | معیار | شاهد لازم |
|---|---|---|
| S2-AC-01 | clone تمیز با env نمونه و دستورهای README به DB اختصاصی وصل شود | اجرای محلی و CI |
| S2-AC-02 | URL غایب/خالی/نامعتبر قبل listen رد، مقدار حساس چاپ نشود | unit و startup واقعی |
| S2-AC-03 | migration روی DB خالی app/btree_gist/journal معتبر بسازد و اجرای دوباره اثر اضافی نداشته باشد | integration روی PostgreSQL واقعی |
| S2-AC-04 | readiness با DB واقعی 200 و با DB قطع/timeout،503 بدهد؛ liveness مستقل 200 بماند | HTTP integration؛ mock کافی نیست |
| S2-AC-05 | برگشت DB باعث recovery همان app شود؛ pool/error/shutdown منابع را سالم مدیریت کنند | integration و بررسی بسته‌شدن فرایند |
| S2-AC-06 | query و URL و sentinel حساس در خطا/log عمومی دیده نشوند | سناریوی خطا و ثبت log |
| S2-AC-07 | تمام بررسی‌های اسپرینت ۱، تست‌های تازه و CI نهایی پاس شوند | check محلی و check همان SHA در GitHub |
| S2-AC-08 | تصمیم، migration و ساختار واقعی مستند و درس ساده ارائه شود | ADR تکمیل‌شده، گزارش و درس پس از اجرا |

`npm run test:integration` به root/workspace اضافه شود؛ مقصد تست با `TEST_DATABASE_URL` مستقل است. مقدار آن اجباری، نام دیتابیس دارای پسوند `_test` یا پیشوند `hair_salon_test_` و میزبان محلی/سرویس CI صریح باشد. نبود آن نباید به DATABASE_URL توسعه fallback کند. cleanup فقط دیتابیس/schema موقت ایجادشده توسط همان suite را حذف کند؛ از دستور تخریب بدون guard یا داده مشترک استفاده نشود. چند suite روی DB مشترک migration یا DROP هم‌زمان اجرا نکنند.

check کامل شامل integration است و DB تست لازم دارد؛ README دستور آماده‌کردن آن را می‌گوید. unit و HTTPهای مستقل همچنان بدون DB واقعی قابل اجرا باشند. CI از PostgreSQL واقعی با نسخه هماهنگ و داده تست بی‌حساسیت استفاده کند؛ secrets توسعه به آن وارد نشود.

## خارج محدوده و آموزش

auth/OTP، User/Business/رزرو کامل، UI، Redis، سرویس ابری، استقرار و load test این اسپرینت نیستند. معماری چندسرویسی یا GenericRepository ساخته نمی‌شود. آموزش با مثال همین کد: schema و migration، Pool و lifecycle، جداسازی adapter از مصرف‌کننده، و تفاوت liveness/readiness. FK/index و transaction با مثال مرتبط معرفی می‌شوند؛ تضمین صحت رزرو به اسپرینت دامنه و DB واقعی آن تعلق دارد.

پس از اجرا، گزارش `sprint-02-report.md` و درس `docs/learning/sprint-02.md` ایجاد و PR با تست واقعی تحویل شود. این دو فایل اکنون ایجاد نمی‌شوند تا سند طراحی با نتیجه اجرا اشتباه نشود. تأیید محدوده اسپرینت ۲ معتبر است؛ برای تصمیم عادی در این طرح تأیید تکراری لازم نیست.
