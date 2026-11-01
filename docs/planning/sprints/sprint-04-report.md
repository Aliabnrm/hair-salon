# گزارش اجرای اسپرینت ۴ — مدیریت خصوصی سالن

**نسخه فعلی:** MFA طبق دستور تازه کارفرما و [ADR-008](../../architecture/adr/ADR-008-remove-owner-mfa.md) حذف شده است. خروجی، اعداد تست و راهنمای MFA در بخش‌های اولیه پایین، سابقه تحویل قبل از حذف‌اند؛ مرجع نتیجه جاری بخش «اصلاح پس از تحویل — حذف MFA» انتهای همین سند است.

تاریخ: ۲۰۲۶-۱۱-۰۱؛ محدوده کامل ۴A و ۴B با درخواست صریح کارفرما اجرا شد. مرجع قرارداد [طرح](sprint-04-plan.md)، [پرامپت](../../prompts/sprint-04.md) و تصمیم [ADR-007](../../architecture/adr/ADR-007-private-salon-management.md) است. این گزارش نتیجه محلی را از وضعیت remote جدا ثبت می‌کند.

## خروجی واقعی

- **امنیت مالک:** احراز مجدد رمز؛ enrollment/confirmation عامل TOTP، secret رمزگذاری‌شده، recovery یک‌بارمصرف و assurance مستقل هر نشست با انقضای مطلق/idle. setup فارسی با ورود دستی Authenticator؛ بدون SMS/سرویس بیرونی.
- **سالن:** ساخت پیش‌نویس تک‌محل زنانه/مردانه و عضویت مالک اتمیک، فهرست سالن‌های خود و ویرایش مشخصات خصوصی؛ سقف سه سالن زیر قفل User.
- **خدمات:** ایجاد/ویرایش، قیمت صحیح ریال با UI تومان، مدت/بافر و آرشیو/فعال‌سازی؛ تخصیص تاریخی با آرشیو حذف نمی‌شود.
- **متخصص:** پروفایل بدون حساب/credential، فعال/غیرفعال‌سازی و تخصیص خدمات همان سالن؛ خدمت غیرفعال برای تخصیص تازه رد می‌شود.
- **برنامه:** جایگزینی اتمیک ساعت هفتگی سالن/متخصص، استراحت با فاصله بازه‌ها، تعطیلی/ساعت جایگزین روز خاص، ویرایش و رفع استثنا. UI تاریخ شمسی، API تاریخ ISO؛ بدون محاسبه slot.
- **صحت و تجربه:** owner authorization سروری و FK مرکب tenant، version/ETag، idempotency اتمیک، pagination، rate limit، audit پالایش‌شده، loading/empty/error/retry و حفظ قصد در قطع ارتباط. پنل mobile-first/RTL از tokenهای موجود استفاده می‌کند.

فایل‌های اصلی در [ساختار واقعی](../../architecture/sprint-04-structure.md) و [درس فارسی با مثال](../../learning/sprint-04.md) معرفی شده‌اند. migration افزایشی `backend/drizzle/0002_salon_management.sql` همراه journal/snapshot است؛ SQL/snapshotهای 0000 و0001 تغییر نکردند. روی دیتابیس توسعه همین دستگاه نیز migrator بدون reset با پیام `Database migrations applied.` موفق شد.

## مبنا و وضعیت Git

شاخه کار `feat/sprint-04-salon-management` از اسپرینت۳ روی `b80151c331e14b0e44b8e3ec3f9948e184b791fc` ساخته شد. بررسی مجدد remote: `origin/dev` هنوز `7360ce9` است. [PR #4](https://github.com/Aliabnrm/hair-salon/pull/4) برای ادغام اسپرینت۳ open، merged=false و blocked است؛ بررسی CI همان PR در مرحله whitespace شکست خورد و app checks آن اجرا نشدند.

دو اصلاح محلی پیشین در `docs/architecture/adr/ADR-006-pnpm-workspace.md` و `frontend/public/fonts/OFL.txt` فقط whitespace‌اند. کارفرما صریحاً commit/push آن اصلاح آماده را خود بر عهده گرفت؛ آن‌ها حفظ شدند. بعد از درخواست مجدد ادامه اسپرینت۴، توسعه از نتیجه موجود اسپرینت۳ ادامه یافت تا روی dev فاقد frontend اجرا نشود. این انحراف از ترتیب عادی شروع، پنهان نشده و dev دست‌کاری نشده است؛ پس از merge اسپرینت۳، مبنا/تعارض شاخه پیش از PR بعدی بررسی شود.

هیچ commit/push تازه، merge، deploy یا PR اسپرینت۴ انجام نشد. PR #4 مربوط به درخواست قبلی ادغام اسپرینت۳ است. CI remote اسپرینت۴ هنوز اجرا نشده؛ موفقیت محلی جای CI آخرین commit را نمی‌گیرد.

## بررسی واقعی

محیط: macOS ARM، Node24.22.2، pnpm12.16.1، PostgreSQL17.11 اختصاصی پروژه روی localhost:55432 و Google Chrome نصب‌شده. credential/کلید واقعی در گزارش نیست. runnerها از TEST_DATABASE_URL محافظت‌شده DB موقت می‌سازند؛ هیچ truncate/drop روی DB توسعه انجام نشد. تست مرورگر Next production، Nest و PostgreSQL واقعی را روی پورت‌های متعلق به اجرا بالا آورد و در finally بست. پس از بررسی نهایی، نمونه PostgreSQL پروژه که برای همین کار راه‌اندازی شده بود نیز تمیز متوقف شد؛ داده توسعه حفظ شد و سرویس در حال اجرا برای تحویل باقی نماند.

| فرمان/مرحله                          | نتیجه محلی                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`     | موفق؛ lockfile واحد و نصب تکرارپذیر                                                        |
| `pnpm run check`                     | موفق؛ build، typecheck، lint، format:check و همه سطوح تست                                  |
| backend unit                         | ۸۷ تست پاس                                                                                 |
| frontend unit                        | ۲۹ تست پاس                                                                                 |
| HTTP/Nest واقعی                      | ۵۰ تست پاس                                                                                 |
| PostgreSQL واقعی                     | ۳۷ تست پاس                                                                                 |
| مرورگر واقعی                         | ۲۰ تست پاس؛ discovery/identity قبلی و سه سناریوی مدیریت                                    |
| مجموع                                | **۲۲۳ تست پاس، صفر شکست/skip در check کامل**                                               |
| `pnpm run db:migrate` روی توسعه محلی | موفق و افزایشی؛ داده هویت قبلی حفظ شد                                                      |
| اجرای زنده API پس از migrate         | readiness200، مسیرهای خصوصی بدون نشست401 و OpenAPI200؛ فرایند متعلق به بررسی تمیز متوقف شد |
| `git diff --check`                   | موفق؛ فایل‌های tracked بررسی شدند؛ فایل‌های تازه نیز جدا برای whitespace بررسی شدند        |

فرمان کامل بررسی با مسیر ابزار محلی همین checkout (در clone دیگر Node/pnpm طبق README فراهم شوند):

```sh
export PATH="$PWD/work/tools/bin:$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PATH"
# TEST_DATABASE_URL باید مقصد اختصاصی تست مطابق README باشد؛ مقدار خصوصی اینجا ثبت نمی‌شود.
BACKEND_ORIGIN=http://127.0.0.1:3001 PLAYWRIGHT_CHANNEL=chrome pnpm run check
```

لاگ‌های محلی ignored در `work/sprint-04-check-delivery.log`، `work/sprint-04-install-frozen.log` و `work/sprint-04-development-migration.log` هستند؛ مدرک قابل انتقال، کد تست و اجرای مجدد scriptهاست. در اجرای ابتدایی، timeoutهای DB و شکست‌های وابسته دیده شدند؛ در اجرای مستقل و دو check کامل نهایی تکرار نشدند. آزمون rollback به fixture ناکامل truncate برخورد کرده بود و با پاکسازی جدول والد businesses در DB موقت اصلاح شد. دو شکست تست browser ناشی از locator مبهم بین alert فرم و Next route announcer بودند؛ locator بر پیام خطای واقعی محدود شد. فهرست مسیرهای آزمون Swagger با endpointهای تازه به‌روز شد؛ هیچ گیت یا تست قبلی حذف نشد.

## شواهد پذیرش

| معیار    | شاهد اجراشده                                                                                                                                                                                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S4-AC-01 | integration: MFA_REQUIRED، encryption، actor/session-bound grant/pending، expiry، rate، replay گام و recovery تحت رقابت و idle نشست؛ unit بردار RFC و AEAD؛ مرورگر setup واقعی                                         |
| S4-AC-02 | دو create هم‌کلید یک سالن/عضویت/audit/result؛ JSON با ترتیب کلید متفاوت همان نتیجه؛ trigger شکست عضویت بدون هیچ اثر باقی‌مانده؛ سقف سالن با کلید متفاوت هم‌زمان                                                        |
| S4-AC-03 | دو مالک/دو سالن: خواندن و child write خدمت/متخصص/ساعات/استثنا، cursor/filter tenant، FK مستقیم بین tenantها، replay پس از لغو عضویت؛ مرورگر URL سالن مالک دیگر                                                         |
| S4-AC-04 | پول/مدت/فیلد ناشناخته، missing428/stale409، ETag و دو PATCH یک نسخه؛ آرشیو/فعال‌سازی و تعارض واقعی فرم در مرورگر                                                                                                       |
| S4-AC-05 | پروفایل بدون user تازه، حفظ تخصیص آرشیوشده، رد تخصیص خدمت غیرفعال یا tenant دیگر؛ UNIQUE کلید تخصیص و validation UUIDها                                                                                                |
| S4-AC-06 | policy: overlap/adjacency/24:00/overnight/closed/intersection؛ integration: replace اتمیک، stale version، exclusion مستقیم و deferred exception consistency/unique؛ UI سالن و متخصص/تعطیلی                             |
| S4-AC-07 | fresh، upgrade از journal واقعی اسپرینت۲ و هویت seedشده اسپرینت۳، حفظ user/credential/session/hash journal و rerun بدون تغییر                                                                                          |
| S4-AC-08 | stack واقعی: MFA، سالن/خدمت/متخصص/برنامه/روز خاص و reload؛ validation/network retry بدون duplicate، نسخه کهنه، تغییر سالن، نشست منقضی و logout؛ عرض‌های۳۲۰/۳۶۰/۳۹۰/۱۲۸۰ بدون overflow و Tab/Shift+Tab کنترل‌های پایانی |
| S4-AC-09 | Origin، no-store و خطای امن؛ assertion نبود secret خام در DB/log؛ regression cookie/CSRF و اسکن bundle قبلی؛ secret/recovery setup قبل screenshot از DOM خارج‌اند                                                      |
| S4-AC-10 | check کامل، frozen، migration توسعه، اسناد API/data/security/structure/decision/plan و آموزش؛ بدون commit/push تازه                                                                                                    |

تصاویر local فقط داده ساختگی سالن را در `work/sprint-04-ui/` دارند. عرض۳۲۰/۳۹۰ بصری مرور شد؛ کنترل اصلی با کیبورد و اسکرول در۳۲۰ قابل دسترس است. این بررسی معادل audit کامل WCAG یا تست شبکه واقعی کاربران ایران نیست. پنل مالک طراحی تازه روی design system آراسته است؛ Figma مالک ارائه نشده است.

## محدودیت و خارج از محدوده

کشف عمومی fixture می‌ماند؛ draft منتشر/قابل رزرو نیست. availability، ظرفیت اشغال، رزرو، CRM، SMS، پرداخت، upload، دعوت/نقش‌های بیشتر، reset رمز و تغییر/بازیابی پشتیبانی عامل اجرا نشده‌اند. گم‌شدن عامل بدون recovery یا کلید سرور اکنون مسیر پشتیبانی ندارد؛ UI آن را اعلام می‌کند. پیش از پایلوت عمومی راستی‌آزمایی، چرخه بازیابی/کلید، trusted proxy و آزمون بار لازم‌اند. ادعای benchmark، deploy، RLS یا production readiness نداریم.

کلید MFA حاضر باید معتبر و مستقل باشد؛ کلید غایب فقط مسیر نیازمند آن را503 می‌کند. همه پاسخ‌های secretدار MFA از idempotency عمومی جدا هستند. schema SQL مکمل trigger/exclusion دارد که snapshot به‌تنهایی نشانش نمی‌دهد. قفل Business writeهای یک سالن را سری می‌کند؛ انتخاب ساده پایلوت است.

## امتحان دستی

۱. طبق README از مسیر Desktop، PostgreSQL پروژه، API و frontend را اجرا کنید؛ دو کلید خصوصی مستقل MFA تنظیم و migration را اجرا کنید. فایل env موجود را overwrite نکنید.
۲. ثبت‌نام ایمیل/رمز و ورود؛ `/account/security`، احراز دوباره رمز، ورود دستی کلید در Authenticator زمان‌محور، کد شش‌رقمی و ذخیره امن recovery codeها. setup پیامک/هزینه بیرونی ندارد.
۳. `/manage` → افزودن سالن → نام/نوع/شهر؛ سپس خدمت با۲۵۰٬۰۰۰تومان و۴۵دقیقه؛ متخصص و تخصیص آن خدمت؛ برای سالن و متخصص بازه شنبه ثبت کنید. در روزهای خاص تعطیلی شمسی بسازید و reload کنید.
۴. در دو تب، یک فرم نسخه مشترک را ویرایش کنید؛ ذخیره دوم باید تعارض نشان دهد. نسخه تازه را بخوانید و سپس تغییر تازه بدهید. آرشیو خدمت را نیز امتحان کنید؛ متخصص پاک نمی‌شود.
۵. با حساب دوم و MFA خودش، URL سالن اول را باز کنید؛ داده دیده نشود. خروج از حساب، صفحه مدیریت خصوصی را می‌بندد. نشست مدیریتی idle منقضی به تأیید مجدد عامل هدایت می‌کند.

## تحویل محلی و پیام پیشنهادی commit

۱۴۲ فایل شامل ۳۶ فایل tracked تغییرکرده و ۱۰۶ فایل تازه در تحویل بررسی شدند؛ تغییرها unstaged/محلی‌اند؛ backend/frontend، migration/lockfile و مستندات باید با هم مرور شوند. env، work، dist، .next، node_modules و خروجی browser وارد Git نشوند. دو whitespace fix قبلی با قابلیت تازه اشتباه گرفته نشوند. اصلاح تولیدشده next-env از build تغییر محصول نیست و برای تحویل به نسخه مبنا بازگردانده شد؛ typecheck آن جدا اجرا شد.

پس از مرور، کارفرما می‌تواند commitهای منسجم را به‌ترتیب بسازد؛ عنوان پیشنهادی اصلی:

```text
feat(salon-management): add secure private owner setup and scheduling
```

برای اصلاح CI اسپرینت۳، commit مستقل پیشنهادی:

```text
style: fix ADR and font license whitespace
```

PR اسپرینت۴ تنها پس از push کارفرما و دستور مربوط به dev ایجاد شود. اسپرینت۵ خودکار شروع نمی‌شود.

## اصلاح پس از تحویل — حذف MFA

در ۲۰۲۶-۱۱-۰۱، کارفرما حذف قابلیت را درخواست کرد. صفحه و APIهای MFA، setup/recovery/reauth، assurance، کلیدهای config و OTPAuth حذف شدند. مدیریت از SessionAuthGuard موجود و کاربر resolveشده استفاده می‌کند؛ نشست معتبر و مالکیت فعال همان سالن همچنان اجباری است. Origin، نرخ، audit، tenant، version/idempotency حفظ شدند. migration0003 فقط داده‌های اختصاصی عامل دوم را پاک می‌کند؛ migrationهای قبلی و اطلاعات اصلی تغییر نمی‌کنند.

پس از `git fetch origin`، dev همچنان روی7360ce9 بود. درخت شامل تغییرهای ثبت‌نشده اسپرینت۴ و قالب‌بندی است؛ برای حفظ آن‌ها شاخه موجود feat/sprint-04-salon-management ادامه یافت و checkout/pull روی dev انجام نشد. commit/push/PR/merge انجام نشد.

راهنمای جاری: ورود معمولی → `/manage` → ساخت یا ویرایش سالن. Authenticator و کد لازم نیستند. `/account/security` حذف شده و404 می‌دهد.

نتیجه بررسی تازه پس از حذف MFA:

- build هر دو workspace، typecheck، lint، format:check و نصب frozen موفق شدند. root check یک‌جا موفق نشد: ابتدا محیط اشتباه اجرای build اصلاح شد؛ سپس تست startup در اجرای موازی به مهلت۵ثانیه خورد. اجرای نهایی مستقل تمام۵۲تست HTTP با `pnpm --filter @hair-salon/api exec vitest run --config vitest.config.e2e.ts --maxWorkers=1` موفق بود.
- backend unit:۸۳؛ frontend unit:۲۹؛ HTTP:۵۲؛ PostgreSQL واقعی:۳۷؛ مجموع۲۰۱تست موفق. integration شامل مهاجرت داده MFA موجود، حفظ user/session/مالکیت، tenant، race، rollback و محدودیت نرخ مدیریت است.
- مرورگر:۱۷تست موفق، یک شکست به‌دلیل گذشتن ساخت Next آزمایشی از مهلت۹۰ثانیه، یک تست با توقف دستی اجرا interrupted و دو تست اجرا نشدند. بنابراین موفقیت کامل مرورگر یا check کامل ادعا نمی‌شود. مسیر ساخت سالن/خدمت/متخصص/ساعت/تعطیلی با ورود معمولی در بین تست‌های موفق بود. یک اجرای قبلی مرورگر نیز با توقف فرایندهای محیط نیمه‌تمام ماند.
- logهای ignored: `work/remove-mfa-check.log`، `work/remove-mfa-http.log`، `work/remove-mfa-integration.log`، `work/remove-mfa-browser.log`، `work/remove-mfa-install.log` و `work/remove-mfa-format.log`.
- migration0003 روی DB توسعه با پیام `Database migrations applied.` موفق شد؛ SQL و snapshotهای قبلی0000..0002 با snapshot پیش از تغییر مقایسه شدند و ثابت‌اند. فقط داده اختصاصی MFA حذف شد.
- اجرای زنده نهایی: frontend ساخته‌شده با `next start` روی localhost:3000، backend ساخته‌شده روی127.0.0.1:3001 و PG روی55432 فعال‌اند. GET `/` و `/manage` برابر200، readiness از proxy برابر200، مدیریت ناشناس401 و صفحه/API حذف‌شده404 بودند. این اجرا watch نیست؛ تغییر کد بعدی نیازمند build/restart متناسب است.
- وضعیت و diff محلی بررسی شدند و `git diff --check` موفق بود. تغییرهای تازه با تغییرهای ثبت‌نشده اسپرینت۴ و Prettier در همان شاخه باقی‌اند؛ هیچ commit/push/merge انجام نشد. snapshot منبع پیش از این اصلاح در `work/before-mfa-removal.tar.gz` ignored است و env خصوصی را شامل نمی‌شود.

پیام پیشنهادی commit این اصلاح: `refactor(auth): remove owner MFA and retain session-based salon access`.

## بازبینی پیش از ارسال اسپرینت ۴ به dev — ۲۰۲۶-۱۱-۰۱

کارفرما پس از تحویل محلی، صریحاً push اسپرینت۴ و merge آن به dev را درخواست کرد. این مجوز مربوط به همین بسته است و سیاست commit/push دستی در کارهای آینده را تغییر نمی‌دهد. بسته شامل مدیریت خصوصی سالن، حذف MFA طبق ADR-008، ریدیزاین حساب/مدیریت و اصلاح قالب‌بندی مشترک موجود است. اسپرینت۳ هنوز در dev نبود؛ commit پایه آن نیز وابستگی ضروری این PR است. main و اسپرینت۵ در دامنه این merge نیستند.

`pnpm run check` دوباره روی وضعیت واقعی بسته اجرا و با exit موفق تمام شد: backend unit۸۳، frontend unit۲۹، HTTP۵۲، PostgreSQL۳۷ و مرورگر۲۶؛ مجموع۲۲۷تست. build، typecheck، lint، format:check و `git diff --check` موفق‌اند. تست‌ها DB موقت مستقل ساختند؛ DB توسعه و حساب‌های کارفرما تغییر نکردند. بررسی الگوی کلید خصوصی/توکن در فایل‌های قابل نسخه‌بندی موردی پیدا نکرد؛ این بررسی جای ممیزی امنیت کامل نیست. comment بلااستفاده کلید MFA از env.example پاک شد؛ secret واقعی وارد بسته نشد.

در این نقطه CI remote نسخه تازه هنوز اجرا نشده بود؛ merge باید فقط پس از موفقیت check همان SHA و با حفظ محافظت dev انجام شود. نتیجه واقعی PR/CI/merge در به‌روزرسانی وضعیت برنامه اسپرینت‌ها ثبت می‌شود. نتیجه مرورگر محلی یا CI قبلی جای check نسخه ارسال‌شده نیست.

## اصلاح بررسی remote پیش از merge

بسته با commit `0ed242a` در [PR #5 به dev](https://github.com/Aliabnrm/hair-salon/pull/5) ارسال شد. [اجرای اول CI](https://github.com/Aliabnrm/hair-salon/actions/runs/41333118167) در تست reflow صفحه مدیریت با عرض۳۲۰ و متن۲۰۰٪ شکست خورد؛ ۲۵ تست مرورگر دیگر و بررسی‌های قبل از آن موفق بودند. موفقیت محلی به‌جای این شکست پذیرفته نشد و محافظت شاخه تغییر نکرد.

هدر مشترک خصوصی و انتخاب نوع سالن اجازه رفتن به سطر بعد گرفتند تا مجموع عرض متن، آیکن و فاصله‌ها از عرض موجود بیشتر نشود. همان assertion نبود سرریز حفظ شد؛ تست برای پوشش فضای scrollbar کلاسیک از `scrollbar-gutter: stable` استفاده می‌کند و در صورت شکست عناصر بیرون‌زده را گزارش می‌دهد. تست هدفمند تازه موفق شد. یک تلاش محلی پیش از آن هنگام ساخت محیط تست/اتصال cleanup به DB شکست محیطی داشت؛ نتیجه آن با موفقیت اجرای بعد مخلوط نمی‌شود. logها در `work/sprint-04-release/` ignored هستند. نتیجه check کامل نسخه اصلاح‌شده و CI نهایی در بخش پیگیری ادغام ثبت خواهد شد.

check کامل پس از اصلاح با exit۰ موفق شد: build/typecheck/lint/format، واحد۸۳+۲۹، HTTP۵۲، PostgreSQL۳۷ و مرورگر۲۶؛ مجموع۲۲۷. `git diff --check` نیز موفق است. خروجی تازه در `work/sprint-04-release/check-after-reflow.log` ثبت شد. تصاویر عادی که تنها تفاوت بایتی ناشی از ثبت مجدد داشتند وارد اصلاح نشدند؛ شاهد متن۲۰۰٪ در work باقی است.

در [اجرای دوم CI](https://github.com/Aliabnrm/hair-salon/actions/runs/41334519303)، تمام۳۷تست integration موفق بودند، ولی پس از پایان suite مدیریت، خطای asynchronous با کد57P01 ثبت شد؛ مرورگر در این اجرا شروع نشد. `pg-pool.end()` می‌تواند پیش از بسته‌شدن socket در سمت PostgreSQL برگردد و DROP FORCE اتصال در حال خاتمه را قطع کند. teardown همان suite اکنون با `vi.waitFor` و query روی `pg_stat_activity` بسته‌شدن اتصال‌های DB متعلق به خودش را حداکثر۵ثانیه انتظار و assert می‌کند؛ خطای غیرمنتظره نادیده گرفته نمی‌شود و تست/CI حذف نشده‌اند. تلاش میانی استفاده از `expect.poll` در afterAll با نسخه Vitest سازگار نبود و به `vi.waitFor` اصلاح شد. اجرای تازه تمام۳۷تست integration با exit۰ موفق شد؛ typecheck و lint بک‌اند نیز موفق بودند. منطق محصول در این اصلاح تغییر نکرد. log نهایی: `work/sprint-04-release/integration-drain-final.log`.
