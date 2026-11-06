# ADR-015 — نتیجه مراجعه و مسدودی در دفتر ظرفیت مشترک

۲۰۲۶-۱۱-۰۶؛ مصوب در اسپرینت۹.

Appointment وضعیت completed/no_show می‌گیرد؛ رویدادهای outcome/corrected قبل/بعد وضعیت و دلیل را نگه می‌دارند. اصلاح نتیجه با بازگشت به confirmed یا نتیجه مجاز ممکن است؛ cancelled پایانی است. پایان زمان خودکار نتیجه نیست. allocation برای نتیجه و اصلاح دست‌نخورده می‌ماند؛ زمان گذشته/عدم حضور به‌طور ضمنی ظرفیت قابل فروش تولید نمی‌کند.

ScheduleBlock در همان feature bookings است؛ allocation دقیقاً به یک appointment یا block متصل می‌شود. PK مستقل allocation و unique nullable روی هر منبع، FK مرکب tenant، check XOR و exclusion مشترک داریم. constraint triggerهای deferred، ledger هر منبع را هنگام commit بررسی می‌کنند. شناسه‌های قدیمی نوبت، allocation و تاریخچه حفظ می‌شوند. کلیدهای booking_writes نیز دقیقاً یک منبع دارند و replay وضعیت فعلی را می‌خواند.

قفل و authorization مشترک BookingTransaction برای outcome/block reuse می‌شوند؛ readهای دفتر در snapshot سازگار، بازه حداکثر۷روز و pagination محدود دارند. دلایل مسدودی خصوصی مالک‌اند؛ availability عمومی فقط occupied range را می‌خواند. حساب متخصص/پذیرش اضافه نمی‌شود.
