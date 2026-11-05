import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test-stack';
import { fill, registerAndLogin } from './fixtures/account-flow';

async function enterManagement(page: Page, origin: string) {
  const email = `management-${randomUUID()}@example.com`;
  await registerAndLogin(page, origin, email);
  await expect(page.getByRole('link', { name: 'امنیت حساب', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'مدیریت سالن‌های من', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'سالن‌های من', exact: true })).toBeVisible();
  return email;
}
async function createSalon(page: Page, name: string) {
  await page.getByRole('link', { name: /^(افزودن سالن|ساخت اولین سالن)$/ }).click();
  await page.getByLabel('نام سالن', { exact: true }).fill(name);
  await page.getByRole('radio', { name: 'زنانه', exact: true }).check();
  await page.getByLabel('شهر', { exact: true }).fill('تهران');
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByRole('heading', { name: 'مشخصات سالن', exact: true })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue(name);
  return new URL(page.url()).pathname;
}
async function navigation(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'مدیریت سالن', exact: true })
    .getByRole('link', { name, exact: true })
    .click();
}

function hoursToast(page: Page) {
  return page.getByRole('alert').filter({ has: page.getByRole('button', { name: 'بستن پیام' }) });
}

test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.auth_attempt_buckets');
});

test('weekly hours show validation, server error, and saved result in toasts', async ({
  page,
  stack,
}) => {
  await enterManagement(page, stack.origin);
  await createSalon(page, 'سالن پیام ساعت‌ها');
  await navigation(page, 'ساعات کاری');
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByLabel('شنبه شروع 1', { exact: true }).fill('25:00');
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(hoursToast(page)).toContainText('زمان شروع را به شکل 09:00 وارد کنید.');
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toBeFocused();
  await mkdir('../work/hours-feedback', { recursive: true });
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const toast = hoursToast(page);
    await expect(toast.getByRole('button', { name: 'بستن پیام' })).toBeInViewport();
    await page.screenshot({
      path: `../work/hours-feedback/validation-${width}.png`,
      animations: 'disabled',
    });
  }
  await page.getByLabel('شنبه شروع 1', { exact: true }).fill('09:00');
  await page.route('**/api/v1/businesses/*/hours', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    await route.fulfill({
      status: 422,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'INVALID_INPUT',
          message: 'برنامه معتبر نیست.',
          fields: { intervals: 'بازه‌ها هم‌پوشانی دارند.' },
        },
      }),
    });
  });
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(hoursToast(page)).toContainText('بازه‌ها هم‌پوشانی دارند.');
  await page.screenshot({
    path: '../work/hours-feedback/server-error-430.png',
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'بستن پیام' }).click();
  await expect(hoursToast(page)).toHaveCount(0);
  await page.unroute('**/api/v1/businesses/*/hours');
  await page.getByLabel('شنبه شروع 1', { exact: true }).fill('۰۹:۰۰');
  await page.getByLabel('شنبه پایان 1', { exact: true }).fill('۲۴:۰۰');
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByRole('status').getByText('برنامه هفتگی ذخیره شد')).toBeVisible();
  await page.screenshot({ path: '../work/hours-feedback/success-430.png', animations: 'disabled' });
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toHaveValue('09:00');
  await expect(page.getByLabel('شنبه پایان 1', { exact: true })).toHaveValue('24:00');
  await expect(page.getByText('برنامه هفتگی ذخیره شد', { exact: true })).toBeHidden({
    timeout: 8000,
  });
  await page.reload();
  await expect(page.getByLabel('شنبه پایان 1', { exact: true })).toHaveValue('24:00');
});

test('weekly hours revalidate related fields and keep rows attached to the right day', async ({
  page,
  stack,
}) => {
  await enterManagement(page, stack.origin);
  await createSalon(page, 'سالن اعتبارسنجی ساعت‌ها');
  await navigation(page, 'ساعات کاری');
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByRole('button', { name: 'افزودن بازه یکشنبه', exact: true }).click();
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  const secondStart = page.getByLabel('شنبه شروع 2', { exact: true });
  await secondStart.fill('10:00');
  await expect(secondStart).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('شنبه پایان 1', { exact: true }).fill('10:00');
  await expect(secondStart).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('شنبه پایان 2', { exact: true }).fill('09:00');
  await expect(secondStart).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('شنبه پایان 2', { exact: true }).fill('20:00');
  await expect(secondStart).not.toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'حذف بازه 1 شنبه', exact: true }).click();
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toHaveValue('10:00');
  await expect(page.getByLabel('یکشنبه شروع 1', { exact: true })).toHaveValue('09:00');
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByText('برنامه هفتگی ذخیره شد', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('شنبه پایان 1', { exact: true })).toHaveValue('20:00');
  await expect(page.getByLabel('یکشنبه شروع 1', { exact: true })).toHaveValue('09:00');
});

for (const failure of ['network', 'server'] as const) {
  test(`weekly hours preserve the same request after ${failure} failure and toast dismissal`, async ({
    page,
    stack,
  }) => {
    await enterManagement(page, stack.origin);
    await createSalon(page, 'سالن تلاش دوباره');
    await navigation(page, 'ساعات کاری');
    await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
    const attempts: {
      key: string | undefined;
      body: string | null;
      version: string | undefined;
    }[] = [];
    await page.route('**/api/v1/businesses/*/hours', async (route) => {
      const request = route.request();
      if (request.method() !== 'PUT') return route.continue();
      attempts.push({
        key: request.headers()['idempotency-key'],
        body: request.postData(),
        version: request.headers()['if-match'],
      });
      if (attempts.length > 1) return route.continue();
      if (failure === 'network') return route.abort('failed');
      return route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'SERVICE_UNAVAILABLE', message: 'سرویس موقتاً در دسترس نیست.' },
        }),
      });
    });
    await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
    await expect(hoursToast(page)).toContainText(
      failure === 'network' ? 'ممکن است برنامه ذخیره شده باشد' : 'سرویس موقتاً در دسترس نیست',
    );
    await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'بستن پیام' }).click();
    await page.getByRole('button', { name: 'تلاش دوباره با همان درخواست' }).click();
    await expect(page.getByText('برنامه هفتگی ذخیره شد', { exact: true })).toBeVisible();
    expect(attempts).toHaveLength(2);
    expect(attempts[0]?.key).toBeTruthy();
    expect(attempts[1]).toEqual(attempts[0]);
  });
}

test('weekly hours show a conflict toast and load the current server version', async ({
  page,
  stack,
}) => {
  await enterManagement(page, stack.origin);
  await createSalon(page, 'سالن نسخه ساعت‌ها');
  await navigation(page, 'ساعات کاری');
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.route('**/api/v1/businesses/*/hours', async (route) => {
    if (route.request().method() !== 'PUT') return route.continue();
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'VERSION_CONFLICT', message: 'اطلاعات تغییر کرده است.' },
      }),
    });
  });
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(hoursToast(page)).toContainText('برنامه در جای دیگری تغییر کرده است');
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toHaveValue('09:00');
  await hoursToast(page).getByRole('button', { name: 'بارگذاری نسخه تازه', exact: true }).click();
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toHaveCount(0);
});

test('owner configures a private salon, service, staff, weekly hours and a dated holiday through real UI', async ({
  page,
  stack,
}) => {
  test.setTimeout(60_000);
  await enterManagement(page, stack.origin);
  const root = await createSalon(page, 'سالن آزمون آراسته');
  await navigation(page, 'خدمات');
  await page.getByRole('button', { name: 'خدمت جدید', exact: true }).click();
  await page.getByLabel('نام خدمت', { exact: true }).fill('کوتاهی مو');
  await page.getByLabel('دسته خدمت', { exact: true }).selectOption('haircut');
  await page.getByLabel('قیمت (تومان)', { exact: true }).fill('۲۵۰٬۰۰۰');
  await page.getByLabel('مدت خدمت (دقیقه)', { exact: true }).fill('۴۵');
  await page.getByRole('button', { name: 'ذخیره خدمت' }).click();
  await expect(page.getByRole('heading', { name: 'کوتاهی مو', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('۲۵۰٬۰۰۰ تومان', { exact: false })).toBeVisible();
  await navigation(page, 'متخصصان');
  await page.getByRole('button', { name: 'متخصص جدید', exact: true }).click();
  await page.getByLabel('نام نمایشی متخصص').fill('متخصص آزمون');
  await page.getByLabel('کوتاهی مو', { exact: true }).check();
  await page.getByRole('button', { name: 'ذخیره متخصص' }).click();
  await expect(page.getByRole('heading', { name: 'متخصص آزمون', exact: true })).toBeVisible();
  await navigation(page, 'ساعات کاری');
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByLabel('شنبه شروع 1', { exact: true }).fill('09:00');
  await page.getByLabel('شنبه پایان 1', { exact: true }).fill('18:00');
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByRole('status').getByText('برنامه هفتگی ذخیره شد')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toHaveValue('09:00');
  await page.getByLabel('برنامه چه کسی؟').selectOption({ label: 'متخصص آزمون' });
  await expect(page.getByLabel('شنبه شروع 1', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByLabel('شنبه شروع 1', { exact: true }).fill('10:00');
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByRole('status').getByText('برنامه هفتگی ذخیره شد')).toBeVisible();
  await navigation(page, 'تعطیلی‌ها');
  await page.getByRole('button', { name: 'روز خاص جدید' }).click();
  await page.getByRole('button', { name: 'ذخیره روز خاص' }).click();
  await expect(page.getByRole('heading', { name: /تعطیل/ })).toHaveCount(2);
  await page.reload();
  await expect(page.getByText('کل سالن', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'رفع استثنا', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید رفع استثنا', exact: true }).click();
  await expect(page.getByText('در این بازه برنامه روز خاص ندارید.')).toBeVisible();
  await navigation(page, 'خدمات');
  await page.getByRole('button', { name: 'آرشیو', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید آرشیو', exact: true }).click();
  await expect(page.getByText('آرشیوشده', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'فعال‌سازی', exact: true }).click();
  await page.getByRole('button', { name: 'تأیید فعال‌سازی', exact: true }).click();
  await expect(page.getByText('فعال', { exact: true })).toBeVisible();
  await page.goto(`${stack.origin}${root}`);
  await mkdir('../work/sprint-04-ui', { recursive: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 360, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `../work/sprint-04-ui/settings-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.setViewportSize({ width: 320, height: 900 });
  const phone = page.getByLabel('موبایل عمومی سالن (اختیاری)');
  await expect(page.getByRole('button', { name: 'ذخیره تغییرات' })).toBeDisabled();
  await page.getByLabel('نام سالن', { exact: true }).fill('سالن آزمون ویرایش');
  await phone.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'ذخیره تغییرات' })).toBeFocused();
  await page.screenshot({
    path: '../work/sprint-04-ui/settings-controls-320.png',
    animations: 'disabled',
  });
  await page.keyboard.press('Shift+Tab');
  await expect(phone).toBeFocused();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
});

test('validation, version conflict and uncertain network retry preserve intent and server data', async ({
  page,
  context,
  stack,
}) => {
  await enterManagement(page, stack.origin);
  const root = await createSalon(page, 'سالن نسخه');
  const id = root.split('/').at(-1);
  await navigation(page, 'خدمات');
  await page.getByRole('button', { name: 'خدمت جدید', exact: true }).click();
  await page.getByLabel('نام خدمت').fill('رنگ مو');
  await page.getByLabel('دسته خدمت', { exact: true }).selectOption('color');
  await page.getByLabel('قیمت (تومان)').fill('1e3');
  await page.getByRole('button', { name: 'ذخیره خدمت' }).click();
  await expect(page.getByRole('alert').first()).toContainText('صحیح');
  await page.getByLabel('قیمت (تومان)').fill('300000');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'ذخیره خدمت' }).click();
  await expect(page.getByText('نتیجه ذخیره مشخص نیست.', { exact: false })).toBeVisible();
  await expect(page.getByLabel('نام خدمت')).toHaveValue('رنگ مو');
  await context.setOffline(false);
  await page.getByRole('button', { name: 'تلاش دوباره با همان درخواست' }).click();
  await expect(page.getByRole('heading', { name: 'رنگ مو', exact: true })).toBeVisible();
  expect(
    (
      await stack.pool.query('SELECT count(*)::int AS n FROM app.services WHERE business_id=$1', [
        id,
      ])
    ).rows[0].n,
  ).toBe(1);
  await navigation(page, 'مشخصات');
  await page.getByLabel('نام سالن', { exact: true }).fill('ویرایش محلی');
  await stack.pool.query('UPDATE app.businesses SET name=$2,version=version+1 WHERE id=$1', [
    id,
    'ویرایش هم‌زمان',
  ]);
  await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'اطلاعات تغییر' })).toContainText('تغییر');
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('ویرایش محلی');
  await page.getByRole('button', { name: 'بارگذاری نسخه تازه', exact: true }).click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('ویرایش محلی');
  await page.getByRole('button', { name: 'دریافت نسخه تازه و کنارگذاشتن تغییرها' }).click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('ویرایش هم‌زمان');
});

test('tenant URLs, salon switching, expired sessions and logout clear private content', async ({
  browser,
  page,
  stack,
}) => {
  const email = await enterManagement(page, stack.origin);
  const first = await createSalon(page, 'سالن اول');
  await page.getByRole('link', { name: 'سالن‌های من', exact: true }).click();
  const second = await createSalon(page, 'سالن دوم');
  await page.goto(`${stack.origin}${first}`);
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('سالن اول');
  await page.goto(`${stack.origin}${second}`);
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('سالن دوم');
  const other = await browser.newContext();
  try {
    const foreignPage = await other.newPage();
    await enterManagement(foreignPage, stack.origin);
    const foreignRoot = await createSalon(foreignPage, 'سالن مالک دیگر');
    await page.goto(`${stack.origin}${foreignRoot}`);
    await expect(page.getByRole('alert').filter({ hasText: 'یافت نشد' })).toBeVisible();
    await expect(page.getByLabel('نام سالن', { exact: true })).toHaveCount(0);
  } finally {
    await other.close();
  }
  await page.goto(`${stack.origin}/manage/${randomUUID()}`);
  await expect(page.getByRole('alert').filter({ hasText: 'یافت نشد' })).toContainText('یافت نشد');
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveCount(0);
  const id = second.split('/').at(-1);
  await stack.pool.query(
    "UPDATE app.sessions SET expires_at=now()-interval '1 second',created_at=now()-interval '1 day' WHERE user_id=(SELECT user_id FROM app.business_memberships WHERE business_id=$1)",
    [id],
  );
  await page.goto(`${stack.origin}${second}`);
  await expect(page.getByRole('link', { name: /^ورود (دوباره|با ایمیل)$/ })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveCount(0);
  await page.goto(`${stack.origin}/sign-in`);
  await fill(page, email);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByTestId('account-email')).toHaveText(email);
  await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
  await page.goto(`${stack.origin}${second}`);
  await expect(page.getByRole('link', { name: 'ورود با ایمیل' })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveCount(0);
});

test('the removed account security page no longer offers setup', async ({ page, stack }) => {
  const response = await page.goto(`${stack.origin}/account/security`);
  expect(response?.status()).toBe(404);
  await expect(page.getByLabel('کد شش‌رقمی Authenticator')).toHaveCount(0);
});
