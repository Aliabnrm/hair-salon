# مدل داده پیشنهادی
پایه app/btree_gist و journal در اسپرینت ۲، و schema محدود هویت در اسپرینت ۳ ساخته و با PostgreSQL واقعی بررسی شدند. جدول اجرایی identity پایین این صفحه تفکیک شده است؛ مدل کامل رزرو/سالن در جدول اول همچنان طرح آینده است. PKها UUID و timestampها timestamptz هستند؛ جزئیات DDL اجرایی در migration رسمی است. قواعد RESTRICT/tenant/تاریخچه برای جدول‌های آینده پیشنهادند و نباید به FKهای هویت جاری نسبت داده شوند. NN=غیرnullable و ?=nullable.

| جدول | ستون‌های کلیدی/لازم | nullable و integrity/شاخص |
|---|---|---|
| User / users | id PK؛ در طرح اسپرینت ۳ email canonical NN unique، email_verified_at? و created_at | phone برای حساب ایمیلی الزامی نیست و این مرحله ستون آن را نمی‌سازد؛ credential و session مستقل در identity؛ display_name/state/روش موبایلی و MFA در طرح قابلیت مربوط نهایی شوند |
| Business | id PK، name، category، city، district، public_address، public_phone، timezone، state، booking_policy/version NN | cover_key?، description?؛ timezone=Asia/Tehran در P0؛ index(state,city,district,category)، normalized_name برای جست‌وجو؛ یک محل، بدون مختصات الزامی |
| BusinessMembership | id PK، business_id FK، user_id FK، role، active NN | unique(business_id,user_id)؛ index(user_id,active)؛ آخرین مالک در transaction و قفل Business حفظ شود |
| StaffProfile | id PK، business_id FK، display_name، active NN | user_id?؛ FK(business_id,user_id)→Membership(business_id,user_id)، unique فعال(user_id) WHERE user_id IS NOT NULL؛ unique(business_id,id) |
| Service | id PK، business_id FK، name، price_irr bigint، duration_minutes، buffer_before/after، version، active NN | price≥0 و سقف مصوب، duration>0، بافر≥0؛ unique(business_id,id)؛ قیمت ورودی تومان مضرب ۱۰ ریال باشد؛ index(business_id,active) |
| StaffService | business_id، staff_id، service_id NN | PK(staff_id,service_id)؛ هر دو FK ترکیبی به همان business؛ صلاحیت active هنگام ثبت دوباره بررسی شود |
| BusinessHours | id PK، business_id FK، weekday، start_local، end_local NN | weekday در ۰..۶ با قرارداد شنبه=۰؛ start<end؛ عدم overlap بازه‌های روز برای همان سالن |
| StaffWorkingHours | id PK، business_id، staff_id، weekday، start_local، end_local NN | FK ترکیبی؛ همان قیود بازه؛ index(business_id,staff_id,weekday) |
| ScheduleException | id PK، business_id، local_date، closed NN | staff_id?؛ null یعنی کل سالن؛ یک override هر scope/date؛ indexهای unique مجزا برای staff null/non-null؛ closed=true بدون interval |
| ScheduleExceptionInterval | id PK، business_id، exception_id FK، start_local،end_local NN | child interval برای ساعات جایگزین؛ FK ترکیبی همان tenant، start<end و بدون overlap برای هر exception؛ فقط برای closed=false |
| BusinessCustomer | id PK، business_id، local_name NN | phone_e164?، linked_user_id?، identity_verified_at?، private_note?؛ phone غیرunique چون شماره خانوادگی/بازیافتی؛ اتصال User فقط با اثبات مالکیت و بررسی claim؛ unique(business_id,id)، index(business_id,phone_e164) |
| Appointment | id PK، business_id، staff_id، service_id، business_customer_id، starts_at، ends_at، status، source، version، snapshot_* NN | booking_user_id?، cancelled_actor?، cancel_reason?؛ تمام FKهای tenant ترکیبی؛ ends>starts؛ unique(business_id,id)؛ index(business_id,staff_id,starts_at)، index(booking_user_id,starts_at)؛ actor ایجاد NN |
| ScheduleAllocation | id PK، business_id، staff_id، kind، occupied_range NN | appointment_id?، block_reason?، released_at?؛ appointment⇔appointment_id لازم و block⇔null؛ FKهای ترکیبی؛ فقط یک allocation هر appointment؛ range نیمه‌باز غیرخالی با کران محدود |
| AppointmentRevision | id PK، business_id، appointment_id، version، actor_id، action، occurred_at NN | قبل/بعد زمان/وضعیت/متخصص و دلیل حداقلی؛ unique(appointment_id,version)؛ append-only؛ FK ترکیبی |
| IdempotencyRecord | actor_id، operation، key، request_hash، state، created_at NN | PK(actor_id,operation,key)؛ resource_id?، response_cache?، cache_expires_at?؛ committed state فقط همراه اثر؛ fingerprint تا عمر داده منبع |
| NotificationOutbox | id PK، business_id، appointment_id، appointment_version، event_type، channel، due_at، state، attempts NN | recipient_ref?، provider_ref?، next_attempt_at?، last_error_code?؛ unique logical_key روی رزرو/version/event/channel؛ index(state,due_at)؛ worker lease/claim |
| AuditLog | id PK، actor_type، actor_ref، business_id?، action، target_ref، occurred_at NN | reason?، request_id?، metadata پالایش‌شده؛ append-only، کنترل دسترسی؛ شماره/OTP/متن CRM ثبت نشود |

Appointment snapshot_*: نام خدمت، قیمت IRR، currency=IRR، مدت، بافرها، نسخه خدمت، متن/نسخه سیاست لغو، cancel_deadline_at و timezone ثبت. اصول قیمت/تاریخچه در domain-model مرجعند. برای AppointmentRevision جزئیات مالی جدید از client پذیرفته نشود.

هویت در یک دامنه identity می‌ماند: credential ایمیل/رمز و نشست قابل revoke طبق طرح اسپرینت ۳، با Argon2id کتابخانه معتبر و نه الگوریتم hash سفارشی. OTPChallenge، روش موبایلی و MFA recovery به طرح بعدی منتقل شده‌اند؛ بعداً همان User را مصرف می‌کنند. استفاده از auth نیاز authorization دامنه را حذف نمی‌کند. schema محدود بخش بعد در اسپرینت ۳ با migration جدید ساخته شد؛ مدل رزرو/موبایل پایین هنوز اجرایی نیست.

## schema اجرایی هویت در اسپرینت ۳

`backend/drizzle/0001_identity.sql` به‌صورت رسمی از schema دامنه generate و با migrator رسمی اجرا شد. این جدول‌ها واقعی‌اند؛ مدل گسترده جدول قبل هنوز طرح آینده است.

| جدول app | داده و قید مهم |
|---|---|
| users | UUID، email canonical یکتا و check، email_verified_at nullable، created_at؛ projection بدون نقش فرضی |
| password_credentials | user_id کلید اصلی و FK با RESTRICT، password_hash Argon2id غیرخام |
| sessions | UUID، user_id FK، token_hash یکتای SHA256، expires_at/created_at/revoked_at و قید ترتیب زمانی؛ index برای expiry/user |
| auth_attempt_buckets | کلید HMAC+operation+window_started_at مرکب، attempts مثبت در DB و اشباع‌شده در adapter، expires_at؛ index cleanup |

ایجاد user و credential در transaction واحد است؛ onConflictDoNothing فقط ایمیل یکتا را پوشش می‌دهد و duplicate credential را overwrite نمی‌کند. session token خام وارد DB نمی‌شود. در login قبلیِ ارائه‌شده revoke و نشست جدید در transaction ساخته می‌شود. resolve فقط unrevoked/unexpired است. cleanup محدود بدون scheduler تازه، ۱۰۰ bucket منقضی در consume و ۱۰۰ نشست با گذشت ۲۴ ساعت از expiry/revoke در login انجام می‌شود؛ کاربر/credential با این cleanup حذف نمی‌شوند. SQL/snapshot اسپرینت ۲ byte-identical باقی ماندند و journal قدیمی فقط entry جدید گرفت.

## قیود تعیین‌کننده
extension استاندارد btree_gist در پایه اسپرینت ۲ واقعاً ساخته و آزموده شده؛ قید رزرو زیر هنوز پیشنهاد است و تست واقعی آن به اسپرینت رزرو تعلق دارد. روی **همان جدول ScheduleAllocation** قید EXCLUDE USING gist (business_id WITH =, staff_id WITH =, occupied_range WITH &&) WHERE (released_at IS NULL) برقرار شود. این شبه‌طرح است؛ DDL اجرایی در این مرحله نداریم. اگر extension فراهم نباشد، پیش از توسعه راهکار معادل با قفل و transaction اثبات و ADR اصلاح شود.

قید overlap دو جدول مستقل Appointment و BlockedTime کافی نیست؛ به همین دلیل دفتر اشغال یکی است. FK تضمین می‌کند allocation متعلق به متخصص و رزرو همان tenant باشد. یک deferred consistency trigger یا معادل enforceشده در DB باید هنگام commit تطابق محدوده allocation با زمان+بافر Appointment، وجود دقیقاً یک allocation برای confirmed/completed/no_show و release برای cancelled را بررسی کند؛ یکتایی و FK به‌تنهایی این تطابق را تضمین نمی‌کنند. تمام نویسندگان فقط از سرویس دامنه می‌نویسند؛ حساب DB برنامه اجازه دورزدن کنترل‌ها/حذف history نداشته باشد.

برای اعضا/خدمات/متخصصان archive یا active=false به‌جای حذف است. retention و حذف حساب نباید زنجیره FK را بشکند؛ نام snapshot و مشتری محلی نیز داده شخصی‌اند و باید در فرآیند ناشناس‌سازی بررسی شوند. soft delete سراسری بدون هدف نداریم. راهبرد isolation در security-and-privacy مرجع است.

## ERD — MVP
```mermaid
erDiagram
  USER ||--o{ BUSINESS_MEMBERSHIP : joins
  BUSINESS ||--o{ BUSINESS_MEMBERSHIP : authorizes
  BUSINESS ||--o{ STAFF_PROFILE : has
  USER o|--o{ STAFF_PROFILE : optionally_links
  BUSINESS ||--o{ SERVICE : offers
  STAFF_PROFILE ||--o{ STAFF_SERVICE : eligible
  SERVICE ||--o{ STAFF_SERVICE : assigned
  BUSINESS ||--o{ BUSINESS_HOURS : opens
  STAFF_PROFILE ||--o{ STAFF_WORKING_HOURS : works
  BUSINESS ||--o{ SCHEDULE_EXCEPTION : overrides
  SCHEDULE_EXCEPTION ||--o{ SCHEDULE_EXCEPTION_INTERVAL : contains
  STAFF_PROFILE o|--o{ SCHEDULE_EXCEPTION : scopes
  BUSINESS ||--o{ BUSINESS_CUSTOMER : owns
  USER o|--o{ BUSINESS_CUSTOMER : verified_link
  BUSINESS_CUSTOMER ||--o{ APPOINTMENT : receives
  USER o|--o{ APPOINTMENT : books
  STAFF_PROFILE ||--o{ APPOINTMENT : serves
  SERVICE ||--o{ APPOINTMENT : snapshots
  APPOINTMENT o|--|| SCHEDULE_ALLOCATION : occupies
  STAFF_PROFILE ||--o{ SCHEDULE_ALLOCATION : allocates
  APPOINTMENT ||--o{ APPOINTMENT_REVISION : records
  APPOINTMENT ||--o{ NOTIFICATION_OUTBOX : emits
  USER ||--o{ IDEMPOTENCY_RECORD : deduplicates
  BUSINESS o|--o{ AUDIT_LOG : scopes
```

Business و Staff در همه جداول فرزند با کلید ترکیبی کنترل شوند؛ نمودار برای خوانایی تمام ستون‌های FK را تکرار نمی‌کند. Allocation نوع block بدون Appointment است؛ هر Appointment دقیقاً یک allocation تاریخی دارد که در لغو released می‌شود.

## توسعه‌های آینده و شرط ورود
- BusinessLocation و تخصیص کارکنان به چند محل: فقط پس از نیاز چندشعبه؛ قید overlap جهانی متخصص باید بازطراحی شود.
- AppointmentSegment/Resource/ResourceAllocation: فقط در صورت تأیید خدمات چندمرحله‌ای یا دستگاه/اتاق مشترک؛ ممکن است به MVP منتقل شود و فعلاً «حل‌شده» نیست.
- Payment/Refund/PaymentAttempt: پس از تعیین بیعانه و قرارداد درگاه ایرانی؛ دفتر مالی، idempotency و verify سمت سرور لازم می‌شود.
- Review با unique(appointment_id)، moderation و گزارش: P1. Loyalty/Inventory/Payroll: P2، بدون جدول رزرو شده از امروز.
