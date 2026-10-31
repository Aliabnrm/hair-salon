# مرجع و تطبیق طراحی اسپرینت ۳ — آراسته

تاریخ: ۲۰۲۶-۱۰-۲۹. منبع کامل رابط از فایل باز Figma Make خوانده و صفحه کشف با آن مقایسه شد. صفحه‌های ایمیل/رمز «تکمیل مجاز طراحی» هستند؛ منبع، OTP نمایشی داشت. این سند ادعای تطبیق با صفحه‌ای که در منبع وجود ندارد نمی‌کند.

## منبع و روش دریافت

[فایل تأییدشده کارفرما](https://www.figma.com/make/Pxck6iAPnHETK1U4nIryUx/Tarot-Reading-App?t=yXxZjgKoE4d5m5dK-6)، کلید `Pxck6iAPnHETK1U4nIryUx`، عنوان `Tarot Reading App`؛ محتوای واقعی، آراسته و رزرو سالن است. درستی همین فایل صریحاً تأیید شد.

ابزار get_design_context برای Make در این جلسه callable نبود. کارفرما سپس computer use روی برنامه باز Figma را صریحاً مجاز کرد. طبق skill figma-design-to-code، کد مرجع خوانده و به معماری پروژه تطبیق داده شد. از Files برنامه، متن کامل App.tsx، BusinessApp.tsx، data.ts، format.ts، ui.tsx، index.css و favicon خوانده شد؛ انتخاب/کپی فقط برای خواندن بود و clipboard قبلی بازگردانده شد. Download code فایلی ایجاد نکرد، بنابراین دریافت source به آن وابسته نماند. فایل اصلی refresh، publish، ویرایش یا به Make AI ارسال نشد؛ هشدار همگام‌سازی خود برنامه نیز با دستکاری وضعیت آن پاسخ داده نشد.

[manifest و SHA256 منبع](assets/sprint-03/source-manifest.json) و نسخه خام محلی در `work/figma-source/` نگه داشته شدند. [تصویر مستقیم ناحیه پیش‌نمایش برنامه](assets/sprint-03/figma-desktop-preview.png) شاهد دسترسی به همان طرح است؛ به‌علت viewport/scroll متفاوت، baseline مقایسه هم‌اندازه نیست. [thumbnail اولیه](assets/sprint-03-figma-overview.png)، SHA256 برابر `e153bc7ecf609889e7d655663c8c8b6537767d9724a77a75d9e6f49aa1cfdfd9`، شاهد تاریخی محدود باقی ماند و برای اثبات تطبیق استفاده نشد.

## inventory صفحه‌ها و stateها

Make route واقعی چندصفحه‌ای نداشت؛ stateهای App بین tab و screen جابه‌جا می‌شدند. routeهای محصول به شکل زیر تفکیک شدند:

| route/بخش | منبع و state | نتیجه این اسپرینت |
|---|---|---|
| `/` | home/explore؛ هدر، hero، search؛ all/men/women؛ خدمت؛ ready/empty؛ شهر و محله | پیاده‌شده با همان ساختار، متن اصلی عنوان و داده‌های fixture؛ فیلتر ترکیبی واقعی محلی |
| کارت‌ها | ۱۲ سالن در تهران/شیراز/اصفهان/مشهد؛ تصویر، نوع، محله، ساعت، قیمت شروع و زمان فرضی | همان سالن/تصویر/قیمت/ساعت؛ زمان فرضی با «داده نمایشی» جایگزین شد |
| انتخاب مکان | sheet شهر/محله، draft و Apply، بستن/Escape و focus trap | پیاده‌شده؛ dialog بومی برای inert و گردش/بازگرداندن فوکوس |
| loading/error کشف | request نمایشی با تأخیر ۶۵۰ms و خطای کنترل‌شده پنل | fixture محلی نیاز به شبکه ندارد؛ تأخیر/خطای ساختگی وارد محصول نشد؛ empty واقعی حفظ شد |
| `/sign-in` و `/sign-up` | verify موبایل/کد با DEMO_CODE؛ صفحه ایمیل/رمز وجود نداشت | فرم ایمیل/رمز واقعی با tokenها و سبک همان فرم‌ها؛ تغییر مصوب روش ورود |
| `/account` | حساب ناشناس یا شماره ظاهراً تأییدشده؛ ابزار نمونه و ورودی مدیریت سالن | کاربر واقعی /me، reload، خطا/retry، خروج؛ شماره/عضویت/سالن فرضی ندارد |
| نوبت‌های من | ۳ رزرو اولیه، گذشته/آینده، لغو و جابه‌جایی | فقط توضیح روشن «رزرو هنوز فعال نیست»؛ badge و ticket ساختگی حذف شدند |
| salon/schedule/review/success | خدمات/متخصص/درباره؛ روز/ساعت، تداخل، قیمت، نتیجه نامشخص، موفقیت | خارج محدوده؛ کلیک کارت توضیح نمونه‌بودن می‌دهد و رزرو جعلی نمی‌سازد |
| BusinessApp | امروز، هفته، خدمات و بیشتر؛ وقت دستی/مسدودی و مدیریت نمایشی | خارج محدوده؛ ماژول یا route خالی ایجاد نشد |
| aside و ابزار حساب | تم‌های پیشنهادی، simulation شبکه/تداخل/کندی/SMS و reset نمونه | کنترل بازبینی prototype؛ وارد UI عمومی نشد |

## token و دارایی

منبع واحد رنگ/فونت/shadow، `frontend/src/design-system/tokens.css` است. canvas=`#f8fafc`، surface=`#ffffff`، sand=`#f1f5f9`، ink=`#0f172a`، petrol=`#0f766e` و deep=`#115e59` دقیقاً از CSS منبع‌اند. اندازه‌ها و spacing/radius با همان utilityهای Tailwind 4 حفظ شدند؛ motion و prefers-reduced-motion هم از منبع آمده‌اند. h-14 جستجو ۵۶px، targetهای اصلی ۴۴/۵۲px، تصویر کارت ۱۶۰px و navigation برابر ۶۴px است.

فونت واقعی Vazirmatn با وزن‌های ۴۰۰/۵۰۰/۶۰۰/۷۰۰/۸۰۰ از Google Fonts دریافت و محلی شد؛ مجوز SIL OFL در `frontend/public/fonts/OFL.txt` است. glyphها و BrandMark از مسیرهای واقعی ui.tsx به SVG مستقل export شدند؛ شکل مشابه یا SVG دست‌نویس جای آن‌ها ساخته نشد. Icon از mask همان فایل برای رنگ currentColor استفاده می‌کند.

تصاویر با همان photo ID، crop=entropy، fit=crop، q=80، w=900، h=640 دریافت و با object-cover منبع مصرف شدند. DNS مستقیم images.unsplash.com در محیط به مقصد نامعتبر می‌رفت؛ CDN همان مجموعه در `unsplash.imgix.net` با همان شناسه/پارامترها استفاده شد. تصویر نیلوفر/ترمه با پیش‌نمایش باز فیگما نیز مرور شد. [manifest دارایی‌ها و SHA256](assets/sprint-03/asset-manifest.json) منبع هر فایل را ثبت می‌کند؛ شرط استفاده تصاویر [Unsplash License](https://unsplash.com/license) است. در runtime هیچ تصویر یا فونتی از میزبان خارجی fetch نمی‌شود.

## روش مقایسه و شاهد

کد دریافت‌شده Make در محیط محلی مستقل اجرا شد؛ منطق و classهای آن حفظ شدند. فقط bootstrap اجرای محلی، registration صریح sourceهای Tailwind و انتقال URL فونت/عکس به همان bytes محلی انجام شد. فایل خام و hash پیش از adaptation نگه داشته شده‌اند. این تصاویر baseline خود پیاده‌سازی نیستند؛ از App اصلی Make گرفته شده‌اند. ابزار رندر همان Chrome 156.0.8078.48، scale=1، ارتفاع ۹۰۰، فونت/داده/تم/state یکسان و reduced-motion بود.

| viewport/state | مرجع از source Make | پیاده‌سازی |
|---|---|---|
| ۳۶۰×۹۰۰، ready/all | [reference](assets/sprint-03/reference-360.png) | [implementation](assets/sprint-03/implementation-360.png) |
| ۳۹۰×۹۰۰، ready/all | [reference](assets/sprint-03/reference-390.png) | [implementation](assets/sprint-03/implementation-390.png) |
| ۴۳۰×۹۰۰، ready/all | [reference](assets/sprint-03/reference-430.png) | [implementation](assets/sprint-03/implementation-430.png) |
| ۱۴۴۰×۹۰۰، product crop ۸۳۲×۸۳۶ | [reference](assets/sprint-03/reference-1440.png) | [implementation](assets/sprint-03/implementation-1440.png) |
| ۳۹۰، بانوان+رنگ مو، ۲ نتیجه | [reference](assets/sprint-03/reference-filtered-390.png) | [implementation](assets/sprint-03/implementation-filtered-390.png) |
| ۳۹۰، query ناموجود | [reference](assets/sprint-03/reference-empty-390.png) | [implementation](assets/sprint-03/implementation-empty-390.png) |
| ۳۹۰، انتخاب شهر/محله | [reference](assets/sprint-03/reference-location-390.png) | [implementation](assets/sprint-03/implementation-location-390.png) |

[overlay با نسبت ۵۰٪](assets/sprint-03/overlay-390.png)، [diff بدون حذف پیکسل متفاوت](assets/sprint-03/diff-390.png) و [اندازه/مقایسه ناحیه‌ها](assets/sprint-03/visual-measurements.json) نگه داشته شدند. default/filtered/empty/location به‌ترتیب ۷۸۹۵/۷۷۵۲/۴۸۷۲/۳۹۴۶ پیکسل متفاوت دارند؛ متن مجاز، badge و برچسب نمونه بخش اصلی تفاوت‌اند. این عددها به‌عنوان gate پنهان یا threshold پذیرش استفاده نشدند. عنوان hero و نتیجه در تمام عرض‌های مقایسه‌شده صفر پیکسل اختلاف داشتند؛ جای عمودی ناحیه‌های هدر، جستجو، tabs، فیلتر، عنوان و nav برابر بود. متن demo در عرض ۳۶۰ نیز همان تعداد خط منبع دارد.

## ledger اختلاف و تصمیم

| بخش | انتظار منبع / مشاهده | اصلاح یا علت مجاز |
|---|---|---|
| description قهرمان | ادعای «زمان‌های آزاد واقعی» | با دستور fixture: سالن/قیمت/ساعت نمایشی و رزرو غیرفعال؛ شکست خط و ارتفاع منبع حفظ شد |
| footer کارت | زمان آزاد امروز/فردای شبیه‌سازی‌شده | با «داده نمایشی» عوض شد؛ بقیه layout/قیمت/crop همان منبع است |
| nav | badge سه نوبت | حذف داده شخصی ساختگی؛ نوبت‌ها توضیح قابلیت غیرفعال دارند |
| desktop | aside بازبینی کنار محصول | حذف کنترل prototype و وسط‌چین‌کردن همان ناحیه محصول؛ crop مقایسه اندازه یکسان دارد |
| sheet | dialog سفارشی فقط با aria-modal | dialog بومی، Tab loop، Escape و بازگرداندن فوکوس؛ ظاهر sheet حفظ شد و inert واقعی اضافه شد |
| آیکن/shadow | SVG inline در Make و SVG exportشده به mask در محصول | glyph/اندازه/رنگ یکسان؛ تفاوت ریز raster/rounding دیده شد. مثلاً دکمه فعال «همه» فقط ۳۸ پیکسل با حداکثر اختلاف ۱ از ۲۵۵ داشت؛ سبک computed یکسان بود |
| ورود/ثبت‌نام/حساب | OTP و نشست درون state نمونه | ایمیل/رمز و نشست واقعی، مطابق دستور کارفرما؛ [ورود](assets/sprint-03/sign-in-390.png) و [ثبت‌نام](assets/sprint-03/sign-up-390.png) برای مرور، نه ادعای pixel parity صفحه ناموجود |

داخل محدوده کشف، اختلاف شناخته‌شده حل‌نشده در layout/asset/token باقی نماند؛ تفاوت‌های بالا آگاهانه و مستندند. browser test عرض‌های ۳۲۰/۳۶۰/۳۹۰/۴۳۰/۷۶۸/۱۰۲۴/۱۴۴۰، RTL، نبود overflow، بارگیری تصویر و دسترسی عمل اصلی با صفحه‌کلید را بررسی می‌کند. کیفیت روی موبایل فیزیکی، Safari/Firefox یا شرایط اینترنت ایران هنوز آزموده نشده است.
