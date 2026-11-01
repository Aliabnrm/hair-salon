# درس اسپرینت ۴ — از ورود به حساب تا تغییر امن داده سالن

این درس به فایل‌های واقعی همین اسپرینت اشاره می‌کند. [گزارش](../planning/sprints/sprint-04-report.md) نتیجه اجرا و [ADR-007](../architecture/adr/ADR-007-private-salon-management.md) دلیل تصمیم‌ها را ثبت می‌کنند.

## ۱. Authentication و Authorization دو سؤال متفاوت‌اند

ورود ایمیل/رمز می‌پرسد «کدام حساب هستی؟». مجوز می‌پرسد «این حساب اجازه تغییر همین سالن را دارد؟». طبق درخواست جدید کارفرما و [ADR-008](../architecture/adr/ADR-008-remove-owner-mfa.md)، عامل دوم فعلاً حذف شده است.

[SessionAuthGuard](../../backend/src/modules/identity/presentation/http/session-auth.guard.ts) cookie را به نشست معتبر سرور و سپس کاربر تبدیل می‌کند. [requireCurrentUser](../../backend/src/modules/identity/presentation/http/authenticated-request.ts) همان کاربر را در مرز HTTP در اختیار مدیریت می‌گذارد. شناسه کاربر از body یا URL گرفته نمی‌شود. سپس [BusinessWriteTransaction.owner](../../backend/src/modules/salon-management/infrastructure/persistence/business-write-transaction.ts) عضویت owner فعال همان سالن را در DB بررسی می‌کند.

مثال: علی و سارا هر دو وارد شده‌اند. علی با عوض‌کردن URL به سالن سارا دسترسی نمی‌گیرد؛ query به شناسه علی و سالن سارا هم‌زمان محدود است و404 می‌گیرد. نشست منقضی یا باطل401 می‌گیرد. نبود MFA به معنی حذف بررسی مالکیت نیست. ایمیل هنوز تأیید نشده است؛ سالن همچنان draft و خصوصی است.

## ۲. چرا حذف یک قابلیت فقط حذف صفحه نیست؟

اگر فقط صفحه حذف شود، API همچنان عامل دوم بخواهد و مدیریت قفل می‌شود. بنابراین route، API، Guard، adapter، dependency، schema و تست‌های وابسته با هم اصلاح شدند. محدودیت نرخ، Origin و مجوز مستقل از عامل دوم هستند و باقی می‌مانند.

[migration0003](../../backend/drizzle/0003_remove_mfa.sql) چهار جدول عامل/راه‌اندازی/بازیابی/احراز مجدد و دو ستون اختصاصی نشست را حذف می‌کند. migration0002 چون روی DB اجرا شده، بازنویسی نمی‌شود. نمونه: یک کاربر که دیروز سالن ساخته، بعد از مهاجرت با همان حساب و نشست معتبر، همان سالن را می‌بیند؛ فقط دیگر کد Authenticator لازم ندارد. این حفظ رفتار داده‌های قبلی در تست PostgreSQL واقعی بررسی می‌شود.

## ۳. Tenant و FK مرکب

Tenant اینجا سالن است. در [management.schema.ts](../../backend/src/modules/salon-management/infrastructure/persistence/management.schema.ts)، staff_services هم business_id دارد، هم staff_id و service_id. دو FK مرکب می‌گویند:

```text
(business_id, staff_id)   → staff_profiles(business_id, id)
(business_id, service_id) → services(business_id, id)
```

اگر service_id متعلق به سالن دیگری باشد، حتی query مستقیم تست هم با FK شکست می‌خورد. با این حال FK نمی‌داند درخواست‌کننده علی است یا سارا؛ بررسی owner هنوز لازم است. این دو کنترل مسئولیت متفاوتی دارند.

## ۴. Transaction و قفل: «همه با هم، یا هیچ‌کدام»

در [PostgresBusinessStore.create](../../backend/src/modules/salon-management/infrastructure/persistence/postgres-business-store.ts)، سالن و عضویت مالک در یک transaction ساخته می‌شوند. helper مشترک همان transaction را با audit و نتیجه intent تکمیل می‌کند. اگر عضویت شکست بخورد، سالن بدون مالک باقی نمی‌ماند.

برای سقف سه سالن، صرفاً count و سپس insert کافی نیست: دو درخواست ممکن است هم‌زمان count=2 ببینند. قفل User باعث می‌شود درخواست دوم پس از اول count تازه را ببیند و چهارمین سالن رد شود. در child writeها ابتدا Business و بعد در صورت نیاز Staff قفل می‌شود؛ ترتیب ثابت، فهم رقابت و پرهیز از deadlock را آسان‌تر می‌کند.

قفل Business ساده است اما writeهای همان سالن را سری می‌کند. این انتخاب پایلوت است؛ مقیاس‌پذیری با benchmark سنجیده می‌شود، نه با اسم معماری.

## ۵. Version و Idempotency چرا هر دو لازم‌اند؟

**Version** برای دو ویرایش متفاوت است: شما فرم نسخه۱ را باز کرده‌اید، نفر/تب دیگر نسخه۲ را ذخیره کرده است. `If-Match: "1"` جلوی overwrite نسخه۲ را می‌گیرد؛409 می‌گیریم و باید نسخه تازه را ببینیم.

**Idempotency** برای تکرار همان قصد است: «این خدمت را بساز» به سرور رسیده، اما پاسخ اینترنت قطع شده است. درخواست دوباره با همان کلید باید همان شناسه را بدهد، نه خدمت دوم.

در [BusinessWriteTransaction.run](../../backend/src/modules/salon-management/infrastructure/persistence/business-write-transaction.ts)، ترتیب اصلی چنین است:

```text
قفل و مجوز فعلی → بررسی همان کلید/اثر انگشت → بررسی نسخه → تغییر + نتیجه + audit → commit
```

به همین دلیل retry همان PATCH با If-Match قدیمی می‌تواند نتیجه ذخیره‌شده قبلی را بگیرد؛ ولی یک intent تازه با نسخه کهنه رد می‌شود. پاسخ cache تا۷روز می‌ماند و پس از انقضا تکرار دیرهنگام اثر جدید تولید نمی‌کند.

در [useManagedMutation](../../frontend/src/features/salon-management/hooks/use-managed-mutation.ts)، قطع ارتباط فرم را حفظ می‌کند و دکمه retry از همان intent/key استفاده می‌کند. هنگام نتیجه مبهم، تغییر قصد تازه مسدود می‌شود تا دو اثر ناخواسته نسازیم. این رفتار با مرورگر و سرور واقعی تست شد.

## ۶. چهار مسئولیت بک‌اند با مثال خدمت

[CatalogController](../../backend/src/modules/salon-management/presentation/http/catalog.controller.ts) ورودی HTTP، actor، header و پاسخ را تطبیق می‌دهد. [CatalogService](../../backend/src/modules/salon-management/application/catalog/catalog.service.ts) سناریوی create/update را هماهنگ می‌کند. [service-policy](../../backend/src/modules/salon-management/domain/service-policy.ts) نام، مبلغ، مدت و بافر را بدون Nest/DB بررسی می‌کند. [PostgresCatalogStore](../../backend/src/modules/salon-management/infrastructure/persistence/postgres-catalog-store.ts) SQL و قفل/نسخه را اجرا می‌کند.

Port یعنی قراردادی که Application از I/O لازم دارد؛ اینجا CatalogStore است. Application جزئیات pg را نمی‌شناسد. برای هر تابع interface یا BaseService نساختیم؛ فقط مرزهای واقعی I/O قرارداد گرفتند. این کاربرد عملی SRP و DIP است: دلیل تغییر هر بخش روشن است.

## ۷. Component، Hook، تابع خالص و API در فرانت

[ServiceEditor](../../frontend/src/features/salon-management/components/catalog/service-editor.tsx) فیلدها و تعامل محلی را نمایش می‌دهد. hook mutation عمر درخواست و retry را نگه می‌دارد. [management.api](../../frontend/src/features/salon-management/api/management.api.ts) با transport هم‌مبدأ حرف می‌زند و پاسخ را runtime decode می‌کند. [form-values](../../frontend/src/features/salon-management/model/form-values.ts) تابع خالص تبدیل دارد:

```ts
tomanToRial('۲۵۰٬۰۰۰'); // 2500000
jalaliToIso('۱۴۰۵/۰۸/۱۰'); // '2026-11-01'
```

تابع خالص React نمی‌خواهد و راحت مستقل تست می‌شود. hook وقتی لازم است که state، effect یا عمر درخواست داشته باشیم. `useRemote` درخواست قبلی را abort و پاسخ دیررس را نادیده می‌گیرد؛ فرم یک سالن نباید با پاسخ سالن قبلی پر شود.

UI تومان/شمسی کمک کاربر است؛ سرور همچنان عدد صحیح IRR و ISO واقعی را مستقلاً اعتبارسنجی می‌کند. TypeScript به‌تنهایی داده شبکه را معتبر نمی‌کند.

## ۸. زمان کاری هنوز وقت آزاد رزرو نیست

[Schedule policy](../../backend/src/modules/salon-management/domain/schedule-policy.ts) بازه نیمه‌باز را می‌پذیرد: 09:00–12:00 و 12:00–18:00 مجاورند و overlap ندارند. 23:00–01:00 در یک روز رد می‌شود و باید به دو روز شکسته شود. ساعت متخصص خارج برنامه سالن قابل کار نیست؛ تقاطع دو برنامه مفهوم پایه است و تعطیلی سالن نتیجه خالی دارد.

قید exclusion در [migration](../../backend/drizzle/0002_salon_management.sql) جلوی overlap DB را هم می‌گیرد. روز خاص هنگام commit باید یا تعطیل بدون بازه، یا باز با۱..۴بازه باشد. این پایه هنوز رزرو، ظرفیت اشغال یا slot محاسبه نمی‌کند.

## تمرین مرور کد

۱. درخواست ساخت خدمت را از Controller تا Store دنبال کنید و بگویید هر فایل چرا وجود دارد.
۲. تست `concurrent versioned update` را در [integration](../../backend/test/salon-management.integration-spec.ts) ببینید؛ چرا یکی200 و دیگری409 می‌شود؟
۳. با دو تب تنظیمات سالن را باز کنید؛ در اول ذخیره و در دوم تلاش به ذخیره کنید. نسخه تازه را بارگذاری کنید، سپس دوباره تصمیم بگیرید.
۴. تست قطع اینترنت را در [مرورگر](../../frontend/e2e/salon-management.spec.ts) بخوانید؛ چرا پس از retry فقط یک خدمت در DB وجود دارد؟
