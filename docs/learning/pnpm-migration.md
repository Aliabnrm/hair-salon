# مهاجرت پروژه به pnpm

تاریخ: ۲۰۲۶-۱۰-۳۱. این تغییر با دستور کارفرما انجام شد؛ قابلیت‌های اسپرینت ۳ و ساختار backend/frontend عوض نمی‌شوند. [ADR-006](../architecture/adr/ADR-006-pnpm-workspace.md) نتیجه واقعی نصب و تست را ثبت می‌کند؛ [README](../../README.md) راه اجرای جاری است.

## چه چیزی عوض شد و چرا؟

مدیر بسته مسئول دریافت و اتصال کتابخانه‌هاست؛ framework یا زبان پروژه نیست. در این پروژه pnpm جای npm را می‌گیرد، ولی Nest، Next، React و TypeScript همان نسخه‌های مستقیم قبلی را دارند.

در [package.json](../../package.json)، `packageManager` نسخه دقیق pnpm را تعیین می‌کند. [pnpm-workspace.yaml](../../pnpm-workspace.yaml) می‌گوید backend و frontend دو پکیج همین مخزنند. [pnpm-lock.yaml](../../pnpm-lock.yaml) نسخه و integrity وابستگی‌ها را قفل می‌کند. یک lockfile داریم تا هر پکیج جداگانه درخت ناسازگار نسازد.

## نصب frozen یعنی چه؟

از ریشه پروژه:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

در ترمینال دوم:

```sh
pnpm run dev:frontend
```

frozen یعنی نصب باید دقیقاً با lockfile موجود سازگار باشد؛ اگر package.json عوض شده ولی lockfile به‌روز نیست، نصب شکست می‌خورد. CI نباید خودش نسخه تازه انتخاب کند یا lockfile را اصلاح کند. برای افزودن آگاهانه وابستگی در آینده، مثلاً از `pnpm --filter @hair-salon/frontend add <package>` استفاده می‌کنیم و تغییر manifest و lockfile را با هم مرور می‌کنیم.

Corepack یک راه اجرای نسخه pinشده مدیر بسته است؛ اگر pnpm روی PATH نباشد، `corepack pnpm` معادل آن است. تغییر ابزار global دستگاه جزو این مهاجرت نیست. node_modules و store محلی هم وارد Git نمی‌شوند.

## چرا مسیر تست مرورگر اصلاح شد؟

npm قبلاً Next را در node_modules ریشه در دسترس می‌گذاشت. این یک محل اتفاقی نصب بود، نه قرارداد کد. pnpm dependency هر پکیج را در node_modules همان پکیج قابل دسترسی می‌کند؛ بنابراین runner با createRequire از frontend/package.json، CLI خود Next را پیدا می‌کند.

[runner مرورگر](../../frontend/e2e/fixtures/test-stack.ts) هنوز منبع را در پوشه موقت خودش build می‌کند تا env خصوصی و خروجی توسعه را دست نزند. فقط node_modules همان frontend به این پوشه متصل می‌شود. این symlink فایل‌ها را کپی نمی‌کند؛ یک ارجاع به dependencyهای اعلام‌شده همان پکیج است و در cleanup همراه پوشه موقت برداشته می‌شود.

## اسکریپت نصب با script پروژه فرق دارد

`pnpm run build` فرمان خود پروژه است. بعضی dependencyها هنگام نصب، script داخلی دارند؛ مثلاً Argon2 به آماده‌سازی ماژول native نیاز دارد. allowBuilds در workspace فقط موارد لازم را مجاز می‌کند و Scarf را غیرفعال نگه می‌دارد. اجازه عمومی اجرای تمام scriptهای dependency داده نشده است.

برای HTTP و integration، build صریحاً در خود script نوشته شد. در نتیجه موفقیت تست به تفاوت رفتار pre/post خودکار مدیر بسته وابسته نیست. اسم فرمان‌های عمومی مثل check، db:migrate و test:browser حفظ شده است.

## نتیجه بررسی

نصب تمیز frozen، build/typecheck/lint/format و مجموع ۱۸۱ تست با pnpm موفق شدند؛ شامل ۲۳ تست PostgreSQL واقعی و ۱۷ تست مرورگر. نسخه‌های قبلی وابستگی‌ها حفظ شدند و CI/راهنما نیز به pnpm منتقل شد. فرمان و شواهد در بخش بررسی [ADR-006](../architecture/adr/ADR-006-pnpm-workspace.md) ثبت شده‌اند. نتایج npm در گزارش‌های اسپرینت‌های قبل، شواهد تاریخی همان اجرا هستند و به pnpm نسبت داده نمی‌شوند. CI تازه تا push دستی کارفرما اجرا نشده است؛ commit/push این تغییر نیز با کارفرماست.
