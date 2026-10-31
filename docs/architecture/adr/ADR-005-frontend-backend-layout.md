# ADR-005 — مسیر frontend/backend و ساختار اسپرینت ۳

> به‌روزرسانی ۲۰۲۶-۱۰-۳۱: مدیر بسته و قرارداد lockfile این تصمیم با [ADR-006](ADR-006-pnpm-workspace.md) به pnpm/pnpm-lock.yaml تغییر کرد؛ بخش‌های npm پایین شرح اجرای اولیه‌اند. مسیر backend/frontend و مرز مسئولیت‌ها برقرارند.

تاریخ: ۲۰۲۶-۱۰-۲۹. وضعیت: **پذیرفته و اجراشده در محدوده اسپرینت ۳**. [گزارش](../../planning/sprints/sprint-03-report.md) مرجع آزمون و [ساختار](../sprint-03-structure.md) مرجع مسیر واقعی است. دستور اجرایی پیوست کارفرما جای مرحله قبلی «فقط طرح» را گرفت؛ commit/push با کارفرماست. ADR-002 و مرز domain برقرارند.

## تصمیم مسیرها

ریشه پروژه دو workspace دارد: `backend/` و `frontend/`. API موجود از `apps/api/` به `backend/` **منتقل** می‌شود؛ API دوم یا کپی موازی ساخته نمی‌شود. workspace بک‌اند نام `@hair-salon/api` را حفظ می‌کند، چون وظیفه‌اش API است و تغییر مسیر نیازمند تغییر هویت پکیج نیست. فرانت `@hair-salon/frontend` است. فقط یک package-lock.json در ریشه؛ workspaces مقصد `["backend", "frontend"]` و بدون lockfile داخلی، Nx/Turborepo یا shared package فرضی.

API موجود با حفظ فایل خصوصی ignored، history migration و نام workspace به backend منتقل شد؛ frontend در ریشه ساخته شد. `apps/web` پیشنهاد قبلی بود و دیگر مسیر هدف نیست. پوشه apps تنها اگر واقعاً خالی و فاقد داده کارفرما شد کنار گذاشته می‌شود.

## انتخاب فرانت و دلیل

تصمیم اجراشده: **Next.js با App Router، React و TypeScript strict**. API و قانون دامنه در Nest می‌مانند؛ route handler یا server action در Next جای بک‌اند دوم نمی‌شود. صفحات عمومی کشف/پروفایل در آینده به SEO و رندر اولیه نیاز دارند و App Router مسیر رشد آن‌ها را می‌دهد. گزینه React/Vite برای prototype صرف کوچک‌تر است، اما برای مسیر عمومی محصول کار بیشتری در routing/rendering آینده می‌طلبد. خروجی Make مرجع ظاهر و تعامل است؛ چارچوب یا package.json آن کورکورانه کپی نمی‌شود.

نسخه‌های exact: Next.js 16.4.3، React/react-dom 19.3.1، TypeScript 6.0.2، Tailwind CSS و @tailwindcss/postcss 4.3.3، Playwright 1.64.1، Node 24.22.2 و npm 11.19.1. Tailwind برای نگه‌داشتن utilityها و tokenهای واقعی Make انتخاب شد؛ کتابخانه UI، query manager یا state store اضافی نیاز نبود. فونت Vazirmatn وزن‌های ۴۰۰/۵۰۰/۶۰۰/۷۰۰/۸۰۰ با OFL محلی و تصاویر با همان photo ID/پارامترهای منبع ذخیره شدند. iconها با رندر بردارهای واقعی source به SVG مستقل export شدند؛ glyph جدید حدس زده نشد. مرجع اجزا و تفاوت‌های مجاز در سند فیگماست.

نصب استاندارد از registry رسمی و lockfile ریشه انجام شد؛ برای بسته بزرگ Next/SWC که دانلودشان قطع می‌شد، tarball رسمی با SHA512 رسمی کنترل و وارد cache عادی npm شد، سپس npm install اجرا شد. force، registry جایگزین و تغییر peerها استفاده نشد.

## مرز دامنه‌ها

- backend/src/modules/identity: هویت پایه User، credential ایمیل/رمز، نشست و محدودیت تلاش؛ مالک جدول‌های همین دامنه. User با روش ورود یکی نیست؛ افزودن موبایل بعداً همان User را نگه می‌دارد.
- frontend/features/identity: فرم و جریان ثبت‌نام/ورود/خروج و نمایش حساب؛ امنیت نهایی در backend است.
- frontend/features/discovery: رابط کشف مشاهده‌شده در فیگما و فیلتر داده نمایشی مشخص؛ هنوز API واقعی کاتالوگ/availability نداریم. داده نمونه نباید به backend یا مدل رزرو تبدیل شود.
- app/layout و components/ui: ترکیب صفحه و نمایش مشترک، بدون قانون هویت یا رزرو. bookings،businesses و memberships تا اسپرینت قابلیت واقعی ساخته نمی‌شوند.
- Health و Database اسپرینت ۲ با مسئولیت فعلی منتقل می‌شوند؛ برای Health چهار لایه تازه ساخته نمی‌شود.

HTTP → application service → domain و Port؛ adapter → Port و domain؛ Module wiring را انجام می‌دهد. domain به Nest/Drizzle/React وابسته نیست. frontend هیچ فایل، entity یا secret از backend import نمی‌کند؛ فقط قرارداد شبکه. فرانت feature-first است؛ route باریک، component معنادار، hook برای stateful behavior و تابع عادی برای تبدیل خالص.

## انتقال قابل بررسی

ابتدا انتقال ساختاری با ثابت نگه‌داشتن رفتار انجام و تمام تست‌های موجود واقعاً اجرا شود؛ سپس identity و frontend افزوده شوند. مسیرهای زیر باید کنترل شوند:

| مورد | مبدأ/خطر | نتیجه لازم |
|---|---|---|
| workspace/lockfile | apps/api و linkهای lock | backend و frontend در همان lockfile، بدون ارتقای بی‌دلیل نسخه‌های موجود |
| Compose در backend/package.json | ../../compose.yml | ../compose.yml |
| README و commandهای CI | مسیرهای قبلی، build و cache | فرمان‌های ریشه همچنان delegate، مسیرهای جاری اصلاح، cache lockfile ریشه |
| env runtime و CLI | URLهای module-relative | از backend/src/config یا dist/config، ../../.env همچنان صحیح است؛ replace کورکورانه نکن |
| migration runner | از dist/database به ../../drizzle | این نسبت بعد انتقال هم صحیح است؛ SQL/journal/snapshot قبلی فقط جابه‌جا و byte-identical بمانند |
| تست startup/migration | cwd و dist/main.js | اجرای child process از backend؛ نه ارجاع به apps/api یا خروجی build قدیمی |
| داده ignored | env،dist و فایل شخصی احتمالی | بدون افشا یا حذف؛ env خصوصی هرگز stage/ثبت نشود؛ build تازه اجرا شود |
| اسناد | مسیرهای تاریخی گزارش ۱/۲ | مسیر جاری در README/ساختار اصلاح؛ گزارش تاریخی با یادداشت انتقال، نه جعل نتیجه تست گذشته |

## مرز اتصال مرورگر و API

تصمیم اجراشده: مرورگر API را از مسیر هم‌مبدأ `/api/v1` روی frontend مصرف کند؛ Next فقط rewrite/proxy به backend است. `BACKEND_ORIGIN` تنظیم server-only و بدون NEXT_PUBLIC است. توسعه: frontend روی 3000 و backend روی 3001، هر دو localhost؛ آدرس واقعی از config معتبر. Cookie/Set-Cookie و X-Request-Id در proxy حفظ و با مرورگر واقعی آزموده شوند. صحت Origin و CSRF را صرف وجود proxy یا SameSite فرض نکن.

نشست opaque و قابل revoke در PostgreSQL؛ token خام فقط cookie HttpOnly، نه localStorage/sessionStorage یا response JSON. cookie در production Secure و host-only، SameSite=Lax و Path=/؛ توسعه HTTP نام/secure متناسب و صریح. backend برای mutationهای auth، Origin دقیق allowlist و JSON content-type را کنترل کند؛ Origin غایب/null/بیگانه رد شود، از جمله login/register/logout. تست مرورگر باید این مرز را از خود frontend ثابت کند. CORS=* همراه credentials ممنوع.

## پیامد و حد ادعا

جابه‌جایی مسیر، دلیل بازنویسی API سالم نیست. frontend و backend در یک repo و lockfile توسعه می‌یابند، ولی domain مشترک اجباری ندارند. این طرح انتشار عمومی، تأیید مالکیت ایمیل، بازیابی رمز، MFA نقش ممتاز یا رزرو واقعی را تکمیل‌شده فرض نمی‌کند. تصمیم‌های عددی و قرارداد دقیق هویت در طرح اسپرینت ۳ برای تصویب آمده‌اند. پس از اجرا، همین ADR با نسخه‌ها و شواهد واقعی تکمیل شود.

## نتیجه اجرایی و محدودیت

Nest مالک امنیت و DB است. frontend فقط rewrite و UI دارد؛ پوشه auth یا users موازی ساخته نشده است. migration جدید رسمی `0001_identity.sql` و snapshot اضافه شد؛ SQL/snapshot قدیمی و entry قبلی journal حفظ شدند. شماره journal جدید append شده است. `check` هر دو workspace و PostgreSQL و مرورگر واقعی را اجرا می‌کند؛ CI نام API quality را حفظ کرده، ولی نسخه تازه تا push دستی اجرا نشده است. پشت Next محلی، socket peer سهمیه مشترک دارد؛ forwarding دلخواه معتبر نیست و trusted edge/سهمیه IP کاربر نهایی برای عرضه عمومی هنوز طراحی نشده است.
