# ADR-004 — پایه PostgreSQL و مرز دسترسی داده

تاریخ: ۲۰۲۶-۱۰-۲۹. وضعیت: **اجراشده در محدوده مصوب اسپرینت ۲**. [گزارش اجرا](../../planning/sprints/sprint-02-report.md) شاهد نصب و آزمون واقعی است. نتیجه بار و مقیاس‌پذیری از این انتخاب استنباط نشود.

## نیاز تعیین‌کننده

مدل پیشنهادی رزرو به transaction، FK ترکیبی، نوع بازه PostgreSQL، GiST/exclusion، migration SQL سفارشی و احتمالاً trigger نیاز دارد. کد دامنه نباید به مدل ORM وابسته شود. تیم کوچک است و یادگیری SQL و رفتار واقعی دیتابیس بخشی از هدف کارفرماست. اسپرینت ۲ تنها پایه اتصال، migration و probe را می‌سازد؛ جدول‌های کامل محصول از طرح آینده وارد نمی‌شوند.

## گزینه‌ها و انتخاب

| گزینه | تناسب با نیاز | هزینه یا محدودیت |
|---|---|---|
| Prisma | client تولیدشده، مدل داده و مسیر migration مشخص؛ SQL سفارشی برای قابلیت خارج schema ممکن است | برخی قابلیت‌های پیشرفته DB به SQL سفارشی و هماهنگی schema/client نیاز دارند؛ برای تیم ما یک مدل و مرحله تولید اضافی دارد |
| TypeORM | ساختار DataSource/entity و migration، استفاده رایج در Nest؛ SQL سفارشی ممکن است | باید entity پایگاه داده از مدل دامنه جدا بماند؛ decoratorها و رفتارهای entity برای پایه کوچک فعلی ضروری نیستند |
| **Drizzle + node-postgres** | queryهای typed نزدیک به SQL، transaction و migration SQL قابل مرور؛ کنترل مستقیم قابلیت‌های PostgreSQL | wiring ماژول Nest را خودمان به‌صورت کوچک می‌نویسیم؛ آشنایی با SQL لازم است و انواع بازه/قیود ویژه احتمالاً SQL سفارشی می‌خواهند |

انتخاب برای اجرا: **PostgreSQL 17.x، Drizzle ORM و درایور `pg`**؛ `drizzle-kit` فقط برای ساخت/مدیریت artifactهای migration. این انتخاب برتری عملکردی اندازه‌گیری‌شده بر دو گزینه دیگر را ادعا نمی‌کند. دلیل اصلی، تطبیق با SQL و قیود برنامه رزرو و هدف آموزشی است. Nest DI با provider کوچک این adapter را مدیریت می‌کند؛ ORM جای transaction، index یا constraint را نمی‌گیرد.

در preflight، PostgreSQL 17.11 فقط نصب بود؛ هنگام اجرای اسپرینت، cluster اختصاصی همان patch واقعاً راه‌اندازی و تست شد و image رسمی متناظر با digest در توسعه/CI ثبت شد. PostgreSQL جدیدتر فقط با نیاز یا دلیل سازگاری انتخاب شود، نه برای تازگی شماره نسخه.

نسخه‌های exact نصب‌شده و بررسی‌شده با Node 24.22.2/npm 11.19.1 و TypeScript 6.0.2: `drizzle-orm=0.45.4`، `drizzle-kit=0.31.11` و `pg/@types/pg=8.23.1`. pg نیازمند Node >=16 و Drizzle دارای peer برای pg >=8 است؛ patch نهایی و peer/engineهای مرتبط قبل نصب با Node 24.22.2 و TypeScript 6 بررسی شدند. نسخه‌ها در lockfile ریشه ثبت و build/typecheck و تست واقعی اجرا شدند. prerelease وارد پروژه نشود و راهنمای online جدیدتر از نسخه نصب‌شده، بدون کنترل سازگاری کپی نشود.

## مرزها و مالکیت

- `database/` adapter زیرساخت و صاحب یک Pool است. ساخت Pool در Controller/Serviceهای محصول تکرار نمی‌شود. اتصال‌های قرض‌گرفته‌شده در همه مسیرها آزاد و Pool در shutdown بسته می‌شود.
- ماژول Health به قرارداد کوچک `DatabaseHealthCheck` وابسته است، نه query یا کلاس Pool. پیاده‌سازی PostgreSQL در DatabaseModule ثبت و از token صریح DI ارائه می‌شود. interface برای همه کلاس‌ها لازم نیست؛ اینجا مرز واقعی بین Health و I/O است.
- queryهای قابلیت‌های آینده کنار همان قابلیت در infrastructure قرار می‌گیرند؛ DatabaseModule به مخزن queryهای همه محصول یا GenericRepository تبدیل نشود.
- module wiring، ساخت config و lifecycle از HTTP و قانون رزرو جدا بمانند. domain آینده، Drizzle/Nest/pg را import نمی‌کند.

## migration و schema حداقلی

برای شروع، migration نسخه‌بندی‌شده تنها namespace مشترک `app` و extension موردنیاز `btree_gist` را آماده می‌کند. namespace `app` برای کل برنامه است؛ schema جدا برای هر سالن نمی‌سازیم. journal مخصوص migration را ابزار مدیریت می‌کند. فایل schema TypeScript فقط namespace واقعاً مصرف‌شده در migration را تعریف می‌کند؛ ساخت جدول نمونه در production برای پرکردن قالب ممنوع است.

جدول‌های User/Session/Business و مدل رزرو در اسپرینت قابلیت مربوط با نیاز و constraint مشخص ساخته می‌شوند. PK/FK و index با مثال آموزشی یا fixture موقت توضیح داده می‌شوند و اثبات مدل نهایی محصول محسوب نمی‌شوند. این تصمیم، بازماندن Q-15 درباره خدمات چندمرحله‌ای را پنهان نمی‌کند.

migration با runner رسمی Drizzle و SQL نسخه‌بندی‌شده اجرا می‌شود؛ runner دست‌ساز جدید لازم نیست. custom migration تولیدشده باید طبق **نسخه نصب‌شده** artifact metadata معتبر داشته باشد. SQL و journal/snapshot لازم با هم commit شوند. migration در startup هر web instance اجرا نمی‌شود. `db push`، synchronize و تغییر خودکار production جای migration را نمی‌گیرند.

پس از اعمال migration، فایل آن ویرایش نشود؛ اصلاح با migration جدید است. اجرای دوباره migration نباید اثر تکراری داشته باشد. برگشت تغییرات عملیاتی با برنامه forward-fix/restore بررسی می‌شود؛ rollback امنِ خودکار همه DDLها ادعا نشود. اجرای هم‌زمان migration از دو فرایند در این اسپرینت پشتیبانی نمی‌شود و باید در روش اجرا منع شود.

## دسترس‌پذیری و خطا

URL نامعتبر پیش از listen رد می‌شود؛ اما قطع دیتابیس با URL معتبر مانع زنده‌بودن HTTP نیست. Pool lazy است و startup منتظر اتصال بی‌نهایت نمی‌ماند. liveness مستقل از DB باقی می‌ماند؛ readiness یک query واقعی و محدود از نظر زمان انجام می‌دهد. query، URL، نام میزبان و exception خام در log عمومی یا پاسخ نیاید. برای خطای background اتصال idle، listener امن لازم است.

Pool اولیه کوچک و محدود باشد؛ اعداد منتخب و علتشان هنگام اجرا ثبت شوند. acquire و query هر دو timeout واقعی و cleanup داشته باشند؛ `Promise.race` بدون خاتمه query/آزادسازی اتصال کافی نیست. این مقادیر پیش‌فرض توسعه‌اند و بدون load test به‌عنوان ظرفیت production اعلام نمی‌شوند.

## منابع بررسی‌شده و محدودیت

- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)، [transactions](https://orm.drizzle.team/docs/transactions)، [migrations](https://orm.drizzle.team/docs/migrations)، [custom generate](https://orm.drizzle.team/docs/drizzle-kit-generate): صفحات رسمی دریافت شدند؛ query/migration و SQL سفارشی مبنای انتخاب‌اند. فرمت artifact نسخه نصب‌شده در اجرا کنترل شود.
- [Prisma unsupported database features](https://www.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features): SQL سفارشی برای قابلیت‌های خارج schema ممکن است؛ نبود پشتیبانی کامل در schema به معنی ناممکن‌بودن قابلیت نیست.
- [node-postgres Pool](https://node-postgres.com/apis/pool): حد اتصال، timeout، release، end و event خطای idle.
- metadata رسمی npm شامل engine، peer و optional بودن adapterهای دیگر خوانده شد؛ نصب بدون force/legacy-peer-deps انجام شد. جایگزین‌کردن runner یا تغییر تصمیم اصلی با علت و اصلاح همین ADR انجام شود.

## جزئیات اجرای ثبت‌شده

- PostgreSQL **17.11**؛ image رسمی `postgres:17.11-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5` از Docker Hub بررسی و در Compose/CI یکسان ثبت شد. Docker daemon محلی در دسترس نبود؛ آزمون محلی روی cluster اختصاصی Homebrew همان patch اجرا شد. اجرای اولیه همین image در CI موفق شد؛ نتیجه آخرین commit در PR checks و گزارش ارجاع شده است.
- `DatabaseProvider` فقط یک Pool lazy و client typed Drizzle می‌سازد. max=5 برای بودجه کوچک توسعه، idle=10s برای آزادشدن اتصال بلااستفاده، acquire/connect=1s، statement_timeout=1s و query_timeout=1.2s. probe مهلت query را صریح روی همان درخواست اعمال می‌کند تا URL آن را خنثی نکند. بدترین بودجه معمول probe حدود 2.2s است، بدون تضمین زمان‌بندی سیستم یا ظرفیت production.
- در query failure/timeout، `release(true)` socket را حذف می‌کند؛ خطای idle فقط event ثابت دارد. shutdown از hook رسمی Nest، `pool.end()` را اجرا می‌کند. migration CLI نیز در finally Pool خودش را می‌بندد و شکست exit غیرصفر دارد.
- `drizzle-kit 0.31.11 generate --custom` artifact نسخه 7 تولید کرد؛ SQL اولیه namespace و extension را دارد. snapshot namespace با خروجی واقعی generate همین نسخه هماهنگ شد؛ اجرای generate بعدی «No schema changes» داد. custom extension بیرون مدل declarative ابزار است و در SQL حفظ می‌شود.
- `dotenv 18.0.9` وابستگی مستقیم CLI برای خواندن `.env` است؛ validation URL همان تابع مرکزی runtime باقی می‌ماند. `TEST_DATABASE_URL` فقط runner integration می‌خواند و guard میزبان/نام/parameter دارد.
- audit زمان اجرا: dependencyهای runtime بدون advisory شناخته‌شده؛ چهار moderate در زنجیره dev-only `drizzle-kit → @esbuild-kit/esm-loader → core-utils → esbuild 0.18.20` (GHSA-67mh-4wv8-2f99). ریسک مربوط به dev server esbuild است؛ پروژه آن server را اجرا نمی‌کند. پیشنهاد خودکار npm downgrade ناسازگار است؛ force/override آزموده‌نشده اعمال نشد. هنگام patch ابزار دوباره بررسی شود.
