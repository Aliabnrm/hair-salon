# ساختار اجرایی اسپرینت ۵

مرجع تصمیم: [ADR-009](adr/ADR-009-reviewed-public-catalog.md). انتشار و کشف، دو مسئولیت در feature موجود salon-management هستند؛ هر دو از aggregate سالن می‌خوانند و ماژول/DB دوم ایجاد نشده است.

```text
backend/src/modules/salon-management/
  domain/
    publication.types.ts          # DTO مستقل از Nest/ORM، state و خطای آمادگی
    publication-policy.ts         # transition، readiness و normalizePersian
    catalog-query.ts              # ورودی محدود و cursor وابسته به فیلتر
  application/
    publication.service.ts        # ورودی سناریوهای انتشار و بررسی
    public-catalog.service.ts     # سناریوهای خواندن عمومی
    ports/publication-store.ts    # دو Port مستقل publication/public catalog
  infrastructure/persistence/
    business-write-transaction.ts # مسیر مالک/بررسی‌کننده، replay، قفل و invalidation
    postgres-publication-store.ts # درخواست/تصمیم/تاریخچه/خواندن خصوصی
    public-profile-query.ts       # یک projection صریح، snapshot یک statement
    postgres-public-catalog-store.ts # فهرست/مکان/صفحه‌بندی عمومی
  presentation/http/
    publication.controller.ts
    public-catalog.controller.ts
    dto/publication.dto.ts        # OpenAPI عمومی و خصوصی جدا
backend/src/database/reviewer-permission.ts # CLI محدود توسعه/تست
backend/drizzle/0004_reviewed_public_catalog.sql
frontend/src/features/
  public-catalog/{api,model,components,index.ts} # قرارداد، decoding، پول، پروفایل/ساعات مشترک
  discovery/{hooks,components}    # URL و server state، بدون داده نمونه runtime
  salon-management/
    api/publication.api.ts
    model/publication.types.ts
    components/publication/      # آمادگی، رضایت، سابقه و پیش‌نمایش مالک
  review/{api,components}         # capability gate، صف، جزئیات و فرم تصمیم
frontend/src/app/
  salons/[businessId]/            # server fetch no-store و 404 پیش از streaming
  review/[businessId]/           # مسیر خصوصی بررسی
  (management)/manage/[businessId]/{publication,preview}/
```

Controller فقط HTTP و Application را می‌شناسد؛ service سناریو را به Port واگذار می‌کند؛ adapter تراکنش/SQL را می‌داند و برای تصمیم از domain استفاده می‌کند. BusinessWriteTransaction مسیر مجوز reviewer صریح دارد؛ skipAuthorization وجود ندارد. مجوز پیش از replay و دوباره پس از قفل بررسی می‌شود.

Account route ورودی reviewer را با AccountScreen ترکیب می‌کند؛ identity مالک قابلیت review نیست. نمایش پروفایل مشترک، اجازه خواندن خصوصی نمی‌سازد. UI عمومی هیچ import از backend ندارد. fixtureهای قدیمی و مدارک فیگما تاریخی نگهداری شده‌اند و از runtime کشف import نمی‌شوند.
