# گزارش بررسی راه‌اندازی محلی و Docker

تاریخ: ۲۰۲۶-۱۱-۰۳. درخواست: بررسی ادغام اسپرینت۵، انتقال dev به main و قابل اجرای پروژه برای clone تازه با روش محلی یا Docker. مرجع استفاده [README](../../README.md)، تصمیم [ADR-010](../architecture/adr/ADR-010-local-docker-runtime.md) و [درس فارسی](../learning/local-docker.md) است.

## وضعیت آغاز و محدوده تغییر

پس از fetch، `origin/dev` و `dev` و HEAD شاخه `feat/sprint-05-public-catalog` همگی `c8bcaf6` بودند؛ `origin/main` برابر `7360ce9` بود. اسپرینت۵ commit نشده و هیچ شاخه remote مربوط ندارد. dev با `pull --ff-only origin dev` بررسی شد و به‌روز بود؛ بدون stash/reset/clean به شاخه اجرای موجود برگشتیم. تغییرهای قبلی اسپرینت و تغییر مستقل metadata صفحه حفظ شدند.

README از راهنمای وابسته به runtime و مسیر شخصی دستگاه به راهنمای clone، اجرای کامل Docker، توسعه محلی، PostgreSQL بدون Docker، migration، حساب reviewer، تست و رفع اشکال تبدیل شد. Dockerfile چندمرحله‌ای، dockerignore، سرویس‌های migrate/API/frontend در profile app و میان‌برهای pnpm اضافه شدند. DB-only حفظ شد. تنظیم HOST معتبر API و مقصد دقیق api در فرانت، ارتباط واقعی کانتینرها را ممکن می‌کنند.

## نتیجه بررسی

محیط میزبان: macOS ARM64، Node24.22.2، pnpm12.16.1، PostgreSQL17.11 محلی و Chrome. فرمان‌ها از ریشه و با runtime محلی موجود اجرا شدند؛ env خصوصی چاپ نشد. نتیجه تازه:

| بررسی                                                  | نتیجه                       |
| ------------------------------------------------------ | --------------------------- |
| `pnpm run build`                                       | هر دو workspace موفق        |
| `pnpm run typecheck` و `pnpm run lint`                 | موفق                        |
| `pnpm run format:check`                                | موفق، بدون ویرایش           |
| unit بک‌اند / فرانت                                    | ۸۹ / ۳۷ موفق                |
| `pnpm run test:e2e`                                    | ۵۴ موفق                     |
| `pnpm run test:integration`                            | ۵۵ موفق با PostgreSQL واقعی |
| `pnpm run test:browser` با `PLAYWRIGHT_CHANNEL=chrome` | ۲۹ موفق                     |
| مجموع تست‌های موفق این نوبت                            | **۲۶۴**                     |
| `docker compose --profile app config --quiet`          | موفق                        |
| لینک‌های محلی README و سه سند تازه                     | مقصدها موجودند              |

در بررسی‌های نخست، تنظیم optional خروجی Next خطای نوع و دو فایل خطای قالب‌بندی داشتند؛ اصلاح شدند. `pnpm run check` از build/typecheck/lint/format و unit عبور کرد، اما سه تست شروع فرایند به timeout پنج‌ثانیه‌ای خوردند. همان زمان Docker و دستگاه تحت فشار حافظه بودند؛ رابطه علت قطعی ادعا نمی‌شود. اجرای دوباره `pnpm run test:e2e` بدون تغییر timeout یا assertion، هر۵۴تست را در حدود۳٫۵ثانیه عبور داد؛ integration و مرورگر نیز جدا موفق شدند. نتیجه بالا، اجرای موفق تک‌فرمان check کامل معرفی نمی‌شود.

داده توسعه migrate/reset نشد؛ suiteهای PostgreSQL و مرورگر دیتابیس موقت خودشان را ساختند. نصب ابزار global میزبان، تغییر secret خصوصی و اعطای reviewer به حساب واقعی انجام نشد.

## بررسی Docker

Docker client29.7.1، Engine29.2.0 و Compose5.0.2 روی Docker Desktop بررسی شدند. شروع نخست daemon خاموش بود. پس از شروع Desktop، PATH محلی ابزار رسمی credential helper لازم شد؛ تنظیم credential یا محافظت Docker تغییر نکرد. دریافت image رسمی Node با digest ثبت‌شده انجام شد.

ساخت نخست هنگام نصب dependency با `rpc ... EOF` قطع شد و daemon از دسترس خارج شد. پس از راه‌اندازی مجدد و پایان تست‌های میزبان، ساخت API جدا از فرانت انجام شد. اتصال مستقیم npm داخل کانتینر timeout داشت، در حالی که همان مقصد از میزبان HTTP200 می‌داد. برای build موفق، یک تونل CONNECT موقت روی loopback میزبان و فقط برای `registry.npmjs.org:443` استفاده شد؛ TLS، integrity و supply-chain policy خاموش نشدند. آدرس تونل در Compose یا image نهایی ذخیره نشد و فرایند آن پس از build بسته شد.

| بررسی Docker                              | نتیجه واقعی                                                  |
| ----------------------------------------- | ------------------------------------------------------------ |
| نصب frozen داخل Linux ARM64               | full و prod موفق؛ policy تمام۵۲۳ورودی lockfile عبور کرد      |
| ساخت target API                           | موفق؛ Node24.22.2، uid1000 و بارگیری واقعی Argon2 تأیید شدند |
| ساخت نهایی target frontend                | موفق؛ standalone، typecheck فعال و دو worker                 |
| دریافت PostgreSQL17.11 با digest مصوب     | موفق، پس از retry خطای403 و قطع daemon                       |
| اجرای Compose کامل با PostgreSQL کانتینری | **ناموفق به علت خرابی snapshot محلی Docker Desktop**         |
| API و فرانت کانتینری با DB تست میزبان     | **smoke واقعی موفق**                                         |

ساخت اول فرانت، نبود helper مشترک تست DB از backend را آشکار کرد؛ منبع لازم فقط به مرحله build اضافه شد و typecheck حذف نشد. image نهایی source/test کامل را کپی نمی‌کند. محدودیت دو worker برای مرحله ساخت کانتینری اضافه و در build نهایی واقعاً با دو worker اجرا شد؛ typecheck فرانت پس از این تغییر نیز جدا موفق بود.

شکست Compose در مرحله ایجاد کانتینر PostgreSQL، `failed to stat parent` و نبود مسیر `/var/lib/desktop-containerd/daemon/io.containerd.snapshotter.v1.overlayfs/snapshots/293/fs` بود. حذف و دریافت دوباره **فقط image تازه همین آزمون** مشکل را رفع نکرد. reset/prune عمومی، حذف imageهای قبلی دیگر پروژه‌ها یا دست‌کاری storage Docker انجام نشد. بنابراین **اجرای کامل همه سرویس‌ها با DB کانتینری تأیید نشده است**؛ خطای محیطی باید روی Docker Desktop سالم رفع/بازآزمایی شود.

برای تفکیک packaging برنامه از این مانع، API و فرانت نهایی در شبکه Docker مستقل روی پورت‌های3101/3100 اجرا شدند و به دیتابیس تازه `hair_salon_test_docker_<UUID>` در PostgreSQL17.11 میزبان وصل شدند. migration داخل image API اجرا شد. smoke شامل HTML فارسی، CSS ساخته‌شده و SVG، readiness از proxy،۷دسته واقعی، فهرست خالی،404 پروفایل غیرعمومی، ثبت‌نام، ورود، cookie با HttpOnly/SameSite، خواندن نشست و ابطال پس از خروج بود؛ همه موفق شدند. migration مجدد و restart دو کانتینر نیز موفق و شمارش کاربر آزمایشی همچنان۱ بود. این نتیجه، تست PostgreSQL کانتینری یا حفظ volume داده‌دار آن معرفی نمی‌شود.

کانتینرها، شبکه و DB موقت این smoke در finally پاک شدند. شبکه و volume خالی پروژه Compose آزمایشی `hair-salon-docker-check` نیز پاک شدند؛ volume توسعه و داده قبلی دست‌نخورده‌اند. imageهای قابل استفاده API/فرانت باقی‌اند. لاگ‌ها و helperهای خصوصی این اجرا فقط زیر `work/` و ignored هستند؛ برای clone لازم نیستند.

job جدا `Docker smoke` در CI اضافه شد تا ساخت از checkout تمیز، healthcheck، صفحه‌ها/دارایی ثابت، proxy/readiness و rerun migration را روی Linux بررسی کند. این workflow هنوز push یا روی GitHub اجرا نشده و موفقیت remote ادعا نمی‌شود.

## وضعیت تحویل پیش از مجوز ثبت و ادغام

طبق AGENTS.md و git-workflow، مجوز merge به‌تنهایی مجوز commit/push تغییرهای ثبت‌نشده نیست. تا ثبت و push اسپرینت۵، PR آن به dev قابل ساخت نیست. هیچ commit/push یا ادغام ناقص dev به main انجام نشده است. انتقال مورد درخواست باید پس از ثبت، با PR قابلیت به dev و سپس PR جدا dev به main و بررسی CI همان commit انجام شود.

پیام پیشنهادی برای بخش راه‌اندازی: `build: containerize the full local stack and document setup`.

diff تحویل شامل تغییرهای قبلی اسپرینت۵ و مستندات مصوب موجود، به‌اضافه تنظیمات راه‌اندازی همین درخواست بود. در زمان تحویل همه آن‌ها روی `feat/sprint-05-public-catalog` و بدون stage/commit/push بودند؛ تغییر مستقل عنوان صفحه حفظ شد. `git diff --check` و بررسی قالب نهایی موفق بودند.

در ادامه همین درخواست، کارفرما در تاریخ۲۰۲۶-۱۱-۰۳ صریحاً مجوز commit/push و تکمیل دو ادغام را داد. این مجوز مخصوص همین نوبت است؛ سیاست دستی پیش‌فرض Git برای کارهای آینده تغییر نکرده است. نتیجه CI و ادغام‌ها باید از PRهای GitHub و گزارش نهایی همین گفتگو خوانده شود.
