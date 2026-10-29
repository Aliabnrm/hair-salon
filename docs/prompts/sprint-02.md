# پرامپت اجرایی اسپرینت ۲ — PostgreSQL Foundation

نسخه ۱٫۰ — ۲۰۲۶-۱۰-۲۹. محدوده اسپرینت توسط کارفرما تأیید شده؛ این فایل آماده اجراست و هنوز نتیجه اجرا نیست. درخواست تهیه/مرور این سند را به ادعای تکمیل برنامه تبدیل نکن. هنگام درخواست اجرای اسپرینت، همین محدوده را کامل کن.

## Goal

روی API موجود، پایه PostgreSQL واقعی، migration نسخه‌بندی‌شده، Pool با lifecycle درست و readiness محدود از نظر زمان بساز. صحت رفتار را با PostgreSQL واقعی، check محلی و GitHub CI همان commit اثبات و سپس گزارش و آموزش فارسی ارائه کن. scaffold یا mock به‌تنهایی خروجی کافی نیست.

## Context مرتبط

1. AGENTS.md و README و package.jsonهای واقعی؛ وضعیت Git، diffهای موجود و PRهای باز را بررسی کن و تغییر کارفرما را حفظ کن.
2. [طرح اسپرینت ۲](../planning/sprints/sprint-02-plan.md)، S2-AC-01..08 و قرارداد readiness مرجع دامنه‌اند.
3. [ADR-002](../architecture/adr/ADR-002-code-organization.md)، [ADR-004](../architecture/adr/ADR-004-database-foundation.md)، [ساختار کد](../architecture/codebase-structure.md) و [استاندارد بک‌اند](../engineering/backend-standards.md).
4. [Git workflow](../engineering/git-workflow.md)، [کیفیت](../engineering/quality-gates.md) و [گزارش پایه](../planning/sprints/sprint-01-report.md).
5. src/config، src/common/http، src/modules/health، main/app.module/app.setup، تست‌ها و workflow فعلی را بخوان. کل PRD یا schema پیشنهادی MVP را برای این کار تکرار نکن.

## مرز اختیار و Git

محدوده تأییدشده است؛ برای نصب محلی dependency لازم، انتخاب patch سازگار، فایل‌بندی عادی و تست DB اختصاصی تأیید دوباره لازم نیست. کارفرما commit/push و PR روی `https://github.com/Aliabnrm/hair-salon.git` را مجاز کرده است. مرحله‌ای پیش برو و هر گام را به نیاز/معیار مرتبط وصل کن.

روی branch اجرایی `feat/sprint-02-database` با مبنای روشن کار کن؛ branch برنامه‌ریزی یا main را با تغییرهای اجرا مخلوط نکن. ابتدا وضعیت PR پایه و طرح را ببین؛ اگر هنوز merge نشده‌اند، مبنای دقیق PR وابسته را روشن کن و تاریخچه را بازنویسی نکن. commitهای معنادار با زمان واقعی بساز. به main push مستقیم، force-push یا merge خودکار نکن. PR نهایی باید متن و تست‌های آخرین implementation را توضیح دهد، نه تاریخچه گفتگو را.

شروع اسپرینت ۳، auth، مدل کامل User/Business/Booking، UI، Redis، سرویس خارجی، deploy و تغییر visibility در این درخواست نیست. رمز یا token واقعی در response/log/Git/PR نرود. داده و سرویس PostgreSQL شخصی موجود را reset/drop نکن.

## ابزار و محیط

- runtime موجود Node 24.22.2/npm 11.19.1 و ESM/NodeNext/TypeScript strict حفظ شود. نصب global و runner/linter دوم لازم نیست.
- طبق ADR-004، PostgreSQL 17.x + Drizzle ORM + pg؛ drizzle-kit فقط devDependency. stable exact versions و peer/engineها را قبل نصب بررسی و در lockfile واحد ریشه ثبت کن. snapshot سند، نصب موفق محسوب نمی‌شود. در صورت ناسازگاری واقعی، علت و راه‌حل متناسب را ثبت کن؛ force، legacy-peer-deps، any، ts-ignore یا خاموش‌کردن strict راه‌حل نیست.
- image رسمی PostgreSQL با patch/digest واقعی انتخاب و توسعه/تست/CI هماهنگ شوند. compose با healthcheck، volume نام‌دار و bind پورت به localhost باشد. `db:down` عادی volume توسعه را حذف نکند.
- Docker daemon را بررسی کن؛ CLI به‌تنهایی کافی نیست. اگر Docker قابل استفاده نبود، نمونه محلی اختصاصی همان نسخه می‌تواند شاهد تست باشد؛ compose/CI را حذف نکن و دقیق بگو کدام مسیر اجرا نشده است. daemon/DB دیگران را متوقف نکن.

## تنظیمات و schema

validation فعلی environment را توسعه بده و `DATABASE_URL` را اضافه کن: غایب/خالی، URL نامعتبر، protocol غیر postgres/postgresql و host یا database خالی رد شوند. error امن نام متغیر را بگوید، مقدار را تکرار نکند. مقادیر معتبر typed در یک مرجع مرکزی خوانده شوند؛ کپی validator برای runtime،CLI و تست نساز.

`.env.example` فقط credential ساختگی و صریحاً محلی دارد. تست‌ها از env توسعه مستقل بمانند. `TEST_DATABASE_URL` فقط برای runner integration، اجباری و معتبر است؛ هرگز به DATABASE_URL توسعه fallback نکند. نام و میزبان مقصد تست را طبق guard طرح کنترل کن؛ URLهای نمونه مبنای اتصال به سرویس خارجی نیستند. توقف startup نامعتبر با فرایند واقعی و بدون افشای sentinel بررسی شود.

schema اولیه فقط namespace مشترک `app` و extension `btree_gist` است؛ journal ابزار migration را خودش مدیریت کند. schema TypeScript برای همین namespace مصرف واقعی داشته باشد. جدول نمایشی یا تمام جداول طرح MVP ساخته نشوند. این schema با tenant سالن‌ها یکسان نیست؛ همه سالن‌ها بعداً با کلیدهای business_id و کنترل مجوز جدا می‌شوند.

## معماری و lifecycle

درخت پیشنهادی طرح را با مسئولیت روشن اجرا کن:

- DatabaseModule صاحب provider دسترسی typed به Drizzle و **یک Pool** است؛ ایجاد Pool در controller، هر درخواست یا هر service ممنوع.
- قرارداد کوچک `DatabaseHealthCheck` در مرز DB/Health داشته باش؛ یک abstract class با متد `isAvailable(): Promise<boolean>` می‌تواند هم قرارداد و هم token DI باشد. adapter PostgreSQL آن را اجرا و Module اتصال را ثبت کند.
- HealthService از constructor همین قرارداد را بگیرد؛ Controller فقط HTTP را مدیریت کند. SQL و pg/Drizzle را وارد Controller یا domain آینده نکن. service locator یا ساخت دستی adapter داخل HealthService ممنوع.
- Pool lazy باشد تا با URL معتبر و DB خاموش هم HTTP بالا بیاید. startup به query موفق DB وابسته نشود. خطای idle Pool با listener امن مدیریت شود؛ raw Error/URL/query در log نرود.
- pool max، idle و connection timeout مقادیر محدود و با دلیل داشته باشند؛ probe هم زمان acquire و هم query را محدود کند. برای timeout/query failure، client آزاد یا نابود شود. `Promise.race` بدون cleanup کافی نیست؛ listener و اتصال رهاشده باقی نماند.
- shutdown و migration CLI در موفقیت/شکست Pool را ببندند. catch خالی یا تبدیل failure به پاسخ 200 مجاز نیست؛ probe عدم دسترسی را با خروجی false و ثبت metadata امن گزارش کند.

## Migration

از runner رسمی Drizzle و migration SQL تولیدشده/سفارشی مطابق نسخه نصب‌شده استفاده کن. SQL و journal/snapshot لازم با هم version شوند؛ فرمت راهنمای online جدیدتر را به نسخه قدیمی تحمیل نکن.

1. اولین migration، app و btree_gist را روی DB اختصاصی خالی بسازد.
2. دستور مستقل `db:migrate` داشته باش؛ هنگام startup web اجرا نشود و از target معتبر تنظیمات استفاده کند.
3. اجرای دوباره تغییری تکرار نکند؛ journal واقعی و شیءهای ساخته‌شده با query از PostgreSQL بررسی شوند.
4. migration اعمال‌شده ویرایش نمی‌شود؛ forward-fix و نیاز backup/restore مستند شوند. rollback امن خودکار همه DDLها وعده داده نشود. migration از یک فرایند اجرا شود.
5. db push/synchronize یا ساخت دستی schema از GUI مسیر عادی پروژه نیست.

## قرارداد HTTP و OpenAPI

`GET /api/v1/health/readiness` با query واقعی `SELECT 1`، موفقیت 200 با همان envelope موفق Health و شناسه همسان header/meta بدهد. در قطع DB یا timeout، 503 با `SERVICE_UNAVAILABLE` و پیام «سرویس موقتاً آماده پاسخ‌گویی نیست.»، request_id و retryable=false بدهد. mapping در مرجع مشترک error اضافه شود؛ قراردادهای اسپرینت ۱ و fallback ریشه حفظ شوند.

در قطعی DB، `/api/v1/health/liveness` همچنان 200 باشد. پس از برگشت DB، readiness همان app دوباره 200 بدهد. host، DB name، SQL، URL، stack، credential یا exception خام در پاسخ یا log عمومی نباشد. schema واقعی 200/503 با DTO/decorator و docs فقط dev/test باقی بماند. تعریف عمومی interceptor یا error framework تازه لازم نیست.

## تست و commandها

- unit: URL/defaultهای قبلی/نامعتبرها و رفتار HealthService از قرارداد probe؛ unit مستقل از DB واقعی باشد.
- integration: PostgreSQL واقعی برای migration از صفر، اجرای دوباره، صحت app/btree_gist/journal و cleanup؛ readiness واقعی 200/503/recovery، liveness مستقل و عدم افشای sentinel. DB mock یا SQLite جای این شاهد نیست.
- suiteها از DB موقت متعلق به خودشان استفاده کنند. مقصد با نام تست و allowlist میزبان guard شود؛ cleanup فقط شیء ایجادشده توسط همان suite را حذف کند. migration و DROP روی DB مشترک هم‌زمان اجرا نشوند. توقف DB آزمایش، فقط نمونه اختصاصی خود تست را هدف بگیرد؛ روش نبود اتصال هم جدا بررسی شود.
- API HTTPهای مستقل قبلی قابل اجرا بمانند؛ integration واقعی در فایل و Vitest config جدا، بدون transformer/runner دوم است. ساخت دستی service برای دورزدن DI ممنوع.
- root scriptهای `db:up`، `db:down`، `db:migrate` و `test:integration` روشن و delegated باشند؛ `check` نهایی تمام بررسی‌های متناسب از جمله integration را اجرا کند. پیش‌نیاز DB تست و env در README دقیق بیاید. lint و format:check و test بدون mutation/watch بمانند.
- workflow موجود GitHub Actions را با PostgreSQL واقعی و env فقط تست تکمیل کن. همان patch/image و migration واقعی استفاده شوند؛ remote check آخرین SHA را ببین. CI ناموفق یا اجرا‌نشده با حذف test سبز نشود.
- پس از check، اجرای زنده readiness/liveness و توقف تمیز را مستقل از test runner انجام بده. command، نتیجه، محدودیت و اجرا‌نشده‌ها را دقیق ثبت کن.

## Done و آموزش

S2-AC-01..08 اثبات شوند. README، ساختار واقعی، ADR-004، قرارداد API، برنامه اسپرینت و راهنمای تست به‌روز شوند. **فقط پس از اجرا** `docs/planning/sprints/sprint-02-report.md` و `docs/learning/sprint-02.md` را با فایل واقعی، علت تصمیم، نتیجه check و تمرین کوتاه بساز.

آموزش فارسی و ساده: چرا schema/migration داریم، Pool چه مشکلی را حل می‌کند، چرا Health به Port وابسته است و liveness با readiness چه تفاوتی دارد. FK/index/transaction را به اندازه نیاز واقعی توضیح بده؛ مدل رزرو تأییدنشده را ساخته‌شده فرض نکن.

پیش از تحویل، diff، import boundary، تکرار، cleanup، اطلاعات حساس و dependency بی‌مصرف را مرور کن. commit/push و PR قابل بررسی با نتیجه CI و محدودیت واقعی تحویل بده. سپس بایست؛ اسپرینت ۳ خودکار شروع نشود.
