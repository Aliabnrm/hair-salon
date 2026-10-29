# Hair Salon

A modular NestJS API for a salon booking platform in Iran, developed incrementally with documented decisions and automated tests.

پلتفرم رزرو و مدیریت سالن برای ایران؛ توسعه مرحله‌ای با NestJS و آموزش معماری بک‌اند. اسپرینت ۱ پایه API را فراهم می‌کند: تنظیمات معتبر، شناسه درخواست، خطای امن، OpenAPI و liveness. این endpoint فقط زنده‌بودن فرایند را نشان می‌دهد؛ اتصال دیتابیس، SMS یا آمادگی production را بررسی نمی‌کند.

## اجرای محلی

پیش‌نیاز: Node.js **24.22.2** (فایل `.nvmrc`) و npm **11.19.1**. با مدیر نسخه دلخواه نسخه مشخص‌شده را فعال کنید؛ برای nvm:

```sh
nvm install
nvm use
npm ci
cp apps/api/.env.example apps/api/.env
npm run dev
```

در محیط فعلی یک runtime محلی تأییدشده نیز در `work/runtime/` موجود است. برای استفاده در همان ترمینال، پیش از فرمان‌های npm:

```sh
export PATH="$PWD/work/runtime/node-v24.22.2-darwin-arm64/bin:$PATH"
```

این مسیر فقط برای همین دستگاه macOS ARM است و بخشی از کد قابل انتقال پروژه نیست. روی دستگاه دیگر از `.nvmrc` استفاده کنید. هیچ نصب global لازم نیست.

برنامه روی `127.0.0.1:3001` گوش می‌دهد. برای توقف، `Ctrl+C` بزنید. مقدار `PORT` فقط عدد صحیح ۱ تا ۶۵۵۳۵ و `NODE_ENV` یکی از `development`، `test` یا `production` است؛ نبود این متغیرها به‌ترتیب 3001 و development می‌دهد. مقدار نامعتبر پیش از listen اجرا را با exit ناموفق متوقف می‌کند. `.env` خصوصی و خارج از نسخه‌بندی است؛ تست‌ها آن را نمی‌خوانند. متغیر محیطی ترمینال بر `.env` اولویت دارد.

```sh
curl -i -H 'X-Request-Id: local-demo' http://127.0.0.1:3001/api/v1/health/liveness
```

```json
{"data":{"status":"ok"},"meta":{"request_id":"local-demo"}}
```

هدر `X-Request-Id` نیز `local-demo` است. یک شناسه تک‌مقداری با ۱ تا ۶۴ حرف انگلیسی، عدد، `_` یا `-` پذیرفته می‌شود؛ مقدار غایب، تکراری یا نامعتبر با UUID جایگزین می‌شود. این شناسه برای ارتباط پاسخ و log است و مجوز دسترسی ایجاد نمی‌کند.

مسیر ناموجود، HTTP 404 و `error.code=NOT_FOUND` برمی‌گرداند. خطای داخلی پیام عمومی فارسی دارد؛ متن exception یا stack در پاسخ و log عمومی ثبت نمی‌شود. log هر درخواست فقط event، شناسه، method، status و مدت را ثبت می‌کند.

## مستند API و فرمان‌ها

در development/test: [Swagger UI](http://127.0.0.1:3001/api/docs) و [OpenAPI JSON](http://127.0.0.1:3001/api/openapi.json). این مسیرها در production ثبت نمی‌شوند. Schema از DTO و decoratorهای واقعی تولید می‌شود.

| فرمان در ریشه | کاربرد |
|---|---|
| `npm run dev` | توسعه با بازسازی پس از تغییر |
| `npm run build` | خروجی ESM در `apps/api/dist` |
| `npm start` | اجرای خروجی ساخته‌شده |
| `npm run typecheck` | بررسی نوع کد و تست‌ها |
| `npm run lint` | بررسی Oxlint، بدون ویرایش |
| `npm run format:check` | بررسی Prettier، بدون ویرایش |
| `npm run format` | قالب‌بندی صریح کد API |
| `npm test` | تست واحد تنظیمات، بدون watch |
| `npm run test:e2e` | build و تست HTTP/شروع برنامه، بدون watch |
| `npm run check` | build، typecheck، lint، format و همه تست‌ها |

یک npm workspace با نام `@hair-salon/api` و فقط یک `package-lock.json` در ریشه داریم؛ نصب از ریشه انجام شود. خروجی build، runtime محلی و پکیج‌های نصب‌شده نسخه‌بندی نمی‌شوند.

## مسیر ادامه و یادگیری

- [درس اسپرینت ۱](docs/learning/sprint-01.md): Module، Controller، Service، DI و مسیر درخواست.
- [گزارش اجرا و شواهد](docs/planning/sprints/sprint-01-report.md) و [طرح اسپرینت](docs/planning/sprints/sprint-01-plan.md).
- [ساختار و جهت وابستگی](docs/architecture/codebase-structure.md)، [ابزارها و نسخه‌ها](docs/architecture/adr/ADR-003-sprint-01-tooling.md) و [قواعد عامل](AGENTS.md).
- [راهنمای مستندات](docs/README.md)، [روش همکاری](docs/planning/collaboration-workflow.md) و [برنامه اسپرینت‌ها](docs/planning/sprint-plan.md).
- [روند Git و Pull Request](docs/engineering/git-workflow.md): تغییرهای کوچک، دلیل تصمیم، بررسی خودکار و تاریخچه قابل مرور.

دیتابیس، احراز هویت، رزرو و UI در اسپرینت‌های بعد و پس از تأیید طرح مربوط اضافه می‌شوند. این پایه محلی، اثبات عملکرد در بار واقعی یا مجوز انتشار عمومی نیست.
