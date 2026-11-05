# دستور اجرایی اسپرینت۷

محدوده طرح sprint-07-plan.md با درخواست اجرای کارفرما مصوب است. تمام بسته‌های ۷٫۱ تا ۷٫۴ اجرا شوند؛ خارج از محدوده و سیاست عدم commit/push رعایت شود.

NestJS Modular Monolith، Next.js، PostgreSQL و pnpm فعلی حفظ شوند. ماژول مستقل bookings با domain/application/infrastructure/presentation ساخته شود. مرز برنامه‌کاری از public.ts و persistence-contract.ts صریح باشد. قفل Business، idempotency، snapshot و ledger در یک transaction و exclusion constraint دیتابیس، ضامن ظرفیت هستند. سیاست: ۱۰ ایجاد در دقیقه، سقف۳رزرو آنلاین آینده در هر سالن، تماس ایران بدون تأیید پیامکی، قطعیت فوری بدون پرداخت. ثبت دستی فقط notice را با دلیل استثنا می‌کند. لغو مالک قبل شروع با دلیل و If-Match؛ آزادسازی ظرفیت اتمیک.

API: POST /appointments، GET /me/appointments، GET /appointments/:id؛ GET/POST /businesses/:businessId/appointments و GET /businesses/:businessId/appointments/:id، POST .../:id/cancellation؛ GET .../booking-options برای ثبت دستی. تمام خواندن‌های خصوصی no-store و دارای object authorization. Idempotency-Key برای هر mutation، fingerprint و resource تا عمر نوبت حفظ می‌شوند؛ replay وضعیت جاری را برمی‌گرداند.

UI: /salons/:id/book (خلاصه تازه و فرم تماس)، /appointments و /appointments/:id، /manage/:id/appointments و /new و /:appointmentId. route باریک، api decoder، pure model و hook جدا؛ فرم تماس در URL/storage ذخیره نشود. بازگشت امن ورود فقط به مسیر رزرو داخلی. intent فاقد PII برای بازیابی پاسخ نامشخص مجاز است. حالت‌های پرشدن/قیمت تازه/انقضای نشست/خطا/empty/refresh طراحی شوند. design tokens و componentهای پروژه حفظ شوند.

migration افزایشی با قیود تطابق appointment/allocation، حفظ snapshot و audit؛ حفاظت تنظیمات با همان قفل. تست DB واقعی شامل race۱۰۰تایی، tenant، rollback، replay، manual/online، cancel و تغییر برنامه. مرورگر واقعی دو جریان، check کامل، شواهد کارایی، گزارش صادقانه و درس فارسی الزامی‌اند. هیچ موفقیت یا انتشار عمومی بدون شاهد ادعا نشود. در پایان API روی۳۰۰۱ و رابط روی۳۰۰۰ اجرا و سلامت و مسیرهای تست بررسی شوند.
