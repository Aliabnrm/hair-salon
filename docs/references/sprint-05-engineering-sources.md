# مراجع و شواهد مهندسی اسپرینت ۵

تاریخ: ۲۰۲۶-۱۱-۰۲. این برش رتبه‌بندی مخزن GitHub یا ادعای بررسی جدید رقبا نیست. نسخه‌های package.json و lockfile فعلی حفظ شدند؛ وابستگی تازه‌ای نصب نشده است.

- معماری: ADR-002، استانداردهای backend/frontend و قرارداد کیفیت همین مخزن؛ تصمیم جدید در [ADR-009](../architecture/adr/ADR-009-reviewed-public-catalog.md).
- Next.js16.4.3: فایل‌های نصب‌شده `frontend/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` و `04-functions/not-found.md`، `use-search-params.md`، `generate-metadata.md` و `01-getting-started/06-fetching-data.md` پیش از پیاده‌سازی خوانده شدند. params یک Promise است؛ fetch عمومی no-store و notFound پیش از streaming استفاده شده‌اند. metadata ثابت است و اسم خصوصی سالن را دریافت نمی‌کند.
- PostgreSQL17.11: isolation یک statement، قفل سطر مشترک و صحت FK/exclusion با دیتابیس واقعی همین نسخه آزموده می‌شوند؛ [مستند رسمی isolation](https://www.postgresql.org/docs/17/transaction-iso.html)، [قفل‌ها](https://www.postgresql.org/docs/17/explicit-locking.html)، [تابع‌های رشته](https://www.postgresql.org/docs/17/functions-string.html) و [collation/ICU](https://www.postgresql.org/docs/17/collation.html) پیوند مطالعه‌اند؛ دریافت آنلاین تازه این صفحات در این نوبت انجام نشده است.
- شواهد اجرایی: تست‌های `publication.integration-spec.ts`، `publication-contract.e2e-spec.ts`، ارتقای داده‌دار در `database.integration-spec.ts` و مسیر مرورگر `frontend/e2e/publication.spec.ts`. نتیجه و محدودیت فقط در [گزارش](../planning/sprints/sprint-05-report.md) ثبت می‌شود.

تست EXPLAIN روی dataset کنترل‌شده کوچک است؛ اثبات کارایی در بار واقعی ایران، شبکه موبایل یا میلیون‌ها داده نیست. آزمایش Chromium اختصاصی در این دستگاه ابتدا به‌دلیل فایل اجرایی نصب‌نشده شروع نشد؛ اجرای جایگزین Chrome با Playwright از روش مستند موجود پروژه استفاده می‌کند.
