# درس اسپرینت ۱ — یک درخواست از کجا می‌آید و کجا می‌رود؟

هدف این اسپرینت، داشتن یک API کوچک برای فهم ساختار Nest است. محصول نهایی به رزرو و دیتابیس نیاز دارد؛ فعلاً درخواست سلامت را دنبال می‌کنیم تا نقش هر بخش روشن بماند.

## ۱. Module: معرفی اجزای یک قابلیت

در [health.module.ts](../../apps/api/src/modules/health/health.module.ts)، `HealthController` در controllers و `HealthService` در providers ثبت شده‌اند. Module به Nest می‌گوید این قابلیت از چه اجزایی ساخته می‌شود. [app.module.ts](../../apps/api/src/app.module.ts) ماژول Health و تنظیمات را کنار هم قرار می‌دهد.

ماژول‌بندی یعنی بتوانیم کد یک قابلیت را یکجا پیدا کنیم و وابستگی‌هایش را بشناسیم. صرف داشتن پوشه، استقلال ایجاد نمی‌کند؛ جهت import و export محدود هم باید رعایت شود. HealthService داخلی است و فعلاً export نشده، چون مصرف‌کننده‌ای بیرون این ماژول ندارد.

## ۲. Controller و Service: دلیل تغییر متفاوت

[health.controller.ts](../../apps/api/src/modules/health/health.controller.ts) مسیر HTTP را تعریف می‌کند، Service را صدا می‌زند و پاسخ دارای `data` و `meta.request_id` می‌سازد. [health.service.ts](../../apps/api/src/modules/health/health.service.ts) فقط داده زنده‌بودن را برمی‌گرداند و request یا response نمی‌گیرد.

اگر فردا نام مسیر یا قالب پاسخ عوض شود، Controller تغییر می‌کند. اگر روش تشخیص سلامت عوض شود، Service محل آن تغییر است. این یک نمونه کوچک از «مسئولیت واحد» است: هر بخش دلیل روشنی برای تغییر دارد. برای چنین منطق کوچکی، domain، repository و interface جدا نساختیم؛ این لایه‌ها وقتی قانون یا I/O واقعی داشته باشیم ارزش پیدا می‌کنند.

در این مثال داده Service بسیار ساده است و از نوع ساختاری DTO استفاده می‌کند؛ import آن `type` است و وابستگی runtime به Swagger نمی‌آورد. برای دامنه پیچیده رزرو، مدل مستقل از DTO و Nest طبق ADR-002 خواهیم داشت.

## ۳. Provider و DI: چه کسی وابستگی را می‌سازد؟

Provider چیزی است که Nest مدیریت می‌کند؛ اینجا HealthService یک provider با `@Injectable()` است. در constructor کنترلر نوشته‌ایم:

```ts
constructor(private readonly healthService: HealthService) {}
```

این یعنی «برای کار کردن به HealthService نیاز دارم». کنترلر خودش `new HealthService()` نمی‌نویسد. Nest ثبت ماژول را می‌خواند، Service را می‌سازد و آن را به کنترلر می‌دهد. این کار **تزریق وابستگی یا DI** نام دارد.

مزیت عملی: وابستگی آشکار است، ساخت اشیا یک جا مدیریت می‌شود و در تست می‌توان یک مرز واقعی مثل logger را جایگزین کرد. DI به‌تنهایی معماری تمیز یا قانون درست کسب‌وکار را تضمین نمی‌کند. `app.get` در bootstrap برای wiring برنامه است؛ داخل Controller از constructor استفاده می‌کنیم.

TypeScript پس از build نوع‌ها را حذف می‌کند. Nest برای constructor DI به metadata زمان اجرا نیاز دارد؛ به همین دلیل تنظیم decoratorها، import مقدار واقعی کلاس و pipeline تست باید با هم سازگار باشند. تبدیل import یک provider به `import type` ممکن است این اطلاعات را حذف کند.

## ۴. مسیر واقعی درخواست

فایل [main.ts](../../apps/api/src/main.ts) برنامه را می‌سازد، [app.setup.ts](../../apps/api/src/app.setup.ts) رفتار HTTP را یک بار تنظیم می‌کند و سپس برنامه روی پورت معتبر گوش می‌دهد. تست HTTP هم از همین setup استفاده می‌کند.

برای درخواست `GET /api/v1/health/liveness`:

1. [request-id.middleware.ts](../../apps/api/src/common/http/request-id.middleware.ts) شناسه را بررسی یا UUID تولید می‌کند، آن را روی request می‌گذارد و هدر پاسخ را تنظیم می‌کند.
2. Nest با prefix `api/v1` و مسیر Controller، متد `getLiveness` را پیدا می‌کند.
3. Controller از Service داده سلامت را می‌گیرد و شناسه همین درخواست را در meta می‌گذارد.
4. Nest نتیجه را به JSON تبدیل و با HTTP 200 ارسال می‌کند.
5. پس از پایان پاسخ، middleware شناسه، method، status و مدت را log می‌کند. هیچ body، query، cookie یا Authorization ثبت نمی‌شود.

شناسه درخواست مثل شماره پیگیری است: کمک می‌کند پاسخ را در log پیدا کنیم. این شناسه به‌تنهایی اثبات نمی‌کند چه کسی درخواست داده یا چه مجوزی دارد. درخواست‌های هم‌زمان نیز context جدا دارند.

## ۵. تنظیمات، خطا و قرارداد قابل آزمون

[environment.ts](../../apps/api/src/config/environment.ts) ورودی متنی محیط را در startup بررسی می‌کند. `PORT=3e3` حتی اگر تبدیل عددی آن ممکن باشد، مطابق قرارداد ما معتبر نیست. TypeScript نمی‌تواند مقدار محیط دستگاه را پیشاپیش بداند؛ بررسی runtime لازم است. نبود متغیر default دارد، ولی مقدار خالی یک خطای پیکربندی است.

اگر در مسیرهای Nest خطایی رخ بدهد، [http-exception.filter.ts](../../apps/api/src/common/http/http-exception.filter.ts) آن را به [قالب خطا](../../apps/api/src/common/http/api-error.ts) تبدیل می‌کند. برای مسیرهای ناشناخته بیرون prefix نیز یک fallback پایانی در app.setup همین سازنده خطا را مصرف می‌کند؛ این تفاوت رفتار Nest 12 در ADR-003 توضیح داده شده است. کاربر code ثابت و پیام فارسی می‌گیرد؛ متن ناشناخته exception یا stack افشا نمی‌شود. درخواست ناموفق با پاسخ موفق پنهان نمی‌شود.

کلاس‌های [response DTO](../../apps/api/src/modules/health/dto/health-response.dto.ts) قرارداد پاسخ و schema مستندات را مشخص می‌کنند. OpenAPI از decoratorهای کد ساخته می‌شود؛ spec دستی موازی نداریم. DTO پاسخ، جای validation ورودی یا مجوز دسترسی را نمی‌گیرد.

## چگونه رفتار را می‌آزماییم؟

- [تست تنظیمات](../../apps/api/src/config/environment.spec.ts): default، بازه، مقدار خالی و شکل‌های نامعتبر.
- [تست Health](../../apps/api/test/health.e2e-spec.ts): boot واقعی Nest، DI، قرارداد پاسخ، شناسه معتبر/نامعتبر/تکراری و هم‌زمانی درخواست‌ها.
- [تست خطا](../../apps/api/test/errors.e2e-spec.ts): 404 و 500 بدون افشای متن حساس. Controller خطاساز فقط در test است.
- [تست OpenAPI](../../apps/api/test/openapi.e2e-spec.ts): schema واقعی و نبود docs در production.
- [تست startup](../../apps/api/test/startup.e2e-spec.ts): خروجی ساخته‌شده با env نامعتبر پیش از listen شکست می‌خورد.

تست واحد یک بخش کوچک مثل validation را جدا بررسی می‌کند. تست HTTP چند بخش واقعی را کنار هم بررسی می‌کند تا فراموش‌کردن middleware، prefix یا ثبت provider هم دیده شود. نتایج اجرای واقعی در [گزارش اسپرینت](../planning/sprints/sprint-01-report.md) است.

## خطاهای رایج و تمرین اختیاری

ساخت Service با `new` داخل Controller، خواندن پراکنده `process.env`، نوشتن متن خام exception در log و ساخت تست با setup جدا از برنامه، مرزها را مخدوش می‌کنند. همچنین `liveness=ok` فقط نشان می‌دهد همین فرایند پاسخ می‌دهد؛ سلامت DB و readiness مفهوم دیگری است و در اسپرینت مربوط اضافه خواهد شد.

تمرین بدون نیاز به تغییر کد: یک درخواست با `X-Request-Id: learning-01` و یک درخواست با `X-Request-Id: bad/id` بفرستید. برای هرکدام هدر پاسخ، meta و log را مقایسه کنید. سپس یک مسیر ناموجود را امتحان کنید و توضیح دهید چرا Service اجرا نمی‌شود، ولی شناسه درخواست همچنان در پاسخ وجود دارد.
