# پرامپت اجرایی اسپرینت ۳ — frontend آراسته و identity

> دستور جدید ۲۰۲۶-۱۰-۳۱ مدیر بسته را به pnpm تغییر داد؛ [ADR-006](../architecture/adr/ADR-006-pnpm-workspace.md) بر بخش npm/lockfile این پرامپت تاریخی مقدم است. مسیرها و محدوده قابلیت‌ها تغییر نکرده‌اند.

وضعیت: **دستور اجرا با پیوست کارفرما صادر و محدوده این پرامپت اجرا شد**؛ [گزارش](../planning/sprints/sprint-03-report.md) نتیجه واقعی را ثبت می‌کند. متن دستور برای مرجع نگه داشته شده است؛ اجرای دوباره یا اسپرینت بعد از این سند استنباط نشود. commit/push با کارفرماست.

## Goal

اسپرینت ۳ را طبق طرح تأییدشده اجرا کن: API موجود را از apps/api به **backend/** منتقل کن؛ **frontend/** ریشه را با ساختار feature-first بساز؛ صفحه کشف «آراسته» را دقیقاً مطابق منبع تأییدشده Figma پیاده کن؛ ثبت‌نام، ورود ایمیل/رمز، حساب جاری و خروج را از مرورگر تا PostgreSQL واقعی کامل کن. داده سالن/وقت در این مرحله demo است؛ موفقیت رزرو یا availability واقعی نساز. اسپرینت بعد را آغاز نکن.

## Context — به ترتیب بخوان

۱. AGENTS.md و [طرح اسپرینت ۳](../planning/sprints/sprint-03-plan.md) کامل؛ معیارهای S3-AC-01..09 و مرزهای مصوب.
۲. [ADR-005](../architecture/adr/ADR-005-frontend-backend-layout.md)، [درخت دقیق هدف و نام‌گذاری](../architecture/sprint-03-structure.md)، [ADR-002](../architecture/adr/ADR-002-code-organization.md) و ساختار واقعی کد.
۳. [مرجع فیگما و روش تطبیق](../references/sprint-03-figma.md)، [استاندارد فرانت](../engineering/frontend-standards.md)، [بک‌اند](../engineering/backend-standards.md)، [کیفیت](../engineering/quality-gates.md) و [روند Git](../engineering/git-workflow.md).
۴. API/error/request-id، environment، DatabaseModule/Pool/schema/migrate و تست/CI واقعی؛ قراردادهای API/data/security فقط بخش هویت مرتبط و ADR-004. گزارش اسپرینت ۲ شاهد قبلی است و جای اجرای تست تازه نیست.
۵. package.json/lockfile ریشه و API، compose، config و scriptهای واقعی را قبل تغییر بخوان. کل MVP را به این اسپرینت تبدیل نکن.

## Constraints — اختیار و Git

- در اجرای صریحِ طرح مصوب، انتخاب عادی implementation، نصب محلی لازم و ساخت DB تست اختصاصی تأیید تکراری نمی‌خواهد؛ دامنه تازه اضافه نکن.
- وضعیت Git، diff و شاخه‌ها را بخوان. مبنا dev به‌روز از origin/dev با pull --ff-only است؛ شاخه پیشنهادی `feat/sprint-03-frontend-auth`. اگر تغییر ثبت‌نشده موجود است، آن را حفظ و مستقل بررسی کن؛ stash/reset/clean خودکار یا جابه‌جایی اجباری شاخه مجاز نیست. کار قبلی را به خود نسبت نده.
- **هیچ تغییر جدیدی را commit یا push نکن.** پایان کار diff، تست واقعی و متن انگلیسی پیشنهادی commit بده تا کارفرما بررسی و خودش commit/push کند. PR/merge/deploy بدون دستور مربوط انجام نشود؛ remote CI جدید پیش از push اجراشده فرض نشود.
- نصب global، سرویس SMS/ایمیل، telemetry، استقرار عمومی، MFA/مدیریت سالن، catalog/booking backend و پرداخت خارج محدوده‌اند. credential واقعی، رمز، session خام یا body حساس در log/response/git/frontend نرود.

## اجرا — ساختار و انتقال

فقط یک API: apps/api را به backend منتقل کن؛ @hair-salon/api حفظ شود. frontend با نام @hair-salon/frontend و فقط یک lockfile ریشه ایجاد شود. apps/web یا API دوم نساز. ساختار/نام فایل‌ها را از سند هدف بگیر: backend/src/modules/identity و frontend/features/identity/discovery؛ نام فنی انگلیسی، فایل‌ها kebab-case با suffixهای معنادار Nest و exportهای PascalCase/camelCase.

ابتدا انتقال ساختاری و regression، سپس قابلیت جدید. چک‌لیست ADR-005 برای Compose/CLI/workspace/lock/env/CI را اجرا کن؛ نسبت module-relative صحیح را با replace کورکورانه خراب نکن. env خصوصی و داده ignored کارفرما حفظ شوند. SQL، journal و snapshot migration قدیمی باید byte-identical باشند؛ اصلاح schema با migration جدید رسمی، نه ویرایش تاریخچه یا db push.

Nest مالک DB/قانون دامنه است؛ Next route handler/server action بک‌اند موازی نشود. domain از Nest/Drizzle/React مستقل، Controller باریک، application هماهنگ‌کننده، I/O پشت Port واقعی و adapter باشد؛ GenericRepository/BaseService یا لایه اضافی Health نساز. نسخه exact ابزار فرانت و peer/engine با runtime موجود بررسی شود؛ strict را خاموش و ناسازگاری را با force/any پنهان نکن.

## اجرا — طراحی Figma بدون مغایرت

مرجع قطعی همین لینک است؛ درباره عنوان Tarot دوباره سؤال نکن:

https://www.figma.com/make/Pxck6iAPnHETK1U4nIryUx/Tarot-Reading-App?t=JqAC3POdyGrkPctL-1

- skill مربوط Figma design-to-code را بخوان و پیش از UI، source/context کامل و screenshotهای همین Make را دریافت کن. ابزار get_design_context اگر برای این نوع فایل در دسترس است طبق skill مصرف شود؛ برای Make node-id خیالی نساز. thumbnail موجود فقط شاهد محدود است و کافی نیست.
- route→screen/state→viewport→asset/token inventory را تکمیل کن. صفحه‌های خارج محدوده و کنترل‌های prototype را طبقه‌بندی و دلیل ثبت کن؛ کشف source بیشتر مجوز ساخت کل آن نیست.
- **طراحی را دقیق، بدون مغایرت شناخته‌شده با منبع در محدوده مصوب اجرا کن**: layout، اندازه/فاصله، رنگ، فونت واقعی، icon، تصویر/crop، متن، RTL، responsive و stateهای تعامل. source Make را به ساختار پروژه تطبیق بده؛ App.tsx همه‌کاره یا dependencyهای آن را کورکورانه کپی نکن. دارایی مشابهِ حدسی جای اصل نیست.
- تم انتخاب‌شده مرجع و tokenهای واقعی یک محل داشته باشند؛ پنل شبیه‌سازی prototype خودکار وارد UI عمومی نشود. از source تعیین کن کدام بخش محصول و کدام کنترل review است.
- ایمیل/رمز دستور قطعی کارفرماست. اگر auth منبع OTP بود یا صفحه فرم نداشت، تغییر/تکمیل طراحی را با حفظ زبان بصری روشن ثبت کن؛ برای صفحه ندیده تطبیق پیکسلی ادعا نکن.
- تصویر reference و اجرا را با viewport، تم، داده، فونت و state یکسان overlay/diff و دستی مرور کن. اختلاف را اصلاح و ledger با شاهد نگه دار؛ baseline خود برنامه شاهد تطبیق با فیگما نیست. هیچ مغایرت حل‌نشده داخل محدوده را با threshold زیاد پنهان نکن.
- منبع کامل/asset لازم در دسترس نبود، مانع دقیق ثبت کن؛ کار مستقل backend و انتقال را پیش ببر، ولی UI حدسی یا ناقص را دقیق/تمام‌شده معرفی نکن.

## اجرا — قابلیت‌ها و قرارداد

تمام جزئیات auth، جداول، کدهای خطا، policy و عددهای طرح مصوب را اجرا کن؛ مرجع واحد آن طرح است:

- discovery: جست‌وجو/فیلتر مخاطب و خدمت، کارت/نتیجه و empty/reset مطابق منبع؛ fixture صریح. نشان نوبت/زمان نمایشی به کاربر واقعی نسبت داده نشود. route خارج محدوده، شکست مبهم یا موفقیت جعلی ندهد.
- identity: `/auth/register` با پاسخ عمومی 202 یکسان برای ایمیل تازه/موجود، `/auth/login`، `/me` و `/auth/logout` زیر /api/v1. ثبت‌نام تکراری credential را عوض نکند و login نباشد؛ email_verified=false صریح بماند.
- canonical ایمیل و password policy واحد، Argon2id، transaction و unique constraint واقعی، session token تصادفی و hashشده در PG، expiry/revoke و rate limit اتمیک چندنمونه‌ای اجرا شوند. مجوز role/user_id از client گرفته نشود.
- cookie HttpOnly با گزینه‌های امن، proxy هم‌مبدأ، CSRF Origin دقیق و JSON برای mutationها، no-store و عدم نشت secret به bundle/log برقرار باشد. trust proxy/IP را واقعاً تست کن؛ X-Forwarded-For دلخواه مبنای مجوز یا سهمیه نشود.
- فرم‌ها loading/error/disabled/focus و password manager داشته باشند. account از /me واقعی، reload و logout صحیح؛ نشست یک مالک state داشته باشد و داده دو کاربر در cache مخلوط نشود. بازیابی رمز/تأیید ایمیل اجرا نشده را فعال نشان نده.
- error envelope/request-id فعلی و OpenAPI dev/test-only حفظ و برای statusهای لازم گسترش محدود داده شوند؛ raw exception/DB details به client نروند.

## Verification — اجرا و شاهد واقعی

commandها را از package.json نهایی بخوان؛ scriptهای هدف طرح را واقعاً ایجاد و اجرا کن. build/typecheck/lint/format:check/unit برای دو workspace، HTTP مستقل، integration PostgreSQL واقعی 17.11 و browser واقعی در check باشند؛ lint/format:check و تست بدون mutation/watch. CI موجود را پوشش بده و نام required check یعنی API quality را بی‌هماهنگی عوض نکن.

تست‌ها باید invariantها را ثابت کنند: migration خالی/ارتقا/تکرار و تاریخچه سالم، ثبت‌نام هم‌زمان با تنها یک credential، hash غیرخام، نشست منقضی/revoked و session fixation، سهمیه هم‌زمان دو app، cookie/proxy/CSRF و IP، validation/429/503 و نبود داده حساس. رفتار login ناشناخته و رمز اشتباه امن و همسان باشد.

Playwright با backend و PostgreSQL واقعی، ثبت‌نام→ورود→reload→حساب→خروج و جدایی دو حساب را اجرا کند؛ mock شبکه جای این مسیر نیست. discovery/RTL/responsive/keyboard و مقایسه تصویر با منبع نیز بررسی شوند. برای screenshot، داده و زمان/state پایدار و متعلق به تست باشند.

runner فقط DB تست UUID و فرایندهای متعلق به خودش را بسازد/پاک کند؛ guard نام/host و TEST_DATABASE_URL اجباری، بدون fallback به DB توسعه/.env و بدون reuseExistingServer نامطمئن. در failure/timeout هم teardown انجام شود. داده/DB شخصی reset نشود. Docker CLI بدون daemon، mock یا SQLite شاهد PostgreSQL واقعی نیست.

بعد check، اجرای زنده محلی و توقف تمیز هم بررسی شود. command، خروجی/تعداد تست واقعی، نسخه، screenshot/مقایسه و اجرا‌نشده‌ها را ثبت کن. CI گذشته یا تست قبلی را به این تغییر نسبت نده؛ قبل push دستی، remote CI جدید «اجرا نشده» است.

## Done when — تحویل

S3-AC-01..09 با شاهد واقعی در گزارش نگاشت شوند. README، ساختار واقعی، ADRها، API/data/security و برنامه اسپرینت هماهنگ باشند؛ گزارش‌های تاریخی جعل/بازنویسی نشوند. فقط پس از اجرا، `docs/planning/sprints/sprint-03-report.md` و `docs/learning/sprint-03.md` را بنویس.

آموزش فارسی با فایل واقعی و مثال ساده: domain/feature و مسئولیت route/component/hook، token و تطبیق فیگما، fixture در برابر داده واقعی، hash و نشست/cookie، CSRF و unique/transaction/race. بگو چه ساخته شد، چرا، کدام تست واقعاً اجرا شد و چه محدودیتی باقی است.

پیش از تحویل diff، مرز import، تکرار، خطا، cleanup و داده حساس را review کن. نتیجه و متن پیشنهادی commit را بده؛ **commit/push/PR/merge خودکار نکن**. سپس بایست؛ اسپرینت بعدی در این درخواست نیست.
