# ساختار اسپرینت ۳ و قرارداد نام‌گذاری

وضعیت: **ساختار جاری پس از اجرای اسپرینت ۳**. [ADR-005](adr/ADR-005-frontend-backend-layout.md) و [گزارش](../planning/sprints/sprint-03-report.md) مرجع‌اند. درخت زیر مسئولیت‌ها و فایل‌های اصلی را نشان می‌دهد؛ فهرست تست‌های تکمیلی در دیسک است.

## درخت اصلی جاری

فایل‌های زیر مسئولیت مشخص دارند؛ index عمومی فقط برای export واقعاً مصرف‌شده است. فایل component هر بخش تنها وقتی همان بخش در inventory تأییدشده طراحی وجود دارد ساخته شود؛ مسیرها الگوی پرکردن پوشه نیستند.

```text
hair-salon/
  package.json                    # workspaces: backend, frontend؛ scripts هماهنگ
  pnpm-lock.yaml               # تنها lockfile
  pnpm-workspace.yaml       # اعضای workspace و سیاست نصب
  compose.yml                     # PostgreSQL فعلی حفظ می‌شود
  backend/                        # انتقال apps/api؛ @hair-salon/api
    package.json
    .env.example
    nest-cli.json
    tsconfig.json
    tsconfig.build.json
    tsconfig.test.json
    drizzle.config.ts
    drizzle/
      0000_database_foundation.sql # بدون ویرایش محتوا
      0001_identity.sql           # generate رسمی از schema
      meta/                       # journal و snapshot معتبر؛ قبلی حفظ شود
    src/
      main.ts
      app.module.ts
      app.setup.ts
      config/
        environment.ts
        environment.spec.ts
      common/http/                # request-id و envelope/filter موجود
      database/
        app-schema.ts             # appSchema به‌عنوان leaf؛ جلوگیری از import cycle
        schema.ts                 # aggregate schema مصرف‌شده Drizzle
        database.module.ts
        database.provider.ts
        database-health.port.ts
        postgres-health-check.ts
        migrate.ts
      modules/
        health/                   # ساختار ساده موجود حفظ می‌شود
        identity/
          identity.module.ts      # wiring؛ تنها API عمومی لازم export شود
          domain/
            email-policy.ts       # canonicalization واحد در سرور
            password-policy.ts    # تابع خالص، بدون ORM/Nest
            identity-errors.ts
          application/
            register-user.service.ts
            sign-in.service.ts
            sign-out.service.ts
            resolve-session.service.ts
            auth-attempt-limiter.service.ts
            session-token.ts
            ports/
              identity-store.port.ts
              password-hasher.port.ts
              auth-attempt-store.port.ts
          infrastructure/
            persistence/
              identity.schema.ts
              postgres-identity-store.ts
              postgres-auth-attempt-store.ts
            security/
              argon2-password-hasher.ts
          presentation/http/
            authentication.controller.ts
            current-user.controller.ts
            session-auth.guard.ts
            auth-mutation.guard.ts
            credentials.pipe.ts
            identity-exception.filter.ts
            session-cookie.ts
            current-user.decorator.ts
            authenticated-request.ts
            dto/
              register-request.dto.ts
              sign-in-request.dto.ts
              registration-response.dto.ts
              current-user-response.dto.ts
    test/
      ...                         # تست‌های واقعی قبلی منتقل می‌شوند
      identity.integration-spec.ts
      identity.e2e-spec.ts
      helpers/
        create-test-application.ts
        test-database.ts          # guard و UUID cleanup موجود
    vitest.config.ts
    vitest.config.e2e.ts
    vitest.config.integration.ts
  frontend/                       # workspace @hair-salon/frontend
    package.json
    .env.example
    tsconfig.json                 # strict؛ تنظیم متناسب bundler فرانت
    next.config.ts
    postcss.config.mjs
    .prettierignore
    next-env.d.ts                 # طبق ابزار؛ بدون ویرایش دستی
    vitest.config.ts
    playwright.config.ts
    public/
      assets/                     # تصاویر/آیکن‌های exportشده منبع، با نام توصیفی
      fonts/                      # فقط فونت واقعی و مجاز طراحی
    src/
      app/
        layout.tsx                # lang/dir، فونت و layout ریشه
        page.tsx                  # ترکیب صفحه کشف
        globals.css
        (auth)/
          layout.tsx              # فقط اگر layout مشترک واقعی دو فرم است
          sign-in/page.tsx
          sign-up/page.tsx
        (account)/
          account/page.tsx
      features/
        discovery/
          components/
            discovery-screen.tsx
            discovery-search.tsx
            audience-tabs.tsx
            service-filters.tsx
            salon-card.tsx
            salon-results.tsx
            location-sheet.tsx
          hooks/
            use-discovery-filters.ts
          model/
            discovery.types.ts
            filter-salons.ts
          data/
            demo-salons.ts         # فقط داده نمایشی هم‌معنای منبع، بدون ادعای DB زنده
          index.ts
        identity/
          components/
            credentials-form.tsx   # فرم مشترک واقعی signup/login
            sign-in-form.tsx
            sign-up-form.tsx
            account-screen.tsx
            session-provider.tsx  # یک مالک state مشترک؛ hook فقط مصرف‌کننده آن
          hooks/
            use-session.ts
          api/
            identity.api.ts
          model/
            identity.types.ts
            auth-form-errors.ts
          index.ts
      components/
        layout/
          app-shell.tsx
          bottom-navigation.tsx
        ui/
          button.tsx
          text-field.tsx
          brand.tsx
          icon.tsx
          sheet.tsx
          state-panel.tsx
      design-system/
        tokens.css                # مرجع رنگ،فاصله،تایپوگرافی،radius/shadow واقعی
      lib/
        api/
          http-client.ts          # envelope/error،credentials و request-id
        config/
          environment.server.ts   # server-only؛ BACKEND_ORIGIN به client export نشود
    e2e/
      identity.spec.ts
      identity-transport.spec.ts
      discovery.spec.ts
      design-parity.spec.ts
      fixtures/
        test-stack.ts             # DB/processهای متعلق به تست؛ teardown همه مسیرها
  docs/
    references/sprint-03-figma.md
    planning/sprints/sprint-03-plan.md
    prompts/sprint-03.md
```

تست unit/component کنار فایل با suffix `.spec.ts` یا `.spec.tsx`؛ مسیرهای e2e جای تست مرورگرند. migration 0001_identity نام واقعی generateشده است؛ تاریخچه قبلی حفظ و entry جدید append شده است. برای حالت‌های خطا/loading/empty از component معنادار فقط در صورت نیاز واقعی استفاده شود؛ هر badge یا یک خط JSX فایل جدا نمی‌خواهد.

## نام‌گذاری

| مورد | قرارداد | نمونه |
|---|---|---|
| پوشه/فایل دستی | English kebab-case؛ suffix نقش Nest حفظ شود | sign-in-form.tsx، register-user.service.ts |
| React component / class | PascalCase | SignInForm، RegisterUserService |
| تابع/متغیر | camelCase و فعل/نام روشن | normalizeEmail، resolveSession |
| Port | قرارداد کوچک و مشخص، با token DI واقعی | PasswordHasher، IdentityStore |
| جدول/ستون PostgreSQL | snake_case؛ جدول جمع | app.users، password_credentials، token_hash |
| URL | lowercase kebab-case یا resource رایج | /sign-in، /api/v1/auth/login، /api/v1/me |
| domain capability | نام مفهوم کسب‌وکار، نه نام صفحه یا ابزار | identity، discovery؛ نه services عمومی یا drizzle-domain |
| asset | نام توصیفی محتوا، بدون نام‌های image1/final2 | salon-card-mahour.<source-extension> |

نام‌های قراردادی framework مثل `page.tsx`،`layout.tsx`،`next.config.ts` و فایل تولیدشده ابزار استثنای آگاهانه‌اند. React component در فایل kebab-case export PascalCase دارد. «account» route است؛ هویت و نشست در همین دامنه identity می‌مانند و User دوم یا ماژول موازی auth/users/accounts ساخته نمی‌شود.

## جریان مسئولیت

- route صفحه، feature component را ترکیب می‌کند؛ query DB یا قانون دسترسی در JSX نیست. feature فقط public API لازم feature دیگر را مصرف کند؛ common/lib به feature وابسته نمی‌شوند.
- SessionProvider یک مالک state نشست است و useSession فقط همان context را مصرف می‌کند؛ درخواست /me در چند component مستقل تکرار و در چند store کپی نشود. cookie منبع امنیتی مرورگر است و UI مجوز سروری ایجاد نمی‌کند.
- discovery فقط داده نمایشی همین طرح را فیلتر می‌کند؛ code رزرو، تخصیص متخصص یا تخمین availability تولید نمی‌کند. دامنه‌های Business/Booking از نمونه کارت سالن ساخته نمی‌شوند.
- schema هر دامنه کنار infrastructure همان دامنه است؛ `database/schema.ts` aggregate برای Drizzle Kit و runtime. `identity.schema.ts` به app-schema.ts leaf وابسته است؛ از aggregateای که خودش identity را export می‌کند import نکند.
- Controllerها HTTP/DTO و cookie را مدیریت می‌کنند؛ application service سناریو و transaction را هماهنگ می‌کند؛ domain policy خالص است و adapterها I/O دارند. لایه اضافی برای Health یا GenericRepository/BaseService ساخته نشود.
- شکل نهایی componentها تابع source کامل Figma است؛ اسم فنی مناسب حفظ شود و کد تولیدشده Make به فایل همه‌کاره App.tsx تبدیل نشود. درخت اصلی بالا با فایل‌های اجراشده هماهنگ است؛ علت تفاوت با الگوی اولیه در ادامه ثبت شده است.

## تفاوت‌های لازم با الگوی اولیه

CredentialsForm به‌دلیل فرم مشترک واقعی استخراج شد؛ wrapperهای SignInForm/SignUpForm مسیر مصرف روشن دارند. LocationSheet مسئول draft شهر/محله است. filter-salons.ts تابع خالص و useDiscoveryFilters مالک state است. UI مشترک واقعی شامل icon/brand/button/text-field/state-panel/sheet است. درخواست اولیه backend فایل DTO logout و filter/guard/limiter را کامل فهرست نکرده بود؛ فایل‌های واقعی همین مسئولیت‌ها کنار identity هستند. هیچ فولدر خالی Business/Booking یا API بی‌مصرف discovery ساخته نشده است.
