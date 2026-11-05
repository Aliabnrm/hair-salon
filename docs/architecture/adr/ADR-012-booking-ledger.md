# ADR-012 — چرخه نوبت و دفتر اشغال

وضعیت: پذیرفته‌شده در محدوده اسپرینت۷، ۲۰۲۶-۱۱-۰۴.

bookings مالک Appointment، allocation، event و idempotency است. salon-management مالک کاتالوگ/برنامه است. مرز public.ts صرفاً دامنه و Clock و persistence-contract.ts صرفاً قرارداد خواندن برنامه در transaction موجود است؛ چرخه Nest module نداریم. Clock از SalonManagementModule صادر می‌شود.

هر ایجاد/لغو و تغییر تنظیمات، Business row را به ترتیب واحد قفل می‌کند. ثبت آنلاین برای published و دستی برای سالن دارای برنامه معتبر مجاز است. عملیات رزرو انتشار را تغییر نمی‌دهند. دامنه یک موتور زمان مشترک دارد؛ busy در همان statement با برنامه خوانده می‌شود و شکست I/O به ظرفیت خالی تبدیل نمی‌شود.

Appointment، allocation با range نیمه‌باز شامل بافر، event و مرجع idempotency در یک commit هستند. exclusion GiST و deferred constraint trigger مانع overlap و ledger ناقص می‌شوند. snapshot و هویت/زمان ثابت‌اند؛ فقط confirmed→cancelled با افزایش نسخه مجاز است. fingerprint و مرجع resource تا عمر رکورد حفظ و replay با مجوز دوباره وضعیت جاری را می‌خواند؛ داده تماس در cache دوم کپی نمی‌شود.

برای تنظیمات، رزروهای confirmed جاری/آینده بعد از mutation و قبل commit با ساعت مؤثر و تخصیص متخصص دوباره تطبیق داده می‌شوند. تغییر قیمت/آرشیو خدمت snapshot قبلی را تغییر نمی‌دهد. هزینه این انتخاب: سری‌شدن writeهای یک سالن؛ بهینه‌سازی قفل فقط بعد از سنجش انجام می‌شود. Redis، queue، outbox و microservice نیاز این برش نیستند.
