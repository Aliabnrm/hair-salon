# درس اسپرینت ۳ — از طراحی تا حساب واقعی

در این اسپرینت، صفحه فارسی آراسته و حساب ایمیل/رمز ساخته شدند. سالن‌ها، قیمت و ساعت‌ها نمونه‌اند؛ حساب و نشست واقعاً در PostgreSQL ذخیره می‌شوند. [گزارش اجرا](../planning/sprints/sprint-03-report.md) و [مقایسه طراحی](../references/sprint-03-figma.md) شاهد نتیجه‌اند. این دو نوع داده را نباید با هم اشتباه بگیریم.

## domain و feature یعنی چه؟

domain نام یک مسئولیت محصول است: identity یعنی هویت و نشست؛ discovery یعنی یافتن سالن. فولدرها را با نام ابزارهایی مثل database-services یا صفحه‌ای مثل account-domain تقسیم نکردیم. «حساب» یک صفحه از همان هویت است، نه یک User دوم.

در [backend/src/modules/identity](../../backend/src/modules/identity/identity.module.ts)، چهار مسئولیت جدا هستند:

- **domain** قانون خالص دارد؛ [email-policy](../../backend/src/modules/identity/domain/email-policy.ts) ایمیل را معتبر و canonical می‌کند و [password-policy](../../backend/src/modules/identity/domain/password-policy.ts) طول رمز را می‌سنجد. این فایل‌ها Nest یا SQL را نمی‌شناسند.
- **application** سناریو را جلو می‌برد؛ [sign-in](../../backend/src/modules/identity/application/sign-in.service.ts) credential را می‌خواند، hash را بررسی و نشست جدید می‌سازد.
- **Port** قول کوچکِ وابستگی است؛ [IdentityStore](../../backend/src/modules/identity/application/ports/identity-store.port.ts) می‌گوید چه عملیات داده‌ای لازم داریم، نه اینکه SQL آن چیست.
- **adapter** آن قول را برای ابزار واقعی اجرا می‌کند؛ [PostgresIdentityStore](../../backend/src/modules/identity/infrastructure/persistence/postgres-identity-store.ts) از Drizzle و PostgreSQL استفاده می‌کند. [Module](../../backend/src/modules/identity/identity.module.ts) این پیاده‌سازی را به Port وصل می‌کند.

Controller فقط ترجمه HTTP و cookie را انجام می‌دهد. برای Health کوچک چهار لایه بی‌دلیل نساختیم؛ جداکردن مسئولیت متناسب مسئله است، نه مسابقه زیادکردن فایل.

## route، component و hook چه فرقی دارند؟

[صفحه اصلی](../../frontend/src/app/page.tsx) فقط DiscoveryScreen را ترکیب می‌کند. [DiscoveryScreen](../../frontend/src/features/discovery/components/discovery-screen.tsx) بخش‌های صفحه را کنار هم می‌گذارد؛ [SalonCard](../../frontend/src/features/discovery/components/salon-card.tsx) مسئول ظاهر یک کارت است. نه route و نه کارت، query دیتابیس یا قانون رزرو ندارند.

[useDiscoveryFilters](../../frontend/src/features/discovery/hooks/use-discovery-filters.ts) انتخاب فعلی کاربر را نگه می‌دارد؛ این رفتار stateful است، پس hook مناسب است. اما [filterSalons](../../frontend/src/features/discovery/model/filter-salons.ts) فقط ورودی می‌گیرد و خروجی محاسبه می‌کند؛ تابع عادی است. مثلاً «بانوان + رنگ مو + نیلوفر» فقط داده fixture را کم می‌کند و کاری در سرور انجام نمی‌دهد.

چند component به وضعیت نشست نیاز دارند؛ اگر هر کدام useState و /me جدا داشتند، ممکن بود یکی «وارد شده» و دیگری «خارج شده» نشان دهد. [SessionProvider](../../frontend/src/features/identity/components/session-provider.tsx) یک مالک state است و [useSession](../../frontend/src/features/identity/hooks/use-session.ts) فقط آن را مصرف می‌کند. پاسخ دیررس بررسی نشست پس از خروج نباید کاربر قدیمی را برگرداند؛ request قبلی لغو و بازبینی هنگام تغییر هویت هماهنگ می‌شود.

## اجرای دقیق فیگما یعنی چه؟

از screenshot رنگ و فاصله حدس نزدیم. کد واقعی Make، بردار icon، فونت Vazirmatn و تصاویر همان شناسه‌ها خوانده شدند. [tokens.css](../../frontend/src/design-system/tokens.css) مثلاً می‌گوید رنگ اصلی `#0f766e` است؛ هر component رنگ تازه برای خودش اختراع نمی‌کند. تغییر token، ظاهر بخش‌های مصرف‌کننده را هماهنگ تغییر می‌دهد.

[globals.css](../../frontend/src/app/globals.css) فونت محلی، base style و motion را تنظیم می‌کند. utilityهای منبع، اندازه‌ها و spacing را حفظ می‌کنند. componentها از کد همه‌کاره Make جدا شدند تا تغییر منطق ورود باعث تغییر فیلتر سالن نشود.

تصویر کد اصلی و پیاده‌سازی با عرض/ارتفاع، فونت، داده و state یکسان مقایسه و overlay شد. screenshot خود برنامه به‌تنهایی اثبات شباهت به فیگما نیست. [ledger](../references/sprint-03-figma.md) روشن می‌کند چرا badge سه رزرو، پنل آزمایشی و زمان آزاد ساختگی حذف شدند و چرا صفحه ایمیل/رمز، تکمیل مجاز طراحی است.

## fixture با داده واقعی چه تفاوتی دارد؟

[demo-salons.ts](../../frontend/src/features/discovery/data/demo-salons.ts) نمونه‌ای برای ساخت/آزمودن تجربه کشف است؛ PostgreSQL کاتالوگ سالن ندارد. اگر کارت «ماهور» دیده شود، فقط یعنی این نمونه در فیلتر هست. هیچ رزرو یا تضمین قیمت/زمان برای سالن واقعی ایجاد نشده است. دکمه کارت و «نوبت‌های من» این محدودیت را واضح می‌گویند.

در مقابل، ایمیلی که با [فرم](../../frontend/src/features/identity/components/credentials-form.tsx) ثبت می‌شود به API واقعی می‌رود؛ مرورگر بدون پاسخ موفق سرور ادعای ورود یا خروج نمی‌کند. قطع شبکه خطای قابل retry می‌دهد و pending اجازه ارسال دوباره هم‌زمان نمی‌دهد.

## hash رمز با رمزگذاری چه فرقی دارد؟

رمزگذاری برای برگرداندن داده با کلید است؛ hash رمز قرار نیست به متن اصلی برگردد. [Argon2PasswordHasher](../../backend/src/modules/identity/infrastructure/security/argon2-password-hasher.ts) از کتابخانه معتبر Argon2id و salt تصادفی استفاده می‌کند. برای ورود، `verify` می‌سنجد ورودی با hash سازگار است. دو کاربر با رمز یکسان هم hash یکسان ندارند.

ایمیل در سرور trim/lowercase می‌شود، اما رمز trim نمی‌شود: فاصله‌ای که کاربر در رمز گذاشته بخشی از آن است. طول ۱۲–۱۲۸ بر اساس Unicode code point است؛ emoji را نباید با تعداد واحدهای UTF16 اشتباه شمرد. UI راهنماست و سرور قانون نهایی را اجرا می‌کند.

ثبت‌نام تکراری پاسخ عمومی همان 202 را دارد؛ این پاسخ نمی‌گوید ایمیل از قبل وجود داشته است. credential قبلی هم عوض نمی‌شود. ساخت حساب، مالکیت ایمیل را ثابت نمی‌کند؛ برای همین `email_verified=false` صریح است و تأیید ایمیل/بازیابی اجراشده نشان داده نمی‌شود.

## session و cookie یکی نیستند

session یک رکورد سروری است: متعلق به کدام User، تا کی معتبر و آیا revoke شده؟ cookie وسیله حمل نشانه همان نشست در مرورگر است. [session-token](../../backend/src/modules/identity/application/session-token.ts) token تصادفی تولید می‌کند؛ سرور فقط digest آن را نگه می‌دارد و token خام در cookie HttpOnly می‌رود.

HttpOnly یعنی JavaScript صفحه نمی‌تواند آن را بخواند؛ مرورگر خودش cookie را با درخواست هم‌مبدأ می‌فرستد. token در localStorage یا JSON پاسخ نیست. با logout، هم رکورد سرور revoke و هم cookie پاک می‌شود؛ کپی قدیمی cookie هم دیگر معتبر نیست. صرف حذف cookie، نشست سرور را باطل نمی‌کرد.

[Next config](../../frontend/next.config.ts) درخواست `/api/v1` را به Nest می‌فرستد؛ backend دوم یا route handler موازی نساختیم. `BACKEND_ORIGIN` تنظیم سروری است و در rewrite زمان build ثبت می‌شود؛ تغییر مقصد به build تازه نیاز دارد.

## CSRF و محدودیت تلاش برای چه هستند؟

مرورگر گاهی cookie را خودکار می‌فرستد؛ پس داشتن cookie به‌تنهایی کافی نیست که هر سایت اجازه تغییر حساب داشته باشد. [AuthMutationGuard](../../backend/src/modules/identity/presentation/http/auth-mutation.guard.ts) روی register/login/logout، Origin دقیق مجاز و JSON را می‌خواهد. SameSite کمک می‌کند، ولی جای بررسی Origin را نمی‌گیرد.

[محدودکننده تلاش](../../backend/src/modules/identity/application/auth-attempt-limiter.service.ts) تعداد تلاش را در PostgreSQL نگه می‌دارد تا اجرای دو نمونه API سهمیه را دو برابر نکند. کلیدها HMAC می‌شوند؛ ایمیل/IP خام در جدول شمارنده ذخیره نمی‌شود. X-Forwarded-For دلخواه هم معتبر نیست. در topology محلی، Next یک peer مشترک است؛ تشخیص IP واقعی پشت لبه عمومی به طراحی بعدی نیاز دارد.

## چرا unique، transaction و تست واقعی لازم شدند؟

اگر دو درخواست هم‌زمان بپرسند «این ایمیل هست؟»، ممکن است هر دو «نه» ببینند. بررسی ساده قبل insert جلوی race را نمی‌گیرد. قید unique در [schema هویت](../../backend/src/modules/identity/infrastructure/persistence/identity.schema.ts) اجازه دو User با یک ایمیل نمی‌دهد. transaction هم تضمین می‌کند User و credential با هم ساخته شوند؛ شکست credential نباید User نیمه‌کاره باقی بگذارد.

[migration دوم](../../backend/drizzle/0001_identity.sql) تغییر جدید را اضافه می‌کند؛ migration قدیمی ویرایش نشد. تست upgrade واقعاً از تاریخچه اسپرینت ۲ شروع کرد تا تازه‌ساختن DB خالی، مشکل ارتقای DB قبلی را پنهان نکند.

[تست PG](../../backend/test/identity.integration-spec.ts) دو app واقعی، رقابت ثبت‌نام، rollback و نشست/سهمیه را روی PostgreSQL 17.11 بررسی می‌کند. mock نمی‌تواند قفل، unique یا رفتار transaction موتور واقعی را ثابت کند.

## چه چیزهایی واقعاً آزموده شدند؟

در check نهایی، ۷۳ تست واحد backend، ۲۰ واحد frontend، ۴۸ HTTP، ۲۳ PostgreSQL و ۱۷ مرورگر عبور کردند؛ تعداد و فرمان دقیق در گزارش است. مرورگر واقعی فرم‌ها را با API/PG واقعی اجرا کرد، نه پاسخ موفق ساختگی. فیلترها، خطای شبکه/retry، نشست دو حساب، خروج، فوکوس، RTL و عرض‌های مختلف هم بررسی شدند.

[runner مرورگر](../../frontend/e2e/fixtures/test-stack.ts) DB UUID و فرایندهای خودش را می‌سازد، منبع frontend را بدون env خصوصی به پوشه موقت می‌برد و در پایان منابع خودش را می‌بندد. تست خوب نباید دیتابیس توسعه را reset کند یا به برنامه‌ای که کارفرما باز گذاشته وصل شود.

برای امتحان دستی، [README](../../README.md) را دنبال کنید: API در یک ترمینال و frontend در ترمینال دیگر. یک حساب آزمایشی بسازید، وارد شوید، صفحه را reload و سپس خارج شوید. جستجوی سالن مستقل از ورود کار می‌کند. این تمرین هنوز رزرو واقعی، پیامک، تأیید ایمیل یا آمادگی انتشار عمومی را اثبات نمی‌کند.
