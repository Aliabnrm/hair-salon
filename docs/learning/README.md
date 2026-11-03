# دفتر یادگیری پروژه

[درس اجرای محلی و Docker](local-docker.md): image/container، شبکه داخلی، migration، volume و تفاوت build/runtime با فایل‌های واقعی پروژه.

اسپرینت‌های ۱ تا ۵ اجرا و درس آن‌ها با ارجاع به کد و تست واقعی ثبت شد. درس‌های بعد هم پس از اجرای اسپرینت مرتبط اضافه می‌شوند.

| اسپرینت              | مفهوم‌ها                                                                    | وضعیت                                            |
| -------------------- | --------------------------------------------------------------------------- | ------------------------------------------------ |
| ۱                    | Module،Controller،Provider،Dependency Injection و lifecycle درخواست         | [درس مبتنی بر کد واقعی](sprint-01.md)؛ تکمیل‌شده |
| ۲                    | schema،migration،Pool،Port و liveness/readiness؛ معرفی FK/index/transaction | [درس مبتنی بر کد واقعی](sprint-02.md)            |
| ۳                    | رابط فیگما، domain/feature، هویت ایمیل/رمز، cookie/session، CSRF و race     | [درس مبتنی بر کد واقعی](sprint-03.md)            |
| ۴                    | tenant/permission، version، idempotency و transaction مدیریت                | [درس مبتنی بر کد واقعی](sprint-04.md)            |
| ۵                    | انتشار بررسی‌شده، revision، projection عمومی، cursor و URL state            | [درس مبتنی بر کد واقعی](sprint-05.md)            |
| تغییر ابزار          | pnpm workspace، lockfile، dependency resolution و نصب frozen                | [درس مهاجرت مدیر بسته](pnpm-migration.md)        |
| ریدیزاین حساب/مدیریت | فرم مشترک، state محلی/سرور، dirty، version، retry و دسترس‌پذیری             | [درس ریدیزاین](account-management-redesign.md)   |
| بعدی                 | permission/tenant، رزرو، idempotency، state machine و outbox                | فقط همراه قابلیت مصوب مرتبط                      |

قالب هر درس: مسئله واقعی، توضیح ساده، فایل و مسیر اجرا، دلیل تصمیم و trade-off، خطای رایج، آزمون اثبات رفتار و تمرین اختیاری کوتاه. توضیح باید بگوید این ابزار چه مسئله‌ای را حل می‌کند و چه چیزی را به‌تنهایی تضمین نمی‌کند. نام الگو به‌تنهایی توضیح نیست.
