# راهبرد آزمون
این سند برنامه آزمون قابلیت‌های محصول است؛ بخش زیرساخت اسپرینت ۱ اجرا شده و [گزارش واقعی](../planning/sprints/sprint-01-report.md) دارد. پایه PostgreSQL نیز در اسپرینت ۲ آزموده شده؛ تست‌های رزرو، هویت و رقابت دامنه در جدول زیر هنوز برنامه آینده‌اند. صحت رزرو و tenant isolation با mock DB اثبات نمی‌شوند؛ DB واقعی همان خانواده/نسخه هدف لازم است.

| دسته/شناسه | چه چیزی و کدام ریسک | زمان و روش |
|---|---|---|
| دامنه T-008/009/014/016/026 | slot، بافر، مهلت، transition، قیمت، نرمال‌سازی و ریال/تومان | هر تغییر در CI؛ ساعت کنترل‌شده و مثال مرزی، نه تست متن implementation |
| DB و رقابت T-010/011/012/015/017/018؛ T-N05 | دو رزرو هم‌زمان، block در رقابت، کاهش ساعت و رزرو، جابه‌جایی با لغو، تغییر متخصص با ترتیب قفل | integration PostgreSQL واقعی در CI؛ barrier برای شروع هم‌زمان، ۱۰۰ درخواست و بررسی تعداد commit و allocation، rollback/timeout و retry همان key |
| tenant/مجوز T-N01؛ T-004/019/020/023/024 | مشاهده و mutation بین سالن‌ها، نقش متخصص، revoke، FK اشتباه، list/count/export | CI با دو tenant و کاربر دارای نقش متقاطع؛ هم route و هم DB constraints |
| هویت T-003/004؛ T-N02/03/04 | OTP، rate، CSRF، cookie، MFA/recovery و log امن | CI با provider fake، staging برای delivery واقعی و سناریوی revoke/بازیابی |
| API T-001..027 در محدوده هر endpoint | schema، status/error، pagination، 409، key collision و version | CI contract/integration؛ انتظار REST مطابق api-contracts؛ P1 T-027 اجرا نمی‌شود تا قابلیت مصوب شود |
| timezone/بومی‌سازی T-026؛ T-N11 | نوروز، اسفند کبیسه، تبدیل رفت‌وبرگشت، روز هفته، وقت مرزی، tzdata تاریخی | unit+integration با Asia/Tehran و یک منطقه DST برای آزمون عمومی resolver؛ زمان ناموجود/مبهم صریح |
| E2E مشتری US-01..04/13 | جست‌وجو→OTP→رزرو→timeout/retry→حساب→جابه‌جایی/لغو، روی موبایل | staging و smoke پیش انتشار؛ SMS stub در CI و شماره تست رضایت‌داده در staging |
| E2E کسب‌وکار US-05..09/11/12 | draft→review→publish، خدمت/تیم، دستی، block، مشاهده برنامه و outcome | staging؛ جدول نقش‌ها و UI روز/هفته روی موبایل/دسکتاپ |
| اعلان T-021/022؛ T-N10 | outbox اتمیک، crash بعد ارسال، نتیجه مبهم، retry، version قدیمی و حذف reminder | CI با provider چندحالته، worker قابل توقف؛ نبود رویداد گمشده و کاهش duplicate؛ تضمین دقیقاً یک SMS ادعا نشود |
| عملکرد/شبکه T-N06/07/08 | p95 زیر بار مرجع، cache سرد، p75 صفحه، شبکه ایران و outage | staging پیش پایلوت، سپس telemetry و probe؛ تعریف NFR مرجع اعداد |
| دسترس‌پذیری T-N12 | focus، keyboard، labels، کنتراست و screen reader در date picker RTL | چک خودکار در CI، دستی روی مسیرهای اصلی پیش انتشار |
| داده/عملیات T-N09/13/14 | restore/WAL، migration سازگار، خروجی/حذف و بازاعمال tombstone، نبود PII در logs | تمرین staging پیش پایلوت و restore ماهانه؛ فقط داده بی‌هویت |

## سناریوهای حیاتی صریح
- ۱۰۰ درخواست slot برای یک متخصص: یک confirmed، یک allocation، بقیه 409؛ همان key در ۱۰۰ درخواست: همگی به یک شناسه، بدون اثر تکراری.
- زمان ۱۰–۱۰:۳۰ با بافر ۱۰دقیقه بعد: شروع خدمت بعدی ۱۰:۳۰ نامعتبر و ۱۰:۴۰ از نظر overlap معتبر، مشروط به grid و ساعات. بافر قبل هم باید بررسی شود.
- تمام درخواست‌ها پیش از commit timeout می‌شوند یا بعد از commit پاسخ قطع می‌شود: retry با همان key باید بین «اثری ایجاد نشده» و «قبلاً ایجاد شده» صحیح رفتار کند.
- جابه‌جایی به وقت پر: زمان اولیه، version و allocation اولیه حفظ؛ لغو هم‌زمان با تغییر: فقط یکی با version جاری موفق.
- رزرو vs مسدودی/کاهش ساعت/تعطیلی/غیرفعال‌سازی: هیچ حالت committed ناسازگار باقی نماند. قفل Business/Staff در ترتیب یکسان با آزمون deadlock/timeout بررسی شود.
- کاربر مشتری A و متخصص B: داده عمومی A و رزرو خودش مجاز، CRM مشتریان A غیرمجاز؛ export و query پارامتر دستکاری‌شده نیز رد شوند.
- غیرفعال‌سازی متخصص دارای رزرو آینده، انتشار نسخه قدیمی، تغییر قیمت پیش از تأیید و ثبت نتیجه زودهنگام باید رد شوند.

ورود هر slice به main: type/lint و تست‌های متناسب slice، contract و migration review؛ پیش پایلوت همه P0 و NFRهای امنیت/صحت/restore. coverage درصدی به‌تنهایی gate نیست؛ هر invariant باید سناریوی موفق و شکست با نتیجه قابل مشاهده داشته باشد. باگ production یک regression مرتبط می‌گیرد. تست پرداخت تا ورود دامنه مالی فقط برنامه آینده است: callback جعلی/تکراری، تأیید سمت سرور، تطبیق، refund و timeout.

## ابزار و معیار پایه
ابزار پایه فعلی Vitest/Supertest مطابق [ADR-003](adr/ADR-003-sprint-01-tooling.md) است؛ پیشنهاد قبلی Jest جاری نیست. [S1-T01..06](../engineering/quality-gates.md) و S1-AC اسپرینت ۱ بررسی شدند: ۲۷ تست واحد تنظیمات و ۱۹ تست HTTP/startup، همراه build/typecheck/lint/format و اجرای زنده موفق بودند. ابزارهای UI/DB در اسپرینت مرتبط تعیین می‌شوند.

## اجرای واقعی پایه PostgreSQL — اسپرینت ۲

Vitest config جدا در `backend/vitest.config.integration.ts`، بدون runner/transformer تازه؛ `npm run test:integration` و check کامل نیازمند `TEST_DATABASE_URL` صریح‌اند. روش ساخت مقصد، CREATEDB، allowlist میزبان/نام و cleanup در [README](../../README.md#دیتابیس-و-تست-واقعی) است. هر suite DB با UUID دارد؛ query parameter برای جلوگیری از override مقصد رد می‌شود و فایل‌ها به‌ترتیب اجرا می‌شوند.

`database.integration-spec.ts` اجرای CLI واقعی از صفر، namespace/extension/journal/hash واقعی و اجرای دوم بدون تغییر را بررسی می‌کند. `readiness.integration-spec.ts` wiring واقعی Nest و Pool، پاسخ 200، قطع DB اختصاصی، idle error، 503 امن، recovery همان app، اشباع Pool، handshake بی‌پاسخ و query timeout روی relay به PostgreSQL واقعی را بررسی می‌کند. اتصال‌های timeout‌شده و صف Pool بررسی و همه منابع بسته می‌شوند. نبود اتصال نیز با پورت بسته و credential sentinel جدا آزموده می‌شود. unit/HTTPهای مستقل از DB واقعی قابل اجرا مانده‌اند. نتیجه محلی و CI در [گزارش](../planning/sprints/sprint-02-report.md) تفکیک شده‌اند.

## مرورگر اسپرینت ۳

`frontend/e2e/fixtures/test-stack.ts` از guard دیتابیس موجود استفاده می‌کند؛ DB UUID، migration رسمی، Nest و Next production روی پورت آزاد می‌سازد و در همه مسیرها منابع خودش را می‌بندد. تست فرم هویت به شبکه mock وابسته نیست. قطع شبکه و تأخیر کنترل‌شده صرفاً سناریو شکست‌اند؛ نتیجه ساختگی موفق تولید نمی‌شود. `check` شامل browser و PG واقعی است. مقایسه تصویری منبع و اجرا و حد ادعای آن در [شاهد فیگما](../references/sprint-03-figma.md) ثبت است.
