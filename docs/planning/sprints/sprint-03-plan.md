# طرح اسپرینت ۳ — رابط آراسته و هویت ایمیل/رمز

> به‌روزرسانی پس از اجرا، ۲۰۲۶-۱۰-۳۱: طبق دستور تازه کارفرما، مدیر بسته جاری pnpm است؛ [ADR-006](../../architecture/adr/ADR-006-pnpm-workspace.md) و README فرمان‌های جاری را مشخص می‌کنند. npm در طرح پایین، قرارداد تاریخی زمان اجرای اسپرینت است.

تاریخ: ۲۰۲۶-۱۰-۲۹. وضعیت: **با پرامپت پیوست کارفرما اجرا شد؛ آماده مرور محلی**. [گزارش اجرا](sprint-03-report.md) شاهد معیارها و [درس](../../learning/sprint-03.md) توضیح ساده است. بخش‌های پایین محدوده مصوب زمان اجرا را نگه می‌دارند؛ داشتن این سند مجوز اسپرینت بعد نیست. commit/push انجام نشده است.

## هدف قابل نمایش

کاربر صفحه کشف سالن «آراسته» را با ظاهر و تعامل‌های داخل محدوده فیگما می‌بیند، داده نمونه را جست‌وجو و فیلتر می‌کند، با ایمیل/رمز ثبت‌نام و وارد می‌شود، پس از reload حساب خودش را از API واقعی می‌بیند و با خروج، نشست سروری‌اش باطل می‌شود. داده سالن در این مرحله نمایشی است؛ هویت و نشست واقعی و ماندگار در PostgreSQL هستند.

مراجع: [پرامپت](../../prompts/sprint-03.md)، [تصمیم مسیر و فناوری](../../architecture/adr/ADR-005-frontend-backend-layout.md)، [درخت دقیق فایل‌ها و مسئولیت‌ها](../../architecture/sprint-03-structure.md)، [شاهد و قرارداد فیگما](../../references/sprint-03-figma.md)، [D-010 تا D-013](../../product/assumptions-and-decisions.md). این طرح ادامه پایه واقعی اسپرینت‌های ۱/۲ است، نه بازنویسی آن‌ها.

## داخل و خارج محدوده

| داخل این اسپرینت | مرز خروجی |
|---|---|
| انتقال apps/api به backend | رفتار، workspace identity، migration قدیمی و تست‌های قبلی حفظ شوند؛ فقط یک API |
| ساخت frontend ریشه | Next.js App Router/React/TS strict پیشنهادی؛ نسخه دقیق سازگار در اجرا ثبت می‌شود؛ یک lockfile ریشه |
| استخراج طراحی و design token | منبع کامل Make، asset/فونت واقعی، RTL و تطبیق state/viewport طبق سند فیگما |
| discovery | هدر، hero، جست‌وجو، فیلتر مخاطب/خدمت، کارت‌ها، نتیجه و ناوبری مشاهده‌شده؛ fixture صریح و مستقل از DB محصول |
| identity | ثبت‌نام، ورود، نشست opaque در PG، کاربر جاری، حساب و خروج؛ API، UI و آزمون کامل |
| کنترل خطا و امنیت لازم همین قابلیت | DTO، cookie، CSRF، محدودیت تلاش، hash رمز، uniqueness و عدم افشای داده حساس |
| کیفیت و آموزش | regression پایه، PG واقعی، مرورگر واقعی، شواهد تطبیق، راه اجرا و آموزش فارسی پس از اجرا |

Business/Service/Staff/Booking/availability واقعی، ثبت یا لغو رزرو، پیامک/OTP، اتصال شماره، پرداخت، عضویت و مدیریت سالن، MFA نقش ممتاز، deploy و سرویس ایمیل خارج محدوده‌اند. ساخت route یا جدول خالی برای این دامنه‌ها لازم نیست. مدیریت امن سالن در اسپرینت بعد به طرح مجوز/tenant و MFA نیاز دارد؛ این پیش‌نیازها حذف نشده‌اند.

دکمه/ناوبری رزرو و «نوبت‌های من» در صورت وجود در منبع، با توضیح روشن محدودیت demo رفتار معنادار داشته باشند؛ هیچ نوبت یا موفقیت ساختگی به کاربر نسبت داده نشود. پنل کنترل prototype با UI عمومی یکی فرض نشود. صفحه حساب تنها داده واقعی actor را نشان دهد؛ داده demo در آن ذخیره نشود.

## ساختار و فناوری

مرجع واحد نام‌ها [sprint-03-structure](../../architecture/sprint-03-structure.md) است. backend/src/modules/identity مالک هویت/credential/session است؛ frontend/features/identity فرم و نشست، frontend/features/discovery داده نمایشی و تعامل کشف را مدیریت می‌کنند. routeها باریک، دامنه مستقل از Nest/ORM/UI و adapter پشت Port واقعی باشد. برای Health ساده لایه جدید ساخته نشود.

فرانت پیشنهادی Next.js برای مسیر عمومی و نیاز آینده SEO است؛ Nest تنها مالک API/DB می‌ماند. نسخه‌های Next/React و ابزار سبک CSS پس از دریافت source، با Node/npm/TS موجود و peer/engine واقعی کنترل و exact ثبت شوند. framework تولیدشده Make الزام معماری نیست. کتابخانه UI، query manager، Storybook یا shared package بدون نیاز واقعی اضافه نشود.

انتقال API قبل از قابلیت تازه انجام شود. workspace backend نام @hair-salon/api را حفظ کند. چک‌لیست مسیرها در ADR-005، از جمله Compose، CLI، env، runner و CI اجرا شود. نسبت‌های module-relative صحیح کورکورانه تغییر نکنند. SQL، journal و snapshot migration اسپرینت ۲ فقط منتقل و byte-identical باقی بمانند. migration بعدی از schema واقعی generate و از مسیر رسمی migrate شود؛ db push/synchronize جای آن نیست.

## قرارداد پیشنهادی هویت

این اعداد، قرارداد پیشنهادی همین طرح‌اند؛ نتیجه اجرای فعلی یا نیازمندی قطعی کل MVP نیستند. تغییر لازم در اجرای مصوب با علت و شاهد ثبت شود؛ گسترش دامنه به قابلیت جدید نیازمند طرح مستقل است.

### ایمیل و رمز

- ورودی فقط JSON با فیلدهای مشخص `email` و `password`؛ unknown field و نوع غیر string رد شوند. اندازه کل JSON محدود، پیشنهاد ۱۶ KiB، قبل از hash/DB؛ password در URL/query قرار نگیرد.
- ایمیل: trim فقط حاشیه، validation آدرس ASCII تا ۲۵۴ کاراکتر، lowercase کل آدرس به‌عنوان سیاست روشن این محصول. Gmail dot/plus حذف و alias guessing نشود. canonical واحد در ثبت‌نام/ورود/unique index استفاده شود؛ ادعای یکسانی تمام قواعد providerها نداریم.
- رمز: ۱۲ تا ۱۲۸ Unicode code point و حداکثر ۵۱۲ بایت UTF-8؛ بدون trim، normalization، اجبار ترکیب نماد یا truncation. امکان paste و password manager حفظ شود. مقادیر دقیق در policy خالص واحد و تست مرزی باشند.
- Argon2id با salt تصادفی کتابخانه؛ پیشنهاد اولیه حداقل memory=19456 KiB، timeCost=2، parallelism=1، با سنجش زمان/مصرف در محیط واقعی و بررسی منبع رسمی در اجرا. رمز خام یا رمزنگاری برگشت‌پذیر ذخیره نشود. bcrypt به دلیل محدودیت طول ورودی، جایگزین بی‌توضیح نیست.
- ایمیل در این اسپرینت تأیید مالکیت نمی‌شود؛ `email_verified_at=null`. داشتن credential، مالکیت ایمیل را ثابت نمی‌کند. بازیابی رمز/ارسال ایمیل خارج محدوده است؛ UI لینک فعالِ جعلی آن‌ها نداشته باشد و محصول آماده عرضه عمومی اعلام نشود.

### API و envelope

تمام مسیرهای جدول با پیشوند `/api/v1` هستند و DTO/decorator واقعی در OpenAPI dev/test مستند می‌شوند. موفقیت `data` و `meta.request_id` و خطا همان `{error:{code,message,request_id,retryable}}` فعلی است؛ header X-Request-Id با body یکسان باشد. پاسخ auth و /me دارای Cache-Control: no-store باشد.

| method و مسیر | درخواست/مجوز | پاسخ موفق و رفتار شکست |
|---|---|---|
| POST /auth/register | email,password؛ عمومی با CSRF و محدودیت تلاش | 202 با `data.registration="received"`، هم برای ایمیل تازه و هم موجود؛ هیچ session یا user id برنگرداند. پیام UI فقط دریافت درخواست و امکان ورود را بگوید، نه تأیید ساخت حساب |
| POST /auth/login | email,password؛ عمومی با CSRF و محدودیت تلاش | 200، `data.user={id,email,email_verified:false}` و Set-Cookie نشست تازه. ناشناخته/رمز نادرست یکسان 401 و UNAUTHORIZED، با پیام امن UI؛ علت lookup افشا نشود |
| GET /me | cookie معتبر | 200، `data.user={id,email,email_verified:false}` متعلق به همان نشست؛ غایب/نامعتبر/منقضی/باطل 401؛ شناسه user از client پذیرفته نشود |
| POST /auth/logout | cookie اختیاری، CSRF لازم | 200 با `data.signed_out=true`؛ نشست جاری revoke و cookie پاک شود. تکرار یا cookie نامعتبر همان نتیجه امن بدهد؛ خروج همه دستگاه‌ها خارج محدوده است |

ثبت‌نام موجود نه رمز را عوض می‌کند، نه نشست می‌دهد و نه به‌سبب unique violation خطای قابل تشخیص 409 می‌فرستد. ایجاد User و credential در transaction اتمیک است؛ unique constraint ایمیل canonical، مرجع race است. پاسخ یکسان و مسیر hash با هزینه مشابه برای ایمیل موجود/ناموجود رعایت شود؛ نرخ و حجم پاسخ اطلاعات lookup را لو ندهند. login ناشناخته از verify با hash dummy معتبر استفاده کند؛ تضمین مطلق زمان ثابت در شبکه ادعا نشود.

خطای JSON نامعتبر 400 و BAD_REQUEST؛ validation امن 422 و VALIDATION_FAILED؛ content-type نامناسب mutation برابر 415 و UNSUPPORTED_MEDIA_TYPE؛ Origin نامجاز 403 و FORBIDDEN؛ محدودیت تلاش 429 و RATE_LIMITED با Retry-After معتبر؛ DB ضروری قطع 503 و SERVICE_UNAVAILABLE. mapping این statusهای تازه در api-error موجود توسعه یابد؛ exception خام/متن SQL یا ساخت framework خطای جدید لازم نیست. فهرست خطای فیلدها اگر اضافه شد فقط نام/code غیرحساس، بدون مقدار رمز یا ایمیل باشد. رفتار endpointهای قبلی تغییر نکند.

این چهار endpoint auth نیازمند Idempotency-Key رزرو و If-Match نیستند: ثبت‌نام با uniqueness و پاسخ عمومی، خروج با revoke تکرارپذیر و login با صدور نشست کنترل می‌شود. تکرار خودکار login هنگام timeout ممنوع؛ کاربر می‌تواند وضعیت /me را بررسی کند. پاسخ login مبهم نباید موفقیت قطعی یا retry نامحدود بسازد.

### نشست، cookie و CSRF

- token نشست حداقل ۳۲ بایت تصادفی رمزنگاری‌شده؛ مقدار خام فقط cookie HttpOnly. در DB فقط SHA-256 token ذخیره شود؛ entropy بالا جلوی حدس‌زدن این hash را می‌گیرد. session در localStorage/sessionStorage، JSON، URL یا log قرار نگیرد.
- انقضای مطلق پیشنهادی ۷ روز از زمان ایجاد؛ بدون refresh/sliding در این اسپرینت. expires در سرور مرجع است؛ Max-Age cookie هماهنگ. نشست منقضی یا revoked حتی با cookie قدیمی قابل مصرف نباشد. رکوردهای منقضی/باطل‌شده پس از مهلت کوتاه پیشنهادی ۲۴ ساعت با cleanup محدود متعلق به همین قابلیت حذف شوند؛ هدف، نگهداری نامحدود token hash نیست. login session id قبلی client را نپذیرد و در صورت وجود نشست معتبر قبلی، آن را جایگزین/revoke کند؛ session fixation تست شود.
- production: نام `__Host-hair_salon_session`، Secure، HttpOnly، SameSite=Lax، Path=/ و بدون Domain. توسعه HTTP: نام `hair_salon_session` و secure=false تنها در development/test صریح. پاک‌کردن با همان نام/path/options انجام شود. production با تنظیم ناامن startup نشود.
- مرورگر فقط `/api/v1` هم‌مبدأ را مصرف کند؛ Next rewrite/proxy به BACKEND_ORIGIN server-only، نه API/DB دوم. cookie، Set-Cookie و request-id از مسیر واقعی مرورگر آزموده شوند. backend روی 3001 و frontend روی 3000 پیشنهادی‌اند؛ origin و پورت تست مستقل و معتبر باشند.
- برای تمام mutationهای auth، Origin دقیق allowlist شامل scheme/host/port و Content-Type JSON لازم است؛ غایب، null و بیگانه رد شوند. GET /me بی‌اثر بماند. SameSite یا proxy جای CSRF نیست؛ CORS=* همراه credentials ممنوع.
- .env.example فقط نمونه محلی ساختگی؛ secretها، DATABASE_URL و BACKEND_ORIGIN در bundle/public env نروند. تنظیمات محیطی typed و متمرکز، خطای config بدون انعکاس مقدار باشد. env خصوصی موجود حفظ شود.

### محدودیت تلاش و مدل داده

محدودیت server-side با bucket اتمیک PostgreSQL و window پیشنهادی ۱۵ دقیقه: login حداکثر ۱۰ تلاش برای ایمیل canonical و ۶۰ تلاش برای IP؛ register حداکثر ۱۰ درخواست برای IP. شمارش قبل از عملیات پرهزینه و برای ایمیل ناموجود هم یکسان اعمال شود؛ موفقیت، حفاظت IP را reset نکند. 429 تا پایان window و Retry-After مثبت بدهد؛ قفل دائمی حساب نساز. دو app instance نباید سهمیه مستقل داشته باشند.

کلید bucket از HMAC ایمیل canonical یا IP با secret مستقل سرور به‌دست آید؛ شناسه خام در log یا پاسخ نباشد. secret فقط backend و معتبر باشد؛ داده hashشده هم داده حساس عملیاتی محسوب می‌شود. IP از peer معتبر/پراکسی با trust صریح استخراج شود؛ X-Forwarded-For دلخواه client مبنای دورزدن سهمیه نشود. topology همین proxy در توسعه/تست با مرورگر واقعی ثابت شود؛ اعتماد کلی به تمام proxyها مجاز نیست. پاک‌سازی محدود bucketهای منقضی در مسیر نگهداری همین قابلیت تعریف شود؛ جدول بدون حد رشد نکند و worker فرضی ساخته نشود.

| جدول در schema app | مسئولیت و قید لازم |
|---|---|
| users | UUID id، email canonical unique/not-null، email_verified_at nullable، created_at؛ بدون tenant/role ممتاز از فرم |
| password_credentials | user_id با PK/FK به users، password_hash و زمان ایجاد؛ یک credential فعال این روش برای User |
| sessions | id، user_id FK، token_hash unique، created_at، expires_at، revoked_at nullable؛ index لازم برای lookup/expiry و check ترتیب زمان |
| auth_attempt_buckets | کلید hash و operation/window با unique، counter و زمان expiry؛ رزرو سهمیه اتمیک، index cleanup |

جدول‌ها متعلق به identity هستند؛ schema زیر infrastructure آن دامنه و aggregate schema در database/schema.ts. namespace app در leaf مستقل قرار گیرد تا import cycle ایجاد نشود. SQL جدید فقط برای همین جداول/قیود است؛ phone، Business،Membership و Appointment فعلاً ساخته نشوند. بعداً روش موبایلی با احراز مستقل به همان User وصل می‌شود؛ تطبیق خودکار شماره/ایمیل بدون اثبات ممنوع است.

## صفحات، state و تطبیق طراحی

routeهای داخل محدوده `/`، `/sign-in`، `/sign-up` و `/account` هستند. صفحه/حالت مرجع هرکدام باید در inventory منبع ثبت شود. ساختار root lang=fa و dir=rtl، email در input با جهت مناسب، focus/label/keyboard و فرم‌های pending/error/disabled قابل استفاده باشند. account فقط بعد از /me معتبر داده نشان دهد؛ 401 آن را پاک و به ورود هدایت کند. بازگشت پس از ورود فقط مسیر نسبی allowlist، بدون open redirect.

state نشست یک مالک روشن دارد؛ با قراردادن useSession در چند component، fetch و store مستقل تکرار نشود. reload، چند صفحه، logout و پاسخ منقضی state را هماهنگ کنند. اطلاعات کاربر در HTML/cache مشترک بین حساب‌ها نشت نکند.

discovery fixture با داده و تصاویر منبع هم‌معنا باشد؛ query/فیلتر ترکیبی، نتیجه خالی و reset رفتار واقعی داشته باشند. هیچ fetch جعلی به endpoint رزرو و هیچ برچسب «نوبت آزاد واقعی» ساخته نشود. شهر تهران در fixture طراحی فقط نمونه است و تصمیم قطعی پایلوت نیست. محدودیت‌های demo و badge نوبت فرضی مطابق سند فیگما روشن شوند.

**دقیقاً مطابق طراحی فیگما، بدون مغایرت شناخته‌شده در محدوده مصوب اجرا شود.** این شرط با source، inventory، screenshot هم‌شرایط و ثبت/رفع اختلاف اثبات می‌شود. فونت، تصویر و icon مشابهِ حدسی کافی نیست. تکمیل auth ایمیل/رمز اگر در source نباشد، تغییر مجاز محصول است و باید آشکارا از تطبیق صفحه موجود تفکیک و برای مرور مشخص شود. تغییرهای دسترس‌پذیری لازم و محدودیت demo نیز در ledger ثبت شوند. منبع کامل در دسترس نباشد، ادعای تکمیل UI مجاز نیست.

## ترتیب اجرا و آزمون واقعی

۱. Git و diff محلی و dev را بررسی کن؛ تغییر قبلی کارفرما را حفظ کن. طبق git-workflow، شاخه مرتبط از dev به‌روز، بدون commit/push خودکار. نسخه ابزار/منبع طراحی و امکان PG واقعی را بررسی و شاهد فعلی ثبت کن.
۲. API را منتقل کن، مسیرهای واقعی را اصلاح کن و build/typecheck/lint/format/unit/HTTP/integration قبلی را روی محل تازه واقعاً اجرا کن. migration قبلی با hash مقایسه شود.
۳. identity از policy و port تا schema/migration و HTTP، سپس تست PG واقعی اجرا شود. migration روی DB خالی و روی DB دارای migration اسپرینت ۲، سپس اجرای دوباره، بدون دستکاری تاریخچه آزموده شود.
۴. frontend و source inventory، tokenها و discovery در ساختار هدف؛ سپس auth متصل به API واقعی و stateهای شکست. mock مرورگر جای سناریوی کامل هویت نیست.
۵. مرورگر واقعی و تست بصری روی stack اختصاصی؛ سپس بررسی کامل و اجرای زنده محلی/توقف تمیز. گزارش و درس فقط از شواهد همین اجرا ساخته شوند.

| لایه | رفتار ارزشمند لازم |
|---|---|
| unit | canonical ایمیل، مرز طول رمز بدون trim، policy/expiry و ورودی config؛ بدون mock بی‌نیاز internals |
| PostgreSQL واقعی 17.11 | migration صفر/ارتقا/تکرار؛ ثبت‌نام هم‌زمان یک User/credential، rollback شکست؛ hash غیرخام، uniqueness/FK، token hash، expiry/revoke؛ rate limit هم‌زمان از دو app instance؛ cleanup محدود bucket |
| HTTP | DTO/unknown fields/limit، envelope و request-id، پاسخ عمومی ثبت‌نام تکراری، خطای ورود یکسان، cookie/options، CSRF absent/null/foreign، 429/Retry-After، 503 امن و عدم نشت sentinel به response/log |
| browser با API و PG واقعی | ثبت‌نام→ورود→/me→reload→خروج→رد cookie قبلی؛ جدایی دو حساب، session fixation، مسیر واقعی proxy/cookie و IP؛ قطع/خطای شبکه بدون موفقیت جعلی، reset pending و امکان retry کنترل‌شده |
| browser discovery/visual | جست‌وجو و فیلتر ترکیبی/empty/reset، navigation داخل محدوده، RTL/keyboard/focus، عرض‌های لازم، منبع و screenshot هم‌شرایط و رفع اختلاف‌ها |
| regression | liveness/readiness/recovery و بستن Pool/process، OpenAPI dev/test-only، startup و migration CLI از backend |

Vitest خانواده فعلی برای unit/HTTP/PG حفظ شود؛ Playwright برای مرورگر پیشنهادی است. screenshot/baseline از خود UI بدون مقایسه با منبع کافی نیست. coverage درصدی هدف نیست.

runner مرورگر از TEST_DATABASE_URL محافظت‌شده استفاده کند، DB با UUID متعلق به خود بسازد، migration رسمی اجرا کند، frontend/backend با پورت آزاد و env test مستقل بالا بیاورد و فقط فرایند/DB خودش را در success/failure/timeout پاک کند. به DATABASE_URL توسعه fallback نکند؛ .env توسعه نخواند و به سرویس در حال اجرای کارفرما با reuseExistingServer وصل نشود. allowlist میزبان/نام تست اسپرینت ۲ حفظ شود؛ guard تست با browser runner دور زده نشود. نسخه PostgreSQL compose/CI ثابت بماند؛ SQLite/mock شاهد DB نیست.

فرمان‌های هدف ریشه، پس از ساخت واقعاً در package.json تعریف و آزموده شوند:

| فرمان | مسئولیت هدف |
|---|---|
| npm run dev | API موجود؛ معنی قبلی بی‌خبر تغییر نکند |
| npm run dev:frontend | frontend؛ README دو ترمینال/env را توضیح دهد |
| npm run build / typecheck / lint / format:check / test | هر دو workspace؛ lint/format:check فقط بررسی |
| npm run test:e2e | HTTP مستقل backend؛ وابستگی تازه به DB نگیرد |
| npm run test:integration | تست PG واقعی backend با guard |
| npm run test:browser | مرورگر واقعی و fixture stack مستقل؛ frontend build واقعی |
| npm run check | همه موارد بالا از جمله browser؛ شکست هیچ مرحله‌ای مخفی نشود |
| npm run db:up / db:down / db:migrate | مسیرهای منتقل‌شده؛ volume توسعه در down عادی حفظ شود |

نام required check فعلی CI یعنی `API quality` بدون هماهنگی عوض نشود؛ همان workflow، build/check هر دو workspace و PostgreSQL/browser را پوشش دهد. secret توسعه وارد CI نشود. چون commit/push با کارفرماست، اجرای remote CI نسخه جدید تا push انجام نشده است؛ بررسی محلی یا CI قدیمی به‌عنوان CI این تغییر گزارش نشود.

## معیار پذیرش

| شناسه | شاهد لازم برای Done |
|---|---|
| S3-AC-01 | فقط backend/frontend و lockfile ریشه؛ انتقال واقعی با حفظ migration قدیمی، env خصوصی و regression موفق |
| S3-AC-02 | inventory کامل منبع Make، route/state و asset/token واقعی ثبت؛ مرز demo/control panel روشن |
| S3-AC-03 | discovery با فیلتر/جست‌وجو/empty/reset واقعی روی fixture مشخص؛ بدون رزرو یا نوبت واقعی جعلی |
| S3-AC-04 | signup/login/me/logout از UI تا PostgreSQL واقعی، reload و جدایی حساب‌ها موفق |
| S3-AC-05 | قید atomic signup، hash رمز/token، expiry/revoke و rate limit چندنمونه‌ای با PG واقعی اثبات |
| S3-AC-06 | cookie/proxy/CSRF و IP معتبر، DTO/errors/no-store و نبود داده حساس با HTTP و browser بررسی |
| S3-AC-07 | تصویر منبع و اجرا در state/viewport همسان؛ ledger بدون مغایرت حل‌نشده داخل محدوده، RTL/responsive/accessibility بررسی |
| S3-AC-08 | check کامل محلی واقعاً اجرا؛ فرمان/نتیجه/محدودیت و شواهد هر معیار ثبت؛ وضعیت remote CI صادقانه |
| S3-AC-09 | README/ساختار/API/data/security/ADR هماهنگ؛ گزارش و درس فارسی فقط پس از اجرا؛ پیام commit پیشنهادی، بدون commit/push خودکار |

## تحویل و یادگیری پس از اجرا

گزارش آینده در `docs/planning/sprints/sprint-03-report.md` باید معیار→شاهد، نسخه ابزار، command و نتیجه واقعی، منبع طراحی، screenshotها/اختلاف‌ها و اجرا‌نشده‌ها را ثبت کند. آموزش آینده در `docs/learning/sprint-03.md` با فایل واقعی و مثال ساده توضیح دهد: feature/domain، route/component/hook، token طراحی، fixture در برابر داده واقعی، hash در برابر encryption، cookie در برابر session، CSRF، uniqueness/transaction و علت تست PostgreSQL واقعی. این دو فایل پس از اجرای واقعی ساخته شدند؛ گزارش مرجع نتیجه نهایی است.

پایان اجرا: diff و مرز import، تکرار، catch، cleanup و داده حساس review شوند؛ نتیجه محلی و پیام انگلیسی commit تحویل کارفرما شود. commit/push و PR مطابق دستور جدید دستی‌اند و merge/deploy خودکار ممنوع است. اسپرینت بعد شروع نشود.
