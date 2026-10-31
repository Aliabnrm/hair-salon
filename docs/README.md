# راهنمای مستندات پلتفرم رزرو آرایشگاه و سالن
نسخه ۰٫۳ — ۲۰۲۶-۱۰-۲۹ — مستندات منتقل‌شده به hair-salon؛ NestJS برای بک‌اند انتخاب شده؛ اجرای هر اسپرینت تابع تأیید طرح همان اسپرینت است.

## وضعیت مخزن جاری
پوشه hair-salon در شروع خالی بود و مستندات قبلی به آن منتقل شدند؛ docs/ همین پروژه مرجع جاری است و نسخه کشف اولیه تاریخی محسوب می‌شود. اکنون اسپرینت ۱ طبق [پرامپت اجرایی](prompts/sprint-01.md) اجرا شده: API در apps/api (از اسپرینت ۳ منتقل‌شده به backend)، lockfile ریشه، بررسی‌ها و آموزش آماده‌اند. [گزارش اجرا](planning/sprints/sprint-01-report.md)، [درس](learning/sprint-01.md) و [اجرای محلی](../README.md) نقطه شروع فعلی‌اند. پایه PostgreSQL، migration و readiness در اسپرینت ۲ با تست واقعی اضافه شدند؛ [گزارش](planning/sprints/sprint-02-report.md) و [درس](learning/sprint-02.md) مرجع نتیجه‌اند.

مرور فعلی را از [روش همکاری](planning/collaboration-workflow.md)، [برنامه اسپرینت‌ها](planning/sprint-plan.md) و [طرح اسپرینت ۱](planning/sprints/sprint-01-plan.md) آغاز کنید. [دفتر یادگیری](learning/README.md) پس از هر اسپرینت با کد واقعی تکمیل می‌شود.

اکنون محدوده اسپرینت ۲ و روند Git/PR تأیید شده‌اند؛ [طرح اسپرینت ۲](planning/sprints/sprint-02-plan.md)، [پرامپت](prompts/sprint-02.md)، [ADR-004](architecture/adr/ADR-004-database-foundation.md) و [روند Git](engineering/git-workflow.md) آماده‌اند. اسپرینت ۲ اجرا شده؛ نتیجه check، PostgreSQL محلی و CI به‌طور جدا در گزارش ثبت شده‌اند.

## مراجع اجرای اسپرینت‌ها
[روش ساخت پرامپت‌های بعدی](prompts/README.md) و [پرامپت آماده اسپرینت ۱](prompts/sprint-01.md).
[AGENTS.md](../AGENTS.md) راهنمای کوتاه عامل؛ [سازمان‌دهی کد](architecture/adr/ADR-002-code-organization.md)،[ابزار اسپرینت ۱](architecture/adr/ADR-003-sprint-01-tooling.md)،[ساختار فایل‌ها](architecture/codebase-structure.md)،[استاندارد بک‌اند](engineering/backend-standards.md)،[استاندارد فرانت](engineering/frontend-standards.md)،[کیفیت و تحویل](engineering/quality-gates.md) و [منابع بررسی‌شده](references/engineering-sources.md).

این اسناد یک مرجع برای هر مفهوم دارند؛ پرامپت اسپرینت فقط context لازم و معیارهای همان کار را ارجاع می‌دهد. آماده‌شدن prompt به معنی اجرای برنامه یا بسته‌شدن تمام سؤال‌های محصول نیست.

## نتیجه تاریخی بررسی محیط (مرحله صفر)
پوشه کاری در شروع فقط work/ و outputs/ خالی داشت؛ کد، README، فایل وابستگی، مستند قبلی یا پوشه .git وجود نداشت. فایل AGENTS.md در پوشه پروژه و مسیرهای والد بررسی‌شده یافت نشد. بنابراین فناوری، conventions، CI، schema یا تصمیم قبلی قابل استخراج نبود. هیچ نرم‌افزار، پکیج، migration یا سرویس خارجی تغییر نکرده است؛ فقط مستندات و فایل‌های واسط تولید/بررسی سند در work/ ایجاد شده‌اند.

## وضعیت جاری
- قطعی از کارفرما: ایران، مخاطب ایرانی، مستندات فارسی، هر دو گروه مردانه و زنانه؛ سپس NestJS و همکاری کارفرما/دستیار با هدف یادگیری انتخاب شد. طرح هر اسپرینت پیش از پرامپت اجرایی و کدنویسی باید تأیید شود.
- پاسخ کارفرما: شهر «فعلاً قطعی نیست» و «فعلاً رایگان». جزئیات هزینه پلتفرم در برابر هزینه خدمت و نیاز بیعانه هنوز باز است؛ طرح موقت بدون دریافت وجه در سامانه است و خدمات سالن رایگان فرض نمی‌شوند.
- پیشنهاد نیازمند تأیید: فارسی/RTL و شمسی، تومان نمایشی/ریال ذخیره، Asia/Tehran، وب واکنش‌گرا، یک محل و تیم کوچک، یک خدمت پیوسته و یک متخصص/رزرو است. NestJS/TypeScript، PostgreSQL/Drizzle و فرانت مستقل Next.js/React در اسپرینت‌های ۱ تا ۳ اجرا شده‌اند؛ طرح قبلی Next.js full-stack جایگزین شده است.
- شرط مهم: انتخاب هر دو گروه به معنای حل خدمات چندمرحله‌ای، دستگاه و اتاق مشترک نیست؛ Q-15 پیش از تأیید فنی باید حل شود.

ترتیب مرور: vision → mvp-scope → open-questions → functional/non-functional → domain/data/API → implementation-plan. در صورت اختلاف، ابتدا دفتر تصمیم‌ها بررسی و سندهای متأثر با هم اصلاح شوند؛ هیچ پیش‌فرضی جانشین تأیید کارفرما نیست.

## فهرست کامل
| حوزه | اسناد و مسئولیت |
|---|---|
| محصول | [چشم‌انداز](product/vision.md)، [تحلیل رقبا](product/competitor-analysis.md)، [کاربران و مجوزها](product/personas-and-permissions.md)، [PRD](product/prd.md)، [محدوده MVP](product/mvp-scope.md)، [داستان‌ها](product/user-stories.md)، [جریان‌ها](product/user-flows.md)، [سؤالات باز](product/open-questions.md)، [فرضیات و تصمیم‌ها](product/assumptions-and-decisions.md) |
| نیازمندی | [عملکردی](requirements/functional-requirements.md)، [غیرعملکردی](requirements/non-functional-requirements.md)، [معیار پذیرش](requirements/acceptance-criteria.md)، [ردیابی](requirements/traceability-matrix.md) |
| معماری | [زمینه سامانه](architecture/system-context.md)، [نمای معماری](architecture/architecture-overview.md)، [دامنه و چرخه رزرو](architecture/domain-model.md)، [داده و ERD](architecture/data-model.md)، [API](architecture/api-contracts.md)، [امنیت و حریم خصوصی](architecture/security-and-privacy.md)، [آزمون](architecture/testing-strategy.md)، [عملیات](architecture/operations-and-deployment.md)، [ADR انتخاب فناوری](architecture/adr/ADR-001-technology-selection.md) |
| برنامه | [نقشه راه](planning/roadmap.md)، [برش‌های توسعه](planning/implementation-plan.md)، [ریسک‌ها](planning/risks-and-mitigations.md) |

مرجع واحد تصمیم، assumptions-and-decisions؛ اولویت قابلیت، mvp-scope؛ قواعد زمان و چرخه، domain-model؛ ستون و قید، data-model؛ متن معیار آزمون، acceptance-criteria؛ عدد عملکردی، non-functional؛ endpoint، api-contracts. سایر فایل‌ها به این مراجع لینک می‌دهند و جایگزین آن‌ها نیستند.

## شواهد و محدودیت
در تاریخ جلسه، صفحه رسمی Treatwell با HTTP 200 بررسی شد؛ صفحات رسمی Booksy/Fresha/SQUIRE و مسیرهای جایگزین انتخاب‌شده HTTP 403 دادند. قابلیت‌های تأییدنشده با برچسب سرنخ مشخص شده‌اند. منابع حقوقی و تأمین‌کنندگان ایران هنوز بررسی تخصصی نشده‌اند؛ دسترسی این محیط معیار دسترسی کاربران داخل ایران نیست.

معیارهای پذیرش محصول و تست‌های قابلیت‌های آینده برنامه‌اند؛ نتایج واقعی اسپرینت‌های ۱/۲/۳ در گزارش همان اسپرینت ثبت شده‌اند. کشف و MVP کامل/تأییدشده محسوب نمی‌شوند. تغییرات مهم باید شناسه تصمیم، علت، اثر بر FR/API/data/tests و وضعیت تأیید داشته باشند.

## نتیجه اجرای اسپرینت ۳

[طرح](planning/sprints/sprint-03-plan.md) و [پرامپت](prompts/sprint-03.md) با دستور کارفرما اجرا شدند: کد backend/frontend، کشف نمونه آراسته و حساب واقعی ایمیل/رمز. [گزارش](planning/sprints/sprint-03-report.md)، [درس](learning/sprint-03.md)، [ساختار](architecture/sprint-03-structure.md)، [ADR-005](architecture/adr/ADR-005-frontend-backend-layout.md) و [شواهد فیگما](references/sprint-03-figma.md) نقطه شروع مرورند. commit/push با کارفرما و اسپرینت بعد آغاز نشده است.

## مدیر بسته جاری

طبق دستور کارفرما در ۲۰۲۶-۱۰-۳۱، پروژه از pnpm و یک pnpm-lock.yaml ریشه استفاده می‌کند. [ADR-006](architecture/adr/ADR-006-pnpm-workspace.md)، [درس مهاجرت](learning/pnpm-migration.md) و [README](../README.md) مرجع فرمان‌های جاری‌اند؛ نتایج npm در گزارش‌های قبلی تاریخی‌اند.
