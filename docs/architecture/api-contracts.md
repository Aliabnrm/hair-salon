# قراردادهای اولیه API
وضعیت: پایه Health/error/request-id اسپرینت ۱ پیاده‌سازی شده؛ سایر جدول‌های REST v1 طرح پیشنهادی‌اند، مستقل از UI و وابسته به تصویب ADR. payload قابلیت‌های آینده قرارداد پیشنهادی است و endpointهای آن‌ها پیاده‌سازی نشده‌اند. تاریخ canonical در API میلادی ISO، timestamp با offset یا Z، timezone کسب‌وکار Asia/Tehran؛ UI شمسی است. مبلغ integer با currency=IRR؛ هیچ مبلغ client-authoritative نیست.

## قواعد مشترک قابل اعمال به تمام ردیف‌ها
- پیشوند /api/v1؛ JSON؛ شناسه UUID؛ فیلد ناشناخته رد شود. تمام routeهای مدیریتی business با membership فعال همان b و مجوز نقش و FK tenant کنترل می‌شوند؛ query/body با business_id دیگر رد می‌شود. داده عمومی فقط published projection است. /me فقط actor جاری؛ admin نیازمند MFA و permission مشخص است.
- GET بی‌اثر و قابل تکرار؛ بدون کلید. فهرست‌ها cursor opaque و limit پیش‌فرض ۲۰/حداکثر ۵۰، ترتیب پایدار (فیلد مرتب‌سازی،id)، خروجی items,next_cursor؛ cursor خارج از فیلتر/tenant رد شود. صفحه تقویم بازه حداکثر هفت روز دارد. فیلتر خارج allowlist=422.
- mutationها به جز OTP نیازمند Idempotency-Key؛ key+actor+operation با hash بدنه طبق domain-model. PATCH/DELETE روی منبع mutable همچنین If-Match: version؛ نبود آن 428، ناسازگاری 409 VERSION_CONFLICT. replay همان mutation نتیجه قبلی می‌دهد و اثر جدید ندارد. برای OTP challenge_id و request_id کنترل تکرار مخصوص جریان اعمال می‌شود؛ retry ارسال بی‌قید ممنوع.
- HTTP: 200 خواندن/تغییر/لغو، 201 ایجاد، 202 صف بررسی/درخواست حریم خصوصی؛ 400 JSON نامعتبر، 401 بدون نشست، 403 مجوز ناکافی برای resource قابل مشاهده، 404 منبع ناموجود یا خارج tenant، 409 تعارض slot/وضعیت/quote/version/key، 422 validation، 428 version لازم، 429 rate با Retry-After، 503 وابستگی ضروری موقتاً unavailable. GET مسیر عمومی draft همیشه 404.
- ساختار موفقیت data و meta.request_id؛ version در منابع mutable و ETag عددی. ساختار خطا {error:{code,message,request_id,retryable}}؛ fields فقط برای validation مرتبط اضافه می‌شود. message فارسی و code ثابت انگلیسی؛ جزئیات DB/وجود حساب افشا نشود. validation جزئیات غیرحساس فیلدها را می‌دهد.
- لیست خطاهای ستون آخر، علاوه بر قواعد مشترک است. «مجوز» در هر ردیف بخشی از قرارداد است؛ مسیر فرانت‌اند مجوز ایجاد نمی‌کند. نرخ و idempotency در mutationهای ادمین نیز لازم است. نسخه شکستن قرارداد /v2 یا دوره مهاجرت با اطلاع‌رسانی؛ تغییر افزایشی فیلد اختیاری سازگار است.

## پایه مصوب اسپرینت ۱ — پیاده‌سازی و بررسی‌شده
GET /api/v1/health/liveness عمومی و بی‌اثر است؛ HTTP 200 با data.status="ok" و meta.request_id،همراه X-Request-Id یکسان. liveness فقط فرایند برنامه را می‌سنجد؛ DB/SMS و readiness در این قرارداد نیستند. درخواست ناشناخته 404 با error.code=NOT_FOUND،message امن فارسی،request_id و retryable=false می‌گیرد. خطای ناشناخته 500 با INTERNAL_SERVER_ERROR و پیام امن است.

request-id تک‌مقداری [A-Za-z0-9_-] با طول ۱..۶۴ پذیرفته،و در حالت دیگر UUID تولید می‌شود؛ شناسه مدرک هویت نیست. GET /api/docs و GET /api/openapi.json فقط development/test ثبت و در production غیرفعال‌اند. معیار و schema دقیق در [پرامپت اسپرینت ۱](../prompts/sprint-01.md)؛ middleware/filter/prefix در runtime و تست از app.setup مشترک استفاده می‌کنند.

## هویت و مشتری
| روش/مسیر | مجوز | ورودی → خروجی | validation/قاعده اختصاصی و خطا |
|---|---|---|---|
| POST /auth/otp/challenges | عمومی با rate limit | phone,request_id → challenge_id,expires_in,retry_after | نرمال شماره ایرانی؛ پاسخ یکسان برای وجود/عدم وجود حساب؛ 429،503؛ تکرار request_id همان challenge و بدون ارسال دوباره |
| POST /auth/otp/verifications | دارنده challenge | challenge_id,code → session cookie و me | کد یک‌بار و attempts اتمیک؛ کد منقضی/نامعتبر 422؛ مصرف هم‌زمان فقط یک نشست؛ نیاز MFA برای privileged |
| POST /auth/mfa/verifications | نشست primary محدود | challenge_id,totp/recovery_code → ارتقای نشست | TOTP با پنجره کوتاه و جلوگیری replay همان timestep؛ recovery یک‌بارمصرف؛ OTP پیامکی به‌تنهایی سطح مالک/ادمین را نمی‌دهد؛ 422،429 |
| POST /me/mfa/enrollments | نشست OTP تازه و صاحب هویت | نوع TOTP → enrollment_id و secret موقت فقط برای کاربر | secret رمزگذاری‌شده، TTL کوتاه و بدون log؛ تا تأیید عامل، نقش ممتاز فعال نمی‌شود؛ 409 اگر از قبل فعال |
| POST /me/mfa/enrollments/{e}/confirmations | همان User با نشست تازه | totp → فعال‌سازی MFA و recovery codes یک‌بار نمایش | enrollment متعلق به actor، انقضا و replay بررسی؛ secret قدیمی با این مسیر جایگزین نشود؛ 422 |
| POST /auth/logout | نشست جاری | بدون body → revoked | revoke سروری؛ تکرار logout موفق بدون اثر اضافی؛ CSRF |
| GET /me | واردشده | — → نام، موبایل خود، memberships و تنظیمات | هیچ profile خصوصی سالن دیگر بازنگردد |
| PATCH /me | واردشده | display_name,notification_preferences → me/version | تغییر موبایل مسیر عادی نیست؛ نیازمند احراز مجدد و بازیابی مستقل؛ marketing consent هرگز پیش‌فرض true |
| POST /me/privacy-requests | واردشده/احراز مجدد | type=export/delete,reason? → request_id,status | محدود به خود؛ 202؛ رسیدگی دستی پایلوت؛ موارد نگهداری قانونی/اختلاف توضیح داده شوند |
| GET /businesses | عمومی | name?,city?,district?,category?,cursor?,limit? → items | بدون فیلتر امتیاز/فاصله در P0؛ متن جست‌وجو حداکثر ۱۰۰ نویسه؛ projection عمومی |
| GET /businesses/{b} | عمومی | id → پروفایل عمومی، خدمات، سیاست و اعضای عمومی | شماره خصوصی/CRM/عضویت کاربری مخفی؛ unpublished=404 |
| GET /businesses/{b}/services | عمومی | cursor?,limit? → خدمات فعال | فقط منتشرشده و قیمت/مدت عمومی |
| GET /businesses/{b}/availability | عمومی با rate | service_id,staff_id یا any،local_date،days≤7 → slots،service_version،policy_version | ISO date در tz سالن؛ هر slot starts_at,ends_at و متخصصان مجاز، نه نام مشتری؛ سالن/خدمت نامعتبر 404/422؛ slot تضمینی نیست |
| POST /me/appointments | مشتری | business_id,service_id,staff_id یا any,starts_at,expected_service_version,expected_policy_version → appointment | احراز قبل ثبت؛ service/state/program/lead/horizon/snapshot در سرور؛ 409 SLOT_UNAVAILABLE یا QUOTE_CHANGED؛ 422 زمان نامعتبر |
| GET /me/appointments | مشتری | from?,to?,status?,cursor? → items | فقط booking_user_id خود؛ تاریخ گذشته/آینده؛ شماره سالن عمومی مجاز |
| GET /me/appointments/{a} | مالک همان رزرو | id → snapshot،وضعیت،version،سیاست | حدس id=404؛ داده خصوصی CRM هرگز |
| POST /me/appointments/{a}/cancellations | مالک همان رزرو | reason_code? → appointment/version | deadline snapshot و confirmed؛ 409 CANCELLATION_WINDOW_CLOSED/STATE_CONFLICT؛ تکرار لغو همان نتیجه |
| POST /me/appointments/{a}/reschedules | مالک همان رزرو | starts_at,staff_id یا any → appointment/version | همان خدمت/قیمت/مدت snapshot، اتمیک؛ 409 SLOT_UNAVAILABLE/POLICY_CONFLICT؛ وقت قبلی در خطا محفوظ |

## عملیات کسب‌وکار
در مسیرهای زیر b همان tenant مجاز است؛ «پذیرش» مجوزهای روزانه دارد و قیمت/عضویت را ویرایش نمی‌کند. متخصص فقط read برنامه و outcome رزرو تخصیص خود را دارد.

| روش/مسیر | مجوز | ورودی → خروجی | validation/invariant/خطای اختصاصی |
|---|---|---|---|
| POST /businesses | User دارای MFA آماده | name,category,city,district,address → draft + owner membership | ساخت owner و business اتمیک؛ اطلاعات ناقص مجاز در draft؛ سقف کسب‌وکار برای ضدسوءاستفاده TBD |
| GET/PATCH /businesses/{b}/settings | مالک | GET کامل مجاز؛ PATCH contact,address,policy → settings/version | patch جزئی، timezone در P0 ثابت؛ تغییر آدرس/تماس عمومی/دسته در published باعث in_review و توقف رزرو جدید تا تأیید می‌شود؛ رزرو موجود برقرار؛ قیمت این مسیر نیست |
| POST /businesses/{b}/publication-requests | مالک | version → in_review | خدمت،متخصص،ساعت،آدرس/تماس و رضایت انتشار لازم؛ 422 PROFILE_INCOMPLETE؛ تغییر داده حین review نسخه را باطل کند |
| GET /businesses/{b}/catalog/services | مالک/پذیرش مجاز | active?,cursor? → خدمات فعال و archived همان سالن | projection مدیریت؛ مستقل از GET عمومی /services؛ بدون دسترسی عمومی |
| POST /businesses/{b}/services | مالک | name,price_irr,duration,buffers → service | مبلغ صحیح/سقف، مدت>0؛ 422 |
| PATCH /businesses/{b}/services/{s} | مالک | name,price_irr,duration,buffers,active → service/version | archive به‌جای حذف؛ snapshot قبلی ثابت؛ version++ |
| GET/POST /businesses/{b}/staff | GET مالک/پذیرش؛ POST مالک | cursor یا display_name,user_id? → staff | user_id باید عضو همان سالن باشد؛ 409 ALREADY_ACTIVE_ELSEWHERE؛ بدون دعوت به حساب جهانی شماره lookup نشود |
| PATCH /businesses/{b}/staff/{s} | مالک | name,active,service_ids → staff/version | تمام serviceها همان tenant؛ غیرفعال‌کردن با رزرو آینده 409 FUTURE_APPOINTMENTS |
| POST /businesses/{b}/invitations | مالک | phone,role → invite_id,state | پذیرش/متخصص مجاز؛ توکن کوتاه‌عمر یک‌بار، شماره باید هنگام accept تأیید شود؛ بدون افشای وجود حساب |
| POST /me/invitation-acceptances | User احرازشده | token → membership | شماره تأییدشده باید با دعوت یکسان باشد؛ expired/used=422؛ replay همان عضویت بدون اثر دوباره |
| PATCH /businesses/{b}/memberships/{m} | مالک با احراز مجدد | role,active → membership/version | آخرین owner حفظ؛ قطع عضو مرتبط با Staff فعال نیازمند تعیین تکلیف؛ 409 LAST_OWNER/FUTURE_APPOINTMENTS |
| GET/PUT /businesses/{b}/hours | GET اعضای مجاز؛ PUT مالک | intervals weekday/start/end → hours/version | جایگزینی اتمیک؛ روز/بازه معتبر؛ تعارض آینده=409 با فهرست مجاز سالن |
| GET/PUT /businesses/{b}/staff/{s}/hours | GET مالک/پذیرش/خود؛ PUT مالک/پذیرش | intervals → hours/version | همان قفل رزرو؛ تعارض آینده رد شود |
| GET/POST /businesses/{b}/schedule-exceptions | مالک/پذیرش | date,staff_id?,closed,intervals → exception | scope روز و متخصص/سالن؛ closed و intervals سازگار؛ تعارض رزرو=409 |
| PATCH/DELETE /businesses/{b}/schedule-exceptions/{x} | مالک/پذیرش | replacement یا — → وضعیت جدید/version | DELETE یعنی رفع override، نه حذف تاریخ audit؛ صحت آینده زیر قفل |
| GET/POST /businesses/{b}/blocked-times | مالک/پذیرش | from/to یا staff,start,end,reason → block | اشغال مشترک، بدون bypass؛ محدودیت بازه؛ 409 overlap |
| PATCH/DELETE /businesses/{b}/blocked-times/{x} | مالک/پذیرش | start/end/reason یا — → block/version | تغییر/آزادسازی اتمیک، تاریخچه audit بماند |
| GET /businesses/{b}/appointments | مالک/پذیرش؛ متخصص محدود خود | from,to,staff?,status?,q?,cursor? → calendar items | سقف ۷روز برای تقویم؛ جست‌وجوی نام/کد فقط داده سالن؛ متخصص q شماره ندارد |
| POST /businesses/{b}/appointments | مالک/پذیرش | service,staff,start,customer{name,phone?},lead_time_exception_reason? → manual appointment | همان exclusion؛ بدون User claim خودکار؛ منبع manual؛ no-phone بدون SMS؛ گذشته 422 |
| GET /businesses/{b}/appointments/{a} | مالک/پذیرش/متخصص تخصیص | id → جزئیات مجاز | شماره برای متخصص ماسک شود؛ یادداشت CRM endpoint جدا |
| POST /businesses/{b}/appointments/{a}/cancellations | مالک/پذیرش | reason → cancelled | استثنای سیاست با دلیل؛ status/version معتبر؛ outbox و release اتمیک |
| POST /businesses/{b}/appointments/{a}/reschedules | مالک/پذیرش | start,staff,reason? → appointment/version | اتمیک؛ override overlap مطلقاً ندارد؛ مهلت استثنا با دلیل |
| POST /businesses/{b}/appointments/{a}/outcomes | مالک/پذیرش/متخصص خود | status=completed/no_show → appointment/version | زمان معتبر طبق lifecycle؛ 409 INVALID_TRANSITION/TOO_EARLY |
| GET /businesses/{b}/customers | مالک/پذیرش دارای CRM | q?,cursor?,limit? → پرونده‌های محلی | query تلفن فقط داخل سالن، بدون lookup جهانی |
| GET/PATCH /businesses/{b}/customers/{c} | همان مجوز CRM | read یا local_name,private_note → customer/version | private_note متن ساده≤۱۰۰۰؛ linked_user_id از این مسیر قابل ویرایش نیست |
| GET /businesses/{b}/reports/appointments | مالک | from,to≤90days → counts,rates,definitions | start محلی؛ مخرج صفر null؛ بدون revenue؛ query تحت tenant |

## مدیریت پلتفرم و اعلان
| روش/مسیر | مجوز | ورودی → خروجی | قاعده/خطا |
|---|---|---|---|
| GET /admin/business-reviews | reviewer+MFA | state,cursor → queue | حداقل داده، بدون CRM |
| POST /admin/businesses/{b}/decisions | reviewer+MFA | publish/reject/suspend,reason,review_version → business/version | همان نسخه پروفایل بررسی شود؛ 409 STALE_REVIEW؛ audit الزامی |
| POST /admin/support-cases | support+MFA | target_ref,reason → case | scope و دلیل لازم؛ اطلاعات حساس در متن آزاد محدود |
| POST /admin/support-cases/{c}/data-accesses | permission حساس+MFA/احراز مجدد | purpose,fields → داده حداقلی موقت | بدون export عمومی؛ ثبت مشاهده، مدت محدود؛ 403 برای CRM بدون مجوز مشخص |
| GET /admin/notification-deliveries | عملیات+MFA | state,cursor → خطا و reference ماسک‌شده | بدون OTP یا متن حاوی PII؛ گزارش provider receipt به معنی خواندن پیام نیست |
| POST /admin/notification-deliveries/{n}/retries | عملیات+MFA | reason → queued/current state | فقط رویداد هنوز معتبر؛ در نتیجه مبهم ابتدا استعلام؛ retry نسخه قدیمی 409 OBSOLETE_EVENT |

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
