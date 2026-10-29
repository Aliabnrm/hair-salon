# استاندارد بک‌اند
نسخه ۰٫۱ — مرجع پایدار اسپرینت‌ها؛ NestJS انتخاب‌شده، قواعد ADR-002 و ساختار codebase-structure معتبرند. این سند مجوز ساخت تمام قابلیت‌ها در اسپرینت ۱ نیست.

## مسئولیت‌ها
- Module مرز قابلیت و محل wiring وابستگی است؛ provider داخلی را بی‌دلیل export نکند. AppModule ترکیب‌کننده است، نه محل منطق محصول.
- Controller ورودی HTTP، DTO، فراخوانی application service و ارائه پاسخ را مدیریت کند؛ query DB، محاسبه زمان آزاد یا تصمیم مجوز در بدنه Controller قرار نگیرد.
- Application Service سناریو را هماهنگ می‌کند؛ transaction و فراخوانی مرزها به شکل واضح و قابل آزمون. سناریوی ساده نیاز به کلاس UseCase جدا در کنار Service تکراری ندارد.
- Domain قوانین و invariantها را بیان می‌کند؛ مستقل از request، ORM، Nest و state مرورگر. این جداسازی هنگام وجود قانون واقعی اجرا شود، نه برای پاسخ ثابت Health.
- Infrastructure ارتباط با PostgreSQL، SMS و فایل را انجام می‌دهد؛ جزئیات provider از قانون رزرو جداست. interface فقط وقتی مرز یا چند پیاده‌سازی/تست واقعی لازم است.

## خوانایی، SOLID و تکرار
نام‌ها هدف را نشان دهند؛ ابهام data،manager یا helper بدون مسئولیت مشخص بازبینی شود. توابع چند مسئولیتی و شاخه‌های تودرتو به واحدهای معنادار شکسته شوند؛ guard clause برای شکست زودهنگام مفید است. comment دلیل تصمیم را توضیح دهد، نه ترجمه هر خط. public API typed و خطاهای قابل انتظار مشخص باشند.

SRP: یک مسئولیت و دلیل تغییر؛ DIP: قواعد به قرارداد مرز وابسته، نه جزئیات provider؛ ISP: قرارداد کوچک مورد نیاز مصرف‌کننده؛ LSP/OCP در صورت وجود جایگزینی/توسعه واقعی، بدون وراثت و factory پیشاپیش. composition بر پایه نیاز واقعی انتخاب شود. یک خط منطق با نام مبهم در چندین فایل پخش نشود.

قواعد مشترک رزرو، مبلغ، شماره و زمان یک مرجع داشته باشند؛ cache، UI و مسیر دستی قاعده مستقل ناسازگار نسازند. abstraction همه‌کاره برای کدهای صرفاً مشابه ساخته نشود. Controller یا Service بزرگ نشانه بازبینی سناریوهاست؛ شکستن مکانیکی بر اساس تعداد خط کافی نیست.

## TypeScript و ابزار
strict=true؛ در TypeScript جدید می‌توان noUncheckedIndexedAccess و exactOptionalPropertyTypes را نیز فعال کرد و اثر را سنجید. any،ts-ignore،non-null assertion و cast دو مرحله‌ای برای ساکت‌کردن خطا جای طراحی صحیح نیستند؛ unknown در مرز بیرونی با narrowing. استثنای واقعی کوچک، توضیح‌دار و بازبینی‌شده باشد؛ نه خاموش‌کردن سراسری strict.

ESM/NodeNext مطابق ADR-003؛ import value مورد نیاز DI نباید به import type تبدیل شود. domain types با import type جدا شوند. تست HTTP باید boot واقعی DI را اثبات کند. constructor injection برای providerها؛ service locator و ساخت دستی provider داخل Controller استفاده نشود.

اعتبارسنجی compile-time جای validation runtime را نمی‌گیرد. env در startup validate شود؛ process.env در منطق محصول پراکنده خوانده نشود. از ConfigService یا object typed validated استفاده شود. در DTO محصول، whitelist و منع mass assignment و تفکیک request/response لازم است؛ پکیج DTO validation هنگام نخستین ورودی واقعی انتخاب شود.

## HTTP و امنیت
[قرارداد API](../architecture/api-contracts.md) مرجع shape است. Filter سراسری خطاها را به code/message/request_id ثابت نگاشت می‌کند؛ stack،secret،body یا متن خطای خام DB/provider به کاربر نرسد. request-id صرفاً برای correlation است و مدرک هویت نیست. در log فقط metadata لازم و پالایش‌شده؛ header،cookie،OTP،بدنه و query کامل ثبت نشوند.

Guard احراز و مجوز endpoint را اعمال می‌کند؛ scope داده tenant در application/repository و قیود DB نیز لازم است. business_id ارسالی از مرورگر مجوز ایجاد نمی‌کند. فرانت مرجع مجوز نیست. auth/CSRF/MFA/rate در اسپرینت مرتبط از ابتدا تست شوند.

در promiseها خطای شناور نداشته باشیم؛ await یا مدیریت صریح نتیجه. catch عمومی که failure را به موفقیت تبدیل می‌کند ممنوع؛ catch برای نگاشت خطا، جبران یا ثبت پالایش‌شده است. زمان جاری برای قواعد مهم قابل کنترل در تست باشد، نه Date.now پراکنده.

## دیتابیس و کارهای پس‌زمینه — هنگام ورود دامنه
migration نسخه‌بندی و قابل بررسی؛ schema sync خودکار production ممنوع. ORM ابزار دسترسی است؛ transaction،FK،index و exclusion SQL لازم را حذف نمی‌کند. برای رزرو و مسدودی دفتر اشغال و قفل مشترک طبق domain-model/data-model مرجعند. صحت هم‌زمانی با DB واقعی اثبات شود؛ mock کافی نیست.

ارسال SMS خارج transaction و بعد commit، با outbox اتمیک. idempotency نتیجه و اثر را هماهنگ نگه دارد. cache availability پیشنهادی است؛ ثبت از DB زنده بررسی می‌شود. پول عدد صحیح IRR در سرور، تاریخ UTC با IANA timezone، نمایش شمسی/تومان در UI. دامنه مالی، multi-resource و چندمرحله‌ای هنوز تصمیم‌های خود را می‌خواهند.

## عملکرد
الگوریتم، query و تعداد round-trip پیش از ابزار بیشتر بررسی شوند. EXPLAIN و index بر اساس query واقعی؛ pagination و سقف query مشخص؛ N+1 کنترل شود. Redis یا تغییر adapter صرفاً به امید سریع‌ترشدن اضافه نشود. نتیجه benchmark و بار مرجع در تصمیم عملکردی ثبت شود.
