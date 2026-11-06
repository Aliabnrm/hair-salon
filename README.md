# Hair Salon — آراسته

کاتالوگ فارسی سالن‌های منتشرشده و مدیریت سالن برای ایران، با **Next.js، NestJS و PostgreSQL** در یک pnpm workspace. رابط راست‌به‌چپ است؛ قیمت در رابط به تومان و در API به ریال است.

قابلیت‌های فعلی: ورود ایمیل/رمز، مدیریت سالن/خدمات/متخصصان/برنامه، انتشار بررسی‌شده و کاتالوگ واقعی؛ **انتخاب زمان با اشغال واقعی، ثبت قطعی آنلاین، رسید و نوبت‌های من، دفتر روزانه مالک، ثبت تلفنی/حضوری و لغو مالک قبل شروع**. پرداخت در سالن است؛ SMS، تأیید موبایل/ایمیل، بازیابی رمز و لغو/جابه‌جایی مشتری هنوز فعال نیستند. دیتابیس تازه نمونه یا حساب آماده ندارد؛ خالی‌بودن کاوش طبیعی است. این نسخه برای آزمون کنترل‌شده است؛ نتیجه و مرز انتشار در [گزارش۷](docs/planning/sprints/sprint-07-report.md) ثبت می‌شود.

## دریافت پروژه و انتخاب روش اجرا

```sh
git clone https://github.com/Aliabnrm/hair-salon.git
cd hair-salon
```

تمام فرمان‌های این راهنما از **ریشه پروژه** اجرا می‌شوند. در clone تازه، شاخه پیش‌فرض `main` است؛ برای نسخه توسعه، `git switch dev` بزنید. تغییرهای محلی تا پیش از commit/push و ادغام در آن شاخه برای دیگران قابل clone نیستند.

| روش                                            | نیازمندی                                                                               | کاربرد                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [تمام برنامه با Docker](#اجرای-کامل-با-docker) | Git، Docker Engine یا Docker Desktop فعال، Docker Compose نسخه 2.20 یا جدیدتر و Buildx | اجرای فرانت، API، migration و دیتابیس بدون نصب Node یا pnpm روی میزبان |
| [توسعه محلی](#اجرای-محلی-برای-توسعه)           | Git، Node.js 24.22.2، pnpm 12.16.1، PostgreSQL 17.11 محلی یا Docker برای دیتابیس       | ویرایش کد و بازسازی خودکار فرانت/API                                   |

دانلود اولیه imageها و بسته‌ها به اینترنت نیاز دارد. Docker زیر برای **اجرای محلی HTTP** تنظیم شده است: پورت‌ها فقط روی `127.0.0.1` منتشر می‌شوند و credentialها ساختگی‌اند. انتشار عمومی نیازمند تنظیم مستقل HTTPS، secret، backup و عملیات است.

## اجرای کامل با Docker

وضعیت بررسی این نسخه: ساخت imageهای API/فرانت و smoke آن‌ها با PostgreSQL17.11 موقت میزبان موفق بوده است. اجرای DB کانتینری روی دستگاه بررسی به خطای snapshot در Docker Desktop خورده و اجرای کامل Compose هنوز تأیید نشده است؛ [شواهد و محدودیت دقیق](docs/engineering/local-setup-report.md).

ابتدا Docker Desktop را باز کنید یا سرویس Docker Engine را اجرا کنید؛ `docker info` باید بدون خطای اتصال به daemon تمام شود. پورت‌های پیش‌فرض `3000`، `3001` و `54329` باید آزاد باشند.

```sh
docker compose --profile app up --build -d --wait --wait-timeout 180
docker compose --profile app ps -a
```

برای این روش نیازی به ساخت فایل `.env`، نصب Node/pnpm، build روی میزبان یا اجرای دستی migration نیست. Compose این ترتیب را رعایت می‌کند:

1. PostgreSQL آماده می‌شود؛ داده‌ها در volume نام‌دار `postgres_data` ذخیره می‌شوند.
2. سرویس یک‌بارمصرف `migrate`، migrationهای موجود را اعمال می‌کند و با کد `0` خارج می‌شود.
3. API پس از موفقیت migration اجرا و readiness آن بررسی می‌شود.
4. فرانت پس از آماده‌شدن API اجرا می‌شود؛ healthcheck آن ارتباط فرانت→API→DB را می‌سنجد.

`migrate` با وضعیت `Exited (0)` طبیعی است؛ سه سرویس دیگر باید `healthy` باشند. شکست migration مانع شروع API می‌شود. اجرای دوباره فرمان بالا migrationهای اعمال‌شده را تکرار نمی‌کند و داده‌های قبلی باقی می‌مانند. هنگام اولین build، مدت دانلود/ساخت imageها جدا از زمان انتظار healthcheck است.

| سرویس                   | نشانی روی میزبان                                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| برنامه                  | [http://127.0.0.1:3000](http://127.0.0.1:3000)                                                              |
| Swagger API             | [http://127.0.0.1:3001/api/docs](http://127.0.0.1:3001/api/docs)                                            |
| OpenAPI JSON            | [http://127.0.0.1:3001/api/openapi.json](http://127.0.0.1:3001/api/openapi.json)                            |
| readiness از مسیر فرانت | [http://127.0.0.1:3000/api/v1/health/readiness](http://127.0.0.1:3000/api/v1/health/readiness)              |
| PostgreSQL              | `127.0.0.1:54329`، database/user برابر `hair_salon`/`hair_salon_local`، password محلی `local_only_password` |

API داخل کانتینر با `NODE_ENV=development` و خروجی buildشده اجرا می‌شود تا cookie محلی HTTP و ابزار reviewer کار کنند؛ فرانت خروجی production از نوع standalone دارد. هر دو فرایند Node با کاربر غیر root اجرا می‌شوند. bind داخلی کانتینر `0.0.0.0` است؛ محدودیت دسترسی میزبان را Compose اعمال می‌کند. فرانت و API کد میزبان را mount نمی‌کنند؛ پس از تغییر کد، فرمان `up --build` را دوباره اجرا کنید.

فرمان‌های روزمره:

```sh
# مشاهده لاگ؛ Ctrl+C فقط مشاهده لاگ را متوقف می‌کند.
docker compose --profile app logs -f

# توقف سرویس‌ها و حذف کانتینرها؛ دیتابیس در volume باقی می‌ماند.
docker compose --profile app down

# اجرای دوباره با داده قبلی و اعمال تغییرهای جدید
docker compose --profile app up --build -d --wait --wait-timeout 180
```

برای پورت‌های متفاوت، این متغیرها را **پیش از اجرای Compose** در همان ترمینال تنظیم کنید؛ سپس در نشانی برنامه نیز از پورت تازه استفاده کنید. پورت داخلی سرویس‌ها ثابت می‌ماند و Origin مجاز API با پورت فرانت هماهنگ می‌شود:

```sh
export FRONTEND_PORT=3100
export API_PORT=3101
export POSTGRES_PORT=54339
docker compose --profile app up --build -d --wait --wait-timeout 180
```

از `http://127.0.0.1:3100` استفاده کنید. اجرای محلی و Docker را هم‌زمان روی پورت یکسان بالا نیاورید. برای چند checkout مستقل، نام پروژه Compose را با `-p` جدا کنید و در تمام فرمان‌های همان اجرا ثابت نگه دارید؛ نام volume نیز با همان نام پروژه جدا می‌شود.

**حذف عمدی همه داده‌های محیط Docker:** فقط برای محیط آزمایشی یک‌بارمصرف، `docker compose --profile app down --volumes` بزنید. این فرمان کاربران، نشست‌ها و سالن‌های همان volume را حذف می‌کند؛ برای توقف عادی از `down` بدون `--volumes` استفاده کنید.

[Dockerfile](Dockerfile) ساخت چندمرحله‌ای با Node دقیق و نصب از lockfile دارد. [.dockerignore](.dockerignore) مانع ورود `.env` خصوصی، `node_modules`، خروجی build، Git و `work/` به context ساخت است. [compose.yml](compose.yml) قرارداد سرویس‌هاست. secret خصوصی را به build argument یا فایل قابل commit اضافه نکنید.

## اجرای محلی برای توسعه

### ۱. ابزارها و نصب وابستگی‌ها

نسخه Node در [.nvmrc](.nvmrc) و نسخه pnpm در `packageManager` فایل [package.json](package.json) ثبت شده است. برای مثال، اگر nvm از قبل نصب است:

```sh
nvm install
nvm use
node --version
pnpm --version
pnpm install --frozen-lockfile
```

خروجی مورد انتظار Node برابر `v24.22.2` و pnpm برابر `12.16.1` است. اگر pnpm روی PATH ندارید، در **تمام فرمان‌های pnpm این راهنما** به‌جای `pnpm` از `npx --yes pnpm@12.16.1` استفاده کنید؛ این روش نصب global نمی‌خواهد. نمونه: `npx --yes pnpm@12.16.1 install --frozen-lockfile`. npm صرفاً ابزار دریافت pnpm در این حالت است؛ نصب وابستگی‌های پروژه با npm یا ساخت package-lock.json انجام نشود.

### ۲. تنظیم فایل‌های خصوصی

فقط در clone تازه یا وقتی فایل مقصد وجود ندارد:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

**فایل خصوصی موجود را بازنویسی نکنید.** برای checkout موجود، کلیدهای لازم را با نمونه‌ها مقایسه و مقادیر محلی خودتان را حفظ کنید. envها وارد Git نمی‌شوند.

| فایل/تنظیم                               | مقدار محلی پیش‌فرض و معنی                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `backend/.env` → `HOST` / `PORT`         | `127.0.0.1` / `3001`؛ گوش‌دادن API فقط روی میزبان محلی                           |
| `NODE_ENV`                               | `development`؛ production به Origin HTTPS و secret خصوصی نیاز دارد               |
| `DATABASE_URL`                           | نمونه به PostgreSQL روی `127.0.0.1:54329/hair_salon` وصل می‌شود                  |
| `AUTH_ALLOWED_ORIGINS`                   | `http://localhost:3000,http://127.0.0.1:3000`؛ فقط Origin دقیق، بدون `/` انتهایی |
| `AUTH_RATE_LIMIT_SECRET`                 | نمونه فقط محلی است؛ برای محیط مشترک، مقدار تصادفی خصوصی ۳۲ تا ۲۵۶ نویسه لازم است |
| `frontend/.env.local` → `BACKEND_ORIGIN` | `http://127.0.0.1:3001`؛ فقط سرور Next، هرگز `NEXT_PUBLIC_...` نشود              |
| `NEXT_TELEMETRY_DISABLED`                | `1`؛ در فرمان‌ها و image نیز غیرفعال است                                         |

مرورگر درخواست‌ها را به `/api/v1` همان فرانت می‌فرستد و Next به API proxy می‌کند. `BACKEND_ORIGIN` در rewrite هنگام **build** ثبت می‌شود؛ تغییر آن نیازمند build دوباره یا راه‌اندازی مجدد dev است. داخل Docker مقصد `http://api:3001` است؛ `127.0.0.1` در یک کانتینر به کانتینر دیگر اشاره نمی‌کند. متغیر محیطی ترمینال بر فایل env اولویت دارد.

### ۳. دیتابیس و migration

روش ساده با Docker، فقط برای دیتابیس:

```sh
pnpm run db:up
pnpm run db:migrate
```

`db:up` فقط سرویس `postgres` را اجرا می‌کند. برای توقف آن، `pnpm run db:down` بزنید؛ داده در volume می‌ماند. این فرمان Compose را متوقف می‌کند؛ آن را هنگام استفاده هم‌زمان از stack کامل همین پروژه اجرا نکنید.

**بدون Docker:** PostgreSQL **17.11** با extension `btree_gist` و ICU collation `und-x-icu` فراهم کنید؛ از نمونه اختصاصی استفاده کنید. با حساب مدیر PostgreSQL، یک role محلی و دیتابیس بسازید؛ `createuser` رمز را تعاملی می‌پرسد:

```sh
createuser --pwprompt --createdb hair_salon_local
createdb --owner=hair_salon_local hair_salon
```

در `backend/.env`، `DATABASE_URL` را مطابق host/port/رمز همین نمونه تنظیم کنید؛ نویسه‌های ویژه رمز در URL باید percent-encode شوند. سپس `pnpm run db:migrate` بزنید. اگر role یا DB موجود است، دوباره نسازید و داده قبلی را reset نکنید. کاربر migration باید اختیار لازم برای ساخت schema/extension را داشته باشد؛ مدیر DB می‌تواند `btree_gist` را از قبل نصب کند.

migration مستقل از شروع API است؛ پس از دریافت تغییرهای تازه نیز آن را اجرا کنید. SQL و journal در `backend/drizzle/` قرار دارند؛ migration اعمال‌شده ویرایش نمی‌شود. ارتقای اسپرینت۵ داده‌های قدیمی را نگه می‌دارد؛ سالن قدیمی draft، متخصص قدیمی مخفی و دسته خدمت قدیمی خالی می‌ماند تا مالک آن‌ها را تکمیل کند.

### ۴. شروع API و فرانت

ترمینال اول، از ریشه:

```sh
pnpm run dev
```

ترمینال دوم، از ریشه:

```sh
pnpm run dev:frontend
```

[برنامه](http://127.0.0.1:3000) و [Swagger](http://127.0.0.1:3001/api/docs) را باز کنید. برای کار با نشست، یک مبدأ ثابت انتخاب کنید؛ بین localhost و 127.0.0.1 جابه‌جا نشوید. توقف هر فرایند با `Ctrl+C` است؛ توقف API/فرانت داده DB را حذف نمی‌کند.

برای اجرای محلی خروجی buildشده، ابتدا `pnpm run build`، سپس در یک ترمینال `pnpm start` برای **API** و در ترمینال دیگر `pnpm --filter @hair-salon/frontend start` برای **فرانت** بزنید. `pnpm start` به‌تنهایی کل برنامه را اجرا نمی‌کند.

## بررسی کارکرد و ساخت اولین سالن

```sh
curl --fail http://127.0.0.1:3001/api/v1/health/liveness
curl --fail http://127.0.0.1:3000/api/v1/health/readiness
```

پاسخ موفق `data.status=ok` دارد. liveness فقط زنده‌بودن API است؛ readiness اتصال PostgreSQL را هم بررسی می‌کند. قطع DB باید readiness را با 503 ناموفق کند. Swagger و OpenAPI فقط در development/test فعال‌اند.

1. در `/sign-up` با ایمیل آزمایشی و رمز ۱۲ تا ۱۲۸ نویسه ثبت‌نام و سپس در `/sign-in` وارد شوید. ثبت‌نام ورود خودکار ندارد؛ فاصله‌های رمز حذف نمی‌شوند.
2. در `/manage` سالن بسازید و مشخصات، دسته خدمات، قیمت/مدت، متخصصان قابل نمایش و ساعات را تکمیل کنید.
3. در تب «انتشار»، نقص‌ها را برطرف کنید، پیش‌نمایش را ببینید، رضایت انتشار اطلاعات عمومی را تأیید و «انتشار سالن» را بزنید.
4. سالن همان لحظه برای مشتری در کاوش و `/salons/[businessId]` دیده می‌شود؛ حساب reviewer برای انتشار عادی لازم نیست. انتخاب ساعت هنوز رزرو نیست؛ ثبت نهایی و رسید لازم‌اند.
5. ویرایش معتبر قیمت یا برنامه، انتشار را حفظ می‌کند؛ اطلاعات ناقص سالن را draft می‌کنند و تکمیل آن نیاز به انتشار دوباره مالک دارد. نوبت قبلی حفظ و تغییر برنامه ناسازگار با رزرو رد می‌شود.

### مدیریت استثنایی انتشار در توسعه

پنل `/review` برای تعلیق با دلیل، رفع تعلیق و درخواست‌های قدیمی است؛ مرحله اجباری ثبت سالن نیست. برای آزمودن نظارت، حساب مستقل موجود را با ابزار زیر فعال کنید. مالک امکان بررسی مدیریتی سالن خودش را ندارد. ابزار فقط در development/test همراه دلیل کار می‌کند؛ USER_UUID شناسه واقعی محلی است و هیچ حسابی خودکار این اختیار را نمی‌گیرد. این CLI راه مدیریت دسترسی production نیست.

```sh
# اجرای محلی؛ پس از pnpm run build
NODE_ENV=development pnpm --filter @hair-salon/api exec node dist/database/reviewer-permission.js grant USER_UUID "بررسی محلی انتشار"
NODE_ENV=development pnpm --filter @hair-salon/api exec node dist/database/reviewer-permission.js revoke USER_UUID "پایان بررسی محلی"

# اجرای کامل Docker؛ روی سرویس api آماده
docker compose --profile app exec api node dist/database/reviewer-permission.js grant USER_UUID "بررسی محلی انتشار"
docker compose --profile app exec api node dist/database/reviewer-permission.js revoke USER_UUID "پایان بررسی محلی"
```

## تست و بررسی کیفیت

| فرمان در ریشه                                        | کاربرد                                              |
| ---------------------------------------------------- | --------------------------------------------------- |
| `pnpm run build` / `pnpm run typecheck`              | ساخت هر دو workspace / بررسی نوع کد و تست‌ها        |
| `pnpm run lint` / `pnpm run format:check`            | بررسی بدون تغییر فایل                               |
| `pnpm run format`                                    | اعمال صریح قالب مشترک Prettier                      |
| `pnpm test`                                          | تست واحد هر دو بخش                                  |
| `pnpm run test:e2e`                                  | تست HTTP و boot واقعی API                           |
| `pnpm run test:integration`                          | تست PostgreSQL واقعی با DB موقت اختصاصی             |
| `pnpm run test:browser`                              | Playwright با فرانت production، API و DB واقعی      |
| `pnpm run check`                                     | مجموعه build، typecheck، lint، format و تمام تست‌ها |
| `pnpm run docker:up` / `docker:down` / `docker:logs` | میان‌بر Compose کامل؛ روش Docker به pnpm نیاز ندارد |

برای `check` به Node/pnpm محلی، PostgreSQL تست و Chromium نیاز است؛ imageهای اجرایی Docker ابزار تست را شامل نمی‌شوند. در روش Docker کامل یا DB-only، فقط بار اول دیتابیس مدیریتی تست بسازید:

```sh
docker compose exec -T postgres createdb -U hair_salon_local hair_salon_test_admin
export TEST_DATABASE_URL='postgresql://hair_salon_local:local_only_password@127.0.0.1:54329/hair_salon_test_admin'
pnpm --filter @hair-salon/frontend exec playwright install chromium
export BACKEND_ORIGIN='http://127.0.0.1:3001'
pnpm run check
```

اگر پورت DB را عوض کرده‌اید، URL تست را نیز هماهنگ کنید. برای PostgreSQL بدون Docker، با همان role دارای `CREATEDB` دیتابیس `hair_salon_test_admin` بسازید. **از URL دیتابیس توسعه برای تست استفاده نکنید.** runnerها فقط مقصد تست با host محلی یا سرویس `postgres` و نام شروع‌شده با `hair_salon_test_` یا پایان‌یافته با `_test` را می‌پذیرند؛ به `.env` توسعه fallback نمی‌کنند. هر suite DB تازه خودش را می‌سازد و فقط همان را حذف می‌کند.

در صورت وجود Chrome نصب‌شده می‌توان `PLAYWRIGHT_CHANNEL=chrome pnpm run check` اجرا کرد. CI مرورگر Chromium و PostgreSQL واقعی را فراهم می‌کند؛ موفقیت محلی جای CI همان commit روی GitHub نیست.

## رفع اشکال

| نشانه                                    | بررسی و اقدام                                                                                                                                       |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot connect to the Docker daemon`    | Docker Desktop/Engine را اجرا کنید؛ تا موفقیت `docker info`، Compose قابل آزمون نیست.                                                               |
| `docker-credential-desktop` پیدا نمی‌شود | نصب رسمی Docker و PATH ابزارهای آن را بررسی کنید؛ credential helper را حذف یا تنظیم امنیتی Docker را خاموش نکنید.                                   |
| دانلود image یا package ناموفق           | دسترسی شبکه به Docker Hub و npm registry را بررسی کنید؛ خطای TLS/دسترسی/نسخه را رفع کنید و integrity را خاموش نکنید.                                |
| پورت اشغال است                           | سرویس دیگر خودتان را متوقف یا پورت‌های Compose را طبق بخش Docker تغییر دهید. در اجرای محلی، PORT و BACKEND_ORIGIN و Origin فرانت باید هماهنگ باشند. |
| `migrate` ناموفق یا API/فرانت unhealthy  | `docker compose --profile app logs migrate api frontend postgres` و `ps -a` را بررسی کنید؛ برای رفع خطا volume را حذف نکنید.                        |
| خطای ICU یا `btree_gist`                 | PostgreSQL 17.11 سازگار با ICU و extension لازم فراهم کنید؛ image pinشده Compose همین مبناست.                                                       |
| ورود 403 یا cookie باقی نمی‌ماند         | آدرس مرورگر با `AUTH_ALLOWED_ORIGINS` دقیقاً یکی باشد؛ API محلی با development و HTTP اجرا شود. mutationها Origin معتبر و JSON می‌خواهند.           |
| API درست است ولی فرانت 502 می‌دهد        | BACKEND_ORIGIN، شبکه و مقصد rewrite را بررسی کنید؛ پس از تغییر آن rebuild کنید. در Docker مقصد `api:3001` است.                                      |
| کاوش خالی است یا سالن 404 دارد           | سالن باید کامل باشد و مالک «انتشار سالن» را بزند؛ ساخت اولیه به‌تنهایی آن را عمومی نمی‌کند.                                                         |
| تست DB از اجرا خودداری می‌کند            | TEST_DATABASE_URL اختصاصی تست و مجوز CREATEDB را بررسی کنید؛ محافظ تست را دور نزنید.                                                                |

## ساختار و مستندات

- `backend/`: API ماژولار NestJS، قوانین دامنه، persistence و migrationهای Drizzle.
- `frontend/`: Next.js App Router، رابط فارسی و تست‌های مرورگر.
- `docs/`: طرح‌ها، تصمیم‌ها، گزارش‌های واقعی و آموزش فارسی.
- یک [pnpm workspace](pnpm-workspace.yaml) و فقط `pnpm-lock.yaml` ریشه؛ پوشه `work/`، env، خروجی build و dependencyهای نصب‌شده جزو clone لازم نیستند.

[فهرست مستندات](docs/README.md)، [وضعیت اسپرینت‌ها](docs/planning/sprint-plan.md)، [معماری کد](docs/architecture/codebase-structure.md)، [قرارداد API](docs/architecture/api-contracts.md)، [استاندارد کیفیت](docs/engineering/quality-gates.md) و [روند Git](docs/engineering/git-workflow.md).

نتیجه اسپرینت۵: [گزارش اجرا](docs/planning/sprints/sprint-05-report.md)، [درس فارسی](docs/learning/sprint-05.md) و [ADR-009](docs/architecture/adr/ADR-009-reviewed-public-catalog.md). جزئیات ساخت Docker و نتیجه بررسی مستقل آن در [راهنمای تصمیم](docs/architecture/adr/ADR-010-local-docker-runtime.md) و [گزارش راه‌اندازی](docs/engineering/local-setup-report.md) ثبت می‌شوند؛ گزارش‌های اسپرینت‌های قبل شواهد تاریخی همان اجرا هستند.

## امتحان زمان‌های پیشنهادی

یک سالن منتشرشده را از کاوش باز کنید و «بررسی زمان‌ها» را بزنید. مسیر `/salons/<businessId>/times`، خدمت، متخصص یا اولین متخصص آزاد، روز شمسی و خلاصه انتخاب ساعت را نشان می‌دهد. نشانی با service_id/staff_id/date قابل اشتراک است. در نسخه جاری، زمان‌های آزاد از برنامه و اشغال واقعی محاسبه می‌شوند؛ انتخاب زمان رزرو نیست و ثبت قطعی پس از ورود، تکمیل تماس و دریافت رسید انجام می‌شود. حساب reviewer یا داده نمونه واقعی خودکار ساخته نمی‌شود.

API: `GET /api/v1/catalog/salons/<businessId>/availability?service_id=<serviceId>`، عمومی و no-store. راه‌اندازی با فرمان‌های همین README و اجرای تمام migrationهای موجود انجام می‌شود. timezone با Temporal در backend محاسبه می‌شود. تست‌ها با DB موقت خودشان کار می‌کنند و داده توسعه را seed/reset نمی‌کنند.

اسپرینت۶: [گزارش](docs/planning/sprints/sprint-06-report.md)، [درس فارسی](docs/learning/sprint-06.md)، [ساختار](docs/architecture/sprint-06-structure.md) و [منابع](docs/references/sprint-06-engineering-sources.md). تغییرهای این اسپرینت تا commit/push کارفرما فقط محلی‌اند؛ نتیجه قدیمی Docker، شاهد rebuild image نسخه۶ نیست.

## تست چرخه رزرو اسپرینت۷

۱. مالک با حساب فعلی سالن/خدمت/متخصص/برنامه را تنظیم و با رضایت انتشار، سالن را مستقیم عمومی کند؛ reviewer لازم نیست.
۲. مشتری از کاوش یا لینک سالن، زمان را انتخاب و پس از ورود نام/موبایل را وارد کند؛ رسید در `/appointments` می‌ماند.
۳. مالک در `/manage/{businessId}/appointments` روز/متخصص را انتخاب و نوبت آنلاین را ببیند؛ از همان‌جا نوبت تلفنی ثبت یا قبل شروع با دلیل لغو کند.

صفحه مشخصات سالن نقص‌های واقعی آمادگی و گام بعد را نشان می‌دهد. ساعات سالن و متخصص باید جدا تنظیم و برای مدت خدمت و بافرها مشترک باشند. درخواست‌های قدیمیِ در انتظار نیز در صفحه انتشار، با تأیید مالک مستقیم منتشر می‌شوند؛ دوره انتظار تازه نداریم. [ADR-013](docs/architecture/adr/ADR-013-owner-self-publication.md) سیاست جاری است.

«نوبت‌های من» برای مراجعه‌های شخصی حساب است؛ برای دیدن مشتریان وارد «مدیریت سالن‌های من» و سپس «نوبت‌های مشتریان» همان سالن شوید. دفتر ابتدا امروز را نشان می‌دهد؛ تاریخ رزرو را انتخاب کنید. نوبت سالن آزمایشی به دفتر سالن تازه‌ساخته منتقل نمی‌شود.

[پرامپت۷](docs/prompts/sprint-07.md)، [ساختار](docs/architecture/sprint-07-structure.md)، [ADR-012](docs/architecture/adr/ADR-012-booking-ledger.md) و [درس فارسی](docs/learning/sprint-07.md). کلید intent برای بازیابی خطای شبکه نگه داشته می‌شود؛ اطلاعات تماس فقط در حافظه فرم است.

## مدیریت نوبت مشتری — اسپرینت۸

مشتری در «نوبت‌های من» جزئیات نوبت آنلاین خودش را باز می‌کند؛ تا دو ساعت قبل شروع، لغو با تأیید یا تغییر زمان/متخصص برای همان خدمت و سالن ممکن است. مقصد هم حداقل دو ساعت آینده است. کد پیگیری، قیمت/مدت/بافر توافق‌شده ثابت می‌مانند؛ اگر مقصد پر باشد نوبت فعلی محفوظ است. تاریخچه در جزئیات مشتری و مالک دیده می‌شود. در دفتر سالن، روز تازه نوبت را انتخاب و اطلاعات را تازه کنید؛ پیامک و اعلان لحظه‌ای نداریم.

مسیر تازه `/appointments/{appointmentId}/reschedule` است. مشتری پس از مهلت یا برای نوبت لغوشده، دکمه تغییر فعال نمی‌بیند. شماره تماس، رزرو دستی را به حسابی متصل نمی‌کند. همه migrationها از جمله0006 باید پیش از اجرای API تازه اعمال شوند؛ migration جدید داده قبلی را نگه می‌دارد.

[طرح۸](docs/planning/sprints/sprint-08-plan.md)، [پرامپت۸](docs/prompts/sprint-08.md)، [ADR-014](docs/architecture/adr/ADR-014-customer-booking-changes.md)، [رابط۸](docs/architecture/sprint-08-ui.md) و [درس فارسی۸](docs/learning/sprint-08.md). نتیجه اجرای واقعی در [گزارش۸](docs/planning/sprints/sprint-08-report.md) ثبت می‌شود.

## اسپرینت۹ — عملیات روزانه سالن

دفتر روز/۷روز با خلاصه و فیلتر، نتیجه مراجعه و اصلاح دارای دلیل، مسدودی متخصص و رفع آن در ظرفیت مشترک. [طرح۹](docs/planning/sprints/sprint-09-plan.md)، [گزارش۹](docs/planning/sprints/sprint-09-report.md) و [درس۹](docs/learning/sprint-09.md) مرجع دامنه/نتیجه‌اند.
