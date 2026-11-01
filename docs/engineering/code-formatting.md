# قالب‌بندی یکپارچه کد

تنظیم مشترک در `.prettierrc.json` ریشه است؛ backend و frontend تنظیم جدا ندارند. Prettier نسخه exact `3.9.10` ابزار توسعه ریشه workspace است و scripts هر پکیج هم از همان نسخه استفاده می‌کنند. نصب global یا plugin تازه لازم نیست.

| تنظیم                                      | مقدار و دلیل                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------- |
| printWidth                                 | ۱۰۰؛ راهنمای شکستن خط برای خوانایی TypeScript، نه محدودیت سخت طول تمام رشته‌ها/جدول‌ها |
| tabWidth / useTabs                         | دو فاصله، بدون tab؛ هماهنگ با EditorConfig                                             |
| semi                                       | روشن؛ پایان دستور صریح                                                                 |
| singleQuote / jsxSingleQuote               | کوتیشن تکی در JavaScript/TypeScript؛ کوتیشن دوتایی برای ویژگی JSX                      |
| singleAttributePerLine                     | روشن؛ جداسازی ویژگی‌های متعدد JSX برای مرور ساده‌تر فرم و component                    |
| bracketSameLine                            | خاموش؛ پایان tag چندخطی جدا و واضح                                                     |
| trailingComma                              | all؛ تغییر کوچک‌تر diff هنگام افزودن عضو/آرگومان                                       |
| bracketSpacing / arrowParens               | فاصله داخل object و پرانتز همیشگی پارامتر arrow function                               |
| endOfLine                                  | LF؛ خروجی یکسان روی سیستم‌ها                                                           |
| proseWrap                                  | preserve؛ متن مستندات فارسی بی‌دلیل در عرض ثابت شکسته نشود                             |
| embeddedLanguageFormatting در Markdown/MDX | off؛ کد نمونه و command تاریخی داخل مستند، با قالب‌بندی متن بازنویسی نشود              |

## فرمان‌ها

از ریشه:

```sh
pnpm run format
pnpm run format:check
```

فرمان اول فایل‌ها را ویرایش می‌کند؛ دومی فقط بررسی می‌کند و برای CI است. `pnpm run check` همین بررسی ریشه را اجرا می‌کند. برای یک workspace:

```sh
pnpm --filter @hair-salon/api run format:check
pnpm --filter @hair-salon/frontend run format:check
```

هر workspace، ignore ریشه را صریح با `--ignore-path ../.prettierignore` می‌خواند؛ formatter داخل IDE نیز config ریشه را به‌صورت طبیعی پیدا می‌کند. برای قالب‌بندی خودکار هنگام ذخیره، formatter ادیتور را روی Prettier نصب‌شده همین workspace بگذارید؛ تنظیم سراسری ادیتور در این تغییر عوض نشده است.

## فایل‌های مستثنا

`.prettierignore` خروجی تولیدشده، node_modules، work، env خصوصی، next-env.d.ts، migration/snapshotهای Drizzle، lockfile، asset/licenseهای بالادستی و AGENTS.md را کنار می‌گذارد. migration اعمال‌شده با formatter تغییر نمی‌کند. مستندات Markdown، config ریشه و workflowهای GitHub در بررسی ریشه پوشش دارند.

این ابزار قالب ظاهری را یکپارچه می‌کند. مرتب‌سازی import، مرتب‌سازی کلاس Tailwind، شکستن component طولانی و جداسازی منطق، مسئولیت lint/review/معماری‌اند؛ plugin خودکار برای بازنویسی آن‌ها اضافه نشده است. script نصب dependency و نسخه کتابخانه‌های محصول تغییر نکرده‌اند.
