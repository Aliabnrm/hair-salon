# پرامپت اجرایی اسپرینت ۴ — مدیریت اولیه سالن

**اصلاح مصوب پس از اجرا:** کارفرما در ۲۰۲۶-۱۱-۰۱ حذف کامل MFA را درخواست کرد؛ [ADR-008](../architecture/adr/ADR-008-remove-owner-mfa.md) بر همه بندهای TOTP/reauth/recovery/assurance و معیارهای وابسته همین سند مقدم است. این بخش‌ها سابقه طرح اولیه‌اند و نباید دوباره اجرا شوند. مدیریت فعلی فقط نشست معتبر و مجوز مالک همان سالن را لازم دارد؛ سایر معیارهای tenant/داده/UI برقرارند.

نسخه ۱، تاریخ ۲۰۲۶-۱۱-۰۱. **این نسخه ابتدا برای بررسی تهیه شد؛ سپس کارفرما اجرای کامل آن را صریحاً درخواست کرد.** وضعیت اجرا و استثنای مبنای Git در [گزارش](../planning/sprints/sprint-04-report.md) و ADR-007 ثبت‌اند. عبارت‌های شرطی تصویب در متن، قرارداد مرحله تهیه پرامپت‌اند و مجوز گسترده‌تر از همین اسپرینت نمی‌دهند.

## ۱. مأموریت و اختیار

در پروژه موجود `hair-salon`، بخش مصوب اسپرینت ۴ را به‌صورت یک برش واقعی frontend → API → PostgreSQL پیاده کن. کاربر بتواند پس از احراز هویت و عامل دوم، سالن پیش‌نویس خود را ایجاد و خدمات، پروفایل متخصصان و برنامه کاری را مدیریت کند. داده پس از reload باقی بماند؛ مالک سالن A نتواند با تغییر هیچ شناسه‌ای به سالن B دسترسی بگیرد.

ما کارفرما و دستیار هستیم؛ محصول برای ایران است. مستند/توضیح فارسی، شناسه فنی انگلیسی. هدف علاوه بر خروجی قابل استفاده، یادگیری معماری و بک‌اند با مثال واقعی است. SOLID/Clean Code را با مسئولیت روشن، وابستگی درست و تست رفتار اعمال کن؛ تعداد لایه و فایل معیار کیفیت نیست.

مرجع محدوده [طرح اسپرینت ۴](../planning/sprints/sprint-04-plan.md) است. چهار پیشنهاد `S4-D01..04` آن، شامل دامنه تیم، خدمات تک‌مرحله‌ای، قرارداد پول/زمان و افزودن TOTP مالک، باید پیش از اجرای بخش وابسته صریح تأیید شده باشند. آن‌ها را با تهیه این فایل یا پاسخ‌های قدیمی مصوب فرض نکن. اگر کل طرح تأیید شد، ۴A سپس ۴B را بدون اجازه‌گیری تکراری داخل محدوده کامل کن؛ اگر فقط ۴A تأیید شد، ۴B را شروع نکن. تصمیم باز را مشخص و فقط کار مستقل و مصوب را ادامه بده؛ شرط امنیتی را با flag یا owner ساختگی دور نزن.

## ۲. baseline و شروع امن

1. `AGENTS.md` و `docs/engineering/git-workflow.md` را بخوان؛ status، branch، diff و فایل‌های واقعی را بررسی کن. تغییر کارفرما را حفظ کن؛ reset/clean/stash خودکار، commit، push، ساخت/merge PR یا deploy انجام نده.
2. از درخت کار مناسب و تمیز، `git fetch origin`، `git switch dev` و `git pull --ff-only origin dev`؛ سپس شاخه مستقل مثل `feat/sprint-04-salon-management` بساز. اگر شاخه مناسب از قبل وجود دارد، اول وضعیت/مبنایش را بررسی کن؛ تغییرها را برای ساخت دوباره شاخه حذف نکن.
3. **گیت baseline:** در بررسی ۲۰۲۶-۱۱-۰۱، dev روی `7360ce9` و اسپرینت ۳/pnpm روی شاخه `feat/sprint-03-frontend-auth` در `b80151c` بودند. هنگام اجرا دوباره بررسی کن که نتیجه اسپرینت ۳ و ADR-006 وارد dev شده‌اند. اگر نشده‌اند، اجرای این اسپرینت را روی dev قدیمی، با کپی برنامه یا merge خودکار شروع نکن؛ وابستگی را گزارش کن. تکمیل این وابستگی نیازمند روند Git و دستور مربوط کارفرماست.
4. baseline صحیح: `backend/`، `frontend/`، `pnpm-workspace.yaml`، `pnpm-lock.yaml` ریشه؛ NestJS/Next.js/TypeScript strict، PostgreSQL 17 و Drizzle/node-postgres. هویت ایمیل/رمز، Argon2id و نشست opaque HttpOnly اجرا شده؛ ایمیل verified نیست و MFA هنوز وجود ندارد. discovery آراسته fixture است؛ Business/tenant/رزرو واقعی وجود ندارند. گزارش قدیمی را نتیجه تست تازه معرفی نکن.
5. از کد موجود توسعه بده؛ scaffold دوباره، بازگشت به `apps/api`/npm، lockfile دوم، ارتقای عمومی dependency و جابه‌جایی نامرتبط انجام نده. packageManager و `.nvmrc` و scripts واقعی را بخوان؛ نسخه‌ها را از همان baseline بگیر.

پیش از تغییر کد، خلاصه کوتاهی از baseline، بخش مصوب، تصمیم‌های باز و اولین برش قابل نمایش بده. داخل محدوده روشن برای تصمیم عادی دوباره اجازه نگیر.

## ۳. context لازم؛ فقط بخش‌های مرتبط

- معماری: `docs/architecture/adr/ADR-002-code-organization.md`، ADR-005/006، `docs/architecture/codebase-structure.md` و [ساختار اسپرینت ۴](../architecture/sprint-04-structure.md).
- مهندسی: `docs/engineering/backend-standards.md`، `frontend-standards.md`، `quality-gates.md` و `git-workflow.md`.
- baseline: `docs/planning/sprints/sprint-03-report.md`، `docs/architecture/sprint-03-structure.md`؛ کد/تست مرتبط identity، config، DB، HTTP error/request-id، API client و SessionProvider.
- قرارداد: بخش مرتبط `docs/architecture/api-contracts.md`، `data-model.md`، `domain-model.md` و `security-and-privacy.md`؛ تصمیم‌های D-011 و Q-03/04/12/15 در اسناد محصول.
- UI: `frontend/src/design-system/tokens.css`، primitives موجود، `docs/references/sprint-03-figma.md`. منبع طراحی قبلی، طراحی پنل مالک را اثبات نمی‌کند.
- [منابع و حدود شواهد این طرح](../references/sprint-04-engineering-sources.md). برای API یا dependency تازه، مستند رسمی سازگار با نسخه نصب‌شده را هنگام اجرا بررسی کن؛ ادعای «بهترین GitHub سال ۲۰۲۶» نکن.

فایل مرتبط را واقعاً بخوان؛ تمام مستندات محصول را هر بار به context تحمیل نکن. در تعارض، دستور جدید کارفرما و AGENTS و ADR جاری بر prompt تاریخی مقدم‌اند؛ تغییر قرارداد مصوب را پنهانی انجام نده.

## ۴. قراردادهای محصول و داده

پیش‌فرض‌های زیر پیشنهاد اجرایی این طرح‌اند و پس از تصویب آن مبنا می‌شوند. کران‌ها validation فنی پایلوت‌اند، نه قیمت‌گذاری یا تعهد تجاری؛ تغییرشان باید در کد، OpenAPI، UI و تست همسو باشد.

| موضوع           | قرارداد                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| مدل سالن        | تک‌محل، `state=draft` سروری، timezone ثابت `Asia/Tehran`، `version=1`؛ هیچ API تغییر state/publication در این اسپرینت نداریم                                                                                                          |
| مخاطب           | `audience: men\|women` برای هر پروفایل سالن؛ محصول هر دو را پوشش می‌دهد. با `CategoryId` خدمت نمایشی frontend یکی نیست؛ fixture مجوز schema نیست                                                                                      |
| اطلاعات سالن    | `name` پس از trim بین ۲..۱۲۰ code point؛ `city` ۲..۸۰ و اجباری برای ساخت؛ `district` حداکثر ۱۲۰ و `public_address` حداکثر ۵۰۰، اختیاری و nullable در draft؛ شهر hard-code یا از fixture استخراج نشود                                  |
| تماس عمومی      | `public_phone` اختیاری؛ در این برش فقط موبایل ایران با نرمال‌سازی به `+98`، خط ثابت بعداً؛ حداکثر مجاز و قالب دقیق مستند شود. تأیید/مالکیت شماره ادعا نشود و SMS ارسال نشود                                                           |
| هویت/مجوز       | actor از نشست سرور، owner membership فقط حاصل ساخت اتمیک سالن؛ role/actor/user_id/state/timezone قابل انتخاب client نیستند. متخصص در این مرحله user_id ندارد                                                                          |
| خدمت            | `name` ۲..۱۲۰؛ `price_irr` عدد صحیح JSON بین ۰ و ۱۰٬۰۰۰٬۰۰۰٬۰۰۰ و مضرب ۱۰؛ `currency=IRR` خروجی ثابت؛ مدت صحیح ۱..۷۲۰ دقیقه؛ هر بافر صحیح ۰..۲۴۰؛ جمع مدت/بافر حداکثر ۱۴۴۰ دقیقه                                                      |
| پول             | DB از نوع bigint با CHECK؛ API فقط عدد صحیح در کران امن بالا، بدون serialize کردن bigint خام؛ UI تومان با برچسب، تبدیل دقیق ×۱۰؛ عدد اعشاری، scientific notation در ورودی فرم و overflow رد شوند؛ «رایگان بودن پلتفرم» قیمت خدمت نیست |
| متخصص           | `display_name` ۲..۸۰؛ active سروری پیش‌فرض true؛ خدمت‌ها UUID یکتا از همان سالن و برای تخصیص تازه فعال باشند؛ هیچ credential، دعوت یا جست‌وجوی حساب جهانی ساخته نشود                                                                  |
| متن             | plain text؛ whitespace-only و فیلد ناشناخته رد؛ آرایه‌ها bounded؛ هیچ HTML رندرشده از داده کاربر نداریم؛ محدودیت‌ها با Unicode سازگار باشند                                                                                           |
| هفتگی           | `weekday` عدد ۰..۶، شنبه=۰؛ `start_local/end_local` رشته دقیق `HH:mm`، بازه نیمه‌باز `[start,end)` و `start<end`؛ انتهای `24:00` فقط به‌عنوان کران پایان مجاز است، شروع آن ممنوع                                                      |
| استراحت/نیمه‌شب | استراحت فاصله بین بازه‌هاست؛ حداکثر ۴ بازه در هر روز/۲۸ در هفته؛ overlap و duplicate رد؛ بازه مجاور مجاز. بازه عبوری از نیمه‌شب رد شود؛ کاربر دو بازه در روزهای مجاور ثبت کند                                                         |
| روز خاص         | `local_date` تاریخ معتبر میلادی `YYYY-MM-DD` در تقویم سالن، نه timestamp؛ UI شمسی؛ هر scope/date فقط یک override فعال؛ `staff_id=null` یعنی سالن                                                                                      |
| زمان ذخیره      | created/updated/occurred timestamp از نوع timestamptz و UTC؛ برنامه هفتگی local time باقی می‌ماند. offset ثابت `+03:30` در منطق نوشته نشود                                                                                            |

پیشنهاد سقف پایلوت: هر حساب حداکثر ۳ سالن در این مرحله، هر سالن ۱۰۰ خدمت و ۵۰ پروفایل متخصص. check سقف ساخت هم‌زمان زیر قفل منبع والد/کاربر انجام شود. این سقف‌ها و نرخ‌ها در policy/config سرور نام‌دار و مستند باشند، نه literalهای پراکنده. صفحه‌های بزرگ بدون limit یا fetch همه داده‌ها نساز.

## ۵. ۴A.۰ — امنیت واقعی مالک، درون identity موجود

این بخش افزودن نقش عمومی owner به identity نیست؛ identity فقط سطح احراز را ارائه می‌کند و مالکیت سالن در قابلیت مدیریت تعیین می‌شود. نشست ایمیل/رمز قبلی برای مشتری باقی بماند. TOTP اثبات verified بودن ایمیل، هویت قانونی یا مجوز صنفی سالن نیست؛ پروفایل هنوز خصوصی است.

### جریان و قرارداد

همه مسیرها زیر `/api/v1`، هم‌مبدأ، no-store، نشست معتبر و Origin/JSON معتبر برای mutationها:

| مسیر                                         | ورودی/رفتار                                                                                                                                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /me/mfa`                                | فقط وضعیت enabled و نیاز به verification همین نشست؛ بدون secret، hash یا recovery code                                                                                                         |
| `POST /auth/reauthentications`               | `{password}`؛ بررسی رمز همین actor و صدور grant تصادفی opaque، وابسته به actor/session، اعتبار ۵ دقیقه، یک‌بارمصرف؛ فقط hash آن در DB                                                          |
| `POST /me/mfa/enrollments`                   | `{reauthentication_token}`؛ مصرف grant و ایجاد pending با TTL ده دقیقه؛ خروجی `enrollment_id,secret,otpauth_uri,expires_at` فقط برای همان actor در response خصوصی؛ عامل فعال قبلی جایگزین نشود |
| `POST /me/mfa/enrollments/{e}/confirmations` | `{code}`؛ همان actor/session، pending معتبر؛ فعال‌سازی اتمیک، مصرف timestep و تحویل ۱۰ recovery code تصادفی فقط یک‌بار؛ نشست جاری ارتقا یابد                                                   |
| `POST /auth/mfa/verifications`               | دقیقاً یکی از `{code}` یا `{recovery_code}`؛ عامل فعال همین user، مصرف اتمیک و ارتقای همان نشست؛ هیچ user_id دلخواهی از body گرفته نشود                                                        |

reauth/enrollment/verification خانواده auth هستند؛ پروتکل challenge/مصرف خودشان را دارند و از cache عمومی idempotency کسب‌وکاری برای response حاوی secret استفاده نمی‌کنند. ارسال دوباره confirmation نباید کدهای recovery را دوباره آشکار کند. از دست رفتن پاسخ، pending مبهم یا کد مصرف‌شده پیام قابل فهم داشته باشد؛ retry خودکار کور نکن.

### سیاست و حفاظت

- کتابخانه TOTP معتبر و سازگار با RFC 6238 انتخاب و نسخه exact/engine/license/دلیل در منابع ثبت شود؛ الگوریتم OTP سفارشی ننویس. پیشنهاد سازگاری authenticator: ۶ رقم، گام ۳۰ ثانیه، پنجره حداکثر ±۱؛ timestep تأییدشده فقط یک‌بار مصرف و `last_accepted_step` اتمیک به‌روز شود.
- schema هویت شامل grant احراز مجدد با actor/session/hash/expiry/consumed، enrollment رمزگذاری‌شده با actor/session/expiry، عامل فعال یکتا برای هر User و recovery hash با consumed_at باشد؛ assurance و idle به همان session تعلق دارند. هم‌زمان فقط یک pending معتبر برای user مجاز است؛ ساخت تکراری `409 MFA_ENROLLMENT_EXISTS`، عامل فعال `409 MFA_ALREADY_ENABLED`، و enrollment خارج actor/session برابر 404. تأیید enrollment، ساخت recovery و ارتقای نشست یک transaction باشند؛ timestep جدید باید اکیداً بزرگ‌تر از آخرین timestep پذیرفته‌شده عامل باشد.
- secret فعال و pending برای verification لازم‌اند و hash به‌تنهایی کافی نیست؛ با AEAD استاندارد مثل AES-256-GCM از Node crypto، nonce تصادفی مستقل، key id و AAD شامل user/هدف رمزگذاری شوند. کلید فقط config سرور معتبر و env خصوصی؛ نمونه env فقط placeholder. رمزنگاری اختصاصی یا key ثابت در Git ممنوع.
- recovery code حداقل ۱۲۸ بیت تصادفی، فقط hash/HMAC امن با key مستقل یا password hash معتبر در DB؛ مصرف یک‌بار و رقابت واقعی آزموده شود. recovery نباید MFA را خاموش یا secret را عوض کند؛ صرفاً نشست فعلی را ارتقا می‌دهد.
- امنیت سطح مالک: حداکثر ۸ ساعت از تأیید عامل و ۳۰ دقیقه عدم فعالیت مدیریتی؛ اعتبار primary session هم باید برقرار باشد. فقط دسترسی مدیریتی مجاز زمان idle را اتمیک جلو ببرد؛ نشست دیگری با تأیید عامل یک نشست ارتقا نگیرد. logout/revoke هر دو سطح را باطل کند.
- session عادی مدیریت را با `403 MFA_REQUIRED` و ارتقای منقضی را با `403 MFA_EXPIRED` رد کند؛ بدون نشست `401`. enrollment منقضی/کد نامعتبر/مصرف‌شده پاسخ عمومی و ثابت بدون افشای secret داشته باشد. نشست و assurance هنگام هر درخواست سروری بررسی شوند؛ refresh صفحه یا state client معیار نیست.
- تلاش رمز/کد: شمارنده PostgreSQL اتمیک؛ پیشنهاد حداکثر ۱۰ تلاش در ۱۵ دقیقه برای actor و ۶۰ برای peer واقعی، و محدودیت ایجاد enrollment؛ `429` با Retry-After. از X-Forwarded-For دلخواه اعتماد نگیر؛ محدودیت peer مشترک proxy فعلی را صریح گزارش کن، نه ادعای rate کاربر نهایی production.
- OTP/recovery/secret/password/grant/token خام وارد URL، log، audit، analytics، localStorage، sessionStorage، پاسخ عمومی، گزارش یا snapshot تست نشوند. نمایش secret و recovery در UI setup استثنای ضروری و خصوصی است؛ با خروج از صفحه/حساب پاک شود. پیام ذخیره recovery پیش از ادامه نمایش بده.
- reset، تغییر/حذف عامل، بازیابی پشتیبانی و SMS در این برش نیستند. مسیر bypass یا production backdoor نساز. این محدودیت پیش از پایلوت عمومی باید حل و برای کاربر روشن شود.

در صورت نیاز، ResolveSession و guard/type فعلی را با API عمومی محدود توسعه بده؛ مصرف مستقیم `identity/infrastructure` یا ساخت auth موازی ممنوع. origin/JSON guard فعلی را برای mutationهای جدید به نام/جای مناسب تعمیم بده و regression چهار endpoint موجود را حفظ کن.

## ۶. ۴A.۱ و ۴A.۲ — سالن و خدمات

در همه مسیرهای مدیریتی، نشست با assurance معتبر و owner membership فعال همان سالن لازم است. `POST /businesses` فقط assurance و actor معتبر می‌خواهد؛ owner membership داخل transaction ساخته می‌شود. `GET /businesses` عمومی آینده را برای فهرست خصوصی استفاده نکن.

| مسیر                                   | payload/خروجی و رفتار                                                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /me/businesses`                   | فهرست paginated فقط سالن‌هایی که actor مالک فعال آن‌هاست؛ نام/id/state/audience/version و نقش خود؛ بدون کاربران دیگر                |
| `POST /businesses`                     | `{name,audience,city,district?,public_address?,public_phone?}` → `201` سالن draft و عضویت مالک؛ همه یا هیچ                          |
| `GET /businesses/{b}/settings`         | اطلاعات مدیریتی سالن خود، version و ETag                                                                                            |
| `PATCH /businesses/{b}/settings`       | فقط فیلدهای قابل تغییر بالا، patch جزئی؛ state/role/timezone/policy رزرو قابل ویرایش نیست؛ nullable فقط فیلد اختیاری، patch خالی رد |
| `GET /businesses/{b}/catalog/services` | `active?`, cursor و limit؛ خدمات فعال/آرشیوشده همان سالن، بدون نشت به public projection                                             |
| `POST /businesses/{b}/services`        | `{name,price_irr,duration_minutes,buffer_before_minutes,buffer_after_minutes}`؛ active پیش‌فرض true و version=1                     |
| `PATCH /businesses/{b}/services/{s}`   | patch فیلدهای فوق و `active`؛ `false` آرشیو و `true` فعال‌سازی دوباره؛ حذف فیزیکی نداریم                                            |

آرشیو خدمت، تخصیص‌های قبلی را حذف نمی‌کند؛ در UI خدمت غیرفعال مشخص و برای تخصیص تازه غیرقابل انتخاب است. هنوز Appointment وجود ندارد؛ کنترل رزرو آینده، snapshot رزرو و خطای `FUTURE_APPOINTMENTS` را با stub یا عدد ثابت شبیه‌سازی نکن.

## ۷. ۴B — تیم، ساعت و استثنا

| مسیر                                             | payload/خروجی و رفتار                                                                                                                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /businesses/{b}/staff`                      | فهرست paginated همان سالن با active? و وضعیت تخصیص‌ها                                                                                                                        |
| `POST /businesses/{b}/staff`                     | `{display_name,service_ids:[]}`؛ ایجاد پروفایل و تخصیص‌های اولیه در transaction؛ فهرست خالی مجاز                                                                             |
| `PATCH /businesses/{b}/staff/{s}`                | `{display_name?,active?,service_ids?}`؛ ارسال service_ids یعنی جایگزینی کامل اتمیک، نبودن یعنی حفظ؛ `[]` یعنی رفع همه؛ validation قبل اثر جزئی                               |
| `GET/PUT /businesses/{b}/hours`                  | GET برنامه هفتگی و version؛ PUT `{intervals:[{weekday,start_local,end_local}]}` جایگزینی کامل اتمیک، `[]` یعنی تمام هفته بسته                                                |
| `GET/PUT /businesses/{b}/staff/{s}/hours`        | همان قرارداد و version مستقل برنامه متخصص؛ متخصص تازه بدون برنامه بسته است، از سالن به‌صورت مخفی ارث نمی‌برد                                                                 |
| `GET /businesses/{b}/schedule-exceptions`        | بازه اجباری `from,to` تاریخ ISO، حداکثر ۹۳ روز، staff_id?، cursor/limit؛ فقط داده همان سالن                                                                                  |
| `POST /businesses/{b}/schedule-exceptions`       | `{local_date,staff_id:null\|uuid,closed,intervals:[{start_local,end_local}]}`؛ closed=true ⇒ []، closed=false ⇒ حداقل یک بازه؛ scope/date تکراری فعال `409 EXCEPTION_EXISTS` |
| `PATCH /businesses/{b}/schedule-exceptions/{x}`  | `{closed,intervals}` جایگزینی وضعیت و بازه‌ها، scope/date immutable؛ خطای یک بازه تمام تغییر را rollback کند                                                                 |
| `DELETE /businesses/{b}/schedule-exceptions/{x}` | رفع override با version/idempotency و ثبت audit؛ خروجی 200 وضعیت حذف‌شده و version تازه؛ تاریخچه حداقلی حفظ، override دیگر مؤثر نیست                                         |

### معنای برنامه، بدون ساخت availability

- برنامه هر scope در روز خاص از exception فعال همان scope می‌آید؛ در نبود آن از هفتگی. exception جایگزین کل روز است، نه جمع مبهم بازه‌ها.
- برنامه مؤثر متخصص تقاطع برنامه مؤثر سالن و متخصص است. تعطیلی سالن هیچ‌وقت با بازبودن متخصص دور زده نمی‌شود. ساعات متخصص خارج ساعت سالن قابل ذخیره‌اند، ولی UI محدودشدن برنامه مؤثر را روشن می‌کند؛ ساعت قابل رزرو ادعا نکند.
- intervalهای ذخیره مرتب و canonical شوند؛ overlap/duplicate رد، adjacency مجاز. replacement زیر قفل والد، اتمیک و versioned باشد. قید DB و تست هم‌زمان مانع overlap و override تکراری باشند؛ read-before-write بدون قفل/constraint کافی نیست.
- weekday/تاریخ/کبیسه/ورودی شمسی و مرز 24:00 تست شوند. تابع دامنه بررسی/ترکیب برنامه می‌تواند نوشته شود؛ تولید slot، تخصیص متخصص، occupancy، بررسی نوبت آینده و endpoint availability این اسپرینت نیستند.

## ۸. قرارداد HTTP، version و تکرار امن

قالب جاری `{data,meta:{request_id}}` و error امن و `X-Request-Id` حفظ شود. مسیرهای جدول همگی زیر `/api/v1` هستند. ورودی UUID/array/enum/number/date واقعی validate و unknown field رد؛ از cast برای گذر از unknown استفاده نکن. خطا code ثابت انگلیسی، پیام فارسی، request id و retryable مطابق قرارداد واقعی؛ stack/SQL/نام constraint/وجود داده tenant دیگر منتشر نشود.

- `401` بدون نشست؛ `403` MFA/مجوز ناکافی برای منبع قابل مشاهده؛ برای business/child ناموجود یا خارج tenant همیشه `404` یکسان. body/path با tenant متفاوت یا child متعلق به دیگری مجوز نیست.
- `422` validation؛ `409` version/state/assignment/key conflict؛ `428` If-Match لازم؛ `429` نرخ؛ `503` خرابی وابستگی لازم. JSON خراب 400، type نامناسب 415 و body بزرگ 413 مثل پایه حفظ شوند. پاسخ همه مسیرهای خصوصی، حتی خطا و MFA، no-store باشد.
- همه ایجاد/تغییر/حذف کسب‌وکاری Idempotency-Key دارند؛ پیشنهاد key UUID، حداکثر ۶۴ ASCII مجاز. کلید غایب/نامعتبر 422. operation صریح و fingerprint شامل actor، method، path/tenant/child، بدنه canonical و نسخه مورد انتظار است. همان key/operation با fingerprint متفاوت `409 IDEMPOTENCY_CONFLICT`.
- برای PATCH/PUT/DELETE مدیریتی، `If-Match: "<version>"` اجباری؛ ETag نیز quoted integer است. نبود آن 428، قالب غلط 422، کهنگی 409 VERSION_CONFLICT. نسخه ساعت سالن/متخصص مستقل از نسخه مشخصات همان resource است؛ GET نسخه برنامه خالی اولیه را هم می‌دهد.
- ترتیب: **احراز نشست/assurance و دسترسی فعلی → بررسی replay معتبر → نسخه و mutation**. replay موفق همان پاسخ/شناسه/نسخه قبلی را می‌دهد، حتی اگر If-Match اصلی حالا قدیمی است؛ مجوز فعلی قبل replay دوباره سنجیده شود. raw secretهای MFA هرگز در این cache نیستند.
- ثبت نتیجه idempotency و اثر در یک transaction؛ دو درخواست هم‌زمان همان key فقط یک اثر. نتیجه کامل تا هفت روز، fingerprint و resource reference تا عمر منبع؛ پس از انقضای cache، replay قدیمی اثر تازه نسازد و `409 IDEMPOTENCY_RESULT_EXPIRED` با راهنمای بررسی وضعیت بدهد. نتیجه مبهم client با همان key پیگیری می‌شود، نه key تصادفی تازه.
- GET فهرست cursor opaque، limit پیش‌فرض ۲۰/حداکثر ۵۰، ترتیب پایدار `(created_at,id)`؛ cursor وابسته به tenant/filter و برای cursor نامعتبر 422. نه UUID تصادفی به‌تنهایی معیار ترتیب، نه فهرست بی‌کران. lookup انتخاب خدمات متخصص هم صفحات بعدی را پشتیبانی کند.
- mutationها Origin دقیق allowlist، application/json در عملیات دارای بدنه و حفاظت cookie فعلی را دارند؛ DELETE بدون بدنه همچنان Origin معتبر لازم دارد. تغییر guard نباید GETها را به JSON اجباری وابسته کند. سقف ۱۶KiB پایه حفظ و payloadهای bounded سازگار طراحی شوند.
- روی business writeها سهمیه actor/operation و روی create business محدودیت شدیدتر بگذار؛ پیشنهاد ۶۰ write/دقیقه/actor و ۵ ساخت/ساعت/actor، با شمارنده اتمیک موجود/قابل توسعه. هیچ سهمیه‌ای جای سقف resource و مجوز نیست. اندازه و نرخ در OpenAPI/گزارش ثبت شوند.

نمونه ساخت خدمت؛ نام فیلد در UI فارسی است و payload canonical:

```http
POST /api/v1/businesses/{businessId}/services
Content-Type: application/json
Idempotency-Key: <uuid>
Origin: <allowed frontend origin>

{"name":"کوتاهی مو","price_irr":2500000,"duration_minutes":45,"buffer_before_minutes":0,"buffer_after_minutes":10}
```

نمایش مبلغ نمونه: «۲۵۰٬۰۰۰ تومان». نمونه ویرایش همین resource از version 1 با `PATCH` و `If-Match: "1"` و key تازه است. key تازه فقط برای intent تازه، نه retry نتیجه مبهم.

## ۹. دیتابیس و صحت رقابت

- Business، Membership، Service، StaffProfile، StaffService، برنامه‌های هفتگی، ScheduleException/interval، idempotency و audit حداقلی همین قابلیت را بساز؛ User/session/MFA در identity بمانند. جدول رزرو، customer، outbox یا resource آینده نساز.
- شناسه UUID و timestamp سروری؛ version مثبت؛ FK عضویت به User، unique `(business_id,user_id)`؛ فقط role=owner قابل ایجاد در این برش. هیچ endpoint مدیریت عضو یا حذف آخرین owner نداریم؛ برای آینده stub حفظ آخرین مالک نساز.
- تمام childها `business_id` اجباری و `unique(business_id,id)` لازم برای FK مرکب داشته باشند. StaffService دو FK مرکب به staff/service همان business؛ ساعت/exception متخصص و child interval هم با FK مرکب کنترل شوند. `business_id` از مسیر معتبر می‌آید و body موازی ندارد.
- FK/CHECK/unique/indexهای واقعی برای پول، مدت، weekday، بازه، scope/date و عدم اتصال بین tenantها؛ unique استثنای سالن با staff_id=null را صریح حل کن (partial index جدا یا NULLS NOT DISTINCT متناسب PG). FK به‌تنهایی membership فعال/مالکیت actor را ثابت نمی‌کند.
- overlap بازه‌های ساعت را با constraint واقعی PG مثل exclusion روی minute range نیمه‌باز، یا راه معادل مستند با دفاع DB تضمین کن؛ extension موجود btree_gist را دوباره/بی‌دلیل جایگزین نکن. child closed/intervalها در transaction سازگار نوشته و از bypass کنترل‌شده adapter آزموده شوند.
- همه writeهای وابسته سالن قفل Business را اول و در صورت نیاز Staff مرتب‌شده را بعد بگیرند؛ مالک فعال و نسخه در همان transaction دوباره خوانده شوند. ساخت سالن برای سقف actor روی User قفل مناسب دارد. این ترتیب برای پایلوت ساده و قابل آموزش است؛ benchmark یا throughput نامحدود ادعا نشود.
- helper مشترک transaction/idempotency محدود به نیاز واقعی بساز؛ application/domain نباید pg/Drizzle transaction را دریافت کنند. deadlock/unique violation با code محدود نگاشت شود، نه catch عمومی که هر خطا را 409 کند. timeout و rollback اتصال را تمیز آزاد کنند.
- روی `(business_id,active,created_at,id)` یا شاخص متناسب query واقعی و کلیدهای FK لازم index بگذار؛ لیست/assignment را N+1 نکن. SELECT ستون محدود، query پارامتری و pagination اجباری؛ cache/Redis/Elastic برای حدس مقیاس اضافه نکن.
- audit حداقلی شامل actor reference، business/resource reference، action، زمان و request id در transaction write؛ بدون payload فرم، شماره کامل، password/secret/code؛ عمومی/قابل ویرایش از API نیست. پیشنهاد نگهداری سند امنیت را بدون تأیید به تعهد قطعی تبدیل نکن.
- migration افزایشی با journal/snapshot واقعی؛ SQL/metadata migration قبلی تغییر نکند. fresh DB، upgrade DB دارای داده هویت و اجرای مجدد migrator بررسی شوند؛ migrate با startup یا drop/reset DB توسعه انجام نشود.

## ۱۰. معماری، خوانایی و ابزار

[درخت و جهت import](../architecture/sprint-04-structure.md) را رعایت کن. یک `salon-management` feature با زیرقابلیت‌های مستقل برای شروع کافی است؛ نه service/controller عظیم، نه module خالی برای هر endpoint. identity API عمومی محدود لازم دارد؛ private deep import و service locator در business code ممنوع.

Controller فقط HTTP/DTO/actor و فراخوانی سناریو؛ application orchestration؛ domain تابع/قانون خالص؛ infrastructure SQL/crypto/library. constructor DI و Port برای I/O واقعی؛ interface برای هر تابع، BaseService، GenericRepository، CQRS/event bus یا microservices بدون نیاز نساز. `any`، `ts-ignore`، non-null assertion بی‌دلیل و double-cast برای پنهان‌کردن خطا ممنوع. پیام خطای فنی و خطای مورد انتظار دامنه تفکیک شوند.

dependency تازه فقط وقتی ابزار موجود پاسخ نمی‌دهد: نسخه exact، مستند رسمی، سازگاری Node/peer، license و script نصب بررسی و در منابع ثبت شود. برای TOTP یک adapter لازم است؛ یک فرم ساده دلیل نصب UI kit/state manager/form framework/چند date library نیست. global install، telemetry، سرویس ابری و تغییر package manager نداریم. تصمیم مهم امنیت/مرز داده را پس از تصویب در ADR با شماره آزاد ثبت و اسناد جاری را همسو کن.

## ۱۱. UI/UX موبایل و اتصال واقعی

- مسیرهای پیشنهادی: `/manage`، `/manage/new`، `/manage/[businessId]` و زیرمسیرهای services/staff/hours/exceptions؛ امنیت حساب در `/account/security`. routeها compose کنند؛ دسترسی server API منبع مجوز است.
- از tokenهای آراسته، فونت، spacing، radius و primitives فعلی استفاده کن؛ palette تازه و رنگ‌های تصادفی نساز. primary برای اقدام اصلی، neutral برای زمینه، semantic برای موفقیت/هشدار/خطا؛ حالت فقط با رنگ منتقل نشود. منبع پنل فیگما اگر وجود ندارد، پنل را طراحی تازه بر مبنای design system معرفی کن.
- mobile-first: در ۳۶۰ و ۳۹۰ CSS px و دسکتاپ ۱۲۸۰px بررسی؛ در ۳۲۰px reflow بدون گم‌شدن کنترل‌ها. RTL واقعی، متن LTR برای کد/زمان/مبلغ canonical، کارت/list قابل استفاده روی موبایل؛ table پهن و horizontal scroll اجباری نساز. navigation واضح و یک اقدام اصلی هر فرم.
- هدف کنترل اصلی حداقل ۴۴×۴۴ CSS px به‌عنوان انتخاب UX پروژه؛ آن را حداقل کلی WCAG معرفی نکن. label واقعی، focus واضح، ترتیب tab، error متصل به فیلد، status با aria-live، contrast مناسب و reduced-motion رعایت شوند؛ انطباق کامل را بدون audit ادعا نکن.
- setup TOTP با توضیح کوتاه و امکان واردکردن دستی secret در authenticator؛ QR فقط محلی و در صورت نیاز واقعی، بدون ارسال secret به تولیدکننده QR بیرونی. recovery code یک‌بار نمایش و هشدار نگهداری امن. مفقودی عامل و محدودیت بازیابی فعلی روشن باشد.
- فرم خدمت: تومان با جداکننده و برچسب، دقیقه برای مدت/بافر؛ normalization ارقام فارسی/عربی در utility خالص و تست‌پذیر، نه محاسبه پراکنده در JSX. backend ورودی canonical نهایی را اعتبارسنجی می‌کند.
- برنامه هفتگی با روزهای شنبه تا جمعه، وضعیت بسته، افزودن/حذف بازه و «اعمال برای روزهای انتخابی» فقط اگر پیاده‌سازی ساده و روشن باشد. بدون drag-and-drop، تقویم سنگین و autosave مبهم.
- استثنا با نمایش/ورودی شمسی قابل استفاده، تبدیل معتبر و تست leap/round-trip به تاریخ ISO؛ در صورت نبود datepicker مناسب، ورودی ساده و accessible کافی است. فقط `Intl` را برای تبدیل معکوس دلخواه فرض نکن؛ اگر کتابخانه لازم شد یکی با دلیل انتخاب شود.
- هر صفحه loading/empty/error/retry/forbidden/session-expired؛ pending و submit جلوگیری از double click، inline validation، تأیید آرشیو/رفع override، حفظ فرم در خطای شبکه. موفقیت فقط پس از پاسخ سرور؛ پس از mutation داده/نسخه از پاسخ معتبر یا refetch، با reload پابرجا.
- در 409 نسخه، تغییر سرور را اطلاع بده و reload/مقایسه ساده پیشنهاد کن؛ overwrite خودکار ممنوع. در نتیجه مبهم timeout، key همان intent حفظ شود؛ Retry-After رعایت شود. logout/تغییر سالن، state/داده خصوصی قبلی را پاک و request قدیمی را abort کند؛ پاسخ دیررس به سالن جدید ننشیند.
- `SessionProvider` و transport فعلی را توسعه بده. اکنون transport allowlist چهار مسیر identity و GET/POST دارد؛ PATCH/PUT/DELETE، header و ETag/request-id metadata را آگاهانه اضافه کن. API همان relative origin باشد؛ token در Web Storage و fetch موازی با decode/error تکراری نساز.
- component معنادار و کوچک؛ حدود ۲۰۰ خط علامت بازبینی. hook فقط برای stateful orchestration؛ validation/conversion خالص در function. business rule و authorization در UI تکرار نشود. primitive مشترک پس از نیاز واقعی استخراج شود؛ generic form همه‌کاره نساز.
- discovery fixture را به draftهای DB وصل نکن؛ آمار/رزرو/درآمد ساختگی به پنل اضافه نکن. عنوان/توضیح روشن «پیش‌نویس؛ هنوز منتشر نشده» نمایش بده.

## ۱۲. آزمون‌ها و معیار Done

شناسه‌های `S4-AC-01..10` در طرح مرجع پذیرش‌اند. رفتارهای مهم را با شاهد زیر پوشش بده؛ coverage نمایشی و تست جزئیات private لازم نیست:

1. **Unit:** قواعد مبلغ/مدت/بافر، روز/interval/adjacency/24:00 و override/تقاطع، canonical fingerprint، تبدیل تومان/ریال و شمسی/ISO، سیاست عمر assurance با clock کنترل‌شده؛ الگوریتم TOTP کتابخانه را دوباره پیاده/تست نکن، adapter را با بردار معتبر و replay سیاست خودمان بسنج.
2. **HTTP با Nest واقعی:** schema/status/ETag/If-Match/key/request-id، احراز/Origin/JSON/no-store، OpenAPI واقعی و خطای امن؛ fixture خطای داخلی فقط در test. guard جعلی مالک همه مسیرها، شاهد tenant نیست.
3. **PostgreSQL واقعی:** ثبت هم‌زمان دو درخواست یک key؛ key متفاوت/بدنه متفاوت؛ دو PATCH یک version؛ rollback ایجاد سالن/عضویت/idempotency؛ quota concurrent؛ FK بین دو tenant؛ overlap/exception duplicate؛ دو verification یک timestep و دو مصرف یک recovery فقط یک موفقیت. mock repository جای این آزمون‌ها نیست.
4. **دو actor/دو سالن:** خواندن و نوشتن تمام resourceها، جابه‌جایی business/child/service/staff/exception id، pagination و filter/cursor، replay پس از عدم مجوز، و عدم نشت متن/تعداد/داده؛ وضعیت 404 و عدم اثر DB assert شود، نه فقط status.
5. **Browser واقعی:** با Next production/API/PG آزمایشی واقعی، setup عامل، ساخت draft/خدمت/متخصص، برنامه و تعطیلی و reload؛ دسترسی مستقیم URL غیرمجاز، MFA expired، validation، version conflict، network failure/retry، خروج و عوض‌کردن سالن. از route mock به‌جای مسیر موفق اصلی استفاده نکن. در مرورگر تست، secret لازم را بدون ذخیره در trace/screenshot عمومی استفاده کن.
6. **Migration/regression:** fresh + upgrade seeded S3 + rerun؛ حفظ identity و فایل migration قبلی؛ ثبت‌نام/ورود/خروج/discovery قبلی و نصب frozen با lockfile واحد خراب نشوند.

TEST_DATABASE_URL و guardهای runner فعلی را بخوان؛ DB تست مستقل، شناسه/پورت/process متعلق به همین اجرا و cleanup در finally. روی DB توسعه/واقعی truncate/drop نکن و فرایند کارفرما را متوقف نکن. کدهای امنیتی تست از clock/fixture اختصاصی‌اند؛ secret واقعی وارد artifact نمی‌شود.

از ریشه، فرمان واقعی scripts را دوباره بخوان. در baseline مورد انتظار:

```sh
pnpm install --frozen-lockfile
pnpm run check
```

check ریشه build، typecheck، lint، format:check، test، test:e2e، test:integration و test:browser را شامل می‌شود. طی برش‌ها بررسی محدود مرتبط اجرا کن؛ پس از تکمیل محدوده مصوب check کامل لازم است. DB/مرورگر و env تست لازم را با روش امن موجود آماده کن. lint و format:check ویرایش نکنند؛ نیاز به format را صریح انجام بده. تست جدید باید واقعاً توسط scripts/CI کشف شود.

اگر مانع محیطی وجود داشت، دقیقاً command، مرحله، دلیل و آزمون اجرا‌نشده را ثبت کن؛ نه بررسی را حذف کن، نه تست قدیمی/ساختن فایل را موفقیت تازه جا بزن. CI remote فقط بعد push کارفرما و بررسی SHA خودش قابل گزارش است.

## ۱۳. تحویل، یادگیری و توقف در مرز

کار را در برش‌های ۴A.۰ → ۴A.۱ → ۴A.۲ → ۴B مصوب انجام بده. پس از هر برش، کوتاه بگو چه قابلیت واقعی اضافه شد، مهم‌ترین دلیل معماری چه بود و چه بررسی واقعاً انجام شد؛ از تاییدخواهی تکراری داخل محدوده مصوب اجتناب کن. از اتمام جزئی، Done کامل نساز.

پیش از تحویل، diff/status، جهت import و cycle، تکرار UI/logic، transaction/rollback، tenant در همه queryها، error handling، secret و cleanup را review کن. اسناد اثرپذیرفته data-model/API/security/codebase-structure/sprint-plan و ledger تصمیم‌ها را مطابق کد واقعی هماهنگ کن؛ پیشنهاد مصوب‌نشده را تصمیم کارفرما ثبت نکن.

پس از اجرای واقعی بساز/به‌روز کن:

- `docs/planning/sprints/sprint-04-report.md`: بخش اجراشده/نشده، فایل‌های اصلی، تصمیم‌ها و ADR، command/نسخه/محیط و نتیجه واقعی، شواهد ACها، محدودیت، سناریوی امتحان دستی، status/diff و وضعیت CI. secret/credential خصوصی را ثبت نکن.
- `docs/learning/sprint-04.md`: توضیح ساده فارسی با **فایل واقعی و مثال کد** برای authentication در برابر authorization/MFA، tenant/FK ترکیبی، transaction/قفل، version در برابر idempotency، مسئولیت Controller/application/domain/adapter و UI/hook/API؛ هر مفهوم با مشکل، انتخاب و دلیل. متن آموزشی بعد از پیاده‌سازی با کد واقعی نوشته شود.
- ADR تصمیم مهم امنیت مالک و مرز داده با شماره آزاد، شامل زمینه/گزینه/پیامد؛ منابع تازه با برداشت و حدود شواهد. برای rename جزئی ADR تشریفاتی نساز.

پاسخ پایان به کارفرما کوتاه و قابل فهم: چه شد و چرا، چه تست شد و محدودیت، لینک گزارش/درس، نحوه امتحان، شاخه/status محلی و **پیام پیشنهادی commit انگلیسی**. commit/push تازه را خود کارفرما انجام می‌دهد؛ PR/merge/deploy یا اسپرینت ۵ را شروع نکن.

## ۱۴. موارد ممنوع در این اسپرینت

availability/slot و رزرو، مسدودی اشغال/تقویم نوبت، انتشار عمومی و اتصال draft به discovery، CRM/پرونده/گزارش درآمد، دعوت/نقش پذیرش/انتقال مالکیت، SMS/OTP موبایلی، پرداخت، upload، چندشعبه/منابع/چندمرحله، app بومی، Redis/queue/microservices، بازنویسی کل برنامه و ارتقای ابزار نامرتبط. هیچ دکمه یا داده نمایشی این قابلیت‌ها را اجراشده القا نکند.
