# راهنمای عامل در hair-salon

## زمینه و محدوده
- محصول رزرو سالن برای ایران؛ مستند و توضیح فارسی،نام فنی انگلیسی. تیم کارفرما و دستیار است و یادگیری بخشی از تحویل است.
- مرجع وضعیت کار: docs/planning/sprint-plan.md و طرح/پرامپت اسپرینت مربوط. هر اسپرینت ابتدا تأیید می‌شود؛ داخل محدوده مصوب تصمیم عادی را انجام بده. درخواست «فقط پرامپت/مستند» را به اجرا تبدیل نکن و اسپرینت بعدی را خودکار شروع نکن.
- پیش از تغییر،کد و دستورات واقعی پروژه را بخوان و تغییر کارفرما را حفظ کن. اکنون API در backend/ و رابط Next.js در frontend/ وجود دارند؛ گزارش اسپرینت ۱ و درس آن مرجع نتیجه و توضیح‌اند. هیچ نتیجه بررسی گذشته را جای اجرای متناسب تغییر جدید نگذار.

## مراجع مهندسی
- docs/architecture/adr/ADR-002-code-organization.md و docs/architecture/codebase-structure.md: معماری و importها.
- docs/engineering/backend-standards.md؛ برای UI همچنین frontend-standards.md؛ برای تحویل quality-gates.md.
- مدیر بسته جاری pnpm طبق ADR-006 است؛ npm در گزارش‌ها و پرامپت‌های تاریخی، شاهد همان اجرای قبلی است و دستور جاری محسوب نمی‌شود.
- نسخه و ابزار اسپرینت ۱: docs/architecture/adr/ADR-003-sprint-01-tooling.md؛ شواهد: docs/references/engineering-sources.md.
- اسپرینت ۲: محدوده تأییدشده؛ docs/planning/sprints/sprint-02-plan.md و docs/prompts/sprint-02.md؛ انتخاب DB در ADR-004 است و نتیجه نصب/تست واقعی در docs/planning/sprints/sprint-02-report.md ثبت می‌شود. آماده‌بودن طرح را جای شاهد اجرای DB نگیر.
- اسپرینت ۳: انتقال API، identity ایمیل/رمز و discovery نمایشی اجرا شدند؛ docs/planning/sprints/sprint-03-report.md و docs/learning/sprint-03.md مرجع نتیجه‌اند. طرح/پرامپت، ADR-005 و docs/architecture/sprint-03-structure.md مرز مصوب و ساختار را مشخص می‌کنند. منبع کامل و شواهد تطبیق در docs/references/sprint-03-figma.md؛ هیچ داده نمایشی مجوز رزرو یا availability واقعی نیست.
- فقط اسناد مرتبط وظیفه را بخوان؛ مستندات کامل محصول را در هر نوبت تکرار نکن. دستور اجرایی هر اسپرینت در docs/prompts/ است.
- روند branch/commit/PR: docs/engineering/git-workflow.md؛ پیش از هر کار، dev را از origin/dev با pull --ff-only به‌روز کن و شاخه جدا feat/<topic>، fix/<topic>، refactor/<topic> یا docs/<topic> بساز. main و dev محل پیاده‌سازی مستقیم نیستند. طبق دستور جدید کارفرما، تغییرهای جدید را commit یا push نکن؛ پیاده‌سازی، تست و مستندسازی را کامل کن و متن پیشنهادی commit بده تا کارفرما بررسی و خودش commit/push کند. پس از push، PR توسعه به dev است؛ ادغام dev به main با PR جدا انجام می‌شود. ساخت یا merge PR نیازمند دستور مربوط کارفرماست. این قاعده جایگزین مجوز commit/push در پرامپت‌های تاریخی است.

## قواعد کد
- بک‌اند NestJS،feature-first و Modular Monolith. HTTP،اجرای سناریو،قانون دامنه و I/O مسئولیت مستقل دارند. برای Health ساده لایه اضافی نساز.
- TypeScript strict؛ DI از constructor؛ مرز واقعی adapter با Port مشخص. قواعد دامنه به ORM/Nest/UI وابسته نباشند. any/ts-ignore/cast برای پنهان‌کردن خطا و GenericRepository بی‌نیاز نساز.
- Controller و UI محل قوانین رزرو نیستند. componentها معنادار و کوچک؛ hook برای منطق stateful و تابع عادی برای منطق خالص. رفتار/ظاهر مشترک بعد از مشاهده نیاز واقعی استخراج شود.
- env متمرکز و معتبر؛ secret/OTP/بدنه حساس در response،log،git یا frontend نرود. business_id کلاینت مجوز نیست؛ tenant و race در قابلیت مربوط با DB واقعی آزموده شوند.
- یک pnpm workspace با backend/frontend و فقط pnpm-lock.yaml ریشه؛ پوشه/پکیج/ابزار برای آینده فرضی اضافه نکن. نصب global،Observe/telemetry یا سرویس خارجی بخشی از scaffold نیست.

## بررسی و گزارش
در ریشه scriptهای build،typecheck،lint،format:check،test و test:e2e و check تعریف شده‌اند. فرمان واقعی را از package.json بخوان؛ بررسی متناسب تغییر را اجرا کن. lint/format:check نباید ویرایش کنند. تست رفتار و invariant مهم بنویس؛ coverage نمایشی یا تست آینه implementation لازم نیست.

قبل تحویل،مرزها،تکرار،مدیریت خطا و داده حساس را review کن. بدون اجرای واقعی،تست/سازگاری/اتمام ادعا نکن. مانع محیطی را دقیق گزارش کن. آموزش فارسی پایان اسپرینت با فایل واقعی،دلیل انتخاب و مثال ساده در docs/learning/ ثبت شود.

پیش از تحویل، وضعیت و diff محلی، نتیجه واقعی تست و پیام پیشنهادی commit گزارش شوند؛ commit/push تغییرهای تازه با کارفرماست و بدون دستور صریح merge انجام نشود. deploy،انتشار سرویس یا پیام به شخص/چت دیگر نیازمند دستور مربوط کارفرماست. تغییر مهم معماری با ADR و سندهای مرتبط هماهنگ شود؛ تایید یک اسپرینت،کل MVP را مصوب نمی‌کند.
