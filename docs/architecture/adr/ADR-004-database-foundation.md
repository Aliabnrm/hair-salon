# ADR-004 — پایه PostgreSQL و مرز دسترسی داده

تاریخ: ۲۰۲۶-۱۰-۲۹. وضعیت: **انتخاب فنی برای اجرای اسپرینت ۲ با محدوده تأییدشده؛ هنوز نصب یا آزمون پروژه انجام نشده است**. این ADR تصمیم طراحی را ثبت می‌کند؛ گزارش اجرا بعداً شاهد سازگاری خواهد بود. نتیجه بار و مقیاس‌پذیری از این انتخاب استنباط نشود.

## نیاز تعیین‌کننده

مدل پیشنهادی رزرو به transaction، FK ترکیبی، نوع بازه PostgreSQL، GiST/exclusion، migration SQL سفارشی و احتمالاً trigger نیاز دارد. کد دامنه نباید به مدل ORM وابسته شود. تیم کوچک است و یادگیری SQL و رفتار واقعی دیتابیس بخشی از هدف کارفرماست. اسپرینت ۲ تنها پایه اتصال، migration و probe را می‌سازد؛ جدول‌های کامل محصول از طرح آینده وارد نمی‌شوند.

## گزینه‌ها و انتخاب

| گزینه | تناسب با نیاز | هزینه یا محدودیت |
|---|---|---|
| Prisma | client تولیدشده، مدل داده و مسیر migration مشخص؛ SQL سفارشی برای قابلیت خارج schema ممکن است | برخی قابلیت‌های پیشرفته DB به SQL سفارشی و هماهنگی schema/client نیاز دارند؛ برای تیم ما یک مدل و مرحله تولید اضافی دارد |
| TypeORM | ساختار DataSource/entity و migration، استفاده رایج در Nest؛ SQL سفارشی ممکن است | باید entity پایگاه داده از مدل دامنه جدا بماند؛ decoratorها و رفتارهای entity برای پایه کوچک فعلی ضروری نیستند |
| **Drizzle + node-postgres** | queryهای typed نزدیک به SQL، transaction و migration SQL قابل مرور؛ کنترل مستقیم قابلیت‌های PostgreSQL | wiring ماژول Nest را خودمان به‌صورت کوچک می‌نویسیم؛ آشنایی با SQL لازم است و انواع بازه/قیود ویژه احتمالاً SQL سفارشی می‌خواهند |

انتخاب برای اجرا: **PostgreSQL 17.x، Drizzle ORM و درایور `pg`**؛ `drizzle-kit` فقط برای ساخت/مدیریت artifactهای migration. این انتخاب برتری عملکردی اندازه‌گیری‌شده بر دو گزینه دیگر را ادعا نمی‌کند. دلیل اصلی، تطبیق با SQL و قیود برنامه رزرو و هدف آموزشی است. Nest DI با provider کوچک این adapter را مدیریت می‌کند؛ ORM جای transaction، index یا constraint را نمی‌گیرد.

در این محیط PostgreSQL 17.11 نصب است؛ این نتیجه preflight است، نه راه‌اندازی دیتابیس پروژه. patch پشتیبانی‌شده و image رسمی متناظر هنگام اجرا بررسی، نسخه دقیق یا digest ثبت و همان نسخه در توسعه/تست/CI استفاده شود. PostgreSQL جدیدتر فقط با نیاز یا دلیل سازگاری انتخاب شود، نه برای تازگی شماره نسخه.

snapshot registry در تاریخ بررسی: `drizzle-orm=0.45.4`، `drizzle-kit=0.31.11` و `pg/@types/pg=8.23.1`. pg نیازمند Node >=16 و Drizzle دارای peer برای pg >=8 است؛ patch نهایی و تمام peer/engineها قبل نصب با Node 24.22.2 و TypeScript 6 بررسی شوند. این اعداد اثبات build نیستند. prerelease وارد پروژه نشود و راهنمای online جدیدتر از نسخه نصب‌شده، بدون کنترل سازگاری کپی نشود.

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
- metadata رسمی npm برای نسخه‌های ذکرشده خوانده شد. کد نصب‌شده/آزموده‌شده اسپرینت ۲ هنوز نداریم؛ جایگزین‌کردن runner یا تغییر تصمیم اصلی با علت و اصلاح همین ADR انجام شود.
