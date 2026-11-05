# گزارش اسپرینت۷ — رزرو قطعی و دفتر روزانه

به‌روزرسانی سیاست: پس از این گزارش، کارفرما انتشار فوری مالک را تصویب کرد. [ADR-013](../../architecture/adr/ADR-013-owner-self-publication.md) جای انتظار بررسی عادی را می‌گیرد؛ این گزارش سابقه همان بررسی است و الزام فعلی reviewer برای انتشار عادی نیست.

۲۰۲۶-۱۱-۰۴؛ وضعیت: **هسته رزرو محلی اجرا و آزموده شد؛ پس از تست کارفرما، مسیر شروع کار سالن و تشخیص ثبت نهایی اصلاح شد.** شاخه feat/sprint-07-bookings از dev به‌روز `96f58d8` ساخته شد. اسناد طرح قبلی حفظ و با درخواست صریح اجرای کارفرما مصوب شدند. commit/push، PR، merge و deploy انجام نشده‌اند. ادامه اصلاح با حفظ تمام تغییرهای محلی روی `fix/booking-onboarding-flow` است؛ [یافته‌ها و مرز آمادگی محصول](sprint-07-flow-review.md).

## محصول به چه مرحله‌ای رسید؟

مشتری می‌تواند سالن منتشرشده را پیدا کند، خدمت/متخصص/روز/زمان را انتخاب کند، پس از ورود ایمیلی نام و موبایل تماس بدهد و بلافاصله نوبت قطعی بگیرد. رسید و تاریخچه در «نوبت‌های من» باقی می‌مانند. قیمت و مدت توافق‌شده با تغییر کاتالوگ بازنویسی نمی‌شوند.

مالک همان نوبت را در تب «نوبت‌ها» می‌بیند؛ روز و متخصص را فیلتر و جزئیات/تماس را باز می‌کند. ثبت تلفنی/حضوری از همان ظرفیت استفاده می‌کند؛ نام لازم و تماس اختیاری است. لغو مالک پیش از شروع، با دلیل، نسخه و آزادسازی اتمیک ظرفیت انجام می‌شود. پیامکی ارسال نمی‌شود و هماهنگی لغو با مالک است.

این چرخه رزرو برای سالن تکمیل‌شده و تأییدشده است؛ ساخت سالن به‌تنهایی آن را عمومی نمی‌کند. راه‌اندازی reviewer مستقل و پذیرش مسیر شروع کار پیش از پایلوت لازم‌اند. لغو/جابه‌جایی مشتری، نتیجه مراجعه، تقویم پیشرفته، پرداخت آنلاین، SMS و تغییر auth در این اسپرینت اضافه نشدند. خدمت پیوسته تک‌متخصص و ظرفیت۱ برای هر دو گروه مردانه/زنانه حفظ شده‌اند؛ هزینه خدمت از رایگان‌بودن پلتفرم مستقل است.

## تغییر فنی و دلیل

- feature مستقل bookings با domain/application/infrastructure/presentation، Port واقعی و wiring Nest؛ بدون dependency تازه. [ساختار۷](../../architecture/sprint-07-structure.md)، [ADR-012](../../architecture/adr/ADR-012-booking-ledger.md) و [حالت‌های UI](../../architecture/sprint-07-ui.md) مرجع‌اند.
- چهار جدول Appointment/allocation/event/intent در migration افزایشی0005؛ FK مرکب tenant، exclusion GiST و deferred trigger، overlap و ledger ناقص را حتی با SQL مستقیم رد می‌کنند. snapshot و تاریخچه immutable هستند.
- قفل Business مشترک با تنظیمات؛ زمان سرور پس از قفل دوباره خوانده می‌شود. نرخ۱۰ایجاد در دقیقه و سقف۳نوبت آنلاین آینده هر حساب/سالن، همراه snapshot/قیمت/برنامه/اشغال دوباره بررسی می‌شوند.
- idempotency به actor/operation/fingerprint مقید و مرجع resource تا عمر رکورد حفظ می‌شود؛ replay پس از لغو یا خروج از افق ایجاد، وضعیت جاری همان نوبت را می‌دهد. موفقیت قبل commit نمایش داده نمی‌شود.
- خواندن schedule و busy در یک statement؛ خطای DB ظرفیت خالی نمی‌سازد. any در سرور و با ترتیب قطعی متخصص واجد شرایط انتخاب می‌شود. برنامه تازه، تخصیص و active متخصص با رزرو جاری/آینده تطبیق داده و تغییر ناسازگار rollback می‌شود.
- feature فرانت bookings با API decoder، hookهای read/mutation/checkout/manual و componentهای معنادار؛ رنگ و فرم از Design System جاری. بازگشت ورود allowlistشده، اطلاعات تماس فقط در حافظه، کلید تصادفی intent در sessionStorage؛ refresh خطادار دفتر داده قبلی همان فیلتر را با خطا نگه می‌دارد.

## نتیجه واقعی بررسی‌ها

محیط: macOS/Apple M2 با۸هسته منطقی، Node24.22.2، pnpm12.16.1، PostgreSQL17.11 محلی و Chrome. URL و رازهای DB از env خصوصی خوانده و چاپ نشدند. test DBها UUID مستقل و stack مرورگر Next/Nest/PostgreSQL واقعی دارند.

آخرین `pnpm run check` با TEST_DATABASE_URL اختصاصی و PLAYWRIGHT_CHANNEL=chrome با **exit0 و۳۳۰تست موفق، بدون failed/skipped** پایان یافت. شاهد محلی: work/sprint-07-run-check.log. پس از اصلاح مسیر شروع کار، check کامل دوباره با exit0 و همان۳۳۰تست موفق اجرا شد؛ تست انتشار حالا مسیر سالن تازه تا رزرو و دفتر همان مالک را یکپارچه بررسی می‌کند. پس از snapshot آن اجرا، فقط متن راهنمای ساعات کاری روشن‌تر شد؛ format و lint/typecheck متناسب و اجرای زنده دوباره بررسی شدند.

| بررسی                                                       | نتیجه    |
| ----------------------------------------------------------- | -------- |
| build هر دو workspace و routeهای جدید                       | موفق     |
| typecheck strict، lint بدون mutation، format:check کل پروژه | موفق     |
| unit بک‌اند                                                 | ۱۱۴ موفق |
| unit فرانت                                                  | ۴۱ موفق  |
| HTTP/Nest/OpenAPI                                           | ۵۶ موفق  |
| PostgreSQL واقعی                                            | ۸۰ موفق  |
| مرورگر واقعی                                                | ۳۹ موفق  |

شواهد جدید: race۱۰۰درخواست مستقل→دقیقاً۱نوبت/۱allocation؛ رقابت online/manual و any؛ cap اتمیک؛ retry هم‌زمان/کلید متعارض/replay پس از لغو؛ قید مستقل DB با SQL مستقیم و rollback ledger ناقص؛ حفاظت برنامه و race ایجاد/حذف برنامه؛ tenant/CSRF/rate؛ حفظ snapshot پس از آرشیو/عدم انتشار؛ بافر/مجاورت و خدمت رایگان۱۷دقیقه‌ای.

مرورگر: anonymous→signup→login→انتخاب حفظ‌شده→confirmed→reload→رسید؛ دو نشست رقیب؛ قطع پاسخ **پس از commit واقعی** و بازیابی همان رسید بعد refresh؛ مالک→agenda→تماس→لغو→ثبت دستی؛ عدم اتصال دستی از روی شماره. پاسخ موفق mock نشده است. نمایش۳۲۰/۳۶۰/۳۹۰/۴۳۰/۷۶۸/۱۲۸۰، متن۲۰۰٪، keyboard/focus، reduced-motion، timezone غیرتهران و خطای refresh با فهرست محفوظ بررسی شدند. شاهد تصویری work/sprint-07-screens و تصاویر اجرای محلی جدا ذخیره و بصری بررسی شدند؛ این بررسی audit کامل WCAG نیست.

در مسیر بررسی، انتظارهای قرارداد۶ به موجودی واقعی۷ ارتقا یافتند. انتظار منفی decoder باید booking_enabled=false را رد کند؛ fixture آن اصلاح شد. فهرست صریح endpointهای OpenAPI با۸مسیر تازه همگام شد. تست ناوبری فرم باید منتظر heading صفحه مقصد و alert محصول باشد، زیرا announcer خود Next هم role=alert دارد؛ locatorهای مبهم اصلاح شدند. هیچ invariant یا تست شکست مهم برای سبزشدن حذف نشد.

## دیتابیس و کارایی

migrationهای0000..0004 تغییر نکردند. ساخت از صفر، upgrade داده‌دار قدیمی و rerun در check پاس شدند. در توسعه، ابتدا pg_dump خصوصی در work/sprint-07-before-migration.dump گرفته شد؛ migration0005 اجرا و count/hash محتوای **تمام۱۹جدول قبلی** پیش/پس دقیقاً یکسان بود. شاهد خصوصی work/sprint-07-migration-preservation.json است. reset/truncate توسعه انجام نشد.

تست کارایی واقعی مستقل با۱۰سالن،۵متخصص در هر سالن،۱۰هزار نوبت تاریخی و۱۰نوبت روز شلوغ هر سالن؛۲۰کلاینت هم‌زمان در هر گروه HTTP محلی. fixtureها فقط در DB تست بودند. p95 اجرای اولیه: خواندن۳۶٫۸ms، availability۱۰۳٫۱ms و ایجاد۱۴۹٫۵ms؛ هدف‌های آزمایشی۵۰۰/۸۰۰/۱۰۰۰ms در این نمونه محلی برآورده شدند. شاهد کامل، تمام نمونه‌ها و EXPLAIN در work/sprint-07-performance.json است؛ تضمین تأخیر شبکه/بار production نیست.

agenda دو query محصول دارد (مجوز+صفحه)، نوبت‌های من یک query؛ query به‌ازای هر کارت نیست. EXPLAIN agenda از appointments_agenda_idx و فهرست شخصی از appointments_customer_idx استفاده کرد. خواندن برنامه/اشغال همان statement گروهی محدود است. نیازی برای Redis، WebSocket، queue یا شکستن سرویس از این شواهد نتیجه نشد.

## اجرای زنده و تست دستی

فرانت روی http://localhost:3000 و API روی127.0.0.1:3001 روشن‌اند؛ readiness مستقیم و از proxy موفق بود. فرایندهای قدیمی همین پروژه پس از بررسی مالکیت جایگزین شدند. PID/log در work/development-backend و work/development-frontend نگه داشته می‌شوند.

سالن موجود «الماس» draft و بدون متخصص عمومی بود. برای تست کامل، سالن **«سالن آزمایشی اسپرینت ۷»** با دو متخصص و ساعات۹تا۲۲، حساب مشتری و مالک مجزا، از API عادی ساخته شد؛ reviewer مستقل با ابزار توسعه مجوز موقت گرفت، درخواست انتشار را تأیید کرد و اختیارش لغو شد. این داده‌ها صریحاً آزمایشی و فقط روی دیتابیس محلی‌اند؛ حساب‌ها/سالن قبلی حفظ شدند. یک نوبت اولیه با API واقعی ثبت و وجود همان ID در رسید مشتری و agenda مالک بررسی شد.

راهنمای حساب‌ها و لینک‌ها در **work/sprint-07-test-access.md** با دسترسی محدود و خارج Git است؛ رمزها در مستند مخزن یا پاسخ چت منتشر نمی‌شوند. برای تست هم‌زمان، مشتری را در مرورگر عادی و مالک را در پنجره ناشناس وارد کنید. نوبت تازه مشتری با تازه‌سازی دفتر/بازگشت focus دیده می‌شود؛ WebSocket نداریم.

پس از راه‌اندازی، مرورگر واقعی جدا روی **همین localhost3000** با هر دو حساب وارد شد؛ رسید مشتری و agenda مالک موفق، خطای JavaScript صفر. شاهد work/sprint-07-local-browser-result.json و work/sprint-07-live-customer.png / work/sprint-07-live-owner.png است.

## بازبینی و مرز تحویل

مرز import، وابستگی دامنه، تکرار، خطای امن، PII، tenant و state فرم مرور شدند. تماس و credential در log/URL/storage عمومی نیستند. git diff --check و لینک‌های محلی بررسی شدند. تغییرها unstaged روی fix/booking-onboarding-flow هستند؛ commit/push با کارفرماست. CI نسخه تازه و rebuild/Compose جدید در این نوبت اجرا نشده‌اند؛ قبل انتشار Git/سرویس طبق quality gates لازم‌اند. پشتیبان محلی این نوبت جای آزمون restore و سیاست عملیاتی production را نمی‌گیرد.

پیام‌های پیشنهادی commit برای مرور مرحله‌ای:

1. `feat(bookings): add atomic appointment ledger and live availability`
2. `feat(frontend): add customer booking and salon daily agenda`
3. `test(bookings): verify concurrency recovery and tenant boundaries`
4. `docs: document sprint 07 architecture and learning`

[درس ساده فارسی](../../learning/sprint-07.md) دلیل transaction، قید DB، idempotency و snapshot را با مثال و فایل واقعی توضیح می‌دهد. اسپرینت۸ آغاز نشده است.

## پذیرش زنده اصلاح مسیر

پس از check تازه، سرویس‌های همین پروژه دوباره روی localhost3000 و API3001 راه‌اندازی شدند. مرورگر جدا با حساب آزمایشی مالک، کارت آمادگی و نوبت موجود در دفتر را دید؛ مرورگر بدون نشست، انتخاب و پیام عدم ثبت را دید و دکمه ثبت نهایی نداشت. دسترسی به ورود و نبود overflow در عرض‌های۳۲۰/۳۶۰/۳۹۰/۴۳۰ بررسی شد؛ خطای JavaScript صفر بود. شاهد خصوصی work/booking-flow-live-result.json و تصاویر work/booking-flow-live-readiness.png و work/booking-flow-live-guest.png است. رزرو تازه‌ای در DB توسعه ساخته نشد.

پیام پیشنهادی اصلاح: `fix(bookings): clarify salon onboarding and booking confirmation`. این تغییر همراه کد ثبت‌نشده۷ برای مرور کارفرما باقی مانده است.
