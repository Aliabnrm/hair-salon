# قراردادهای اولیه API

وضعیت: Health، هویت ایمیل/رمز اسپرینت۳ و مسیرهای مدیریت/MFA بخش «قرارداد اجرایی اسپرینت۴» ساخته شده‌اند؛ سایر جدول‌های REST v1 طرح آینده‌اند. payload قابلیت‌های آینده قرارداد پیشنهادی است و endpointهای آن‌ها پیاده‌سازی نشده‌اند. تاریخ canonical در API میلادی ISO، timestamp با offset یا Z، timezone کسب‌وکار Asia/Tehran؛ UI شمسی است. مبلغ integer با currency=IRR؛ هیچ مبلغ client-authoritative نیست.

## تقدم تصمیم احراز هویت فعلی

طبق D-011، روش اولیه ایمیل/رمز در اسپرینت ۳ اجرا شد. OTP موبایلی و projection کامل آینده اجرا نشده‌اند؛ MFA خصوصی مدیریت در بخش اجرایی اسپرینت۴ آمده است. OpenAPI واقعی در development/test مرجع schema جاری است.

| مسیر زیر `/api/v1`  | قرارداد جاری                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /auth/register | JSON email/password، 202 یکسان `{data:{registration:"received"},meta:{request_id}}` برای تازه/موجود؛ بدون login/شناسه کاربر؛ duplicate رمز را تغییر نمی‌دهد |
| POST /auth/login    | 200 `{data:{user:{id,email,email_verified:false}},meta:{request_id}}` و cookie HttpOnly؛ 401 یکسان برای ایمیل ناشناخته/رمز اشتباه                           |
| GET /me             | فقط actor نشست جاری؛ همان projection کوچک، بدون نشست معتبر 401                                                                                              |
| POST /auth/logout   | JSON، 200 `{data:{signed_out:true},meta:{request_id}}`، ابطال نشست جاری و پاک‌کردن cookie؛ تکرار امن                                                        |

برای تمام mutationهای auth، Origin دقیق allowlist و application/json لازم است؛ غایب/null/بیگانه 403 و content-type نامناسب 415. credentials ناشناخته/نامعتبر 422، JSON خراب 400، body بیش از ۱۶KiB برابر 413، rate برابر 429 با Retry-After، DB خطادار 503 عمومی است. تمام پاسخ‌های auth و me حتی خطا no-store دارند. قالب خطای قبلی و X-Request-Id حفظ شدند؛ fields حساس، stack و SQL افشا نمی‌شوند. این چهار عملیات Idempotency-Key رزرو را ندارند.

ایمیل ASCII تا ۲۵۴ و local تا ۶۴ نویسه، trim حاشیه/lowercase کل آدرس؛ dot/plus یکسان‌سازی provider-specific ندارد. رمز ۱۲–۱۲۸ Unicode code point، حداکثر ۵۱۲ بایت UTF8، بدون trim. UI راهنما می‌دهد و سرور منبع نهایی policy است. قرارداد امنیتی/سهمیه در [security](security-and-privacy.md) و [گزارش](../planning/sprints/sprint-03-report.md) آمده است.

## قواعد مشترک قابل اعمال به تمام ردیف‌ها

- پیشوند /api/v1؛ JSON؛ شناسه UUID؛ فیلد ناشناخته رد شود. تمام routeهای مدیریتی business با membership فعال همان b و مجوز نقش و FK tenant کنترل می‌شوند؛ query/body با business_id دیگر رد می‌شود. داده عمومی فقط published projection است. /me فقط actor جاری؛ admin نیازمند MFA و permission مشخص است.
- GET بی‌اثر و قابل تکرار؛ بدون کلید. فهرست‌ها cursor opaque و limit پیش‌فرض ۲۰/حداکثر ۵۰، ترتیب پایدار (فیلد مرتب‌سازی،id)، خروجی items,next_cursor؛ cursor خارج از فیلتر/tenant رد شود. صفحه تقویم بازه حداکثر هفت روز دارد. فیلتر خارج allowlist=422.
- mutationهای کسب‌وکاری به جز OTP و چهار endpoint auth طرح اسپرینت ۳ نیازمند Idempotency-Key؛ key+actor+operation با hash بدنه طبق domain-model. PATCH/DELETE روی منبع mutable همچنین If-Match: version؛ نبود آن 428، ناسازگاری 409 VERSION_CONFLICT. replay همان mutation نتیجه قبلی می‌دهد و اثر جدید ندارد. برای OTP challenge_id و request_id کنترل تکرار مخصوص جریان اعمال می‌شود؛ retry ارسال بی‌قید ممنوع.
- HTTP: 200 خواندن/تغییر/لغو، 201 ایجاد، 202 صف بررسی/درخواست حریم خصوصی؛ 400 JSON نامعتبر، 401 بدون نشست، 403 مجوز ناکافی برای resource قابل مشاهده، 404 منبع ناموجود یا خارج tenant، 409 تعارض slot/وضعیت/quote/version/key، 422 validation، 428 version لازم، 429 rate با Retry-After، 503 وابستگی ضروری موقتاً unavailable. GET مسیر عمومی draft همیشه 404.
- ساختار موفقیت data و meta.request_id؛ version در منابع mutable و ETag عددی. ساختار خطا {error:{code,message,request_id,retryable}}؛ fields فقط برای validation مرتبط اضافه می‌شود. message فارسی و code ثابت انگلیسی؛ جزئیات DB/وجود حساب افشا نشود. validation جزئیات غیرحساس فیلدها را می‌دهد.
- لیست خطاهای ستون آخر، علاوه بر قواعد مشترک است. «مجوز» در هر ردیف بخشی از قرارداد است؛ مسیر فرانت‌اند مجوز ایجاد نمی‌کند. نرخ و idempotency در mutationهای ادمین نیز لازم است. نسخه شکستن قرارداد /v2 یا دوره مهاجرت با اطلاع‌رسانی؛ تغییر افزایشی فیلد اختیاری سازگار است.

## پایه مصوب اسپرینت ۱ — پیاده‌سازی و بررسی‌شده

GET /api/v1/health/liveness عمومی و بی‌اثر است؛ HTTP 200 با data.status="ok" و meta.request_id،همراه X-Request-Id یکسان. liveness فقط فرایند برنامه را می‌سنجد؛ DB/SMS و readiness در این قرارداد نیستند. درخواست ناشناخته 404 با error.code=NOT_FOUND،message امن فارسی،request_id و retryable=false می‌گیرد. خطای ناشناخته 500 با INTERNAL_SERVER_ERROR و پیام امن است.

request-id تک‌مقداری [A-Za-z0-9_-] با طول ۱..۶۴ پذیرفته،و در حالت دیگر UUID تولید می‌شود؛ شناسه مدرک هویت نیست. GET /api/docs و GET /api/openapi.json فقط development/test ثبت و در production غیرفعال‌اند. معیار و schema دقیق در [پرامپت اسپرینت ۱](../prompts/sprint-01.md)؛ middleware/filter/prefix در runtime و تست از app.setup مشترک استفاده می‌کنند.

## پایه اسپرینت ۲ — readiness دیتابیس

`GET /api/v1/health/readiness` عمومی و بی‌اثر، با `SELECT 1` واقعی و timeout محدود است. موفقیت 200: `{"data":{"status":"ok"},"meta":{"request_id":"same-as-header"}}`. شکست اتصال/query/timeout، 503: `{"error":{"code":"SERVICE_UNAVAILABLE","message":"سرویس موقتاً آماده پاسخ‌گویی نیست.","request_id":"same-as-header","retryable":false}}`. این false به معنی دائمی‌بودن اختلال نیست. hostname، نام DB، URL، SQL و exception خام در پاسخ/log عمومی نیستند. liveness هنگام قطعی 200 باقی می‌ماند و readiness پس از برگشت DB در همان app بازیابی می‌شود. DTO/decorator واقعی schemaهای 200/503 را در OpenAPI فقط dev/test ارائه می‌کنند. این probe نسخه migration آینده یا SMS را بررسی نمی‌کند.

## هویت و مشتری — نقشه آینده، به‌جز قرارداد محدود اسپرینت ۳ بالا

| روش/مسیر                                   | مجوز                      | ورودی → خروجی                                                                                                   | validation/قاعده اختصاصی و خطا                                                                                                   |
| ------------------------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| POST /auth/otp/challenges                  | عمومی با rate limit       | phone,request_id → challenge_id,expires_in,retry_after                                                          | نرمال شماره ایرانی؛ پاسخ یکسان برای وجود/عدم وجود حساب؛ 429،503؛ تکرار request_id همان challenge و بدون ارسال دوباره             |
| POST /auth/otp/verifications               | دارنده challenge          | challenge_id,code → session cookie و me                                                                         | کد یک‌بار و attempts اتمیک؛ کد منقضی/نامعتبر 422؛ مصرف هم‌زمان فقط یک نشست؛ نیاز MFA برای privileged                             |
| POST /auth/mfa/verifications               | نشست primary محدود        | challenge_id,totp/recovery_code → ارتقای نشست                                                                   | TOTP با پنجره کوتاه و جلوگیری replay همان timestep؛ recovery یک‌بارمصرف؛ OTP پیامکی به‌تنهایی سطح مالک/ادمین را نمی‌دهد؛ 422،429 |
| POST /me/mfa/enrollments                   | نشست OTP تازه و صاحب هویت | نوع TOTP → enrollment_id و secret موقت فقط برای کاربر                                                           | secret رمزگذاری‌شده، TTL کوتاه و بدون log؛ تا تأیید عامل، نقش ممتاز فعال نمی‌شود؛ 409 اگر از قبل فعال                            |
| POST /me/mfa/enrollments/{e}/confirmations | همان User با نشست تازه    | totp → فعال‌سازی MFA و recovery codes یک‌بار نمایش                                                              | enrollment متعلق به actor، انقضا و replay بررسی؛ secret قدیمی با این مسیر جایگزین نشود؛ 422                                      |
| POST /auth/logout                          | نشست جاری                 | بدون body → revoked                                                                                             | revoke سروری؛ تکرار logout موفق بدون اثر اضافی؛ CSRF                                                                             |
| GET /me                                    | واردشده                   | — → نام، موبایل خود، memberships و تنظیمات                                                                      | هیچ profile خصوصی سالن دیگر بازنگردد                                                                                             |
| PATCH /me                                  | واردشده                   | display_name,notification_preferences → me/version                                                              | تغییر موبایل مسیر عادی نیست؛ نیازمند احراز مجدد و بازیابی مستقل؛ marketing consent هرگز پیش‌فرض true                             |
| POST /me/privacy-requests                  | واردشده/احراز مجدد        | type=export/delete,reason? → request_id,status                                                                  | محدود به خود؛ 202؛ رسیدگی دستی پایلوت؛ موارد نگهداری قانونی/اختلاف توضیح داده شوند                                               |
| GET /businesses                            | عمومی                     | name?,city?,district?,category?,cursor?,limit? → items                                                          | بدون فیلتر امتیاز/فاصله در P0؛ متن جست‌وجو حداکثر ۱۰۰ نویسه؛ projection عمومی                                                    |
| GET /businesses/{b}                        | عمومی                     | id → پروفایل عمومی، خدمات، سیاست و اعضای عمومی                                                                  | شماره خصوصی/CRM/عضویت کاربری مخفی؛ unpublished=404                                                                               |
| GET /businesses/{b}/services               | عمومی                     | cursor?,limit? → خدمات فعال                                                                                     | فقط منتشرشده و قیمت/مدت عمومی                                                                                                    |
| GET /businesses/{b}/availability           | عمومی با rate             | service_id,staff_id یا any،local_date،days≤7 → slots،service_version،policy_version                             | ISO date در tz سالن؛ هر slot starts_at,ends_at و متخصصان مجاز، نه نام مشتری؛ سالن/خدمت نامعتبر 404/422؛ slot تضمینی نیست         |
| POST /me/appointments                      | مشتری                     | business_id,service_id,staff_id یا any,starts_at,expected_service_version,expected_policy_version → appointment | احراز قبل ثبت؛ service/state/program/lead/horizon/snapshot در سرور؛ 409 SLOT_UNAVAILABLE یا QUOTE_CHANGED؛ 422 زمان نامعتبر      |
| GET /me/appointments                       | مشتری                     | from?,to?,status?,cursor? → items                                                                               | فقط booking_user_id خود؛ تاریخ گذشته/آینده؛ شماره سالن عمومی مجاز                                                                |
| GET /me/appointments/{a}                   | مالک همان رزرو            | id → snapshot،وضعیت،version،سیاست                                                                               | حدس id=404؛ داده خصوصی CRM هرگز                                                                                                  |
| POST /me/appointments/{a}/cancellations    | مالک همان رزرو            | reason_code? → appointment/version                                                                              | deadline snapshot و confirmed؛ 409 CANCELLATION_WINDOW_CLOSED/STATE_CONFLICT؛ تکرار لغو همان نتیجه                               |
| POST /me/appointments/{a}/reschedules      | مالک همان رزرو            | starts_at,staff_id یا any → appointment/version                                                                 | همان خدمت/قیمت/مدت snapshot، اتمیک؛ 409 SLOT_UNAVAILABLE/POLICY_CONFLICT؛ وقت قبلی در خطا محفوظ                                  |

## عملیات کسب‌وکار

در مسیرهای زیر b همان tenant مجاز است؛ «پذیرش» مجوزهای روزانه دارد و قیمت/عضویت را ویرایش نمی‌کند. متخصص فقط read برنامه و outcome رزرو تخصیص خود را دارد.

| روش/مسیر                                             | مجوز                               | ورودی → خروجی                                                                              | validation/invariant/خطای اختصاصی                                                                                                                               |
| ---------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST /businesses                                     | User دارای MFA آماده               | name,category,city,district,address → draft + owner membership                             | ساخت owner و business اتمیک؛ اطلاعات ناقص مجاز در draft؛ سقف کسب‌وکار برای ضدسوءاستفاده TBD                                                                     |
| GET/PATCH /businesses/{b}/settings                   | مالک                               | GET کامل مجاز؛ PATCH contact,address,policy → settings/version                             | patch جزئی، timezone در P0 ثابت؛ تغییر آدرس/تماس عمومی/دسته در published باعث in_review و توقف رزرو جدید تا تأیید می‌شود؛ رزرو موجود برقرار؛ قیمت این مسیر نیست |
| POST /businesses/{b}/publication-requests            | مالک                               | version → in_review                                                                        | خدمت،متخصص،ساعت،آدرس/تماس و رضایت انتشار لازم؛ 422 PROFILE_INCOMPLETE؛ تغییر داده حین review نسخه را باطل کند                                                   |
| GET /businesses/{b}/catalog/services                 | مالک/پذیرش مجاز                    | active?,cursor? → خدمات فعال و archived همان سالن                                          | projection مدیریت؛ مستقل از GET عمومی /services؛ بدون دسترسی عمومی                                                                                              |
| POST /businesses/{b}/services                        | مالک                               | name,price_irr,duration,buffers → service                                                  | مبلغ صحیح/سقف، مدت>0؛ 422                                                                                                                                       |
| PATCH /businesses/{b}/services/{s}                   | مالک                               | name,price_irr,duration,buffers,active → service/version                                   | archive به‌جای حذف؛ snapshot قبلی ثابت؛ version++                                                                                                               |
| GET/POST /businesses/{b}/staff                       | GET مالک/پذیرش؛ POST مالک          | cursor یا display_name,user_id? → staff                                                    | user_id باید عضو همان سالن باشد؛ 409 ALREADY_ACTIVE_ELSEWHERE؛ بدون دعوت به حساب جهانی شماره lookup نشود                                                        |
| PATCH /businesses/{b}/staff/{s}                      | مالک                               | name,active,service_ids → staff/version                                                    | تمام serviceها همان tenant؛ غیرفعال‌کردن با رزرو آینده 409 FUTURE_APPOINTMENTS                                                                                  |
| POST /businesses/{b}/invitations                     | مالک                               | phone,role → invite_id,state                                                               | پذیرش/متخصص مجاز؛ توکن کوتاه‌عمر یک‌بار، شماره باید هنگام accept تأیید شود؛ بدون افشای وجود حساب                                                                |
| POST /me/invitation-acceptances                      | User احرازشده                      | token → membership                                                                         | شماره تأییدشده باید با دعوت یکسان باشد؛ expired/used=422؛ replay همان عضویت بدون اثر دوباره                                                                     |
| PATCH /businesses/{b}/memberships/{m}                | مالک با احراز مجدد                 | role,active → membership/version                                                           | آخرین owner حفظ؛ قطع عضو مرتبط با Staff فعال نیازمند تعیین تکلیف؛ 409 LAST_OWNER/FUTURE_APPOINTMENTS                                                            |
| GET/PUT /businesses/{b}/hours                        | GET اعضای مجاز؛ PUT مالک           | intervals weekday/start/end → hours/version                                                | جایگزینی اتمیک؛ روز/بازه معتبر؛ تعارض آینده=409 با فهرست مجاز سالن                                                                                              |
| GET/PUT /businesses/{b}/staff/{s}/hours              | GET مالک/پذیرش/خود؛ PUT مالک/پذیرش | intervals → hours/version                                                                  | همان قفل رزرو؛ تعارض آینده رد شود                                                                                                                               |
| GET/POST /businesses/{b}/schedule-exceptions         | مالک/پذیرش                         | date,staff_id?,closed,intervals → exception                                                | scope روز و متخصص/سالن؛ closed و intervals سازگار؛ تعارض رزرو=409                                                                                               |
| PATCH/DELETE /businesses/{b}/schedule-exceptions/{x} | مالک/پذیرش                         | replacement یا — → وضعیت جدید/version                                                      | DELETE یعنی رفع override، نه حذف تاریخ audit؛ صحت آینده زیر قفل                                                                                                 |
| GET/POST /businesses/{b}/blocked-times               | مالک/پذیرش                         | from/to یا staff,start,end,reason → block                                                  | اشغال مشترک، بدون bypass؛ محدودیت بازه؛ 409 overlap                                                                                                             |
| PATCH/DELETE /businesses/{b}/blocked-times/{x}       | مالک/پذیرش                         | start/end/reason یا — → block/version                                                      | تغییر/آزادسازی اتمیک، تاریخچه audit بماند                                                                                                                       |
| GET /businesses/{b}/appointments                     | مالک/پذیرش؛ متخصص محدود خود        | from,to,staff?,status?,q?,cursor? → calendar items                                         | سقف ۷روز برای تقویم؛ جست‌وجوی نام/کد فقط داده سالن؛ متخصص q شماره ندارد                                                                                         |
| POST /businesses/{b}/appointments                    | مالک/پذیرش                         | service,staff,start,customer{name,phone?},lead_time_exception_reason? → manual appointment | همان exclusion؛ بدون User claim خودکار؛ منبع manual؛ no-phone بدون SMS؛ گذشته 422                                                                               |
| GET /businesses/{b}/appointments/{a}                 | مالک/پذیرش/متخصص تخصیص             | id → جزئیات مجاز                                                                           | شماره برای متخصص ماسک شود؛ یادداشت CRM endpoint جدا                                                                                                             |
| POST /businesses/{b}/appointments/{a}/cancellations  | مالک/پذیرش                         | reason → cancelled                                                                         | استثنای سیاست با دلیل؛ status/version معتبر؛ outbox و release اتمیک                                                                                             |
| POST /businesses/{b}/appointments/{a}/reschedules    | مالک/پذیرش                         | start,staff,reason? → appointment/version                                                  | اتمیک؛ override overlap مطلقاً ندارد؛ مهلت استثنا با دلیل                                                                                                       |
| POST /businesses/{b}/appointments/{a}/outcomes       | مالک/پذیرش/متخصص خود               | status=completed/no_show → appointment/version                                             | زمان معتبر طبق lifecycle؛ 409 INVALID_TRANSITION/TOO_EARLY                                                                                                      |
| GET /businesses/{b}/customers                        | مالک/پذیرش دارای CRM               | q?,cursor?,limit? → پرونده‌های محلی                                                        | query تلفن فقط داخل سالن، بدون lookup جهانی                                                                                                                     |
| GET/PATCH /businesses/{b}/customers/{c}              | همان مجوز CRM                      | read یا local_name,private_note → customer/version                                         | private_note متن ساده≤۱۰۰۰؛ linked_user_id از این مسیر قابل ویرایش نیست                                                                                         |
| GET /businesses/{b}/reports/appointments             | مالک                               | from,to≤90days → counts,rates,definitions                                                  | start محلی؛ مخرج صفر null؛ بدون revenue؛ query تحت tenant                                                                                                       |

## مدیریت پلتفرم و اعلان

| روش/مسیر                                        | مجوز                           | ورودی → خروجی                                                   | قاعده/خطا                                                                               |
| ----------------------------------------------- | ------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| GET /admin/business-reviews                     | reviewer+MFA                   | state,cursor → queue                                            | حداقل داده، بدون CRM                                                                    |
| POST /admin/businesses/{b}/decisions            | reviewer+MFA                   | publish/reject/suspend,reason,review_version → business/version | همان نسخه پروفایل بررسی شود؛ 409 STALE_REVIEW؛ audit الزامی                             |
| POST /admin/support-cases                       | support+MFA                    | target_ref,reason → case                                        | scope و دلیل لازم؛ اطلاعات حساس در متن آزاد محدود                                       |
| POST /admin/support-cases/{c}/data-accesses     | permission حساس+MFA/احراز مجدد | purpose,fields → داده حداقلی موقت                               | بدون export عمومی؛ ثبت مشاهده، مدت محدود؛ 403 برای CRM بدون مجوز مشخص                   |
| GET /admin/notification-deliveries              | عملیات+MFA                     | state,cursor → خطا و reference ماسک‌شده                         | بدون OTP یا متن حاوی PII؛ گزارش provider receipt به معنی خواندن پیام نیست               |
| POST /admin/notification-deliveries/{n}/retries | عملیات+MFA                     | reason → queued/current state                                   | فقط رویداد هنوز معتبر؛ در نتیجه مبهم ابتدا استعلام؛ retry نسخه قدیمی 409 OBSOLETE_EVENT |

برای هر route ترکیبی GET/POST یا GET/PATCH قواعد هر method جدا از جدول عمومی اعمال می‌شود: GET بی‌اثر و pagination برای collections؛ POST ایجاد 201؛ PUT/PATCH با version نتیجه 200؛ DELETE به‌صورت soft release با 200. مسیر review و privacy به‌صورت 202 پردازش می‌شوند. webhook provider در P0 فقط اگر مستندات provider قابلیت امضای معتبر/احراز و replay protection داشته باشد اضافه می‌شود؛ بدون آن polling امن reference و وضعیت داخلی، نه endpoint باز بدون قرارداد.

## نمونه ایجاد رزرو

```json
{
  "business_id": "uuid",
  "service_id": "uuid",
  "staff_id": "any",
  "starts_at": "2026-11-01T10:00:00+03:30",
  "expected_service_version": 3,
  "expected_policy_version": 2
}
```

این timestamp فقط نمونه است؛ offset در اجرا از IANA استخراج شود. پاسخ 201 شامل id،staff_id تخصیص‌یافته،starts_at،ends_at،status="confirmed"،version=1 و snapshot مبلغ/نام/سیاست است. اختلاف snapshot با انتظار client به QUOTE_CHANGED و تأیید دوباره منجر می‌شود. header کلید درخواست در body تکرار نشود.

Endpoint Review،Payment،Refund،campaign و نقشه در P0 عمداً قرارداد فعال ندارند. اضافه‌کردن پرداخت نیازمند state machine مالی جدا، verify سروری، callback تکرارپذیر، reconciliation و سیاست بازپرداخت است؛ callback به‌تنهایی اثبات پرداخت نیست.

## قرارداد اجرایی اسپرینت ۴ — مدیریت خصوصی

این بخش برای مسیرهای ساخته‌شده بر طرح آینده مقدم است. OpenAPI واقعی توسعه در `/api/openapi.json`؛ جزئیات قواعد در [پرامپت مصوب](../prompts/sprint-04.md) و [ADR-007](adr/ADR-007-private-salon-management.md). همه مسیرهای جدول زیر زیر `/api/v1` و پاسخ موفق `{data,meta:{request_id}}` هستند.

| method/path                                                                        | قرارداد اجرایی                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| GET /me/businesses؛ POST /businesses                                               | فهرست سالن‌های خود؛ ساخت draft همراه عضویت owner، 201                                       |
| GET/PATCH /businesses/{b}/settings                                                 | مشخصات private؛ فیلدهای عمومی مدل به معنی انتشار نیستند                                     |
| GET /businesses/{b}/catalog/services[/{id}]                                        | خواندن کاتالوگ خصوصی؛ مسیر GET عمومی خدمات ساخته نشده                                       |
| POST /businesses/{b}/services؛ PATCH .../services/{id}                             | نام/price_irr/مدت/بافر؛ active=false آرشیو و true بازفعال‌سازی                              |
| GET /businesses/{b}/staff[/{id}]؛ POST /businesses/{b}/staff؛ PATCH .../staff/{id} | پروفایل بدون credential، display_name/service_ids و active در PATCH                         |
| GET/PUT /businesses/{b}/hours                                                      | version و intervals هفتگی سالن؛ PUT جایگزینی کامل                                           |
| GET/PUT /businesses/{b}/staff/{staffId}/hours                                      | برنامه مستقل متخصص؛ تازه بدون بازه/بسته                                                     |
| GET/POST /businesses/{b}/schedule-exceptions                                       | فهرست محدوده from/to (حداکثر۹۳روز)؛ ایجاد local_date/staff_id/closed/intervals              |
| PATCH/DELETE /businesses/{b}/schedule-exceptions/{id}                              | PATCH هر دو closed/intervals، تاریخ و scope ثابت؛ DELETE رفع soft با version و deleted=true |

مدیریت به نشست معتبر ایمیل/رمز و owner فعال نیاز دارد؛ ناشناس یا نشست منقضی/باطل401 و منبع خارج مالکیت404. طبق [ADR-008](adr/ADR-008-remove-owner-mfa.md)، مسیرهای MFA و reauthentication حذف شده‌اند و404 می‌دهند. draft فقط state سروری است. فیلد ناشناخته422؛ نقش، actor، currency و timezone قابل تعیین client نیستند. public_phone ورودی اختیاری ۱۰..۱۶ code point و قالب موبایل ایران، نرمال به +989xxxxxxxxx؛ شماره تأیید نمی‌شود.

همه business mutationها `Idempotency-Key` با ۱..۶۴ کاراکتر `[A-Za-z0-9_-]` می‌خواهند. PATCH/PUT/DELETE همچنین `If-Match: "1"`؛ نبود428، قالب نامعتبر422، نسخه کهنه409 VERSION_CONFLICT. پاسخ منبع نسخه‌دار ETag دارد. replay مجاز همان نتیجه/نسخه را پیش از مقایسه نسخه بازمی‌گرداند؛ payload متفاوت409 IDEMPOTENCY_CONFLICT و cache منقضی409 IDEMPOTENCY_RESULT_EXPIRED.

پول عدد صحیح JSON IRR در بازه۰..۱۰٬۰۰۰٬۰۰۰٬۰۰۰ و مضرب۱۰؛ مدت۱..۷۲۰، هر بافر۰..۲۴۰ و مجموع حداکثر۱۴۴۰ دقیقه. برنامه دقیقه محلی، شنبه=۰، چهار بازه/روز و ۲۸/هفته، نیمه‌باز و بدون overlap/عبور از نیمه‌شب؛ `24:00` فقط پایان. تاریخ روز ISO واقعی در بازه۱۹۰۰..۲۲۰۰، نمایش شمسی. UI قیمت تومان را دقیق ×۱۰ می‌کند.

فهرست limit پیش‌فرض۲۰/حداکثر۵۰ و cursor opaque وابسته به tenant/filter است؛ ترتیب `(created_at,id)` با دقت اصلی PostgreSQL. active فقط برای خدمات/متخصص، from/to/staff_id برای استثناها؛ cursor ناسازگار422. lookup UI صفحات را تا سقف resource می‌خواند، fetch بی‌کران ندارد.

Origin دقیق allowlist و JSON برای mutation دارای بدنه؛ DELETE بدون بدنه همچنان Origin می‌خواهد. بدنه حداکثر۱۶KiB و no-store؛ خطای validation می‌تواند `error.fields` شامل پیام فیلد داشته باشد. 429 دارای Retry-After؛ UI انتظار را رعایت می‌کند. سهمیه‌ها: مدیریت۶۰write/دقیقه/actor و ساخت سالن۵/ساعت/actor. سقف داده۳سالن/مالک،۱۰۰خدمت و۵۰متخصص/سالن. peer پشت Next فعلی مشترک است و trusted proxy انتشار هنوز طراحی نشده است.

## قرارداد اجرایی اسپرینت ۵

طبق ADR-009 و اصلاح انتشار عادی در [ADR-013](adr/ADR-013-owner-self-publication.md)، تمام مسیرهای catalog/review/publication نیز no-store هستند. schema دقیق از OpenAPI واقعی `dto/publication.dto.ts` تولید می‌شود؛ این بخش محدوده فعلی را از APIهای آینده رزرو جدا می‌کند.

| مسیر پس از /api/v1                                    | رفتار                                                                                                                             |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET /catalog/categories و /catalog/locations          | page با items/next_cursor=null؛ دسته مرجع فعال به ترتیب و مکان سالن‌های published                                                 |
| GET /catalog/salons                                   | page عمومی؛ q≤100، audience=men/women، category معتبر، city≤80، district≤120 وابسته به city، limit پیش‌فرض20/سقف50 و cursor       |
| GET /catalog/salons/{businessId}                      | PublicProfile allowlist، فقط published؛ منابع دیگر404                                                                             |
| GET /businesses/{businessId}/publication              | مالک؛ state/version/content_revision/request_id/issues/history حداکثر50رویداد آخر                                                 |
| GET /businesses/{businessId}/preview                  | projection مشترک با مجوز مالک                                                                                                     |
| POST /businesses/{businessId}/publication/requests    | مالک، consent=true؛ انتشار فوری draft/pending قدیمی پس از readiness؛ If-Match/Idempotency-Key                                     |
| POST /businesses/{businessId}/publication/withdrawals | مالک، body={}؛ انصراف pending یا توقف published؛ همان هدرها                                                                       |
| GET /review/access                                    | حساب واردشده؛ can_review از DB                                                                                                    |
| GET /review/businesses                                | reviewer مستقل؛ صف صفحه‌بندی‌شده pending/published/suspended، بدون سالن خود و draft هرگز ارسال‌نشده                               |
| GET /review/businesses/{businessId}                   | reviewer مستقل؛ publication/profile و ETag نسخه انتشار؛ فقط سالن سابقاً ارسال‌شده                                                 |
| POST /review/businesses/{businessId}/decisions        | decision=approve/reject/suspend، request_id جاری، content_revision دیده‌شده، reason برای رد/تعلیق۲..۶۰۰؛ If-Match/Idempotency-Key |

ناشناس در خصوصی401، نقش بررسی نامعتبر403، سالن متعلق به دیگری در API مالک404، validation422، state/request/version کهنه409 و If-Match غایب428 است. mutationها Origin دقیق/JSON/بدنه محدود فعلی را حفظ می‌کنند. نرخ catalog تا180درخواست/IP در دقیقه و mutation انتشار داخل سقف مدیریت60درخواست/حساب در دقیقه است؛ حساب پشت NAT در پایلوت اندازه‌گیری شود. ورودی ناشناخته و query تکراری رد می‌شوند. هیچ PATCH عمومی state یا endpoint اعطای reviewer وجود ندارد.

min_price_irr کمینه خدمات منطبق بر فیلتر در سرور، integer IRR است؛ تومان در UI دقیق نمایش داده می‌شود. cursor به فیلتر و ترتیب ایجاد/UUID بسته است و timestamp کامل PostgreSQL را دارد. q از strpos پارامتری استفاده می‌کند؛ `%` و `_` wildcard نمی‌شوند. profile روزهای خاص آینده تا۹۳روز را با متخصص عمومی مرتبط نمایش می‌دهد؛ ساعات، availability نیستند. دلیل تصمیم فقط در مسیر خصوصی مالک/reviewer دیده می‌شود.

## قرارداد جاری اسپرینت۶ — زمان‌های پیشنهادی

`GET /api/v1/catalog/salons/{businessId}/availability` عمومی، بدون نشست و بدون ایجاد رزرو است. تصمیم: [ADR-011](adr/ADR-011-schedule-only-availability.md)، schema اجرایی و نمونه فیلدها در `AvailabilityDto` و OpenAPI `/api/openapi.json` هستند.

| ورودی      | قرارداد                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| businessId | UUID؛ سالن published                                                            |
| service_id | UUID الزامی؛ خدمت فعال و دسته فعال همان سالن                                    |
| staff_id   | پیش‌فرض any؛ یا UUID متخصص فعال/عمومی/تخصیص‌یافته همان سالن                     |
| from/to    | هر دو غایب یا حاضر؛ ISO روز محلی، inclusive و حداکثرهفت روز داخل افق۳۰روز تهران |

بدون تاریخ، امروز سرور تا today+6 بازگردانده می‌شود. ناشناخته/تکراری/آرایه، تاریخ ناموجود/گذشته/خارج افق، UUID خراب یا تزریق قیمت/مدت/بافر/timezone برابر422 است. شناسه معتبر ولی غیرعمومی/نامرتبط404 یکسان دارد. UUIDها در این قرارداد canonical lowercase می‌شوند.

در envelope معمول data/meta.request_id، data شامل business_id، service_id، service={id,name,price_irr,duration_minutes}، staff_id، timezone=Asia/Tehran، checked_at UTC، policy، from/to و days است. policy شامل slot_step_minutes=15، minimum_notice_minutes=60، first_allowed_date و last_allowed_date است. هر day دارای local_date و slots است؛ تمام روزها حتی بسته حاضرند. هر slot فقط starts_at/ends_at UTC، start_local/end_local با ساعت۲۴ساعته و available_staff_count از۱تا۵۰ دارد. پایان24:00 فقط مرزروز است. سقف پاسخ۷۰۰slot بدون truncation؛ نقض غیرمنتظره503 است.

`availability_basis=schedule_only` و `booking_enabled=false` اجباری‌اند. خروجی، ظرفیت طبق برنامه ثبت‌شده است؛ موجودی واقعی رزرو نیست. بافرها، متخصص پنهان، email، عضویت، دلیل تعطیلی/بررسی و audit در خروجی نیستند. انتخاب any فقط اجتماع و count می‌دهد؛ متخصص نهایی تعیین نمی‌کند. قیمت صفر معتبر است و فرانت از formatter دقیق IRR→تومان جاری استفاده می‌کند.

همه پاسخ‌ها no-store؛ هم quota عمومی۱۸۰ و هم اختصاصی۶۰درخواست/IP/دقیقه مصرف می‌شوند.429 دارای Retry-After است. شکست I/O503 امن است؛500/503 یا خطای decoding به slots=[] تبدیل نمی‌شود. GET، If-Match/Idempotency-Key/quote/hold ندارد؛ خطای شبکه یا timeout را با دریافت دوباره اصلاح کنید.

## قرارداد اجرایی اسپرینت۷ — رزرو قطعی

این افزوده semantics خواندنی۶ را ارتقا می‌دهد: availability_basis=live_occupancy و booking_enabled=true؛ پیشنهاد زمان hold نیست و ثبت زیر قفل دوباره بررسی می‌شود. public response همچنان فاقد تماس مشتری/بافر/ledger خصوصی است.

| مسیر با پیشوند /api/v1                                        | دسترسی و نتیجه                                                                                       |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| POST /appointments                                            | نشست مشتری؛ ۲۰۱ resource قطعی                                                                        |
| GET /me/appointments?period=upcoming یا past                  | فقط حساب جاری؛ limit۲۰/حداکثر۵۰ و cursor UUID آخرین مورد                                             |
| GET /appointments/{id}                                        | فقط booking_user_id؛ حتی پس از آرشیو/عدم انتشار                                                      |
| GET /me/booking-intents/{key}?operation=online/manual/cancel  | نتیجه intent همان عامل؛ برای دستی/لغو مجوز مالک فعلی دوباره بررسی می‌شود                             |
| GET /businesses/{b}/appointments?date=YYYY-MM-DD&staff_id=any | owner فعال؛ روز تهران، متخصص اختیاری، pagination                                                     |
| GET /businesses/{b}/appointments/{id}                         | owner همان سالن، تماس خصوصی و snapshot                                                               |
| POST /businesses/{b}/appointments                             | owner؛ نام لازم و تماس اختیاری، همان ledger، draft معتبر مجاز                                        |
| GET /businesses/{b}/booking-options                           | owner؛ service_id، staff_id، from/to مطابق افق۶؛ پیشنهاد دستی با noticeصفر، استثنای ثبت نیازمند دلیل |
| POST /businesses/{b}/appointments/{id}/cancellation           | owner؛ reason۳..۳۰۰ و If-Match، فقط قبل شروع                                                         |

ایجاد: business_id/service_id/staff_id/starts_at/expected_price_irr/expected_duration_minutes/customer_name/customer_mobile؛ staff_id برابرany یا UUID. starts_at دقیقه کامل UTC روی گام۱۵ محلی و افق۳۰روز؛ مبلغ/مدت پس از قفل دوباره مقایسه می‌شوند. نام۲..۱۲۰؛ تماس ایران نرمال۰۹xxxxxxxxx، بدون OTP و بدون هویت‌سازی. در دستی business از path است؛ فقط notice_override_reason۳..۳۰۰ برای کمتر از۶۰دقیقه اضافه می‌شود؛ سایر قواعد قابل دورزدن نیستند.

mutationها Idempotency-Key دارند؛ لغو If-Match لازم دارد (نبود428). همان key با payload/path متفاوت409؛ replay یکسان همان resource با وضعیت جاری را برمی‌گرداند، نه نوبت تازه. ایجاد حداکثر۱۰در دقیقه actor؛ سقف۳confirmed آنلاین آینده حساب در هر سالن، اتمیک. کد پیگیری مجوز خواندن نیست.

پاسخ data شامل id/business_id/service_id/staff_id/code/source/status/version/starts_at/ends_at/snapshot/cancellation_reason/cancelled_at، meta.request_id و no-store است. snapshot شامل نام سالن/خدمت/متخصص، نشانی/تماس عمومی سالن، نام/موبایل مراجعه‌کننده، قیمت/مدت/بافر توافقی، نسخه خدمت و policy است و فقط خصوصی برمی‌گردد. cursorها داده خصوصی نیستند؛ مسیرهای list همواره tenant/actor را از نشست enforce می‌کنند.

خطاهای مهم409: SLOT_UNAVAILABLE، SERVICE_CHANGED، CUSTOMER_BOOKING_LIMIT، IDEMPOTENCY_CONFLICT، VERSION_CONFLICT، APPOINTMENT_STARTED و EXISTING_BOOKING_CONFLICT در تنظیمات. خطای DB ظرفیت خالی یا رسید موفق نمی‌سازد. frontend برای timeout همان intent را بررسی می‌کند؛ نام/موبایل در URL/storage ذخیره نمی‌شوند. پرداخت/SMS/لغو مشتری/جابه‌جایی/وضعیت پایان مراجعه هنوز فعال نیستند.

## اصلاح جاری انتشار مالک — ADR-013

POST publication/requests دیگر pending تازه تولید نمی‌کند؛ پاسخ موفق state=published و رویداد publish دارد. نسخه قبل و رضایت معتبر، همچنان الزامی‌اند. ویرایش معتبر سالن منتشرشده، آن را عمومی نگه می‌دارد؛ ویرایش ناقص در همان transaction آن را draft می‌کند و settings همان وضعیت نهایی را برمی‌گرداند. داده قدیمی pending در UI با رضایت مالک به انتشار فوری می‌رسد.

تعلیق مدیریتی پابرجاست؛ owner publication برای suspended خطای409 دارد. approve مسئول مستقل برای suspended، پس از readiness و با request_id=null جاری، content_revision و If-Match دقیق و سابقه رضایت، رفع تعلیق می‌کند. approve/reject برای pending تاریخی نیز باقی است. مجوز، rate، CSRF و allowlistهای خصوصی/عمومی تغییر نکرده‌اند.

## اسپرینت۸ — مدیریت نوبت مشتری

همه مسیرها session و Cache-Control:no-store دارند. mutationها JSON/Origin معتبر، Idempotency-Key و If-Match نسخه نوبت می‌خواهند؛ ۳۰تغییر/actor/minute. هویت مشتری فقط booking_user_id نوبت آنلاین است.

| روش/مسیر                                               | قرارداد                                                                                                                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET /appointments/{id}/changes                         | همان appointment و نسخه، checked_at، change_deadline، customer_can_change و items تاریخچه تا۵۰، has_more؛ قبل/بعد قدیمی می‌تواند null باشد؛ actor فقط customer/owner                    |
| GET /businesses/{businessId}/appointments/{id}/changes | همان پاسخ با مجوز مالک فعال همان سالن                                                                                                                                                   |
| GET /appointments/{id}/rescheduling-options            | query فقط staff_id=any/UUID و from/to جفت؛ حداکثر۷روز در افق۳۰روز؛ service از نوبت؛ شکل availability با policy.minimum_notice_minutes=120، appointment_version و staff عمومی؛ بدون hold |
| POST /appointments/{id}/cancellation                   | reason رشته۳تا۳۰۰؛ همان Appointment لغوشده؛ آزادسازی ظرفیت در همان commit                                                                                                               |
| POST /appointments/{id}/rescheduling                   | فقط staff_id و starts_at UTC روی گام۱۵دقیقه؛ همان Appointment/id/code با نسخه بعد، قیمت/مدت/بافر توافقی؛ متخصص جدید باید مجاز باشد                                                      |

مهلت تا دو ساعت قبل از زمان فعلی نوبت شامل مرز دقیق است؛ مقصد هم حداقل دو ساعت آینده. درخواست مقصد دورتر مهلت گذشته را دور نمی‌زند. لغو با توقف انتشار همچنان ممکن است؛ گزینه/تغییر زمان به سالن published و خدمت فعال نیاز دارد.

خطاها:401نشست،403Origin،404عدم دسترسی/خدمت یا متخصص عمومی ناموجود،422ورودی،428نسخه غایب،429نرخ با Retry-After و503اختلال.409شامل CHANGE_DEADLINE_PASSED،REPLACEMENT_TOO_SOON،VERSION_CONFLICT،UNCHANGED_APPOINTMENT،SLOT_UNAVAILABLE وIDEMPOTENCY_CONFLICT است. اطلاعات حساس در error/log نمی‌روند.

resolve در /me/booking-intents/{key} اکنون operation=customer-cancel/reschedule را نیز می‌پذیرد؛ مجوز فعلی حفظ و وضعیت فعلی نوبت بازگردانده می‌شود. خطای مقصد یا rollback به لغو جداگانه نوبت قبلی منجر نمی‌شود. OpenAPI schema ورودی،history و policy120 را مستند می‌کند.

## قرارداد افزوده اسپرینت۹

همه مسیرها session/owner، no-store و همان envelope فعلی دارند؛ POSTها Origin/CSRF، Idempotency-Key و محدودیت۳۰تغییر/دقیقه دارند. outcome/release به If-Match نیاز دارند؛ خطاهای۴۰۹/۴۲۲/۴۲۸ و نتیجه مبهم با همان intent پیگیری می‌شوند. قرارداد ماشین‌خوان در salon-operations-api/controller است.

- GET `/businesses/:businessId/appointments?date=YYYY-MM-DD&to=YYYY-MM-DD&staff_id=any&status=any&limit=20&cursor=UUID`: to شامل روز انتهایی و حداکثر۷روز؛ status=confirmed/cancelled/completed/no_show؛ پاسخ همان items/next_cursor. cursor باید عضو همان مجموعه مجاز و فیلترشده باشد.
- GET `/businesses/:businessId/agenda-overview` با همان فیلترها: checked_at، summary شامل total/confirmed/completed/cancelled/no_show/awaiting_outcome، blocks حداکثر۲۰۰ و blocks_truncated. summary پیش از فیلتر status/pagination است؛ blocks با هم‌پوشانی بازه/متخصص خوانده می‌شوند. دلیل مسدودی خصوصی است.
- POST `/businesses/:businessId/appointments/:id/outcome`: فقط status و reason اختیاری؛ اصلاح نتیجه reason لازم دارد؛ پاسخ Appointment. operation=outcome در GET `/me/booking-intents/:key` نیز مجاز است.
- POST `/businesses/:businessId/schedule-blocks`: staff_id/starts_at/ends_at/reason؛ پاسخ۲۰۱ ScheduleBlock شامل id/business_id/staff_id/staff_name/starts_at/ends_at/reason/version/released_at/release_reason. ورودی UTC، آینده، گام۱۵دقیقه، حداکثر۲۴ساعت در افق۳۰روز.
- POST `/businesses/:businessId/schedule-blocks/:id/release`: reason لازم و پاسخ۲۰۰ وضعیت فعلی ScheduleBlock.
- GET `/businesses/:businessId/block-intents/:key?operation=block-create|block-release`: مجوز مالک و منبع همان سالن، پاسخ فعلی block؛ کلید به‌تنهایی مجوز نیست.

Appointment اکنون completed/no_show نیز دارد؛ تاریخچه outcome/corrected با result_status و دلیل را برمی‌گرداند. عدم ثبت نتیجه، confirmed باقی می‌ماند. لغوشده پایانی است؛ اصلاح نتیجه به confirmed مجاز و مستند است.
