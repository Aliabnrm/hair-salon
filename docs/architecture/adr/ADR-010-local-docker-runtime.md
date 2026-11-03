# ADR-010 — اجرای کامل محلی با Docker

تاریخ: ۲۰۲۶-۱۱-۰۳. وضعیت: پذیرفته برای درخواست راه‌اندازی محلی کارفرما؛ نتیجه اجرای واقعی در [گزارش راه‌اندازی](../../engineering/local-setup-report.md) ثبت می‌شود. این تغییر شروع اسپرینت۶ یا مجوز deploy نیست.

## مسئله و تصمیم

Compose قبلی فقط PostgreSQL را اجرا می‌کرد؛ clone تازه برای API و فرانت به Node/pnpm میزبان نیاز داشت. اکنون یک Dockerfile چندمرحله‌ای در ریشه با targetهای `api` و `frontend` داریم؛ `compose.yml` همچنان بدون profile فقط دیتابیس را دارد و profile `app` کل برنامه را اجرا می‌کند. دستور اصلی `docker compose --profile app up --build -d --wait` است.

Node24.22.2-bookworm-slim با digest manifest مشخص و pnpm12.16.1 با همان lockfile ریشه استفاده می‌شوند. pnpm فقط داخل مرحله ساخت image نصب می‌شود؛ ابزار global میزبان تغییر نمی‌کند. نصب full برای build و نصب prod فیلترشده برای API جدا هستند؛ فایل‌های dist و migration در runtime API حضور دارند. API و فرانت با کاربر node اجرا می‌شوند. وابستگی یا package محصول تازه‌ای اضافه نشده است.

فرانت فقط هنگام `NEXT_BUILD_STANDALONE=1` خروجی standalone می‌سازد؛ حالت توسعه و start محلی قبلی حفظ می‌شوند. tracing root ریشه workspace است تا symlinkهای pnpm و dependencyهای واقعی وارد خروجی شوند. public و static جدا به runtime منتقل می‌شوند. `BACKEND_ORIGIN=http://api:3001` هنگام build در rewrite و هنگام runtime در دریافت server-side یکسان است. validator فقط نام دقیق سرویس `api` را به مقصدهای HTTP محلی مجاز اضافه می‌کند؛ wildcard شبکه یا دامنه مشابه مجاز نشده است.

در همین حالت ساخت کانتینری، `experimental.cpus=2` تعداد workerهای ساخت Next را محدود می‌کند تا build از همه CPUهای دستگاه و حافظه متناظر استفاده نکند؛ تنظیم در نوع و پیاده‌سازی نسخه pinشده Next بررسی شده است. این محدودیت مربوط به مرحله ساخت است و concurrency درخواست‌های runtime را محدود نمی‌کند.

`HOST` در تنظیمات معتبر API اضافه شده است: پیش‌فرض `127.0.0.1` و مقدار صریح مجاز دیگر `0.0.0.0` برای کانتینر است. bind داخل کانتینر شرط دسترسی سرویس دیگر است؛ انتشار پورت در Compose همچنان فقط روی loopback میزبان انجام می‌شود.

## ترتیب شروع، داده و محیط

PostgreSQL healthy → migration یک‌بارمصرف موفق → readiness API → فرانت. healthcheck فرانت از مسیر proxy به readiness API می‌رود تا اتصال واقعی به DB نیز بررسی شود. migration هنگام bootstrap هر replica اجرا نمی‌شود و شکست آن شروع API را متوقف می‌کند. volume دیتابیس با down عادی باقی می‌ماند؛ پاک‌کردن volume فقط اقدام عمدی کاربر است.

این Compose مخصوص استفاده محلی HTTP است. API عمداً development دارد تا cookie امن مخصوص production روی HTTP محلی ورود را مختل نکند و ابزار reviewer محلی کار کند؛ فرانت standalone با production اجرا می‌شود. credentialها فقط نمونه‌اند؛ `.env` میزبان وارد build یا کانتینر نمی‌شود. `.dockerignore` از ورود env خصوصی، Git، dependency و work جلوگیری می‌کند. Origin مجاز API از پورت خارجی فرانت ساخته می‌شود؛ تغییر پورت API میزبان نام داخلی `api:3001` را تغییر نمی‌دهد.

انتشار عمومی نیازمند تصمیم عملیاتی جدا درباره HTTPS، secret، DB/backup، محدودیت شبکه و تنظیم production است. این تغییر چنین آمادگی‌ای را ادعا نمی‌کند.

## بررسی و پیامد

تست تنظیمات، پذیرش نام دقیق Docker و حفظ رد مقصدهای ناامن را بررسی می‌کند؛ تست bootstrap و بررسی Docker باید listen و packaging واقعی را تأیید کنند. دستورها و مسیر clone در [README](../../../README.md) و توضیح آموزشی در [درس Docker](../../learning/local-docker.md) هستند. موفقیت build میزبان به‌تنهایی شاهد موفقیت image لینوکس نیست؛ نتیجه هر کدام جدا ثبت می‌شود.

منبع رفتار standalone، راهنمای همراه نسخه نصب‌شده Next در `frontend/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md` است؛ این راهنما کپی مستقل public/static و tracing root در monorepo را توضیح می‌دهد. قرارداد Compose از [profiles](https://docs.docker.com/compose/how-tos/profiles/) و [startup order](https://docs.docker.com/compose/how-tos/startup-order/) پیروی می‌کند.
