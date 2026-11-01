# ساختار اجرایی اسپرینت ۴

ساختار جاری پس از حذف MFA با دستور کارفرما طبق [ADR-008](adr/ADR-008-remove-owner-mfa.md) به‌روز شده است.

در ۲۰۲۶-۱۱-۰۱، محدوده کامل طرح با دستور کارفرما اجرا شد. [ADR-007](adr/ADR-007-private-salon-management.md)، [طرح](../planning/sprints/sprint-04-plan.md) و [گزارش](../planning/sprints/sprint-04-report.md) مرجع تصمیم و شاهدند. فایل‌های زیر واقعی‌اند؛ پوشه فرضی برای اسپرینت بعد ایجاد نشده است.

## مرز و جهت وابستگی

identity مالک هویت/نشست است؛ salon-management مالک داده سالن. Domain با TypeScript خالص و توابع validation/policy؛ Application با سرویس سناریو و Port؛ Infrastructure با SQL/transaction؛ Presentation با Guard/HTTP/DTO. Controller هیچ query DB یا قانون زمان‌بندی ندارد. Health ساده بدون لایه تشریفاتی می‌ماند.

```text
backend/src/
  common/domain/                        # ورودی نامطمئن و خطای typed مشترک
  common/http/                          # خطای امن و request id فعلی
  modules/identity/
    public.ts                           # user/session guard و نرخ موردنیاز مدیریت
    persistence-schema.ts               # leaf users برای FK؛ بدون Provider
    infrastructure/persistence/security-rate-limiter.ts
    presentation/http/
      session-auth.guard.ts             # نشست معتبر فعلی از PostgreSQL
      authenticated-request.ts          # کاربر resolveشده و requireCurrentUser
      cookie-mutation.guard.ts          # Origin و JSON؛ GET و DELETE بدون بدنه
  modules/salon-management/
    salon-management.module.ts          # wiring داخلی قابلیت
    application/
      businesses/businesses.service.ts
      catalog/catalog.service.ts
      team/team.service.ts
      scheduling/scheduling.service.ts
      ports/management-stores.ts        # چهار Port کوچک بر اساس مصرف
    domain/
      business-policy.ts
      service-policy.ts
      schedule-policy.ts                # بازه/روز/override/تقاطع؛ بدون slot
      management-limits.ts
      management.types.ts
      validation.ts                     # re-export validation مشترک
    infrastructure/persistence/
      management.schema.ts              # schema منسجم همین قابلیت
      business-write-transaction.ts     # owner، قفل، replay، audit و commit
      management-pagination.ts          # cursor وابسته به scope/filter
      postgres-business-store.ts
      postgres-catalog-store.ts
      postgres-team-store.ts
      postgres-schedule-store.ts
    presentation/http/
      businesses.controller.ts
      catalog.controller.ts
      staff.controller.ts
      hours.controller.ts
      schedule-exceptions.controller.ts
      management-http.ts                # key/version/query/envelope
      management-api.ts                 # decorator مشترک مجوز/قرارداد
      dto/management.dto.ts
backend/drizzle/0002_salon_management.sql # مدیریت + قید/trigger SQL بازبینی‌شده
backend/drizzle/0003_remove_mfa.sql        # حذف داده/ستون عامل دوم؛ حفظ سالن و نشست
```

schema در یک فایل داده‌ای ۲۷۳خطی نگهداری شده؛ شکستن مکانیکی آن به فایل برای هر جدول، coupling واقعی را کم نمی‌کرد. خطای مشترک در Filter موجود و احراز نشست در identity باقی ماندند؛ guard/filter موازی ساخته نشدند. اعتبارسنجی کوچک Staff در سناریوی Team است و staff-policy خالی نداریم. `database/schema.ts` فقط schemaها را برای Drizzle تجمیع می‌کند.

## فرانت

```text
frontend/src/
  app/(management)/manage/
    layout.tsx                          # AccountGate
    page.tsx                            # سالن‌های خود
    new/page.tsx
    [businessId]/layout.tsx              # ناوبری؛ key مرز تعویض سالن
    [businessId]/page.tsx                # تنظیمات
    [businessId]/{services,staff,hours,exceptions}/page.tsx
  features/salon-management/
    index.ts                            # public UI برای routeها
    api/management.api.ts               # I/O و runtime decode
    model/                              # types، decoder و تبدیل خالص پول/تاریخ
    hooks/use-paged.ts
    hooks/use-managed-mutation.ts       # intent key، retry و AbortController
    components/
      businesses/                       # فهرست/فرم/تنظیمات
      catalog/                          # فهرست/فرم خدمت
      team/                             # متخصص و تخصیص
      scheduling/                       # ساعت/بازه/استثنا
      management-frame.tsx
      management-navigation.tsx         # active route و aria-current
      request-feedback.tsx
      confirm-action.tsx
      pagination.tsx
  components/layout/account-gate.tsx
  components/ui/request-status.tsx      # loading/error/auth مشترک
  lib/api/                              # transport هم‌مبدأ و decoder primitive
  lib/hooks/use-remote.ts                # abort و جلوگیری از پاسخ دیررس
  lib/format/digits.ts
  lib/forms/form-error.ts
```

Route ترکیب‌کننده است؛ feature API entity دیتابیس را import نمی‌کند. Hook برای state/I/O و تابع عادی برای تبدیل خالص است. رفتار مشترک feedback، field، interval و transport پس از نیاز واقعی استخراج شد؛ form framework، global state و package مشترک تازه نداریم. مرز AccountGate با تغییر actor و layout با تغییر business subtree خصوصی را عوض می‌کند.

پنل مالک بر token/primitives فعلی آراسته ساخته شد؛ تطبیق دقیق با Figma مالک ادعا نمی‌شود. discovery فعلی همچنان fixture است. آزمون‌های domain، HTTP، PostgreSQL و مرورگر در convention موجود قرار دارند؛ مسیر و نتیجه در گزارش اسپرینت ثبت‌اند.
