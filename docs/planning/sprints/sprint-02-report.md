# گزارش اجرای اسپرینت ۲ — PostgreSQL Foundation

تاریخ: ۲۰۲۶-۱۰-۲۹، Asia/Tehran. محدوده: [طرح مصوب](sprint-02-plan.md) و [پرامپت](../../prompts/sprint-02.md). پیاده‌سازی و آزمون محلی انجام شده؛ وضعیت CI آخرین commit و تحویل برای مرور در [PR #3](https://github.com/Aliabnrm/hair-salon/pull/3) قابل مشاهده است. اسپرینت ۳ شروع نشده است.

## چه ساخته شد و چرا؟

API موجود به PostgreSQL 17.11 از طریق Drizzle و pg وصل می‌شود. DatabaseModule صاحب یک Pool lazy است؛ startup با URL معتبر به query موفق DB وابسته نیست. دسترسی Drizzle typed و همان Pool مشترک است؛ Pool در Controller یا در هر درخواست ساخته نمی‌شود. HealthService از constructor قرارداد کوچک DatabaseHealthCheck را می‌گیرد و DatabaseModule adapter واقعی PostgreSQL را ثبت می‌کند. Controller فقط HTTP و envelope را مدیریت می‌کند.

محدودیت‌های اولیه برای بودجه کوچک توسعه‌اند: max=5، idle=10s، acquire/connect=1s، statement=1s، query=1.2s. query deadline صریح probe جلوی خنثی‌شدن آن توسط URL را می‌گیرد. در شکست query، client با release(true) حذف می‌شود؛ صف acquire نیز timeout و cleanup واقعی pg دارد. idle error با event ثابت مدیریت می‌شود؛ shutdown رسمی Nest و finally در CLI منابع را می‌بندند. هیچ Promise.race بدون cleanup ساخته نشده است.

migration اولیه فقط namespace مشترک app و extension btree_gist را می‌سازد؛ journal را runner رسمی Drizzle مدیریت می‌کند. SQL و metadata نسخه 7 همان ابزار commit شده‌اند. snapshot namespace با generate واقعی هماهنگ و اجرای generate بعدی بدون تغییر بود. هیچ جدول User/Business/Booking یا نمونه نمایشی وجود ندارد. namespace برنامه به معنی tenant سالن نیست.

`DATABASE_URL` اجباری و validation آن مرکزی است؛ خطا فقط نام متغیر و شرط را می‌گوید. CLI همان validator را مصرف می‌کند. env توسعه در test خوانده نمی‌شود؛ `TEST_DATABASE_URL` fallback به DATABASE_URL ندارد. مقصد تست نام/میزبان مجاز و فاقد query parameter است تا override مقصد از URL ممکن نباشد. هر suite فقط دیتابیس UUID متعلق به خود را می‌سازد و حذف می‌کند؛ اجراها روی مقصد مشترک هم‌زمان migration/DROP ندارند.

## قرارداد قابل مشاهده

- `GET /api/v1/health/readiness` با query واقعی SELECT 1: پاسخ 200، data.status=ok و request-id یکسان در header/meta.
- قطع DB، timeout یا خطای query: پاسخ 503 با SERVICE_UNAVAILABLE، پیام «سرویس موقتاً آماده پاسخ‌گویی نیست.» و retryable=false. log هم code صحیح 503 را از مرجع مشترک error می‌گیرد.
- liveness در قطعی 200 می‌ماند؛ پس از برگشت DB، readiness همان app دوباره 200 می‌شود.
- پاسخ/log عمومی URL، host، نام DB، SQL، credential، stack یا exception خام ندارند. OpenAPI واقعی 200/503 فقط dev/test فعال است؛ fallback ریشه و قراردادهای اسپرینت ۱ حفظ شدند.

## فایل‌های اصلی

| مسیر | مسئولیت |
|---|---|
| `apps/api/src/database/database.provider.ts` و `database.module.ts` | مالکیت Pool/Drizzle، DI و shutdown |
| `database-health.port.ts` و `postgres-health-check.ts` | قرارداد Health و adapter محدود از نظر زمان |
| `schema.ts`، `drizzle.config.ts` و `apps/api/drizzle/` | namespace واقعی و artifactهای migration |
| `apps/api/src/database/migrate.ts` | CLI مستقل runner رسمی، exit درست و finally |
| `apps/api/src/config/environment.ts` | validation مرکزی بدون echo مقدار |
| `apps/api/src/modules/health/` | readiness، DI و پاسخ HTTP |
| `apps/api/test/database.integration-spec.ts` | migration از صفر، journal/hash و اجرای مجدد |
| `apps/api/test/readiness.integration-spec.ts` | قطعی/recovery، timeout، صف Pool و privacy |
| `apps/api/test/helpers/test-database.ts` | guard مقصد و مالکیت cleanup |
| `compose.yml` و `.github/workflows/ci.yml` | image هماهنگ، محیط محلی و CI واقعی |

در جدول، فایل‌های بدون prefix در ردیف database در همان پوشه `apps/api/src/database/` هستند. [ساختار واقعی کامل](../../architecture/codebase-structure.md) و [درس با فایل واقعی](../../learning/sprint-02.md) به‌روز شدند.

## محیط، نسخه و سازگاری

Node **24.22.2**، npm **11.19.1**، TypeScript **6.0.2**، Drizzle ORM **0.45.4**، pg/@types/pg **8.23.1**، drizzle-kit **0.31.11** و dotenv **18.0.9** exact نصب شدند؛ engine/peer/optional metadata پیش از نصب بررسی شد. strict/NodeNext و Vitest موجود حفظ شدند. runner/transformer دوم، نصب global یا telemetry اضافه نشد. نسخه dependencyهای موجود عوض نشده است؛ lockfile واحد ریشه شامل dependencyهای تازه و platformهای اختیاری آن‌هاست.

image رسمی مشترک توسعه/CI:

```text
postgres:17.11-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5
```

tag و digest از Docker Hub و official-images بررسی شدند. daemon Docker این دستگاه پاسخ نداد؛ اجرای کانتینر محلی ادعا نمی‌شود. یک cluster اختصاصی PostgreSQL **17.11 Homebrew** در `work/sprint-02-postgres/data`، bind فقط 127.0.0.1 و پورت 55432 ساخته شد. سرویس و دیتابیس شخصی دستکاری نشدند. Compose با healthcheck، volume نام‌دار و bind localhost نوشته و config آن validate شد؛ down عادی volume را حذف نمی‌کند.

نصب اولیه ابزار در شبکه timeout داشت؛ همان نسخه‌ها با ترجیح IPv4 دوباره نصب شدند. force/legacy-peer-deps استفاده نشد. npm ci از lockfile موفق بود. هشدار scriptهای اختیاری esbuild/fsevents با فعال‌کردن کورکورانه scriptها دور زده نشد؛ generate/build/test روی همین نصب موفق بودند.

## فرمان‌ها و نتیجه واقعی محلی

فرمان‌ها از ریشه و با runtime منتخب روی PATH اجرا شدند؛ TEST_DATABASE_URL به DB مدیریتی اختصاصی با نام hair_salon_test_admin اشاره داشت.

| فرمان / بررسی | نتیجه |
|---|---|
| `npm install` با نسخه‌های exact و سپس `npm ci` | موفق، نصب تکرارپذیر از lockfile |
| `npm run check` | exit 0؛ build/typecheck/lint/format:check و تمام تست‌ها |
| `npm test` | ۴۳ تست واحد؛ config و HealthService از Port؛ موفق |
| `npm run test:e2e` | ۳۲ تست؛ HTTP، OpenAPI، guard و startup فرایند واقعی؛ موفق |
| `npm run test:integration` | ۹ تست با PostgreSQL واقعی، دو فایل متوالی؛ موفق |
| `npm run db:migrate` | اجرای مستقل روی DB اختصاصی خالی، exit 0 و پایان فرایند |
| Drizzle Kit generate پس از هماهنگی snapshot | No schema changes؛ migration اضافی تولید نشد |
| `docker compose -f compose.yml config --quiet` | exit 0؛ فقط validation تنظیمات، نه اجرای کانتینر |
| `git diff --check` | موفق |
| `npm audit --omit=dev --json` | صفر advisory شناخته‌شده runtime در زمان بررسی |
| `npm audit --json` | چهار moderate در ابزار توسعه؛ جزئیات زیر |

مجموع **۸۴ تست** واقعی موفق بودند؛ ۹ integration جایگزین با SQLite یا mock نشده‌اند. migration تست‌ها child process واقعی است و بعد از پایان منابعش باز نمی‌مانند. بررسی‌های قبلی اسپرینت ۱ جای تست جدید استفاده نشدند؛ تمام آن‌ها در check تازه دوباره اجرا شدند.

چهار moderate از زنجیره dev-only Drizzle Kit و esbuild 0.18.20 با advisory GHSA-67mh-4wv8-2f99 هستند؛ مربوط به esbuild dev server که پروژه آن را اجرا نمی‌کند. npm پیشنهاد downgrade ناسازگار ابزار می‌دهد؛ اعمال نشد. این محدودیت در ADR-004 ثبت و در patch بعدی ابزار باید بازبینی شود؛ صفر هشدار کل dependencyها ادعا نمی‌شود.

## تست DB چه چیزی را اثبات کرد؟

- DB خالی فاقد app/drizzle بود؛ بعد migration، app و btree_gist و journal واقعی وجود داشتند، app هیچ جدول محصولی نداشت و hash journal با SQL یکسان بود. اجرای دوم سطر journal را تغییر نداد.
- اتصال‌های DB UUID خود suite با ALLOW_CONNECTIONS=false و terminate قطع شدند؛ idle error امن ثبت شد، readiness=503 و liveness=200 بودند؛ با بازگشت DB همان app=200 شد.
- پنج اتصال Pool قرض گرفته شدند؛ probe منتظر timeout ماند، 503 داد و waitingCount صفر شد؛ با release اتصال‌ها recovery انجام شد.
- relay به PostgreSQL واقعی، handshake یا پاسخ query را بی‌پاسخ کرد؛ timeout محدود و حذف socket/Pool بررسی شدند. حتی query_timeout طولانی در URL deadline probe را تغییر نداد.
- پورت بسته و credential sentinel جدا آزموده شدند؛ HTTP با DB خاموش boot شد و متن sentinel در log نبود. URL نامعتبر/غایب در unit و startup واقعی با exit 1 و بدون echo مقدار رد شد. CLI migration نیز در نبود/نامعتبر/قطع بودن target با exit 1 پایان یافت.

## اجرای زنده پس از check و توقف

جدا از Vitest، `npm run db:migrate` و سپس برنامه ساخته‌شده در production روی پورت آزاد اجرا شدند. PostgreSQL فقط cluster اختصاصی همین کار بود؛ stop/start با pg_ctl روی مسیر همان cluster انجام شد.

| وضعیت | liveness | readiness | شاهد |
|---|---|---|---|
| startup در حالی که DB خاموش است | 200 | 503 | Pool lazy، فرایند زنده |
| روشن‌شدن DB | 200 | 200 | همان PID برنامه |
| توقف فیزیکی دوباره DB | 200 | 503 | پاسخ امن و request-id صحیح |
| روشن‌شدن دوباره DB | 200 | 200 | recovery بدون restart API |
| production docs | — | — | /api/docs برابر 404 |
| SIGTERM | — | — | فرایند با signal بسته شد؛ پورت بسته و log بدون sentinel |

DB موقت smoke حذف و cluster اختصاصی هم در پایان متوقف شد؛ API و relay آزمایشی روشن باقی نماندند. guard/cleanup تست‌ها فقط DB ساخته‌شده خودشان را حذف کردند. پیش از smoke تنها DB تست مدیریتی باقی مانده بود.

## Git، CI و پذیرش

baseline: PR #1 روی main و PR #2 طرح روی شاخه foundation در شروع باز بودند. شاخه `feat/sprint-02-database` از `54c4349` ساخته شد؛ [PR #3](https://github.com/Aliabnrm/hair-salon/pull/3) به `docs/sprint-02-plan` وابسته است. ترتیب مرور #1 → #2 → #3 است؛ main مستقیم تغییر نکرد و هیچ PR خودکار merge نشد. commitهای معنادار پیاده‌سازی، استقلال env تست و مستندات با زمان واقعی ساخته و push شدند.

اجرای اولیه CI روی commit `5946ff0` با نتیجه success و PostgreSQL رسمی ثبت شد: [run 40846052950](https://github.com/Aliabnrm/hair-salon/actions/runs/40846052950). تغییر نهایی استقلال env نیز محلی دوباره check و smoke شد؛ CI آخرین commit مرجع آنلاین زیر است.

CI از clone تمیز، Node منتخب، npm ci و check شامل PostgreSQL واقعی با همان image استفاده می‌کند. [Checks آخرین commit PR](https://github.com/Aliabnrm/hair-salon/pull/3/checks) مرجع نتیجه آنلاین همان SHA است؛ موفقیت محلی جدا از CI ثبت شده و نتیجه نهایی CI پس از مشاهده در تحویل اعلام می‌شود.

| معیار | شاهد |
|---|---|
| S2-AC-01 | npm ci/check محلی، README دقیق و نصب از checkout در CI |
| S2-AC-02 | unit URL و startup compiled با env غایب/نامعتبر، بدون sentinel |
| S2-AC-03 | integration migration از صفر، app/btree_gist/journal/hash و اجرای دوم |
| S2-AC-04 | PostgreSQL واقعی، 200/503، timeout و liveness مستقل |
| S2-AC-05 | recovery همان app، صف/socket cleanup، SIGTERM و پورت بسته |
| S2-AC-06 | response/logهای ثبت‌شده بدون sentinel/URL/SQL/DB identity |
| S2-AC-07 | check محلی ۸۴ تست؛ نتیجه CI همان SHA در PR checks |
| S2-AC-08 | ADR، README، قرارداد، ساختار، راهنمای تست، این گزارش و درس فارسی |

مرور diff، مرز import، تکرار، مدیریت خطا، dependencyها و اطلاعات حساس انجام شد. common به Health وابسته نیست؛ HealthService فقط Port را می‌شناسد؛ pool/query فقط در adapter و CLI هستند. any/ts-ignore/cast پنهان‌کننده خطا و GenericRepository اضافه نشدند. آموزش کوتاه FK/index/transaction ادعای ساخته‌شدن مدل رزرو ندارد.

## محدودیت و روش امتحان

طبق [README](../../../README.md)، DB توسعه و دیتابیس مدیریتی تست را آماده کنید؛ check به TEST_DATABASE_URL صریح نیاز دارد. برای مشاهده رفتار، هر دو مسیر Health را با curl بخوانید و فقط Compose همین پروژه را stop/start کنید. migration از یک فرایند اجرا شود و پس از اعمال ویرایش نشود؛ forward-fix/backup/restore جای rollback خودکار ادعایی را می‌گیرد.

اجرای Docker محلی، load test، نسخه migration آینده، restore عملیاتی، SMS، auth، جدول‌های محصول، UI و deploy انجام نشده‌اند. PostgreSQL محلی واقعی و CI شاهدهای جدا هستند. اسپرینت ۳ تنها پس از طرح و تأیید مربوط شروع می‌شود.
