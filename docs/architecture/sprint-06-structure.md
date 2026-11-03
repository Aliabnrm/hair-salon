# ساختار اجرایی اسپرینت۶

مرجع تصمیم [ADR-011](adr/ADR-011-schedule-only-availability.md). API و DB دوم ساخته نشده‌اند.

| مسیر در backend/src/modules/salon-management                        | مسئولیت                                                        |
| ------------------------------------------------------------------- | -------------------------------------------------------------- |
| domain/availability/availability.types.ts                           | ورودی snapshot، query، policy و DTO خالص                       |
| domain/availability/availability-query.ts                           | سقف روز، شکل query و سیاست از ساعت صریح                        |
| domain/availability/time-range.ts                                   | عملیات بازه، تاریخ محلی و تبدیل IANA با Temporal               |
| domain/availability/availability-policy.ts                          | override، اشتراک، مدت/بافر، کسر busy و اجتماع متخصصان          |
| application/availability/availability.service.ts                    | یک now، validation query، Reader و محاسبه؛ اعلام schedule_only |
| application/ports/{availability-reader,clock}.ts                    | دو مرز واقعی I/O و زمان                                        |
| infrastructure/persistence/postgres-availability-reader.ts          | یک SELECT همساز با tenant و eligibility صریح                   |
| infrastructure/time/system-clock.ts                                 | ساعت واقعی سرور                                                |
| presentation/http/{availability.controller,dto/availability.dto}.ts | مسیر عمومی، rate، allowlist خروجی و OpenAPI                    |

Module همان feature، Portها را به پیاده‌سازی وصل می‌کند. Domain فقط TypeScript و کتابخانه مستقل زمان را می‌شناسد؛ ORM/Nest/request وارد آن نشده‌اند. reuse `minute/clock/intersectIntervals`، منبع واحد معنای بازه جاری را نگه می‌دارد. busyها در engine روی محور UTC هستند و شامل بافر اشغال قبلی‌اند.

فرانت در `frontend/src/features/availability/` است:

- `api/availability.api.ts`: transport مشترک و runtime decoder؛ پاسخ موفق HTTP به‌تنهایی معتبر فرض نمی‌شود.
- `model/`: type، validation URL و گروه‌بندی ماه شمسی؛ محاسبه ظرفیت ندارد.
- `hooks/use-availability.ts`: intent در URL، policy سرور، درخواست، focus refresh و انتخاب ساعت محلی.
- `components/`: service/staff، روز، slot، خلاصه و صفحه ترکیب‌کننده؛ قانون دامنه داخل JSX نیست.
- `index.ts`: export محدود صفحه.

`app/salons/[businessId]/times/page.tsx` پروفایل عمومی را no-store و پیش از streaming می‌خواند؛ `params` به روش نصب‌شده Next await می‌شود. صفحه عمومی سالن لینک ورود را ترکیب می‌کند؛ component پروفایل مشترک برای preview خصوصی، دعوت عمومی تازه‌ای نگرفته است. helper نمایش/افزودن تاریخ، به `lib/format/local-date.ts` منتقل و از مسیر قبلی فرم‌ها re-export شد؛ رفتار قبلی حفظ شده است.

تست دامنه کنار کد است. تست HTTP و PG در backend/test و مسیر واقعی مرورگر در frontend/e2e/availability.spec.ts قرار دارند. Clock ثابت مرورگر فقط در entry زیر test/ جایگزین می‌شود؛ production آن را import نمی‌کند و env ساعت تست را نمی‌خواند. fixture مالک DB موقت، کپی frontend و processهاست و cleanup انجام می‌دهد.
