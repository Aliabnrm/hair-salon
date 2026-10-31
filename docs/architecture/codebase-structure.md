# ساختار کد و جهت وابستگی

کد جاری در `backend/` و `frontend/` است؛ [درخت و نام فایل‌ها](sprint-03-structure.md)، ADR-002 و ADR-005 مرجع‌اند. انتقال اسپرینت ۳ API دوم نساخت؛ workspace `@hair-salon/api` حفظ شد، `@hair-salon/frontend` اضافه شد و فقط یک lockfile ریشه داریم. scripts ریشه به هر دو workspace delegate می‌کنند؛ migration و HTTP مستقل به backend و مرورگر به frontend تعلق دارند.

```text
hair-salon/
  backend/
    drizzle/                 # 0000 محفوظ؛ 0001_identity رسمی
    src/
      common/http/           # request-id، envelope و خطای امن
      config/                # اعتبارسنجی env
      database/              # یک Pool، migration، schema aggregate
      modules/health/        # ساختار ساده فعلی
      modules/identity/
        domain/              # policy خالص ایمیل/رمز و خطا
        application/ports/   # قرارداد I/O
        infrastructure/      # PostgreSQL و Argon2id
        presentation/http/   # DTO، guard، cookie و controller
    test/                    # HTTP و PG واقعی با DB UUID
  frontend/
    public/                  # فونت و دارایی اصلی طرح
    src/app/                 # layout و route باریک
    src/features/discovery/  # data/model/hooks/components
    src/features/identity/   # api/model/hooks/components
    src/components/          # layout و UI مشترک
    src/design-system/       # tokenهای واقعی Make
    src/lib/                 # client و config عمومی
    e2e/                     # مرورگر + stack واقعی اختصاصی
  pnpm-lock.yaml          # تنها lockfile
  pnpm-workspace.yaml       # اعضای workspace و سیاست نصب
  compose.yml                # PostgreSQL 17.11 و volume توسعه
  docs/
  work/                      # فایل واسط و شاهد محلی ignored
```

components/ui و lib به features وابسته نمی‌شوند؛ app ترکیب‌کننده است. frontend به entity/secret بک‌اند import ندارد. runner تست مرورگر فقط helper مالکیت DB تست را reuse می‌کند؛ کد backend وارد bundle نمی‌شود. query رزرو، کاتالوگ واقعی یا لایه فرضی برای آینده ساخته نشده است.

HealthModule فقط DatabaseHealthCheck را از DatabaseModule مصرف می‌کند. DatabaseProvider مالک Pool واحد است؛ schema دامنه کنار persistence آن قرار دارد و `database/schema.ts` aggregate است. `app-schema.ts` leaf مشترک است تا import cycle ایجاد نشود. namespace `app` معادل tenant نیست.

## رشد یک قابلیت پیچیده بک‌اند — مثال آینده، فعلاً نسازید
```text
modules/bookings/
  bookings.module.ts
  presentation/http/
    bookings.controller.ts
    dto/
  application/
    create-booking.service.ts
    reschedule-booking.service.ts
    ports/
      booking-store.port.ts
  domain/
    booking-policy.ts
    booking-status.ts
    time-range.ts
  infrastructure/persistence/
    postgres-booking-store.ts
```

جهت import: Controller→Application؛ Application→Domain و Port؛ adapter→Port/Domain؛ Module پیاده‌سازی Port را به token وصل می‌کند. adapter نباید قانون تازه رزرو تعریف کند. TypeScript interface در runtime وجود ندارد؛ در مرز واقعی از token صریح DI استفاده شود. circular dependency با forwardRef به‌عنوان راهکار پیش‌فرض پنهان نشود؛ مرز مسئولیت بازبینی شود.

ماژول دیگر فقط providerهای exportشده را مصرف کند؛ deep import به repository یا DTO داخلی آن ممنوع است. mapping DTO↔domain در مرز HTTP و mapping DB↔domain در adapter انجام شود. common به modules وابسته نباشد و به انبار helperهای بی‌نام تبدیل نشود. یک shared package برای «شاید بعداً» ساخته نشود.
