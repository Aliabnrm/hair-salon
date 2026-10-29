# ساختار کد و جهت وابستگی
مرجع: ADR-002. درخت اسپرینت‌های ۱ و ۲ زیر، ساختار واقعی کد است. درخت‌های رزرو و فرانت در بخش‌های بعد صرفاً الگوی رشد آینده‌اند و ایجاد نشده‌اند.

## سطح مخزن
یک مخزن و npm workspaces؛ بدون Nx/Turborepo. یک package-lock.json در ریشه، package.json ریشه private و apps/api با نام @hair-salon/api داریم. apps/web و packages/* فقط در اسپرینت مرتبط ایجاد شوند. npm scripts ریشه اجرای ابزارهای API را delegate می‌کنند؛ فایل اجرایی frontend فعلاً نداریم.

```text
hair-salon/
  AGENTS.md
  README.md
  package.json
  package-lock.json         # تنها lockfile پروژه
  .npmrc
  .gitignore
  .nvmrc                    # نسخه دقیق Node انتخاب‌شده در اجرا
  compose.yml               # PostgreSQL 17.11، localhost و volume پایدار
  apps/
    api/
      package.json
      nest-cli.json
      tsconfig.json
      tsconfig.build.json
      tsconfig.test.json     # typecheck تست جدا از build
      vitest.config.ts
      vitest.config.e2e.ts
      vitest.config.integration.ts # PostgreSQL واقعی، suiteهای متوالی
      drizzle.config.ts
      drizzle/
        0000_database_foundation.sql
        meta/
          _journal.json
          0000_snapshot.json
      .prettierrc.json
      .env.example
      src/
        main.ts             # bootstrap و listen، بدون قانون محصول
        app.module.ts       # composition root ماژول‌ها
        app.setup.ts        # تنظیم مشترک برنامه در اجرا و تست
        config/
          environment.ts
          environment.spec.ts
        common/
          http/
            api-error.ts
            request-context.ts
            request-id.middleware.ts
            http-exception.filter.ts
        database/
          database.module.ts
          database.provider.ts     # مالک یک Pool و دسترسی typed به Drizzle
          database-health.port.ts
          postgres-health-check.ts # SELECT 1 محدود، cleanup و log امن
          schema.ts                # namespace مشترک app، بدون جدول محصول
          migrate.ts               # CLI رسمی و بستن Pool در finally
        modules/
          health/
            health.module.ts
            health.controller.ts
            health.service.ts
            health.service.spec.ts
            dto/
              health-response.dto.ts
      test/
        health.e2e-spec.ts
        errors.e2e-spec.ts
        openapi.e2e-spec.ts
        startup.e2e-spec.ts
        test-database-guard.e2e-spec.ts
        database.integration-spec.ts
        readiness.integration-spec.ts
        helpers/
          create-test-application.ts
          test-database.ts         # guard مقصد و مالکیت DB موقت
        fixtures/
          failure.controller.ts  # فقط fixture خطا در تست، خارج از src
  docs/
    architecture/
    engineering/
    references/
    planning/
    prompts/
    learning/
  work/                     # پژوهش و فایل واسط؛ در .gitignore
```

درخت مربوط به اسپرینت‌های ۱ و ۲ است. تغییر جزئی نام فایل در اجرا مجاز است، به شرط حفظ مسئولیت و به‌روزرسانی همین درخت؛ ایجاد لایه/ابزار جدید صرفاً برای پرکردن الگو مجاز نیست. فایل اپ نباید با نتیجه تست یا متن مستند مخلوط شود.

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

## فرانت‌اند آینده — فناوری نهایی هنوز باز است
```text
apps/web/src/
  app/                      # route/layout و composition
  features/
    booking/
      components/
      hooks/
      api/
      model/                # state/schema مرتبط؛ فقط در صورت مصرف
      utils/                # توابع خالص همین قابلیت
  components/ui/            # اجزای مشترک design system
  design-system/            # tokens و مستند اجزا
  lib/                      # API client و کتابخانه پیکربندی‌شده
  hooks/                    # فقط hook واقعاً مشترک
```

components/ui و lib به features وابسته نمی‌شوند. ویژگی‌ها از shared استفاده می‌کنند؛ ترکیب ویژگی‌ها در app انجام می‌شود. نام server/client و روش data fetching تابع انتخاب Next.js/React و نیاز واقعی در اسپرینت فرانت است. ذخیره‌سازی shared state و ابزار query پیشاپیش تحمیل نمی‌شود.

HealthModule فقط `DatabaseHealthCheck` را در Service مصرف می‌کند؛ DatabaseModule adapter PostgreSQL و مالکیت Pool را ثبت و Port/دسترسی typed را export می‌کند. Controller فاقد SQL/pg/Drizzle است؛ queryهای قابلیت‌های آینده کنار همان قابلیت قرار می‌گیرند. database/schema.ts برای namespace واقعی و ورودی Drizzle Kit مصرف می‌شود؛ namespace app با tenant سالن یکی نیست.
