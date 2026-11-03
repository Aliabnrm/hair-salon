# ریدیزاین حساب و مدیریت سالن آراسته

تاریخ: ۲۰۲۶-۱۱-۰۱. محدوده، همین درخواست مستقل کارفرما پس از اسپرینت۴ است؛ اسپرینت بعدی شروع نشده است. حساب واقعی، API، مالکیت، cookie/session، version و idempotency مبنای کار باقی ماندند. backend، migration، وابستگی و token تازه‌ای برای این تغییر لازم نشد. ADR جدیدی نداریم.

## مسئله و جهت طراحی

در مرور نسخه آغاز کار، صفحه حساب یک کارت با دو اقدام هم‌وزن و فضای خالی زیاد داشت. فهرست سالن صرفاً متن در مستطیل سفید بود. فرم روی canvas بدون بخش‌بندی قرار داشت و آدرس، ورودی تک‌خطی بود. ناوبری مدیریت در ۳۹۰ پیکسل دو ردیف می‌شد و توضیح پیش‌نویس از عنوان و فرم جدا بود. دریافت نسخه تازه هشدار از دست‌رفتن ویرایش محلی نداشت.

جهت انتخابی: هدر petrol عمیق با نشان واقعی آراسته، سطح سفید روی canvas، توضیح‌های کوتاه و یک مسیر اصلی روشن. مرجع مشاهده‌شده، کشف فعلی پروژه، tokenها و [شاهد داخلی طراحی](../references/sprint-03-figma.md) است. در این نوبت Fresha، Booksy Biz، Treatwell Connect یا Square Appointments مشاهده نشدند و ادعای بررسی نسخه آن‌ها نداریم.

| مسیر                   | تغییر و دلیل                                                                                                                                                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/account`             | هدر برند، ایمیل واقعی LTR و قابل شکستن، نشانه عمومی کاربر، توضیح وضعیت تأیید ایمیل و یک ورودی برجسته به مدیریت. خروج پایین‌تر و ثانویه است. مهمان، loading، خطای شبکه، retry و خروجِ در حال انجام نیز UI دارند.                    |
| `/manage`              | کارت قابل کلیک با نشانه قیچی، نام، شهر/محله، برچسب متنی زنانه/مردانه و badge پیش‌نویس. empty state یک اقدام ساخت اولین سالن دارد؛ در فهرست، افزودن سالن اقدام اصلی است. skeleton نزدیک به ساختار کارت و pagination فعلی حفظ شدند.  |
| `/manage/new`          | یک فرم کوتاه با دو بخش اطلاعات اصلی و اطلاعات اختیاری؛ بدون wizard. انتخاب نوع سالن radio بومی با حالت انتخاب واضح و علامت تیک است؛ آدرس textarea و موبایل LTR است. خطا کنار فیلد و فوکوس روی نخستین خطای قابل اصلاح قرار می‌گیرد. |
| `/manage/[businessId]` | هدر با نام/شهر/نوع واقعی و پیش‌نویس؛ بازگشت به فهرست، ناوبری یک‌ردیفه و فرم مشترک با ساخت. ذخیره بدون تغییر غیرفعال است؛ انتظار و موفقیت فقط با وضعیت واقعی درخواست بیان می‌شوند.                                                  |

## رنگ، اندازه و ناوبری

همه رنگ‌ها از `frontend/src/design-system/tokens.css` مصرف می‌شوند: `petrol-deep` برای هدر، `petrol` برای عمل اصلی، `petrol-soft` برای انتخاب و ورودی مدیریت، `canvas` و `surface` برای تفکیک زمینه. `saffron-soft` با متن `saffron-deep` فقط در badge پیش‌نویس است. آیکن سالن نشانه برند است و عکس سالن نمونه به داده واقعی نسبت داده نمی‌شود. Vazirmatn محلی و دارایی‌های موجود حفظ شدند.

عنوان صفحه ۲۶، عنوان بخش ۱۸/۲۰، ورودی و label فرم ۱۶ و توضیح ۱۴ پیکسل‌اند. فاصله بیرونی موبایل ۱۶/۲۰، بخش‌ها ۲۴، ورودی ۵۶، کنترل اصلی حداقل ۵۲ و ناوبری حداقل ۴۴ پیکسل است. شعاع بخش‌ها ۲۴ و کنترل‌ها ۱۶ پیکسل است. فقط حالت `comfortable` در TextField، label/hint بزرگ‌تر و مرز `muted` را برای فرم جدید فعال می‌کند؛ ظاهر پیش‌فرض ورود/ثبت‌نام عوض نمی‌شود.

AppShell و اسکرول داخلی `main` حفظ شدند؛ نوار پایین دوم و action ثابت اضافه نشد. حساب در مسیرهای `/manage` نیز فعال است. ناوبری مدیریت از link و `aria-current` استفاده می‌کند؛ در RTL، گزینه فعال هنگام تغییر مسیر به محدوده قابل مشاهده آورده می‌شود. زیرصفحه‌های خدمات/متخصص/ساعات/تعطیلی فقط همین ناوبری مشترک را دریافت کردند. قرارداد و ظاهر داخلی فرم‌های آن‌ها تغییر نکرد.

## وضعیت و حفظ داده

- `useBusinessForm` مالک state فرم، dirty، فوکوس خطا و فراخوانی mutation فعلی است. ورودی در log، URL یا Web Storage ذخیره نمی‌شود.
- اعتبارسنجی کوتاه نام/شهر صرفاً کمک UI است؛ قواعد نهایی و مجوز همچنان در سرورند. خطای سرور برای همه فیلدهای فرم، از جمله نوع سالن و آدرس، به کنترل مربوط متصل است.
- قطع پاسخ پس از commit سرور، موفقیت جعلی نشان نمی‌دهد. فرم تا مشخص‌شدن نتیجه قفل است و retry همان intent و Idempotency-Key را نگه می‌دارد.
- `useBusinessSettings` آخرین پاسخ معتبر را هنگام شکست دریافت مجدد حفظ می‌کند. خطای دسترسی ۴۰۱/۴۰۳/۴۰۴ داده فرم را پنهان می‌کند.
- دریافت نسخه تازه در فرم تغییرکرده، توضیح صریح و دو انتخاب «ادامه ویرایش» و «دریافت نسخه تازه و کنارگذاشتن تغییرها» دارد. شکست شبکه ورودی را پاک نمی‌کند. دریافت موفق حتی با version برابر نیز فرم را از داده معتبر بازنشانی می‌کند.
- هنگام VERSION_CONFLICT، ورودی محلی باقی می‌ماند، ذخیره با version کهنه متوقف و دریافت آگاهانه نسخه تازه برجسته می‌شود. خطای نسخه با retry بی‌نتیجه همان نسخه پوشانده نمی‌شود.
- ذخیره موفق از پاسخ معتبر mutation استفاده می‌کند؛ GET تزئینی یا آمار خدمات/متخصصان دریافت نمی‌شود.

## فایل‌های اصلی

| مسئولیت                | فایل                                                                                                                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| هدر مشترک صفحات خصوصی  | [private-page-header.tsx](../../frontend/src/components/ui/private-page-header.tsx)                                                                                                                                                |
| حساب و دعوت به مدیریت  | [account-screen.tsx](../../frontend/src/features/identity/components/account-screen.tsx)                                                                                                                                           |
| فهرست و کارت           | [businesses-screen.tsx](../../frontend/src/features/salon-management/components/businesses/businesses-screen.tsx)، [business-card.tsx](../../frontend/src/features/salon-management/components/businesses/business-card.tsx)       |
| ترکیب صفحه ساخت/مشخصات | [business-settings-screen.tsx](../../frontend/src/features/salon-management/components/businesses/business-settings-screen.tsx)                                                                                                    |
| UI فرم و فیلدها        | [business-form.tsx](../../frontend/src/features/salon-management/components/businesses/business-form.tsx)، [business-form-fields.tsx](../../frontend/src/features/salon-management/components/businesses/business-form-fields.tsx) |
| رفتار فرم و نسخه معتبر | [use-business-form.ts](../../frontend/src/features/salon-management/hooks/use-business-form.ts)، [use-business-settings.ts](../../frontend/src/features/salon-management/hooks/use-business-settings.ts)                           |
| تبدیل خالص داده فرم    | [business-form-values.ts](../../frontend/src/features/salon-management/model/business-form-values.ts)                                                                                                                              |
| ناوبری                 | [management-navigation.tsx](../../frontend/src/features/salon-management/components/management-navigation.tsx)، [bottom-navigation.tsx](../../frontend/src/components/layout/bottom-navigation.tsx)                                |

## تصاویر و روش بررسی

Chrome واقعی، Next production، Nest و PostgreSQL مستقل آزمایشی استفاده شدند. حساب‌ها از فرم واقعی ثبت‌نام/ورود ساخته شدند؛ bypass مجوز یا پاسخ جعلی موفق نداریم. تنها قطع/تأخیر شبکه عمداً در آزمون شکست ایجاد شد. ایمیل تصاویر یک نشانی رزروشده آزمایشی در `example.com` است؛ تصویر یا اطلاعات خصوصی کارفرما در شواهد قرار نگرفت.

تصاویر `before` از snapshot بازسازی‌شده UI خوانده‌شده در آغاز کار، با متن‌ها و کلاس‌های همان نسخه گرفته شدند؛ این baseline از HEAD نیست، چون مدیریت اسپرینت۴ هنوز تغییر محلی بود. snapshot محلی در `work/account-management-redesign/before-source` باقی است. سه فایل نمایش حساب/فهرست/ناوبری پایین از متن آغاز کار بازسازی و بقیه source کپی شدند. این روش شاهد مقایسه چیدمان است، نه commit مستقل نسخه قبل.

پس از مشاهده تصویرهای ناقص هنگام resize، ثبت نهایی با reload هر مسیر، انتظار برای داده واقعی، فونت و frame مرورگر انجام شد. اندازه‌ها ۳۲۰، ۳۶۰، ۳۹۰، ۴۳۰ و ۱۴۴۰ در ارتفاع۹۰۰ هستند. مقایسه نمونه ۳۹۰:

| صفحه             | قبل                                                                             | بعد                                                                            |
| ---------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| حساب             | [قبل](../references/assets/account-management-redesign/before-account-390.png)  | [بعد](../references/assets/account-management-redesign/after-account-390.png)  |
| فهرست خالی       | [قبل](../references/assets/account-management-redesign/before-empty-390.png)    | [بعد](../references/assets/account-management-redesign/after-empty-390.png)    |
| فهرست دارای سالن | [قبل](../references/assets/account-management-redesign/before-salons-390.png)   | [بعد](../references/assets/account-management-redesign/after-salons-390.png)   |
| ساخت             | [قبل](../references/assets/account-management-redesign/before-new-390.png)      | [بعد](../references/assets/account-management-redesign/after-new-390.png)      |
| مشخصات           | [قبل](../references/assets/account-management-redesign/before-settings-390.png) | [بعد](../references/assets/account-management-redesign/after-settings-390.png) |

تمام عرض‌ها در [پوشه تصاویر](../references/assets/account-management-redesign) با الگوی `{before,after}-{account,empty,salons,new,settings}-{320,360,390,430,1440}.png` هستند. بخش پایین فرم نیز در `after-new-controls-320.png` و `after-settings-controls-320.png` ثبت می‌شود. تصویر کشف پس از تغییر و تست‌های layout/رفتار کشف برای بررسی اثر اجزای مشترک استفاده شدند.

## نتیجه بررسی و محدودیت

محیط اجرای تازه: Node24.22.2 و pnpm12.16.1 پروژه، Chromium با channel نصب‌شده Chrome، و PostgreSQL محلی اختصاصی تست. متغیر TEST_DATABASE_URL فقط به مقصد محافظت‌شده تست داده شد؛ runner برای هر worker دیتابیس موقت مستقل ساخت و در پایان آن را بست. DB توسعه برای این تست‌ها تغییر نکرد.

| فرمان واقعی از ریشه         | نتیجه تازه                                   |
| --------------------------- | -------------------------------------------- |
| `pnpm run build`            | هر دو workspace موفق                         |
| `pnpm run typecheck`        | هر دو workspace موفق                         |
| `pnpm run lint`             | موفق و بدون ویرایش خودکار                    |
| `pnpm run format:check`     | موفق و بدون ویرایش خودکار                    |
| `pnpm run test`             | backend: ۸۳، frontend: ۲۹؛ همه موفق          |
| `pnpm run test:e2e`         | ۵۲ تست HTTP موفق                             |
| `pnpm run test:integration` | ۳۷ تست PostgreSQL واقعی موفق                 |
| `pnpm run test:browser`     | ۲۶ تست مرورگر موفق، شامل ۵ تست تازه ریدیزاین |

اجرای نهایی `pnpm run check` با خروج موفق کامل شد؛ log محلی آن `work/account-management-redesign/check-final.log` است.

واحد، HTTP و PostgreSQL مجموعاً ۲۰۱ و همراه مرورگر ۲۲۷ تست‌اند. عرض‌های ۳۲۰/۳۶۰/۳۹۰/۴۳۰/۱۴۴۰، متن طولانی و بدون فاصله، ایمیل بلند واقعیِ آزمایشی، خطا و empty/loading، فوکوس و radio با صفحه‌کلید، دسترسی به همه لینک‌های ناوبری در RTL و متن ۲۰۰٪ با اسکرول تا کنترل در ۳۲۰ بررسی شدند. موفقیت ذخیره، حفظ داده در خطای دریافت تازه، بازنشانی پس از دریافت همان version، تعارض version، قطع پاسخ پس از commit و replay یک سالن، مالک دیگر، نشست منقضی، خروج و نبود اطلاعات خصوصی در Web Storage نیز بررسی شدند. تست کشف و layout در عرض‌های تبلت/دسکتاپ موجود نیز موفق بود.

کنتراست محاسبه‌شده با luminance نسبی sRGB: سفید روی petrol برابر ۵٫۴۷:۱، سفید روی petrol-deep برابر ۷٫۵۸:۱، muted روی canvas برابر ۴٫۵۵:۱، petrol-deep روی petrol-soft برابر ۷٫۲۷:۱، saffron-deep روی saffron-soft برابر ۶٫۸۳:۱، success روی success-soft برابر ۴٫۷۹:۱ و مرز muted ورودی روی surface برابر ۴٫۷۶:۱ است. حلقه فوکوس پیوند هدر سفید است؛ بنابراین روی petrol-deep هم تمایز دارد. این سنجش رنگ‌های اصلی جای ممیزی کامل دسترس‌پذیری نیست.

در اجراهای میانی، یک build آزمایشی به timeout رسید و تکرار مستقل موفق شد. selectorهای تست با نام قابل دسترسی CTA جدید هماهنگ شدند. تست قدیمی transport که اولین نشست کل دیتابیس را می‌خواند با اضافه‌شدن حساب‌های تست قبلی شکست خورد؛ query به همان token hash نشست خودش محدود شد. تست نشست منقضی هم هر دو مسیر معتبرِ تشخیص از `/me` یا خطای مدیریت را می‌پذیرد و برای بررسی خروج دوباره واقعاً وارد می‌شود. اندازه‌گیری zoom و screenshot پس از resize به انتظار برای چیدمان پایدار و بررسی مستطیل کنترل در همان `main` نیاز داشت. شکست‌ها در logهای محلی باقی‌اند و نتیجه نهایی جایگزین ادعای موفقیت آن اجراهای میانی نشده است.

شواهد متنی محلی در `work/account-management-redesign/` نگه داشته شدند؛ فایل‌های runtime و credential وارد Git نمی‌شوند. نسخه Next production محلی روی `http://localhost:3000` دوباره اجرا شد؛ `/account`، `/manage` و `/manage/new` پاسخ۲۰۰، readiness پاسخ۲۰۰ و `/account/security` پاسخ۴۰۴ دادند. صفحات خصوصی با همان نشست واقعی محافظت می‌شوند. CI remote برای تغییرهای ثبت‌نشده اجرا نشده است.

مرور دستی Safari/Firefox، موبایل فیزیکی، صفحه‌کلید نرم موبایل و screen reader انجام نشده است. اندازه متن و مرور با صفحه‌کلید در Chromium ارزیابی می‌شوند؛ ادعای انطباق کامل WCAG 2.2 AA نداریم. direct browser control در Work settings این محیط غیرفعال بود؛ مرور و تصاویر با Playwright واقعی پروژه انجام شدند.

## وضعیت Git و تحویل

در شروع، شاخه `feat/sprint-04-salon-management` دارای تغییرهای ثبت‌نشده فراوان بود. `git fetch origin` انجام شد؛ برای حفظ داده، switch/pull روی dev، reset، stash یا clean اجرا نشد. شاخه `feat/account-management-redesign` از checkout موجود ساخته شد و تغییرهای قبلی همراه آن باقی‌اند. diff نسبت به HEAD شامل کارهای قبلی نیز هست و نباید همه آن را به ریدیزاین نسبت داد. commit، push، PR، merge یا انتشار انجام نشد.

پیام پیشنهادی commit برای تغییرهای همین درخواست: `feat(frontend): redesign account and private salon management`.
