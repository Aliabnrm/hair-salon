# استاندارد فرانت‌اند و Design System
فرانت در `frontend/` با Next.js App Router/React/TypeScript strict ساخته شده است. [ADR-005](../architecture/adr/ADR-005-frontend-backend-layout.md)، [ساختار واقعی](../architecture/sprint-03-structure.md) و [شاهد طراحی](../references/sprint-03-figma.md) مرجع‌اند. CSS با Tailwind 4 و tokenهای منبع Make، نشست با SessionProvider و داده کشف با fixture مشخص مدیریت می‌شود.

## جداسازی UI و منطق
route/page ترکیب‌کننده صفحه و boundary داده است. component مسئول بخش معنادار UI و تعامل محلی باشد؛ rules رزرو،تبدیل داده و API client در JSX پخش نشوند. component با چند نقش به container کوچک و اجزای معنادار شکسته شود. renderXهای تو در تو را به component مستقل تبدیل کنیم، نه تابع‌های داخلی طولانی.

custom hook برای stateful behavior و orchestration رابط است، مانند useBookingSelection؛ تابع خالص برای محاسبه بدون React، مانند formatToman. هر تابع hook نیست و هر fetch نیازمند wrapper اختصاصی تازه نیست. hook نباید JSX بسازد یا صحت نهایی رزرو را جایگزین سرور کند. component کوچک با state محلی ساده می‌تواند همان state را نگه دارد.

در هر feature، api مسئول درخواست و mapping قرارداد، hooks مسئول stateful behavior و components مسئول نمایش‌اند. API client پیکربندی‌شده مشترک، و declarations مرتبط در feature؛ دریافت/تغییر مستقیم API در چند component تکرار نشود. خطا و query key و mutation مرتبط یک محل روشن داشته باشند. entity پایگاه داده و secrets بک‌اند به فرانت export نشوند؛ قرارداد شبکه مرجع ارتباط است.

## state و تکرار
server state،state فرم و state انتخاب UI جدا تشخیص داده شوند. کپی پاسخ API در global store بدون نیاز ساخته نشود. URL برای فیلتر قابل اشتراک، state محلی برای تعامل محدود و query cache برای داده شبکه در صورت انتخاب ابزار مناسب. در Next.js اگر انتخاب شد، server/client boundary و hydration رعایت شود؛ هر صفحه با use client سراسری آغاز نشود.

اشتراک بعد از نیاز واقعی: Button یا FormField مشترک در design system؛ یک card با ده‌ها flag برای همه حالت‌های نامرتبط نسازیم. componentهای مشابه را بر اساس مسئولیت/رفتار استخراج کنیم. context عمومی یا props زیاد، نشانه بررسی composition و جای state است. memo/useMemo/useCallback برای همه چیز اضافه نشود؛ نیاز یا اندازه‌گیری باید دلیل باشد.

## اندازه و خوانایی
جزء با مسئولیت واحد و نام روشن؛ تعداد خط معیار review است نه هدف معماری. حدود ۲۰۰ خط منطق/JSX دست‌نویس در یک component یا چندین شرط ترکیبی باید به بررسی جداسازی منجر شود، نه شکستن مکانیکی. خط‌های داده،token و کد تولیدشده از این شاخص جدا هستند. به جای فایل همه‌کاره مانند App.tsx، ویژگی‌ها و اجزای قابل نام‌گذاری بسازیم.

## Design System و تجربه ایران
tokenهای رنگ،تایپوگرافی،spacing،radius و motion یک مرجع داشته باشند؛ مقدارهای پراکنده هاردکد نشوند. design system دارای stateهای default/focus/disabled/loading/error/selected باشد. component از primitive دسترس‌پذیر و منطبق با طراحی واقعی استفاده کند؛ ظاهر آخرین prototype پس از تحویل فایل بررسی و پذیرش می‌شود، نه از اسکرین‌شات حدس زده شود.

فارسی/RTL،CSS logical properties،شمسی و روز هفته،تومان با واحد،LTR درست برای شماره و OTP،فونت فارسی مجاز و بارگیری مناسب. تست روی عرض ۳۶۰/۳۹۰/۴۳۰ و بدون حذف عملیات اصلی در ۳۲۰؛ safe-area،صفحه‌کلید،focus،کنتراست و هدف لمس مناسب. دسترس‌پذیری صرفاً ویژگی کتابخانه نیست و باید بررسی شود.

تأیید رزرو فقط با پاسخ معتبر سرور؛ در timeout کلید قبلی و امکان بررسی نتیجه حفظ شود. loading/empty/error و slot پرشده برای هر مسیر داده طراحی شوند. optimistic update رزرو نباید موفقیت قطعی جعلی بسازد. یادداشت خصوصی سالن در UI عمومی نرود؛ داده نمونه و امتیازهای ساختگی وارد داده واقعی نشوند.

## آزمون و مستند
تست رفتار کاربر،flow اصلی و شکست مهم؛ به جای snapshot حجیم یا mock جزئیات implementation. اجزای design system در اسپرینت مربوط catalog یا Storybook می‌گیرند؛ ابزار بدون component واقعی نصب نمی‌شود. تغییر contract،state یا token باید سند/تست مرتبط را به‌روز کند. منبع الهام و دامنه اقتباس در engineering-sources ثبت شده است.
