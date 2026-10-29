# Hair Salon

A modular NestJS API for a salon booking platform in Iran, developed incrementally with documented decisions and automated tests.

پلتفرم رزرو و مدیریت سالن برای ایران؛ توسعه مرحله‌ای با NestJS و آموزش معماری بک‌اند. اسپرینت‌های ۱ و ۲ پایه API و PostgreSQL را فراهم می‌کنند: تنظیمات معتبر، شناسه درخواست، خطای امن، OpenAPI و liveness. این endpoint فقط زنده‌بودن فرایند را نشان می‌دهد؛ برای بررسی اتصال دیتابیس، readiness جداگانه داریم؛ SMS یا آمادگی production در این پایه اثبات نشده است.

## اجرای محلی

پیش‌نیاز: Node.js **24.22.2** (فایل `.nvmrc`) و npm **11.19.1**. با مدیر نسخه دلخواه نسخه مشخص‌شده را فعال کنید؛ برای nvm:

```sh
nvm install
nvm use
npm ci
cp apps/api/.env.example apps/api/.env
npm run db:up
npm run db:migrate
npm run dev
```

در محیط فعلی یک runtime محلی تأییدشده نیز در `work/runtime/` موجود است. برای استفاده در همان ترمینال، پیش از فرمان‌های npm:

```sh
export PATH="$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PATH"
```

این مسیر فقط برای همین دستگاه macOS ARM است و بخشی از کد قابل انتقال پروژه نیست. روی دستگاه دیگر از `.nvmrc` استفاده کنید. هیچ نصب global لازم نیست.

برنامه روی `127.0.0.1:3001` گوش می‌دهد. برای توقف، `Ctrl+C` بزنید. مقدار `PORT` فقط عدد صحیح ۱ تا ۶۵۵۳۵ و `NODE_ENV` یکی از `development`، `test` یا `production` است؛ نبود این متغیرها به‌ترتیب 3001 و development می‌دهد. مقدار نامعتبر پیش از listen اجرا را با exit ناموفق متوقف می‌کند. `DATABASE_URL` اجباری است: فقط URL با protocol برابر postgres/postgresql و host و نام database معتبر پذیرفته می‌شود؛ پیام خطا مقدار آن را نشان نمی‌دهد. URL معتبر و DB خاموش مانع بالا آمدن HTTP نیست. `.env` خصوصی و خارج از نسخه‌بندی است؛ تست‌ها آن را نمی‌خوانند. متغیر محیطی ترمینال بر `.env` اولویت دارد.

```sh
curl -i -H 'X-Request-Id: local-demo' http://127.0.0.1:3001/api/v1/health/liveness
```

```json
{"data":{"status":"ok"},"meta":{"request_id":"local-demo"}}
```

هدر `X-Request-Id` نیز `local-demo` است. یک شناسه تک‌مقداری با ۱ تا ۶۴ حرف انگلیسی، عدد، `_` یا `-` پذیرفته می‌شود؛ مقدار غایب، تکراری یا نامعتبر با UUID جایگزین می‌شود. این شناسه برای ارتباط پاسخ و log است و مجوز دسترسی ایجاد نمی‌کند.

مسیر ناموجود، HTTP 404 و `error.code=NOT_FOUND` برمی‌گرداند. خطای داخلی پیام عمومی فارسی دارد؛ متن exception یا stack در پاسخ و log عمومی ثبت نمی‌شود. log هر درخواست فقط event، شناسه، method، status و مدت را ثبت می‌کند.

## مستند API و فرمان‌ها

در development/test: [Swagger UI](http://127.0.0.1:3001/api/docs) و [OpenAPI JSON](http://127.0.0.1:3001/api/openapi.json). این مسیرها در production ثبت نمی‌شوند. Schema از DTO و decoratorهای واقعی تولید می‌شود.

| فرمان در ریشه | کاربرد |
|---|---|
| `npm run dev` | توسعه با بازسازی پس از تغییر |
| `npm run build` | خروجی ESM در `apps/api/dist` |
| `npm start` | اجرای خروجی ساخته‌شده |
| `npm run typecheck` | بررسی نوع کد و تست‌ها |
| `npm run lint` | بررسی Oxlint، بدون ویرایش |
| `npm run format:check` | بررسی Prettier، بدون ویرایش |
| `npm run format` | قالب‌بندی صریح کد API |
| `npm test` | تست واحد تنظیمات، بدون watch |
| `npm run test:e2e` | build و تست HTTP/شروع برنامه، بدون watch |
| `npm run db:up` | PostgreSQL توسعه با Compose و انتظار healthcheck |
| `npm run db:down` | توقف Compose؛ volume توسعه حفظ می‌شود |
| `npm run db:migrate` | build و اجرای migration مستقل؛ web آن را خودکار اجرا نمی‌کند |
| `npm run test:integration` | build و تست واقعی PostgreSQL با مقصد محافظت‌شده |
| `npm run check` | build، typecheck، lint، format:check، unit، HTTP و integration؛ نیازمند DB تست |

یک npm workspace با نام `@hair-salon/api` و فقط یک `package-lock.json` در ریشه داریم؛ نصب از ریشه انجام شود. خروجی build، runtime محلی و پکیج‌های نصب‌شده نسخه‌بندی نمی‌شوند.

## دیتابیس و تست واقعی

پیش‌نیاز معمول: Docker و **daemon فعال**، Compose، و پورت آزاد `54329` روی localhost. image رسمی PostgreSQL **17.11-bookworm** با digest یکسان در `compose.yml` و CI ثبت شده است. credential نمونه صرفاً محلی و ساختگی است. داده توسعه در volume نام‌دار نگهداری می‌شود؛ `db:down` آن را حذف نمی‌کند. `docker compose down --volumes` داده همین پروژه را حذف می‌کند و فقط برای پاک‌سازی عمدی محیط یک‌بارمصرف است.

در نبود Docker، PostgreSQL **17.11** محلی مجاز است؛ یک نمونه اختصاصی با پورت آزاد بسازید و URL نمونه را متناسب آن تنظیم کنید. سرویس و دیتابیس شخصی را reset نکنید. در اجرای ثبت‌شده این دستگاه، نمونه مستقل روی پورت `55432` استفاده شد؛ فایل‌های ignored در `work/` پیش‌نیاز clone دیگر نیستند.

برای تست، یک دیتابیس مدیریتی جدا با نام تست بسازید (فرمان ایجاد فقط بار اول):

```sh
docker compose exec -T postgres createdb -U hair_salon_local hair_salon_test_admin
export TEST_DATABASE_URL='postgresql://hair_salon_local:local_only_password@127.0.0.1:54329/hair_salon_test_admin'
npm run check
```

کاربر تست باید اجازه `CREATEDB` و مدیریت اتصال‌های دیتابیس‌های خودش را داشته باشد؛ کاربر محلی image این اختیار را دارد. runner به `.env` توسعه یا `DATABASE_URL` fallback نمی‌کند. فقط hostهای `127.0.0.1`، `localhost`، `[::1]` و نام سرویس CI یعنی `postgres` مجازند. نام مقصد باید با `hair_salon_test_` شروع یا با `_test` تمام شود؛ query parameter هم مجاز نیست تا host/database را دور نزند.

هر suite دیتابیس تازه با UUID می‌سازد و فقط همان را در cleanup حذف می‌کند. integrationها موازی روی یک مقصد migration/DROP نمی‌زنند. تست قطع DB فقط دیتابیس موقت خودش را از پذیرش اتصال خارج می‌کند؛ relay محلی نیز اتصال به PostgreSQL واقعی را برای آزمون timeout بی‌پاسخ می‌کند. unit و HTTP مستقل با `npm test` و `npm run test:e2e` بدون DB واقعی اجرا می‌شوند.

```sh
curl -i -H 'X-Request-Id: local-ready' http://127.0.0.1:3001/api/v1/health/readiness
```

DB در دسترس: همان envelope موفق liveness با 200. DB قطع یا timeout: 503، `SERVICE_UNAVAILABLE` و پیام «سرویس موقتاً آماده پاسخ‌گویی نیست.»؛ request-id header/body یکسان و retryable=false. در این حالت liveness همچنان 200 است. پس از برگشت DB، همان فرایند آماده می‌شود. هر probe حداکثر حدود ۱ ثانیه انتظار اتصال و ۱٫۲ ثانیه انتظار query دارد؛ تأخیر زمان‌بندی سیستم جداست.

migration اول فقط namespace مشترک `app` و extension `btree_gist` را می‌سازد؛ journal را Drizzle در `drizzle.__drizzle_migrations` مدیریت می‌کند. هیچ جدول محصولی ساخته نشده است. schema TypeScript در `src/database/schema.ts` منبع namespace و ورودی Drizzle Kit است. ساخت migration بعدی از پوشه `apps/api`، با env معتبر:

```sh
../../node_modules/.bin/drizzle-kit generate --name=describe_change
# برای SQL خارج از schema ابزار:
../../node_modules/.bin/drizzle-kit generate --custom --name=describe_custom_change
```

SQL، journal و snapshot را با هم مرور و commit کنید؛ custom SQL باید با snapshot مربوط هماهنگ باشد. runner رسمی با `npm run db:migrate` اجرا می‌شود؛ در هر زمان فقط یک فرایند migration. فایل migration اعمال‌شده ویرایش نمی‌شود؛ اصلاح با migration تازه و forward-fix است. قبل DDL عملیاتی، backup و روش restore لازم است؛ rollback خودکار امن برای همه تغییرها نداریم. `db push`، synchronize و ویرایش دستی GUI مسیر عادی نیستند.

## مسیر ادامه و یادگیری

- [درس اسپرینت ۱](docs/learning/sprint-01.md): Module، Controller، Service، DI و مسیر درخواست.
- [گزارش اجرا و شواهد](docs/planning/sprints/sprint-01-report.md) و [طرح اسپرینت](docs/planning/sprints/sprint-01-plan.md).
- [ساختار و جهت وابستگی](docs/architecture/codebase-structure.md)، [ابزارها و نسخه‌ها](docs/architecture/adr/ADR-003-sprint-01-tooling.md) و [قواعد عامل](AGENTS.md).
- [راهنمای مستندات](docs/README.md)، [روش همکاری](docs/planning/collaboration-workflow.md) و [برنامه اسپرینت‌ها](docs/planning/sprint-plan.md).
- [روند Git و Pull Request](docs/engineering/git-workflow.md): تغییرهای کوچک، دلیل تصمیم، بررسی خودکار و تاریخچه قابل مرور.
- [گزارش اسپرینت ۲](docs/planning/sprints/sprint-02-report.md)، [درس اسپرینت ۲](docs/learning/sprint-02.md)، [طرح](docs/planning/sprints/sprint-02-plan.md) و [تصمیم دیتابیس](docs/architecture/adr/ADR-004-database-foundation.md): اتصال و migration و readiness با PostgreSQL واقعی.

پایه دیتابیس در محدوده تأییدشده اسپرینت ۲ اضافه شده است؛ احراز هویت، رزرو و UI تابع طرح اسپرینت خود هستند. این پایه محلی، اثبات عملکرد در بار واقعی یا مجوز انتشار عمومی نیست.
