# Hair Salon

A Persian salon discovery frontend and modular NestJS API, developed incrementally with documented decisions and real PostgreSQL/browser tests.

پلتفرم رزرو و مدیریت سالن برای ایران؛ توسعه مرحله‌ای با NestJS و آموزش معماری بک‌اند. اسپرینت‌های ۱ و ۲ پایه API و PostgreSQL را فراهم می‌کنند: تنظیمات معتبر، شناسه درخواست، خطای امن، OpenAPI و liveness. این endpoint فقط زنده‌بودن فرایند را نشان می‌دهد؛ برای بررسی اتصال دیتابیس، readiness جداگانه داریم؛ SMS یا آمادگی production در این پایه اثبات نشده است.

## اجرای محلی

پیش‌نیاز: Node.js **24.22.2** (فایل `.nvmrc`) و pnpm **12.16.1**. با مدیر نسخه دلخواه نسخه مشخص‌شده را فعال کنید؛ برای nvm:

```sh
nvm install
nvm use
corepack pnpm --version
pnpm install --frozen-lockfile
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
pnpm run db:up
pnpm run db:migrate
pnpm run dev
```

در ترمینال دوم، از ریشه `pnpm run dev:frontend` را اجرا کنید و [آراسته](http://127.0.0.1:3000) را باز کنید. هر دو سمت از `127.0.0.1` استفاده کنند؛ جابه‌جایی خودسرانه به localhost، Origin/cookie را تغییر می‌دهد. مرورگر فقط `/api/v1` هم‌مبدأ را می‌شناسد؛ Next درخواست را با `BACKEND_ORIGIN` به Nest می‌فرستد. این متغیر هنگام **build** در rewrite ثبت می‌شود؛ پس از تغییر مقصد، build را دوباره اجرا کنید.

اگر `backend/.env` از اسپرینت ۲ موجود است، آن را overwrite نکنید؛ `AUTH_ALLOWED_ORIGINS=http://127.0.0.1:3000` و `AUTH_RATE_LIMIT_SECRET` حداقل ۳۲ نویسه را اضافه کنید. نمونه `.env.example` فقط محلی و ساختگی است؛ production آن secret نمونه را رد می‌کند. auth به Origin دقیق و JSON نیاز دارد؛ curl بدون Origin برای mutation رد می‌شود.

در محیط فعلی یک runtime محلی تأییدشده نیز در `work/runtime/` موجود است. برای استفاده در همان ترمینال، پیش از فرمان‌های pnpm:

```sh
export PATH="$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PATH"
```

این مسیر فقط برای همین دستگاه macOS ARM است و بخشی از کد قابل انتقال پروژه نیست. روی دستگاه دیگر از `.nvmrc` استفاده کنید. هیچ نصب global لازم نیست. اگر فرمان pnpm روی PATH نیست، به‌جای آن `corepack pnpm` را اجرا کنید؛ Corepack نسخهٔ packageManager را از package.json می‌خواند. روی محیطی که Corepack ندارد، ابتدا pnpm نسخهٔ مشخص‌شده را طبق [راهنمای رسمی](https://pnpm.io/installation) فراهم کنید.

برنامه روی `127.0.0.1:3001` گوش می‌دهد. برای توقف، `Ctrl+C` بزنید. مقدار `PORT` فقط عدد صحیح ۱ تا ۶۵۵۳۵ و `NODE_ENV` یکی از `development`، `test` یا `production` است؛ نبود این متغیرها به‌ترتیب 3001 و development می‌دهد. مقدار نامعتبر پیش از listen اجرا را با exit ناموفق متوقف می‌کند. `DATABASE_URL` اجباری است: فقط URL با protocol برابر postgres/postgresql و host و نام database معتبر پذیرفته می‌شود؛ پیام خطا مقدار آن را نشان نمی‌دهد. URL معتبر و DB خاموش مانع بالا آمدن HTTP نیست. `.env` خصوصی و خارج از نسخه‌بندی است؛ تست‌ها آن را نمی‌خوانند. متغیر محیطی ترمینال بر `.env` اولویت دارد.

```sh
curl -i -H 'X-Request-Id: local-demo' http://127.0.0.1:3001/api/v1/health/liveness
```

```json
{"data":{"status":"ok"},"meta":{"request_id":"local-demo"}}
```

هدر `X-Request-Id` نیز `local-demo` است. یک شناسه تک‌مقداری با ۱ تا ۶۴ حرف انگلیسی، عدد، `_` یا `-` پذیرفته می‌شود؛ مقدار غایب، تکراری یا نامعتبر با UUID جایگزین می‌شود. این شناسه برای ارتباط پاسخ و log است و مجوز دسترسی ایجاد نمی‌کند.

مسیر ناموجود، HTTP 404 و `error.code=NOT_FOUND` برمی‌گرداند. خطای داخلی پیام عمومی فارسی دارد؛ متن exception یا stack در پاسخ و log عمومی ثبت نمی‌شود. log هر درخواست فقط event، شناسه، method، status و مدت را ثبت می‌کند.

## اجرای دوباره روی همین دستگاه

در تنظیم فعلی این دستگاه، PostgreSQL اختصاصی پروژه در `work/sprint-02-postgres/data` و روی پورت **55432** است؛ `backend/.env` و `frontend/.env.local` خصوصی برای همین اجرا تنظیم شده‌اند. این مسیرها مخصوص همین checkout هستند و جای مسیر Docker در clone تازه را نمی‌گیرند. فرمان‌های زیر برای وقتی‌اند که می‌خواهید سرویس‌ها را دوباره راه بیندازید؛ فرایند در حال اجرای قبلی همان پورت را دوباره اجرا نکنید.

در ترمینال اول، از ریشه پروژه:

```sh
cd /Users/a.abnar/Documents/ChatGPT/hair-salon
export PATH="$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PWD/work/tools/bin:$PATH"
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D "$PWD/work/sprint-02-postgres/data" status || /opt/homebrew/opt/postgresql@17/bin/pg_ctl -D "$PWD/work/sprint-02-postgres/data" -l "$PWD/work/development-postgres.log" -o '-p 55432 -h 127.0.0.1' start
pnpm db:migrate
pnpm dev
```

در ترمینال دوم:

```sh
cd /Users/a.abnar/Documents/ChatGPT/hair-salon
export PATH="$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PWD/work/tools/bin:$PATH"
pnpm dev:frontend
```

[برنامه](http://127.0.0.1:3000) و [Swagger](http://127.0.0.1:3001/api/docs) در دسترس‌اند. از نشانی 127.0.0.1 استفاده کنید تا Origin/cookie با تنظیمات یکی باشد. یک ایمیل آزمایشی و رمز حداقل ۱۲ نویسه ثبت کنید؛ سپس وارد شوید، صفحه را reload و خروج را امتحان کنید. کد تأیید ایمیل/پیامک نداریم و سالن‌ها نمونه‌اند.

برای توقف API و فرانت در هر ترمینال Ctrl+C بزنید. در صورت نیاز، فقط همین نمونه PostgreSQL را با فرمان زیر متوقف کنید؛ داده‌ها حفظ می‌شوند:

```sh
/opt/homebrew/opt/postgresql@17/bin/pg_ctl -D "$PWD/work/sprint-02-postgres/data" stop -m fast
```

## مستند API و فرمان‌ها

در development/test: [Swagger UI](http://127.0.0.1:3001/api/docs) و [OpenAPI JSON](http://127.0.0.1:3001/api/openapi.json). این مسیرها در production ثبت نمی‌شوند. Schema از DTO و decoratorهای واقعی تولید می‌شود.

| فرمان در ریشه | کاربرد |
|---|---|
| `pnpm run dev` | توسعه API با بازسازی پس از تغییر |
| `pnpm run dev:frontend` | رابط Next.js روی 127.0.0.1:3000 |
| `pnpm run build` | ساخت هر دو بخش؛ `backend/dist` و `frontend/.next` |
| `pnpm start` | اجرای خروجی ساخته‌شده |
| `pnpm run typecheck` | بررسی نوع کد و تست‌ها |
| `pnpm run lint` | بررسی Oxlint، بدون ویرایش |
| `pnpm run format:check` | بررسی Prettier، بدون ویرایش |
| `pnpm run format` | قالب‌بندی صریح هر دو workspace |
| `pnpm test` | تست واحد هر دو workspace، بدون watch |
| `pnpm run test:e2e` | build و تست HTTP/شروع برنامه، بدون watch |
| `pnpm run db:up` | PostgreSQL توسعه با Compose و انتظار healthcheck |
| `pnpm run db:down` | توقف Compose؛ volume توسعه حفظ می‌شود |
| `pnpm run db:migrate` | build و اجرای migration مستقل؛ web آن را خودکار اجرا نمی‌کند |
| `pnpm run test:browser` | Playwright با Next production و Nest و PostgreSQL اختصاصی واقعی |
| `pnpm run test:integration` | build و تست واقعی PostgreSQL با مقصد محافظت‌شده |
| `pnpm run check` | build، typecheck، lint، format:check، unit، HTTP، PostgreSQL و مرورگر واقعی؛ نیازمند DB تست و Chromium |

دو پکیج در یک pnpm workspace با نام‌های `@hair-salon/api` و `@hair-salon/frontend` و فقط یک `pnpm-lock.yaml` در ریشه داریم؛ اعضای workspace در `pnpm-workspace.yaml` مشخص‌اند و نصب از ریشه انجام شود. فایل package-lock.json دیگر استفاده نمی‌شود؛ سیاست اسکریپت نصب وابستگی‌ها نیز در همین YAML است و Scarf غیرفعال می‌ماند. [تصمیم و بررسی مهاجرت](docs/architecture/adr/ADR-006-pnpm-workspace.md). خروجی build، runtime محلی و پکیج‌های نصب‌شده نسخه‌بندی نمی‌شوند.

## دیتابیس و تست واقعی

پیش‌نیاز معمول: Docker و **daemon فعال**، Compose، و پورت آزاد `54329` روی localhost. image رسمی PostgreSQL **17.11-bookworm** با digest یکسان در `compose.yml` و CI ثبت شده است. credential نمونه صرفاً محلی و ساختگی است. داده توسعه در volume نام‌دار نگهداری می‌شود؛ `db:down` آن را حذف نمی‌کند. `docker compose down --volumes` داده همین پروژه را حذف می‌کند و فقط برای پاک‌سازی عمدی محیط یک‌بارمصرف است.

در نبود Docker، PostgreSQL **17.11** محلی مجاز است؛ یک نمونه اختصاصی با پورت آزاد بسازید و URL نمونه را متناسب آن تنظیم کنید. سرویس و دیتابیس شخصی را reset نکنید. در اجرای ثبت‌شده این دستگاه، نمونه مستقل روی پورت `55432` استفاده شد؛ فایل‌های ignored در `work/` پیش‌نیاز clone دیگر نیستند.

برای تست، یک دیتابیس مدیریتی جدا با نام تست بسازید (فرمان ایجاد فقط بار اول):

```sh
docker compose exec -T postgres createdb -U hair_salon_local hair_salon_test_admin
export TEST_DATABASE_URL='postgresql://hair_salon_local:local_only_password@127.0.0.1:54329/hair_salon_test_admin'
pnpm --filter @hair-salon/frontend exec playwright install chromium
export BACKEND_ORIGIN='http://127.0.0.1:3001'
pnpm run check
```

کاربر تست باید اجازه `CREATEDB` و مدیریت اتصال‌های دیتابیس‌های خودش را داشته باشد؛ کاربر محلی image این اختیار را دارد. runner به `.env` توسعه یا `DATABASE_URL` fallback نمی‌کند. فقط hostهای `127.0.0.1`، `localhost`، `[::1]` و نام سرویس CI یعنی `postgres` مجازند. نام مقصد باید با `hair_salon_test_` شروع یا با `_test` تمام شود؛ query parameter هم مجاز نیست تا host/database را دور نزند.

برای استفاده از Google Chrome نصب‌شده روی همین دستگاه، `PLAYWRIGHT_CHANNEL=chrome pnpm run check` اجرا کنید؛ CI، Chromium متعلق به Playwright را نصب می‌کند. runner مرورگر build واقعی Next را به پورت آزاد API خودش متصل می‌کند؛ trace حساس ذخیره نمی‌کند و فرایندها/DB خودش را حتی هنگام شکست می‌بندد.

هر suite دیتابیس تازه با UUID می‌سازد و فقط همان را در cleanup حذف می‌کند. integrationها موازی روی یک مقصد migration/DROP نمی‌زنند. تست قطع DB فقط دیتابیس موقت خودش را از پذیرش اتصال خارج می‌کند؛ relay محلی نیز اتصال به PostgreSQL واقعی را برای آزمون timeout بی‌پاسخ می‌کند. unit و HTTP مستقل با `pnpm test` و `pnpm run test:e2e` بدون DB واقعی اجرا می‌شوند.

```sh
curl -i -H 'X-Request-Id: local-ready' http://127.0.0.1:3001/api/v1/health/readiness
```

DB در دسترس: همان envelope موفق liveness با 200. DB قطع یا timeout: 503، `SERVICE_UNAVAILABLE` و پیام «سرویس موقتاً آماده پاسخ‌گویی نیست.»؛ request-id header/body یکسان و retryable=false. در این حالت liveness همچنان 200 است. پس از برگشت DB، همان فرایند آماده می‌شود. هر probe حداکثر حدود ۱ ثانیه انتظار اتصال و ۱٫۲ ثانیه انتظار query دارد؛ تأخیر زمان‌بندی سیستم جداست.

migration اول فقط namespace مشترک `app` و extension `btree_gist` را می‌سازد؛ journal را Drizzle در `drizzle.__drizzle_migrations` مدیریت می‌کند. migration دوم `0001_identity.sql` جدول‌های users، password_credentials، sessions و auth_attempt_buckets را اضافه می‌کند. schema در `backend/src/database/schema.ts` ورودی Drizzle Kit است؛ appSchema در leaf جدا تعریف شده است. ساخت migration بعدی از پوشه `backend` با env معتبر:

```sh
pnpm exec drizzle-kit generate --name=describe_change
# برای SQL خارج از schema ابزار:
pnpm exec drizzle-kit generate --custom --name=describe_custom_change
```

SQL، journal و snapshot را با هم مرور و commit کنید؛ custom SQL باید با snapshot مربوط هماهنگ باشد. runner رسمی با `pnpm run db:migrate` اجرا می‌شود؛ در هر زمان فقط یک فرایند migration. فایل migration اعمال‌شده ویرایش نمی‌شود؛ اصلاح با migration تازه و forward-fix است. قبل DDL عملیاتی، backup و روش restore لازم است؛ rollback خودکار امن برای همه تغییرها نداریم. `db push`، synchronize و ویرایش دستی GUI مسیر عادی نیستند.

## روند توسعه و بازبینی

شاخه `dev` مبنای کارهای بعدی است؛ قبل از هر کار از `origin/dev` به‌روز می‌شود. برای قابلیت، رفع باگ، بازآرایی یا مستندات، شاخه جدا با پیشوند `feat/`، `fix/`، `refactor/` یا `docs/` می‌سازیم. مسیر ادغام: **شاخه کار → PR به dev → PR از dev به main**. هر دو شاخه اصلی به PR و CI موفق نیاز دارند.

دستیار پیاده‌سازی، تست، مستندات و متن پیشنهادی commit را آماده می‌کند؛ **commit و push تغییرهای تازه با کارفرماست**. PR و merge با دستور مربوط انجام می‌شوند. جزئیات و نمونه فرمان‌ها در [روند Git](docs/engineering/git-workflow.md)؛ این دستور جدید جای مجوزهای قبلی commit/push را می‌گیرد.

## مسیر ادامه و یادگیری

- [درس اسپرینت ۱](docs/learning/sprint-01.md): Module، Controller، Service، DI و مسیر درخواست.
- [گزارش اجرا و شواهد](docs/planning/sprints/sprint-01-report.md) و [طرح اسپرینت](docs/planning/sprints/sprint-01-plan.md).
- [ساختار و جهت وابستگی](docs/architecture/codebase-structure.md)، [ابزارها و نسخه‌ها](docs/architecture/adr/ADR-003-sprint-01-tooling.md) و [قواعد عامل](AGENTS.md).
- [راهنمای مستندات](docs/README.md)، [روش همکاری](docs/planning/collaboration-workflow.md) و [برنامه اسپرینت‌ها](docs/planning/sprint-plan.md).
- [روند Git و Pull Request](docs/engineering/git-workflow.md): تغییرهای کوچک، دلیل تصمیم، بررسی خودکار و تاریخچه قابل مرور.
- [گزارش اسپرینت ۲](docs/planning/sprints/sprint-02-report.md)، [درس اسپرینت ۲](docs/learning/sprint-02.md)، [طرح](docs/planning/sprints/sprint-02-plan.md) و [تصمیم دیتابیس](docs/architecture/adr/ADR-004-database-foundation.md): اتصال و migration و readiness با PostgreSQL واقعی.

## اسپرینت ۳ و محدودیت فعلی

کد در `backend/` و `frontend/` است. صفحه کشف، جستجو/فیلتر و انتخاب مکان از Figma Make اقتباس شده‌اند؛ **۱۲ سالن و قیمت‌ها فقط نمونه‌اند**. نوبت، کاتالوگ سروری، رزرو، SMS، تأیید ایمیل و بازیابی رمز ساخته نشده‌اند. `/sign-up`، `/sign-in` و `/account` از API و PostgreSQL واقعی استفاده می‌کنند؛ ثبت‌نام خودکار وارد حساب نمی‌کند و پاسخ ایمیل تکراری با ایمیل تازه یکسان است.

رمز ۱۲ تا ۱۲۸ نویسه، حداکثر ۵۱۲ بایت و بدون حذف فاصله است؛ Argon2id ذخیره می‌شود. نشست هفت‌روزه در PG قابل ابطال است و token خام فقط cookie HttpOnly می‌شود؛ frontend هیچ secret یا token در storage ندارد. پشت proxy محلی، سهمیه IP بین کاربران آن proxy مشترک است؛ این توپولوژی ادعای آمادگی انتشار عمومی ندارد.

[گزارش اجرا](docs/planning/sprints/sprint-03-report.md)، [درس فارسی](docs/learning/sprint-03.md)، [ساختار واقعی](docs/architecture/sprint-03-structure.md)، [تصمیم‌ها](docs/architecture/adr/ADR-005-frontend-backend-layout.md) و [شواهد طراحی](docs/references/sprint-03-figma.md) مرجع مرورند. تغییرها commit/push نشده‌اند؛ remote CI تازه هنوز اجرا نشده و اسپرینت بعد شروع نشده است.
