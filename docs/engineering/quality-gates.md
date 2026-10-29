# معیارهای کیفیت، بررسی و تحویل
این سند روش بررسی را تعیین می‌کند؛ نتیجه اجرا در گزارش همان اسپرینت ثبت می‌شود. هیچ check تا اجراشده‌بودن «پاس» اعلام نشود.

## پایان هر تغییر
- نیاز و محدوده مصوب روشن؛ فایل نامرتبط یا تغییر کارفرما overwrite نشود.
- مسئولیت و جهت import با ADR-002 و ساختار جاری سازگار؛ business rule در UI/Controller/adapter تکرار نشده باشد.
- input بیرونی validate، خطای مورد انتظار روشن، داده حساس در response/log نباشد؛ authorization در اسپرینت مرتبط سروری باشد.
- build و typecheck و lint و format-check مرتبط اجرا شوند. commandهای دقیق از package.json واقعی خوانده شوند؛ پیش از ایجاد پروژه، command برنامه‌ریزی‌شده نتیجه اجرا ندارد.
- تست رفتار تغییر با ارزش واقعی: موفقیت، شکست مهم و invariant مرتبط؛ تست بازگویی implementation یا coverage مصنوعی ننویسیم.
- public API و راه اجرای محلی،اسناد اثرپذیرفته و ADR تصمیم مهم به‌روز؛ هیچ سند جاری متناقض باقی نماند.

## قرارداد commandها پس از اجرای اسپرینت ۱
در ریشه npm run dev/build/typecheck/lint/format:check/test/test:e2e/check، با delegation به @hair-salon/api تعریف شوند. lint و format:check بدون mutation؛ lint:fix/format در صورت نیاز صریح‌اند. check مجموعه بررسی‌های build/typecheck/lint/format:check و تست‌های unit/HTTP را با شکست قابل مشاهده اجرا کند. npm ci از lockfile برای نصب تکرارپذیر در محیط قابل نوشتن استفاده شود؛ در محیط بسته، مانع گزارش و مشکل با حذف بررسی پنهان نشود.

## تست‌های حداقلی اسپرینت ۱
| شناسه | ریسک/شاهد |
|---|---|
| S1-T01 | boot واقعی Nest و DI؛ GET health قرارداد موفق و header/body request_id سازگار |
| S1-T02 | PORT/NODE_ENV نامعتبر پیش از listen رد؛ مقادیر غایب default مشخص، ورودی خالی/ناقص/خارج بازه رد |
| S1-T03 | GET مسیر ناموجود،404 یکپارچه و request_id معتبر؛ multi-value/طول زیاد/کاراکتر نامجاز header پاکسازی یا جایگزین |
| S1-T04 | fixture خطای داخلی فقط در test،500 عمومی و بدون متن خطای حساس؛ هیچ route نمایشی در src |
| S1-T05 | docs و OpenAPI در dev/test و غیرفعال در production،schema با health/خطا واقعی همسان |
| S1-T06 | بسته‌شدن برنامه و handleها،و اجرای build/lint/typecheck/format/unit/e2e؛ ثبت خروجی و شکست‌ها |

assert فقط وجود status نیست؛ payload و privacy لازم نیز بررسی شوند. e2e از app.setup واقعی استفاده کند. تست private method یا mock همه Nestها جای بررسی boot/HTTP نیست. برای config واحد،تابع خالص و رفتار startup هر دو بررسی شوند؛ env واقعی توسعه به test تزریق نشود.

## بازبینی قبل تحویل
نام‌گذاری،branchهای پنهان،catchهای بلعنده،اثر جانبی خارج transaction،import cycle،تکرار rule،config پراکنده و وابستگی بی‌مصرف بررسی شوند. در UI،loading/error/empty/focus/RTL و state ownership نیز بررسی شود. dependency تازه با دلیل،peer/engine و حداقل scope اضافه شود؛ ابزار برای نیاز فرضی وارد نشود.

گزارش پایان: هدف و تغییر→فایل‌های اصلی→چرایی تصمیم→command و نتیجه واقعی→چیزهای اجرا‌نشده/محدودیت→نحوه امتحان→درس ساده با مثال کد. docs/planning/sprints/sprint-01-report.md و docs/learning/sprint-01.md فقط پس از اجرای اسپرینت ایجاد شوند. وضعیت Done با داشتن فایل و script اثبات نمی‌شود.
