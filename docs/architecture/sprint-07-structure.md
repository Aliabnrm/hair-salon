# ساختار اسپرینت۷

مرجع تصمیم [ADR-012](adr/ADR-012-booking-ledger.md) و مرجع حالت‌های رابط [inventory](sprint-07-ui.md) است.

```text
backend/src/modules/bookings/
  bookings.module.ts                         # اتصال Port به adapter، بدون چرخه DI
  domain/
    booking.types.ts                         # قرارداد سناریو و snapshot
    booking-policy.ts                        # تماس، whitelist، لغو، cap
    choose-slot.ts                           # تطبیق توافق و انتخاب قطعی متخصص
  application/
    booking-store.ts                         # مرز I/O واقعی
    bookings.service.ts                      # زمان معتبر، validation و orchestration
  infrastructure/persistence/
    bookings.schema.ts                       # چهار جدول؛ aggregate در database/schema
    booking-transaction.ts                   # قفل intent، مجوز مالک، قفل Business و replay
    postgres-booking-store.ts                 # ثبت/لغو/خواندن/ظرفیت دستی
    appointment-query.ts                     # projection و mapping تاریخ
    schedule-compatibility.ts                # تطبیق نوبت‌های موجود با برنامه تازه
  presentation/http/
    booking-http.ts                          # header، fingerprint و rate
    booking-api.ts                           # OpenAPI ورودی/خروجی
    bookings.controller.ts                   # HTTP، guard و envelope
backend/drizzle/0005_booking-ledger.sql       # افزایشی؛ exclusion و triggerهای deferred/immutable
frontend/src/features/bookings/
  api/bookings.api.ts                        # transport و تطبیق resource پاسخ
  model/                                    # types، decoder، انتخاب و فرمت
  hooks/                                    # resource تازه، intent، checkout، manual
  components/                               # screenها و اجزای تماس/کارت/رسید/feedback
```

salon-management/public.ts فقط Clock، دامنه زمان و نوع‌ها را صادر می‌کند؛ هیچ Module/Nest adapter در این leaf نیست. persistence-contract.ts خواندن برنامه در همان PoolClient را صادر می‌کند؛ persistence-schema.ts فقط FKهای tenant است. سازگاری تنظیمات از bookings/persistence-contract.ts فراخوانی می‌شود. واردکردن Module در public دامنه ممنوع است، زیرا guard تنظیمات به دامنه زمان برمی‌گردد و می‌تواند import cycle بسازد.

Clock provider در SalonManagementModule export و در BookingsModule مصرف می‌شود؛ source زمانی تست و محصول یکی است. AvailabilityReader داده schedule+busy را در یک statement می‌گیرد، Application از مدل خالص busyByStaff استفاده می‌کند. داده تماس وارد این projection نمی‌شود.

routeهای جدید باریک و معتبرسازی UUID دارند. SessionProvider، AccountGate و safeReturnTo هویت/عمر state را نگه می‌دارند. state تماس فقط حافظه component است؛ sessionStorage فقط کلید تصادفی intent، با scope حساب/سالن/عملیات دارد. UI از پاسخ معتبر سرور موفقیت می‌گیرد؛ refresh خطادار دفتر، فهرست قبلی همان فیلتر را با خطا نگه می‌دارد.
