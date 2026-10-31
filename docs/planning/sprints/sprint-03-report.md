# گزارش اجرای اسپرینت ۳ — آراسته و هویت ایمیل/رمز

> یادداشت پس از تحویل، ۲۰۲۶-۱۰-۳۱: مهاجرت به pnpm درخواست جداگانه کارفرماست؛ [ADR-006](../../architecture/adr/ADR-006-pnpm-workspace.md) و [درس مهاجرت](../../learning/pnpm-migration.md) نتیجه تازه را ثبت می‌کنند. فرمان‌ها و نتایج npm پایین شواهد اجرای اصلی اسپرینت ۳ هستند.

تاریخ: ۲۰۲۶-۱۰-۲۹، Asia/Tehran. وضعیت: **پیاده‌سازی و بررسی محلی تکمیل؛ آماده مرور کارفرما**. مرجع محدوده [طرح](sprint-03-plan.md) و [پرامپت](../../prompts/sprint-03.md) است؛ پیوست اجرایی و مجوز مستقیم computer use کارفرما مبنای اجرا بودند. اسپرینت بعد شروع نشده است. commit/push/PR/merge/deploy انجام نشدند.

## نتیجه و ساختار

API موجود از apps/api به `backend/` منتقل شد؛ هویت `@hair-salon/api`، فایل خصوصی ignored و رفتار پایه حفظ شدند. `frontend/` با Next.js و workspace `@hair-salon/frontend` ساخته شد؛ تنها lockfile ریشه است. شواهد قبلی به‌جای اجرای تازه استفاده نشدند: ابتدا regression انتقال، سپس identity و frontend بررسی شدند.

صفحه کشف آراسته از کد واقعی Figma Make استخراج شد؛ ۱۲ سالن فقط fixture هستند. جستجو، فیلتر مخاطب/خدمت، انتخاب شهر/محله، empty/reset و navigation کار می‌کنند. فونت، photo ID، بردار icon، token و کلاس‌های ظاهر از منبع‌اند؛ App همه‌کاره Make به پروژه کپی نشد. [سند تطبیق، inventory، overlay و ledger](../../references/sprint-03-figma.md) مرز ادعا و تفاوت‌های مجاز را روشن می‌کند.

ثبت‌نام، ورود، /me و خروج از فرم تا PostgreSQL واقعی کامل‌اند. نشست یک مالک state در SessionProvider دارد؛ routeها باریک، hookها مسئول state و تابع فیلتر خالص است. backend قانون و DB را نگه می‌دارد؛ Next فقط UI و proxy هم‌مبدأ است. [ساختار واقعی](../../architecture/sprint-03-structure.md) و [ADR-005](../../architecture/adr/ADR-005-frontend-backend-layout.md) جزئیات را ثبت می‌کنند.

## هویت و امنیت اجراشده

ایمیل canonical و password policy خالص در domain قرار دارند. رمز با Argon2id (19456KiB، time=2، parallelism=1) ذخیره می‌شود؛ خام به response/log/DB نمی‌رود. ثبت‌نام تازه/موجود پاسخ عمومی 202 دارد، وارد حساب نمی‌کند و duplicate رمز قبلی را عوض نمی‌کند. ایمیل هنوز verified نیست. unknown login همان مسیر dummy verify و همان 401 رمز اشتباه را دارد.

token نشست ۳۲ بایت تصادفی است؛ فقط SHA256 در PG می‌ماند. expiry مطلق هفت‌روزه، revoke، rotation و logout جاری واقعی‌اند. cookie HttpOnly، SameSite=Lax، Path=/ و host-only است؛ production نام __Host و Secure دارد. بدنه JSON حداکثر ۱۶KiB و Origin دقیق برای mutationها لازم است. auth/me حتی روی خطا no-store هستند. quota اتمیک چندنمونه‌ای در PG و کلید HMAC است؛ X-Forwarded-For دلخواه اعتماد نمی‌گیرد. پشت Next محلی سهمیه socket peer بین کاربران مشترک است و trusted edge عمومی هنوز طراحی نشده است.

چهار جدول `app.users/password_credentials/sessions/auth_attempt_buckets` با migration رسمی `0001_identity.sql` ساخته شدند. register اتمیک و unique است؛ سناریوی دو app هم‌زمان فقط یک credential می‌سازد. cleanup bounded برای bucket و نشست قدیمی، بدون scheduler فرضی پیاده شد. [قرارداد API](../../architecture/api-contracts.md)، [مدل داده](../../architecture/data-model.md) و [امنیت](../../architecture/security-and-privacy.md) با کد هماهنگ‌اند.

migration قدیمی byte-identical است:

| فایل | SHA256 |
|---|---|
| 0000_database_foundation.sql | `2b1c8ea5b29b189685962ca26fb6bb06e2a4d6621e1b116721114b34aeedf78c` |
| 0000_snapshot.json | `57d7151aeee6a5f486bbbc80f7e3f61fe9d0da7fd6fa5556f8b99b66d06d01c4` |

entry قبلی journal و timestamp/hash قبلی حفظ شدند و فقط entry جدید append شد؛ fixture تاریخی journal اسپرینت ۲ برای تست upgrade عمدی است.

## بررسی‌های واقعاً اجراشده

محیط نهایی: macOS 27.0.1 ARM64، Node 24.22.2، npm 11.19.1، PostgreSQL 17.11 Homebrew اختصاصی پروژه روی 55432 و Chrome 156.0.8078.48. Next 16.4.3، React 19.3.1، Tailwind 4.3.3، Playwright 1.64.1، TypeScript 6.0.2 و Vitest 4.1.12 exact هستند. نسخه‌های backend قبلی حفظ شدند؛ Argon2 0.45.1 افزوده شد.

```sh
export PATH="$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PATH"
npm ci
export BACKEND_ORIGIN='http://127.0.0.1:3001'
export TEST_DATABASE_URL='postgresql://hair_salon_local:local_only_password@127.0.0.1:55432/hair_salon_test_admin'
PLAYWRIGHT_CHANNEL=chrome npm run check
```

URL بالا فقط credential ساختگی محلی است؛ runner تست از `.env` توسعه fallback نمی‌گیرد. npm ci از lockfile نهایی موفق بود. دانلود اولیه بسته بزرگ Next/SWC با قطعی مواجه شد؛ tarballهای رسمی پس از کنترل SHA512 رسمی وارد cache npm شدند و نصب استاندارد، بدون force یا registry جایگزین کامل شد.

| بررسی در check نهایی | نتیجه واقعی |
|---|---|
| build هر دو workspace | موفق؛ خروجی Nest و پنج route Next شامل not-found |
| typecheck هر دو workspace | موفق؛ strict و noUncheckedIndexedAccess برقرار |
| lint و format:check | موفق، بدون mutation؛ next-env.d.ts تولیدی از Prettier مستثناست |
| unit backend | ۷۳ موفق |
| unit frontend | ۲۰ موفق |
| HTTP مستقل Nest | ۴۸ موفق |
| integration PostgreSQL واقعی | ۲۳ موفق |
| Playwright با Next production + Nest + PG | ۱۷ موفق |

مجموع **۱۸۱ تست** در check نهایی عبور کردند. خروجی محلی `work/sprint-03-check.log` است؛ نتایج فایل‌های backend-check و browser-transport مربوط به مرحله‌های قبل‌اند و دوباره به مجموع اضافه نشدند.

PG: migration خالی/تکرار/upgrade واقعی از journal اسپرینت ۲، race دو app، rollback شکست credential، unique/FK/check، password/token hash غیرخام، expiry/revoke/rotation، quota مشترک و IP spoof، cleanup محدود، cookie production و قطع/برگشت DB متعلق به تست بررسی شدند. HTTP شامل validation، unknown field، Origin غایب/null/بیگانه، 413/415/422/429/503، no-store و خطای امن است؛ regression Health/OpenAPI/startup هم اجرا شد.

مرورگر: فرم ثبت‌نام→ورود→حساب→reload→خروج، جدایی دو حساب و رد cookie باطل‌شده، HttpOnly و نبود Web Storage، درخواست خروج cross-origin، spoof IP از proxy، عدم نشت secret به bundle، شکست شبکه و retry واقعی، pending و جلوگیری از ارسال دوباره، جلوگیری از بازگرداندن کاربر قدیمی با focus هنگام خروج، discovery ترکیبی، empty/reset، focus/Escape، RTL و هفت عرض انجام شدند. تست‌های موفق به پاسخ mock وابسته نیستند؛ برای سناریوی شکست، offline واقعی مرورگر و تأخیر کنترل‌شده پیش از `route.continue()` به API استفاده شد.

runner مرورگر برای هر worker فقط DB UUID و پورت آزاد خودش را می‌سازد؛ frontend از کپی منبع در پوشه موقت ساخته می‌شود تا Next فایل `.env.local` شخصی را نخواند و `.next` توسعه را overwrite نکند. trace حساس ضبط نمی‌شود. teardown فرایندها، Pool، DB و پوشه موقت را در success/failure می‌بندد؛ به existing server وصل نمی‌شود.

پس از check نهایی، اجرای زنده جدا با migration/DB اختصاصی و API روی 3001 و Next روی 45122 انجام شد: liveness/readiness هر دو 200 از proxy، فرم واقعی ثبت‌نام/ورود/reload/خروج موفق؛ خروجی `work/sprint-03-live-smoke.log`. توقف API/Next، حذف DB موقت و بسته‌شدن پورت‌ها نیز بررسی شد. نمونه اختصاصی PostgreSQL که برای این اجرا روشن شده بود در پایان متوقف شد؛ DB شخصی دستکاری نشد.

مشکل‌های پیدا و اصلاح‌شده شامل گردش/بازگرداندن فوکوس sheet، جداکردن alert فرم از route announcer Next در تست، انتظار navigation پیش از reload، استثنای formatter برای فایل تولیدی Next، جداسازی env/build تست از توسعه و هماهنگی refresh نشست با خروج در حال انجام بودند. اسکریپت موقت اجرای زنده نیز در توقف signal به await تکراری می‌رسید؛ cleanup یک‌بارمصرف و تشخیص signalCode اصلاح شد، DB متعلق به همان اجرا پاک و اجرای زنده/توقف دوباره بررسی شد. این اسکریپت محلی در work است؛ runner اصلی مرورگر از قبل signalCode را بررسی می‌کرد. شکست‌های اولیه به‌عنوان پاس گزارش نشده‌اند.

`npm audit --omit=dev` در پایان صفر advisory داد. audit کامل چهار moderate در زنجیره dev-only قدیمی drizzle-kit→esm-loader→core-utils→esbuild داد که همگی به [یک advisory dev server](https://github.com/advisories/GHSA-67mh-4wv8-2f99) مربوط‌اند؛ migration ابزار قبلی حفظ شد و پیشنهاد downgrade شکستن نسخه با audit fix --force اعمال نشد. این مورد در runtime محصول نیست و به معنی اثبات امنیت کامل dependencyها نیز نیست.

## معیارهای پذیرش

| معیار | نتیجه / شاهد |
|---|---|
| S3-AC-01 | backend/frontend و lockfile واحد؛ hash قدیمی محفوظ و regression/upgrade واقعی موفق |
| S3-AC-02 | source کامل رابط، inventory stateها، asset/token و کنترل prototype در سند فیگما |
| S3-AC-03 | fixture مشخص، فیلتر/جستجو/empty/reset و محدودیت رزرو با تست مرورگر |
| S3-AC-04 | فرم تا PG، reload، دو حساب و logout با مرورگر واقعی |
| S3-AC-05 | transaction/unique/hash/session/rate چندنمونه‌ای با PG واقعی |
| S3-AC-06 | cookie/proxy/CSRF/IP و خطا/داده حساس با HTTP و مرورگر |
| S3-AC-07 | تصویر منبع و اجرا هم‌شرایط، overlay/diff و ledger؛ تغییرهای مجاز demo/email آشکارند |
| S3-AC-08 | check کامل محلی و اجرای زنده موفق؛ remote CI جدید اجرا نشده |
| S3-AC-09 | README، معماری، API/data/security، گزارش و درس فارسی؛ تغییر محلی و پیام commit آماده |

## Git و حد تحویل

شاخه اجرا `feat/sprint-03-frontend-auth` از dev به‌روزِ `7360ce9` ساخته شد؛ dev و origin/dev در آغاز برابر بودند. تغییر مستندات ثبت‌نشده قبلی کارفرما حفظ شد؛ stash/reset/clean/stage اجباری انجام نشد. انتقال در diff ثبت‌نشده به‌صورت حذف مسیر قدیم و فایل جدید دیده می‌شود؛ Git هنگام commit دستی renameها را تشخیص می‌دهد. staged diff خالی و HEAD تغییر نکرده است.

workflow همان نام required check یعنی API quality را حفظ کرده و PostgreSQL/Chromium/check هر دو workspace را پوشش می‌دهد. **CI نسخه جدید تا push دستی کارفرما اجرا نشده است**؛ CI قدیمی شاهد این تغییر نیست. Docker daemon در این دستگاه مسیر اجرا نبود؛ Homebrew PostgreSQL همان نسخه استفاده شد. Safari/Firefox، موبایل فیزیکی، بار واقعی، trusted edge، استقرار، restore عملیاتی و سرویس SMS/ایمیل آزموده نشده‌اند.

رزرو، کاتالوگ واقعی، مدیریت سالن/tenant/MFA، پیامک، email verification و reset خارج محدوده باقی ماندند. تصاویر/قیمت‌ها/ساعت‌ها داده واقعی سالن محسوب نمی‌شوند. پیام پیشنهادی commit، پس از مرور کارفرما:

```text
feat: implement Sprint 3 salon discovery and email authentication

- move the NestJS API into backend and add the frontend workspace
- adapt the confirmed Figma discovery design with original assets
- add PostgreSQL-backed credentials, sessions and atomic rate limits
- verify real database and browser flows and document Sprint 3
```
