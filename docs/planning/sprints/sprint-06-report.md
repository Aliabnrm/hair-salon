# گزارش اجرای اسپرینت۶ — انتخاب خدمت و زمان‌های پیشنهادی

وضعیت: اجرا و بررسی محلی کامل؛ ۳۰۶ تست موفق.

تاریخ اجرا: ۲۰۲۶-۱۱-۰۳؛ محل: `/Users/a.abnar/Desktop/hair-salon`. مبنای کد `308bf67` پس از ادغام PR #6 در dev؛ شاخه اجرای محلی `feat/sprint-06-availability`.

## نتیجه قابل مشاهده

از صفحه عمومی سالن منتشرشده، «بررسی زمان‌ها» به `/salons/<businessId>/times` می‌رود. مشتری ناشناس خدمت، متخصص مشخص یا اولین متخصص آزاد، روز شمسی و ساعت را انتخاب و خلاصه قیمت/مدت/شروع/پایان را می‌بیند. خدمت/متخصص/روز در URL حفظ و با reload/back/forward بازیابی می‌شوند. روز تعطیل، loading، خرابی شبکه و انتخاب غیرعمومی حالت‌های متفاوت دارند؛ خطا و refresh اجازه انتخاب داده کهنه نمی‌دهند. focus و دریافت دستی دوباره به داده زنده وصل‌اند.

این برش **رزرو ثبت نمی‌کند**: schedule_only، booking_enabled=false و متن روشن رابط وجود دارند؛ hold، موفقیت رزرو، کد پیگیری، پرداخت و دفتر اشغال ساخته نشده‌اند. ورود ایمیل/رمز و سیاست انتشار۵ حفظ شده‌اند. اسپرینت۷ آغاز نشده است.

## کد و دلیل جداسازی

- `backend/src/modules/salon-management/domain/availability/`: قواعد خالص برنامه مؤثر، اشتراک، بازه پیوسته، بافر، busy ورودی، any و سیاست زمان. گام۱۵ بر نیمه‌شب محلی؛ فاصله۶۰ از now سرور؛ افق۳۰روز محلی؛ query هفت‌روز. مدت لازم نیست مضرب۱۵ باشد.
- `application/availability/availability.service.ts`: یک Clock، query، Reader و محاسبه؛ mapping صریح نبود occupancy در baseline. خطای I/O به busy خالی تبدیل نمی‌شود.
- `infrastructure/persistence/postgres-availability-reader.ts`: انتشار/خدمت/بافر/تخصیص/برنامه و استثناها از یک SELECT و یک snapshot؛ همه scopeها به tenant مقیدند. DTO خروجی شامل اطلاعات خصوصی/بافر/دلیل نیست.
- `presentation/http/availability.controller.ts` و DTO: API عمومی، no-store، quota۱۸۰ catalog و۶۰ availability، خطای422/404/429/503 امن، Retry-After، OpenAPI و مثال معتبر. رخداد خطای زیرساخت فقط metadata امن ثبت می‌کند.
- `frontend/src/features/availability/`: transport و decoding، URL/model خالص، hook هماهنگ‌کننده و componentهای خدمت/متخصص، تقویم، slot و خلاصه. component صفحه۱۳۹خط و hook۱۰۶خط هنگام بازبینی بودند؛ قوانین ظرفیت در JSX تکرار نشده‌اند.
- `frontend/src/lib/format/local-date.ts`: helper تاریخ موجود با حفظ re-export مسیر فرم‌ها مشترک شد؛ formatter دقیق قیمت موجود reuse شد و صفر واقعی حفظ می‌شود. allowlist مسیر HTTP فقط برای endpoint جدید گسترش یافت.

تصمیم و جهت import در [ADR-011](../../architecture/adr/ADR-011-schedule-only-availability.md) و [ساختار۶](../../architecture/sprint-06-structure.md)، شرح ساده با مثال در [درس۶](../../learning/sprint-06.md) ثبت‌اند. ابزار timezone فقط `@js-temporal/polyfill@0.5.1` در backend و dependency گذرای JSBI است؛ native Temporal در Node24.22.2 این محیط موجود نبود. نسخه‌های قبلی ارتقا داده نشدند. قواعد gap/fold و transition تاریخی با ساعت کنترل‌شده آزموده شدند.

## اجرای بررسی‌ها

محیط واقعی: macOS/Node24.22.2، pnpm12.16.1، PostgreSQL17.11 میزبان و Chrome نصب‌شده از طریق `PLAYWRIGHT_CHANNEL=chrome`. URL اختصاصی تست از env خصوصی خوانده شد و در خروجی/سند منتشر نشده است. fixtureها DB UUID مستقل، API واقعی و کپی مستقل build فرانت با مقصد API همان fixture دارند.

`pnpm install --frozen-lockfile` موفق بود؛ lockfile همسان ماند. فرمان نهایی `pnpm run check` با PostgreSQL و Chrome اجرا شد؛ خروجی آخر در `work/sprint-06-run-check.log` است. فرمان با exit code صفر تمام شد؛ مجموع۳۰۶تست موفق و هیچ skipped/failed در اجرای نهایی نبود. پس از آن فقط اسناد نتیجه/وضعیت تکمیل و format:check دوباره اجرا شد.

| بررسی                                                | نتیجه ثبت‌شده                         |
| ---------------------------------------------------- | ------------------------------------- |
| build هر دو workspace، route پویا و TypeScript       | موفق                                  |
| typecheck، lint بدون mutation، format:check کل پروژه | موفق                                  |
| unit backend                                         | ۱۱۱ موفق                              |
| unit frontend                                        | ۴۰ موفق                               |
| HTTP/Nest/OpenAPI                                    | ۵۵ موفق                               |
| integration PostgreSQL واقعی                         | ۶۵ موفق                               |
| مرورگر واقعی                                         | ۳۵ موفق با Next/Nest/PostgreSQL واقعی |

تست‌های اضافه‌شده۶، مرز بافر/استراحت/مجاورت/نیمه‌باز، exact۶۰دقیقه، افق،۲۴:۰۰، any/count و ترتیب ورودی، busy و DST تاریخی، query تزریقی/تکراری، tenant/متخصص مخفی، تعطیلی/override/deleted، عدم write محصول، quota و خرابی واقعی DB را پوشش می‌دهند. تست race با قفل جدول تست، Reader را هنگام commit تغییر مدت و توقف انتشار نگه می‌دارد؛ پاسخ قدیمی منسجم یا404 مجاز و درخواست بعد commit404 الزامی است.

تست مرورگر موفقیت را mock نمی‌کند. مسیر عمومی واقعی، انتخاب/خلاصه، صفر قیمت و مدت۱۷، reset انتخاب ناسازگار، reload/back/forward، قطع شبکه/retry، پاسخ دیررس، unpublish و حدود تاریخ بررسی می‌شوند. entry ساعت ثابت فقط زیر `backend/test/fixtures/` است؛ production هیچ clock آزمایشی یا env آن را نمی‌خواند. آزمون نیمه‌شب، مرورگر با timezone لس‌آنجلس و سرور ساعت۰۰:۰۱تهران دارد. عرض‌های۳۲۰/۳۶۰/۳۹۰/۴۳۰/۷۶۸/۱۴۴۰، اهداف لمس حداقل۴۴، صفحه‌کلید/focus، متن۲۰۰٪ و reduced-motion بررسی شدند؛ در عرض۳۲۰، تقویم برای حفظ هدف لمس ناحیه اسکرول افقی داخلی دارد و سند صفحه overflow ندارد. این بررسی، audit کامل WCAG نیست.

شاهد تصویری جدید زیر `work/sprint-06-mobile-200-percent.png` است؛ مشاهده بصری انجام شد و عملیات پایین صفحه بالای نوار AppShell باقی بود. تصاویر تاریخی مستندات بازنویسی نشدند.

## شکست‌های پیدا و اصلاح‌شده

در بررسی اولیه، دو انتظار unit با بافر انتهایی fixture ناسازگار بودند؛ مثال صحیح فقط۱۰:۱۵ را در برنامه۱۰تا۱۱ می‌گنجاند. سه fixture PostgreSQL باید قید current_request_id و transaction استثنای باز با intervalهایش را رعایت می‌کردند؛ اصلاح شدند. هیچ قید DB یا assertion قبلی حذف نشد.

اجرای اول مرورگر به labelهای wrapشده و انتخاب role=alert عمومیِ شامل announcer خود Next برخورد کرد؛ label صریح و locator مخصوص alert محصول اصلاح شدند. assertion تاریخ نهایی باید منتظر پاسخ همان تاریخ باشد؛ assertion فوری، slot روز قبلی را قبل از اتمام انتقال می‌دید. آزمون اکنون تاریخ UTC slot تازه را صریح انتظار می‌کشد. full check یک وابستگی ConsoleLogger ثبت‌نشده را هم پیدا کرد؛ provider محلی feature اضافه و boot واقعی دوباره بررسی شد. نتیجه نهایی فقط از اجرای کامل پس از این اصلاح‌ها گرفته می‌شود.

## اصلاح CI هنگام انتقال به GitHub

اجرای اول [PR #8](https://github.com/Aliabnrm/hair-salon/pull/8) در job کیفیت پس از موفقیت۶۴تست PostgreSQL، با خطای خارج از assertion به کد `57P01` شکست خورد؛ Docker smoke همان اجرا موفق بود. پاک‌سازی DB موقت با `DROP DATABASE ... WITH (FORCE)` می‌توانست قبل از مشاهده بسته‌شدن socket در PostgreSQL، اتصال در حال پایان را قطع کند؛ موفقیت محلی قبلی این race را رد نمی‌کرد.

helper مشترک `backend/test/helpers/test-database.ts` اکنون با deadline پنج‌ثانیه، نبود اتصال به همان DB تولیدشده را از `pg_stat_activity` بررسی می‌کند و سپس بدون FORCE حذف می‌کند. اتصال باقی‌مانده باعث شکست صریح cleanup می‌شود؛ خطا نادیده گرفته نمی‌شود و guard مقصد محلی تست حفظ شده است. تست واقعی جدید در `backend/test/test-database.integration-spec.ts` ثابت می‌کند client موجود هنگام آغاز cleanup هنوز query موفق دارد و پس از disconnect، DB واقعاً حذف شده است. بررسی متمرکز migration و cleanup،۷تست موفق داشت. پس از اصلاح، `pnpm run check` کامل دوباره با exit code صفر و۳۰۶تست موفق شامل۶۵تست PostgreSQL و۳۵تست مرورگر تمام شد؛ جدول این گزارش نتیجه همین اجرای تازه است. پس از ثبت نتیجه فقط format:check و diff check تکرار شدند.

در CI [PR همگام‌سازی #11](https://github.com/Aliabnrm/hair-salon/pull/11)، تمام تست‌های PostgreSQL موفق شدند؛ آزمون مرورگر انتشار هنگام ویرایش قیمت خدمت شکست خورد. حالت با نگه‌داشتن موقت درخواست واقعی دسته‌بندی‌ها بازتولید شد: ذخیره پیش از رسیدن گزینه‌های select اجباری فعال بود و اعتبارسنجی بومی مرورگر می‌توانست submit را متوقف کند. `ServiceEditor` اکنون دکمه و submit را تا آماده‌شدن دسته‌بندی‌ها متوقف می‌کند. آزمون موجود انتشار، تأخیر کنترل‌شده همان درخواست، غیرفعال‌بودن ذخیره، حفظ دسته قبلی پس از دریافت و ذخیره موفق قیمت را بررسی می‌کند؛ پاسخ موفق mock نشده و assertion عمومی‌شدن/خارج‌شدن از انتشار حفظ شده است. آزمون تأخیر شبکه پیش از اصلاح با دکمه enabled شکست خورد و پس از اصلاح موفق شد؛ پس از آن check کامل دوباره با۳۰۶تست موفق و exit code صفر پایان یافت. این PR علاوه بر اصلاح، ancestry ادغام قبلی main را برای الزام strict محافظت شاخه‌ها وارد dev می‌کند؛ محافظت خاموش یا دور زده نشده است.

## دیتابیس و عملکرد

migration جدید، تغییر schema/SQL migrationهای0000..0004، reset/seed توسعه و write داده محصول انجام نشد. تست‌های تازه migration از صفر و rerun را اجرا کردند؛ تست‌های موجود upgrade داده‌دار/قیود هم در check حفظ شدند. چهارچوب موجود test DB، teardown processها/Pool و حذف کپی موقت frontend را انجام می‌دهد؛ processهای توسعه قبلی روی۳۰۰۰/۳۰۰۱ مالک این تست نبودند و متوقف نشدند.

یک سنجش واقعی با۵۰متخصص عمومی، دو خدمت، هفت‌روز query و استثنا در DB موقت انجام شد. **یک statement محصول، پنج statement کل** شامل دو عملیات limiter و cleanup هرکدام؛ query شبکه به‌ازای هر متخصص/روز وجود ندارد. SQL دقیق `availabilitySnapshotSql` با `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` بررسی شد. شاهد کامل `work/sprint-06-query-evidence.json` است.

در آخرین نمونه ثبت‌شده: پاسخ۵۱۵۴بایت، زمان درخواست حدود۳۹٫۲۲میلی‌ثانیه، planning حدود۰٫۴۴۶ و execution حدود۳٫۵۵۱میلی‌ثانیه؛۲۸۴ shared hit و صفر shared read. این dataset کوچک و محیط محلی است؛ benchmark مقیاس production نیست. شاهدی برای نیاز index تازه دیده نشد و migration/index حدسی اضافه نشد.

## بازبینی و مرز تحویل

جهت import، تکرار قواعد، ورودی/خروجی allowlist، خطای بلعیده‌شده، راز/PII، timeout، نیمه‌شب/DST و state کهنه مرور شدند. Domain وابستگی Nest/ORM/UI ندارد؛ Port برای مرز واقعی است. I/O شکست‌خورده، موفقیت یا empty تلقی نمی‌شود. رزرو اتمیک، اشغال واقعی، SMS/auth تازه و اسپرینت۷ بیرون تحویل‌اند.

منابع واقعاً خوانده‌شده و محدودیت دریافت منابع در [منابع۶](../../references/sprint-06-engineering-sources.md) آمده‌اند. در تحویل محلی اولیه، CI remote و rebuild Docker نسخه۶ انجام نشده بودند؛ هنگام انتقال، Docker smoke در اجرای اول PR #8 موفق شد و شکست quality و اصلاح آن در بخش CI ثبت شد. نتیجه CI آخرین commit در همان PR مرجع انتقال است؛ آزمون بار production یا اجرای محلی Compose تازه ادعا نشده است.

وضعیت Git هنگام تحویل پیاده‌سازی: dev با pull --ff-only به‌روز و سپس شاخه مستقل از درخت پاک ساخته شد. در آن نقطه، تغییرها local و unstaged بودند و commit/push/PR/merge/deploy انجام نشده بود. در درخواست بعدی، کارفرما صریحاً ثبت، push و ادغام همین اسپرینت را ابتدا در dev و سپس main خواست؛ این انتقال از مسیر دو PR و پس از CI انجام می‌شود. وضعیت نهایی انتقال در PRهای GitHub مرجع است. `git diff --check` بدون خطا بود. متن‌های پیشنهادی commit بر اساس دسته‌بندی واقعی:

1. `feat(availability): compute schedule-only slots with Tehran time rules`
2. `feat(frontend): add public service and time selection`
3. `test(availability): verify PostgreSQL and browser selection flows`
4. `docs: document sprint 06 architecture and learning`

گزارش check این سند مربوط به مجموعه کامل تغییرهای اسپرینت است؛ پیام‌های بالا پیشنهاد زمان تحویل محلی‌اند. انتقال بعدی با درخواست صریح کارفرما، در commitهای معنادار بک‌اند، فرانت‌اند و مستندات انجام می‌شود و مجوز دائمی برای اسپرینت‌های بعد نیست.

## امتحان دستی

با روش README، API و فرانت را اجرا/بازراه‌اندازی کنید. سالن منتشرشده‌ای از کاوش باز و «بررسی زمان‌ها» را انتخاب کنید. خدمت/متخصص/روز و یک ساعت را بزنید؛ قیمت/مدت و نبود ثبت آنلاین را در خلاصه ببینید. روز یا متخصص را عوض کنید؛ ساعت قبلی پاک می‌شود. لینک را reload کنید؛ انتخاب‌های URL برمی‌گردند. سالن توسعه خالی یا draft، داده عمومی نمونه تولید نمی‌کند؛ برای تست رفتار کامل از fixtureهای موقت همین check استفاده شده است.
