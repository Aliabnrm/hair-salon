# پرامپت اجرایی اسپرینت ۱ — NestJS Foundation
نسخه ۱٫۰ — ۲۰۲۶-۱۰-۲۹. محدوده اسپرینت توسط کارفرما تأیید شده است. این فایل تاریخچه دستور اجرایی است؛ در ۲۰۲۶-۱۰-۲۹ به درخواست کارفرما اجرا شد. [گزارش](../planning/sprints/sprint-01-report.md) و [درس](../learning/sprint-01.md) نتیجه را ثبت می‌کنند. متن دستور زیر حفظ شده است.

متن زیر دستور اجرایی است؛ هنگام درخواست اجرای این فایل، فقط اسپرینت ۱ را انجام بده.

---

## Goal — نتیجه مورد انتظار
در همین مخزن hair-salon، بک‌اند NestJS/TypeScript کوچک،خوانا و قابل اجرا بساز که تنظیمات معتبر،ساختار ماژولار،خطای استاندارد،شناسه درخواست،OpenAPI محدود به توسعه و یک endpoint زنده‌بودن داشته باشد. کد را تا build و بررسی‌های واقعی و توضیح آموزشی تکمیل کن. خروجی فقط scaffold یا طرح نباشد.

این اسپرینت باید مسیر Request→Middleware→Controller→Service→Response و مدیریت خطا/DI را با کد واقعی روشن کند. Health به DB/SMS وابسته نیست و ادعای readiness ندارد.

## Context — فقط منابع مرتبط را بخوان
۱. AGENTS.md و README.md در ریشه؛ ساختار فعلی و تغییرات موجود را بررسی و حفظ کن.
۲. docs/planning/sprints/sprint-01-plan.md — محدوده و معیارهای S1-AC.
۳. docs/architecture/adr/ADR-002-code-organization.md و ADR-003-sprint-01-tooling.md — مرز و ابزار.
۴. docs/architecture/codebase-structure.md و docs/engineering/backend-standards.md — فایل‌ها و مسئولیت‌ها.
۵. docs/engineering/quality-gates.md — معیارهای S1-T و تحویل.
۶. بخش «قواعد مشترک» docs/architecture/api-contracts.md؛ لازم نیست قرارداد تمام قابلیت‌های آینده را بازنویسی کنی.
۷. docs/references/engineering-sources.md — منابع و snapshot واقعی؛ برای تازه‌بودن نسخه یا ابهام فنی فقط بخش لازم منابع رسمی را بازبینی کن.

بازار ایران،UI فارسی/RTL و مخاطب هر دو گروه مردانه/زنانه است؛ اما این اسپرینت frontend یا منطق کسب‌وکاری ندارد. PostgreSQL،ORM،فیگما،auth و SMS شرط اجرای این محدوده نیستند و بدون تصمیم مصوب وارد نمی‌شوند. اسناد محصول را با فرضیات خود تغییر نده.

## مرز اختیار و روش کار
محدوده این اسپرینت تأیید شده؛ پس از بررسی کوتاه، پیاده‌سازی را انجام بده و برای تصمیم‌های عادی داخل محدوده دوباره تأیید نخواه. اگر تغییر مهم معماری یا نیاز خارج دامنه پیش آمد، دلیل و اثر را مشخص کن؛ حدس را مصوبه نکن. درخواست به چت دیگر،ساخت سرویس خارجی،publish،deploy،Git commit/push یا نصب global در این دستور نیست.

قبل از ویرایش، وضعیت واقعی مخزن را بخوان؛ اگر کد اضافه شده، با آن سازگار شو و فایل کارفرما را overwrite نکن. برنامه کوتاه کار و پیشرفت را فارسی بیان کن. گام‌های کوچک و مرتبط انجام بده و هیچ اسپرینت دیگری را شروع نکن.

## ابزارها و تنظیمات
- npm workspaces با ریشه private و workspace @hair-salon/api در apps/api؛ یک package-lock.json فقط در ریشه.
- Node 24.x LTS با patch سازگار؛ prerequisites CLI حداقل 24.15 در منابع تاریخ بررسی آمده است. Node/npm موجود را بررسی،نسخه دقیق منتخب را در .nvmrc/packageManager و engine سازگار ثبت کن. نسخه‌های global را بی‌درخواست تغییر نده؛ نیاز به runtime دیگر را از مسیر محلی مناسب حل یا مانع واقعی را اعلام کن.
- NestJS خانواده پایدار 12.x و Express؛ core/common/platform-express/testing هم‌نسخه و config/swagger سازگار. peerDependencies و engines را قبل نصب کنترل کن؛ exact resolved versions را ثبت و lock کن. از pre-release یا latest بی‌بررسی استفاده نکن.
- TypeScript با ESM/NodeNext و strict مطابق ADR-003؛ config build و test هر دو typecheck شوند. metadata لازم constructor DI و importهای runtime درست باقی بمانند؛ خطا را با any،ts-ignore،cast اجباری یا خاموش‌کردن strict پنهان نکن.
- Vitest و Supertest/@nestjs/testing؛ از نسخه سازگار starter مبنا بگیر. برای این API Oxlint و Prettier کافی‌اند؛ linter یا runner دوم نساز.
- از @nestjs/config و تابع validate کوچک برای دو متغیر استفاده کن. پکیج validation فرم/DTO را پیشاپیش اضافه نکن.
- scaffold رسمی فقط مرجع است. Hello World/deploy و اتصال Observe/telemetry را وارد نکن. اگر CLI اجرا شد، گزینه‌های همان نسخه را بررسی و ایجاد Git،Observe و lockfile اضافه را کنترل کن؛ ریشه و docs موجود حفظ شوند.

## ساختار و تفکیک مسئولیت
درخت دقیق و مسئولیت فایل‌ها در docs/architecture/codebase-structure.md مرجع است. حداقل:
- main.ts فقط bootstrap/listen و مدیریت شکست startup.
- app.module.ts ترکیب ماژول‌ها.
- app.setup.ts تنظیم مشترک prefix،middleware،filter و docs، قابل استفاده در runtime و e2e.
- config/environment.ts و تست کنار آن، برای خواندن/اعتبارسنجی و نوع پیکربندی.
- common/http برای request context،middleware شناسه درخواست،نوع خطا و exception filter.
- modules/health با Module،Controller،Service و response DTO مشخص برای OpenAPI.
- test برای HTTP و fixture خطای داخلی؛ fixture در src وجود نداشته باشد.

Controller وارد DB یا منطق env نشود؛ Service،request/response مرورگر نگیرد. برای Health،repository/interface/use-case/domain/Entity مصنوعی نساز. Provider از constructor تزریق شود؛ ساخت دستی Service در Controller یا service locator ممنوع. توابع و فایل‌ها مسئولیت روشن داشته باشند؛ کد را صرفاً برای کوتاه‌شدن خط‌ها در helperهای مبهم پخش نکن. رفتار مشترک config/http یک مرجع داشته باشد؛ success interceptor عمومی برای یک پاسخ ساده لازم نیست.

## قرارداد پیکربندی
- PORT: وقتی تعریف نشده،3001؛ در صورت تعریف،فقط عدد صحیح ده‌دهی در بازه 1..65535. مقدار خالی،اعشاری،نمایی،متن یا خارج بازه رد شود.
- NODE_ENV: وقتی تعریف نشده development؛ مقادیر مجاز development/test/production. مقدار خالی یا ناشناخته رد شود.
- خطا قبل listen رخ بدهد،exit غیرموفق و پیام امن با نام متغیر؛ کل env یا مقدار حساس چاپ نشود.
- .env.example فقط مقادیر بی‌خطر؛ .env و work/ و node_modules/dist/coverage در .gitignore مناسب باشند. envهای جدید بدون مصرف نساز.
- تست از .env خصوصی توسعه مستقل باشد و تغییر موقت process.env را بازگرداند. reads اصلی از پیکربندی typed معتبر انجام شود،نه process.env پراکنده.

## قرارداد HTTP دقیق
GET /api/v1/health/liveness
HTTP 200،Content-Type JSON و X-Request-Id:
```json
{
  "data": { "status": "ok" },
  "meta": { "request_id": "<same-as-header>" }
}
```
هیچ نسخه package،پیکربندی،hostname،شماره،اطلاعات memory یا state وابستگی در این پاسخ لازم نیست. HealthService داده health و Controller/DTO قرارداد HTTP را مسئول باشند. prefix را یک‌بار اعمال کن؛ api/v1/v1 نساز.

برای تمام درخواست‌ها از جمله مسیر ناشناخته:
- یک x-request-id تک‌مقداری با الگوی [A-Za-z0-9_-] و طول ۱ تا ۶۴ پذیرفته شود؛ در غیر این صورت UUID جدید با ابزار استاندارد Node بساز.
- header تکراری/ترکیبی،طول زیاد یا نویسه نامجاز را معتبر تلقی نکن.
- شناسه انتخابی در response header و envelope مربوط همسان باشد. این header صرفاً correlation است و هیچ مجوز یا هویتی ایجاد نمی‌کند.
- log حداقلی ساختاری از request_id،method،status و duration؛ body/header/cookie/query کامل و env چاپ نشود. برای خطا نیز پیام raw ناشناخته‌ای که احتمال secret دارد،در log عمومی نریز.

خطای HTTP ساختار error داشته باشد،نه data موفق:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "مسیر موردنظر یافت نشد.",
    "request_id": "<same-as-header>",
    "retryable": false
  }
}
```
fields فقط در صورت validation مرتبط اضافه شود. خطای ناشناخته HTTP 500 با code=INTERNAL_SERVER_ERROR و پیام عمومی امن؛ متن exception،stack یا secret وارد پاسخ نشود. retryable پیش‌فرض false باشد؛ رفتار retry آینده نیازمند تصمیم قرارداد آن عملیات است. برای 500 فقط test fixture خطا بساز؛ endpoint آزمایشی throw در برنامه واقعی اضافه نکن. failure با catch خالی یا status موفق پنهان نشود.

## OpenAPI
- از response DTO و decoratorهای روشن،schema واقعی success/error بساز.
- در development/test رابط docs در /api/docs و JSON در /api/openapi.json در دسترس باشند.
- در production هیچ‌کدام ثبت نشوند؛ هر دو مسیر با تست بررسی شوند.
- path health،prefix و statusها در spec با API واقعی یکسان باشند. type annotation به‌تنهایی همیشه schema runtime کافی ایجاد نمی‌کند.
- فایل spec دست‌نویس موازی که از کد drift کند نساز.

## بررسی و پذیرش
معیارهای S1-AC-01..08 و S1-T01..06 را با تست و اجرا اثبات کن:
۱. boot/DI واقعی،health موفق و سازگاری request_id در header/body.
۲. env معتبر و نامعتبر،defaultها،بازه PORT و جلوگیری startup نامعتبر.
۳. 404 با قالب درست و header غایب/معتبر/نامعتبر/چندمقداری.
۴. 500 با fixture محدود به تست و عدم افشای sentinel حساس در پاسخ یا log ثبت‌شده.
۵. OpenAPI مطابق route واقعی در dev/test و نبود UI/JSON در production.
۶. cleanup برنامه/handleها و گذر build/typecheck/lint/format/unit/e2e.

e2e از app.setup واقعی استفاده کند؛ boot را با mock همه Nest یا new دستی service در Controller دور نزن. اگر transformer متادیتا را حذف کرد،pipeline سازگار را اصلاح و تصمیم را مستند کن. تست صرفاً ثابت خروجی یک تابع برای بالا بردن پوشش ننویس.

در ریشه این scriptها را با delegation روشن به workspace آماده کن:
- npm run dev
- npm run build
- npm run typecheck
- npm run lint
- npm run format:check
- npm run test
- npm run test:e2e
- npm run check

lint/format:check بدون auto-fix و test بدون watch باشند. check همه بررسی‌های مرتبط را با exit صحیح اجرا کند. package scriptها،README و گزارش باید با هم یکسان باشند. lockfile و npm ci نصب تکرارپذیر را ممکن کنند؛ نصب موفق یا نبود آسیب‌پذیری را بدون شاهد ادعا نکن.

پس از گذر checkها،API را واقعاً بالا بیاور،یک health request و404 را امتحان و فرایند را تمیز متوقف کن. اگر بررسی به علت محیط ممکن نیست،بخش قابل انجام را کامل و مانع و command اجرا‌نشده را دقیق گزارش کن؛ با حذف test یا ساکت‌کردن خطا Done نساز.

## تحویل و آموزش
۱. README اجرای محلی با پیش‌نیاز،نسخه،نصب،env،دستورها و درخواست نمونه.
۲. به‌روزرسانی ADR-003 با نسخه‌های واقعی/تصمیم سازگاری و ساختار کد با فایل‌های واقعی.
۳. docs/planning/sprints/sprint-01-report.md: تغییر،چرایی،معیار و شاهد تست،command/نتیجه،محدودیت و روش امتحان؛ فقط پس از اجرا.
۴. docs/learning/sprint-01.md: توضیح ساده Module/Controller/Provider/DI و چرخه request با ارجاع فایل واقعی،خطای رایج و یک تمرین کوچک اختیاری؛ فقط پس از اجرا.
۵. مرور کد از نظر مسئولیت،تکرار،import cycle،خطا/secret و dependencies غیرمصرف‌شده؛ اصلاح در همین محدوده.
۶. گزارش نهایی فارسی با نتیجه اصلی،بررسی‌های واقعی و نکته آموزشی کوتاه. سپس بایست؛ اسپرینت ۲ را خودکار شروع نکن.

Done زمانی است که برنامه واقعاً قابل اجرا،معیارها اثبات و آموزش ارائه شده باشد. تحویل scaffold یا صرف وجود scriptها کافی نیست.
