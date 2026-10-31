# ADR-006 — مهاجرت workspace به pnpm

تاریخ: ۲۰۲۶-۱۰-۳۱. وضعیت: **پذیرفته، اجرا و با نصب تمیز بررسی‌شده**. این تصمیم، بخش npm/lockfile در ADR-003 و ADR-005 را جایگزین می‌کند؛ ساختار backend/frontend، Node و نسخه‌های مستقیم کتابخانه‌ها حفظ می‌شوند. این تغییر اسپرینت یا قابلیت محصول تازه‌ای نیست.

## تصمیم و دلیل

مدیر بسته `pnpm@12.16.1` در packageManager ریشه exact قفل می‌شود. نسخه stable رسمی و engine آن با Node 24.22.2 بررسی شد. یک `pnpm-workspace.yaml` با اعضای backend/frontend و فقط یک `pnpm-lock.yaml` ریشه داریم. package-lock.json پس از import کنار گذاشته می‌شود؛ نصب عادی و CI با `pnpm install --frozen-lockfile` است.

pnpm بسته‌ها را در store مشترک نگه می‌دارد و dependencyهای اعلام‌شده هر پکیج را از طریق symlink در همان پکیج در دسترس می‌گذارد. وابستگی گذرای تصادفاً hoistشده، قرارداد import ما نیست. برای دورزدن خطا از node-linker=hoisted، shamefully-hoist، force یا خاموش‌کردن strictPeerDependencies استفاده نمی‌کنیم.

در خروجی pnpm 12 همین یک lockfile دو سند YAML دارد: metadata مدیر بسته و درخت workspace؛ دو سند در یک فایل به معنی lockfile جدا برای پکیج‌ها نیست.

نسخه‌های مستقیم Nest/Next/React/TypeScript/Drizzle/pg تغییر نمی‌کنند. مهاجرت از lockfile قبلی با `pnpm import` انجام می‌شود؛ نتیجه resolution و هر تفاوت واقعی در گزارش بررسی پایین ثبت می‌شوند. store و node_modules نسخه‌بندی نمی‌شوند. ابزار global دستگاه تغییر نمی‌کند.

## فرمان و اسکریپت نصب

فرمان‌های ریشه با `pnpm --filter` به پکیج مربوط یا با اجرای recursive ترتیبی به هر دو پکیج واگذار می‌شوند. نام و مسئولیت dev، dev:frontend، build، check و فرمان‌های DB حفظ شده است. build پیش از HTTP/integration به‌صورت صریح در خود script آمده؛ به اجرای ضمنی pre/post توسط مدیر بسته وابسته نیستیم.

`allowBuilds` فقط اجرای اسکریپت نصب argon2 و نسخه‌های esbuild لازم را مجاز می‌کند. Scarf و fsevents صریحاً غیرفعال‌اند؛ `scarfSettings.enabled=false` هم حفظ شده است. `strictDepBuilds` نصب dependency تازه دارای script تصمیم‌گیری‌نشده را آشکارا متوقف می‌کند. نصب برای تست یا build به معنی مجوز telemetry نیست.

runner مرورگر CLI خود Next را با createRequire از package.json فرانت resolve می‌کند؛ مسیر root node_modules/next فرض نمی‌شود. کپی موقت منبع برای تست فقط symlink به node_modules همان فرانت دارد، نه env خصوصی یا خروجی توسعه. ownership و cleanup اختصاصی DB/process/پوشه موقت همچنان برقرارند.

CI از action رسمی pnpm/action-setup نسخه 6.1.0 با SHA commit `ea17c68df8912ef543352723c149a84f56e3d413`، cache روی pnpm-lock.yaml، کنترل نسخه دقیق مدیر بسته و نصب frozen استفاده می‌کند. نام required check یعنی API quality و PostgreSQL 17.11 حفظ می‌شوند. هیچ push یا اجرای remote CI از این تصمیم استنباط نمی‌شود.

## منابع بررسی‌شده

- [مستند نصب pnpm](https://pnpm.io/installation)، [workspace](https://pnpm.io/pnpm-workspace_yaml)، [import](https://pnpm.io/cli/import)، [تنظیمات](https://pnpm.io/settings).
- [metadata رسمی نسخه pinشده](https://registry.npmjs.org/pnpm/12.16.1)؛ آرشیو pnpm و binary مخصوص دستگاه با SHA512 رسمی تطبیق داده شدند.
- [نسخه action رسمی](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)؛ tag annotated به SHA commit بالا resolve و action.yml خوانده شد.

## بررسی واقعی مهاجرت

محیط: macOS ARM64، Node 24.22.2، pnpm 12.16.1، PostgreSQL 17.11 روی پورت اختصاصی 55432 و Google Chrome نصب‌شده. دستور از ریشه با runtime و binary محلی ignored اجرا شد؛ ابزار global تغییر نکرد. Corepack همراه Node نیز نسخه pinشده را با `corepack pnpm --version` واقعاً اجرا کرد.

```sh
pnpm import
pnpm install --frozen-lockfile
BACKEND_ORIGIN=http://127.0.0.1:3001 \
PLAYWRIGHT_CHANNEL=chrome \
TEST_DATABASE_URL=postgresql://hair_salon_local:local_only_password@127.0.0.1:55432/hair_salon_test_admin \
pnpm run check
```

URL بالا فقط credential ساختگی محلی تست است. ابتدا import پیش از حذف package-lock انجام شد. مقایسه کامل بخش‌های packages در هر دو سند YAML نشان داد **تمام ۵۲۲ جفت نام/نسخه قبلی حفظ شدند**؛ فقط ۱۵ ورودی مدیر بسته pnpm و binaryهای پلتفرم‌های آن اضافه شدند. هیچ نسخه مستقیم یا گذرای قبلی ارتقا/حذف نشد. شاهد محلی `work/pnpm-lock-import-comparison.json` است.

نصب نخست و نصب frozen دوباره موفق بودند. سپس همه node_modulesهای قبلی، از جمله چیدمان npm ریشه، به backup ignored در `work/pnpm-migration-backup/` منتقل و نصب از پوشه‌های خالی با همان lockfile تکرار شد؛ ۳۵۶ بسته مورد نیاز این پلتفرم از store نصب شدند. بنابراین وجود تصادفی root node_modules/next شاهد موفقیت تست نشد. Next فقط از dependency اعلام‌شده frontend resolve شد. دانلود اولیه برخی بسته‌ها کند بود؛ بررسی integrity غیرفعال و registry جایگزین نشد.

| بررسی تازه با pnpm | نتیجه واقعی |
|---|---|
| نصب تمیز frozen | موفق؛ بدون اصلاح lockfile |
| build و typecheck هر دو بخش | موفق |
| lint و format:check هر دو بخش | موفق؛ بدون mutation |
| unit backend / frontend | ۷۳ / ۲۰ موفق |
| HTTP مستقل Nest | ۴۸ موفق |
| integration PostgreSQL واقعی | ۲۳ موفق |
| مرورگر با Next production، API و PG واقعی | ۱۷ موفق |
| کنترل نسخه دقیق و قالب فایل‌های ریشه/CI | موفق |

مجموع **۱۸۱ تست** در check تازه با pnpm عبور کردند؛ خروجی محلی `work/pnpm-check.log`، نصب در `work/pnpm-install.log` و نصب تمیز در `work/pnpm-clean-install.log` است. runner اصلی مرورگر پس از انتقال مسیر CLI و symlink وابستگی‌ها، ثبت‌نام/ورود/reload/خروج، امنیت proxy، فیلترها و RTL را با stack واقعی اجرا کرد. مرز تست و private env توسعه حفظ شد. داده محصول یا migration SQL تغییر نکرد.

شاخه `feat/sprint-03-frontend-auth` به‌دلیل وجود تغییرهای ثبت‌نشده همین اسپرینت حفظ شد؛ checkout اجباری، stash/reset/clean، stage، commit، push یا PR انجام نشد. backup نصب قبلی فقط زیر work است. [درس مهاجرت](../../learning/pnpm-migration.md) و [README](../../../README.md) مرجع استفاده جاری‌اند؛ گزارش‌های اسپرینت‌های قبلی، شواهد npm همان زمان را نگه می‌دارند. **remote CI جدید اجرا نشده است**؛ بررسی روی Linux یا مرورگر دیگر به نتیجه محلی macOS/Chrome نسبت داده نمی‌شود. تغییر فقط مدیر بسته و زیرساخت مرتبط است و اسپرینت بعد شروع نشده است.

