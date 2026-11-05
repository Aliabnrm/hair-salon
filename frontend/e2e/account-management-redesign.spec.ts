import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { test, expect } from './fixtures/test-stack';
import { registerAndLogin } from './fixtures/account-flow';

test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.auth_attempt_buckets');
});

test('short form focuses errors, supports keyboard selection and saves real optional details', async ({
  page,
  stack,
}) => {
  await registerAndLogin(page, stack.origin, `form-${randomUUID()}@example.com`);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole('link', { name: 'مدیریت سالن‌های من', exact: true }).click();
  await page.getByRole('link', { name: 'ساخت اولین سالن' }).click();
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toBeFocused();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page
    .getByLabel('نام سالن', { exact: true })
    .fill('سالن آزمایشی با نام بلند برای بررسی نمایش فارسی در موبایل');
  const men = page.getByRole('radio', { name: 'مردانه', exact: true });
  await men.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: 'زنانه', exact: true })).toBeChecked();
  await page.getByLabel('شهر', { exact: true }).fill('شهر'.repeat(25));
  await page.getByLabel('محله (اختیاری)', { exact: true }).fill('محله'.repeat(25));
  await page
    .getByLabel('آدرس عمومی (اختیاری)', { exact: true })
    .fill('خیابان آزمایشی\nساختمان آزمایشی، طبقه دوم');
  await page.getByLabel('موبایل عمومی سالن (اختیاری)').fill('۱۲۳۴۵۶۷۸۹۰');
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByLabel('موبایل عمومی سالن (اختیاری)')).toBeFocused();
  await expect(page.getByLabel('موبایل عمومی سالن (اختیاری)')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('موبایل عمومی سالن (اختیاری)').fill('۰۹۱۲۱۲۳۴۵۶۷');
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByRole('heading', { name: 'مشخصات سالن', exact: true })).toBeVisible();
  await expect(page.getByLabel('آدرس عمومی (اختیاری)')).toHaveValue(
    'خیابان آزمایشی\nساختمان آزمایشی، طبقه دوم',
  );
  expect(await page.locator('main').evaluate((main) => main.scrollWidth <= main.clientWidth)).toBe(
    true,
  );
  const save = page.getByRole('button', { name: 'ذخیره تغییرات', exact: true });
  await expect(save).toBeDisabled();
  await page.getByLabel('شهر', { exact: true }).fill('شیراز');
  await save.click();
  await expect(page.getByText('مشخصات ذخیره شد.', { exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('شهر', { exact: true })).toHaveValue('شیراز');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const title of ['خدمات', 'متخصصان', 'ساعات کاری', 'تعطیلی‌ها', 'مشخصات']) {
    const link = page
      .getByRole('navigation', { name: 'مدیریت سالن', exact: true })
      .getByRole('link', { name: title, exact: true });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(link).toHaveAttribute('aria-current', 'page');
    const bounds = await link.boundingBox();
    expect(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 320).toBeTruthy();
  }
  await page.getByLabel('موبایل عمومی سالن (اختیاری)').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'بارگذاری نسخه تازه' })).toBeFocused();
  await page.getByRole('link', { name: 'سالن‌های من', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /سالن آزمایشی با نام بلند/ }).filter({ hasText: 'مدیریت' }),
  ).toBeVisible();
  expect(await page.locator('main').evaluate((main) => main.scrollWidth <= main.clientWidth)).toBe(
    true,
  );
});

test('refresh asks before discarding edits and preserves local values when the read fails', async ({
  page,
  stack,
}) => {
  await registerAndLogin(page, stack.origin, `refresh-${randomUUID()}@example.com`);
  await page.goto(`${stack.origin}/manage/new`);
  await page.getByLabel('نام سالن', { exact: true }).fill('سالن نسخه تازه');
  await page.getByLabel('شهر', { exact: true }).fill('تهران');
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByRole('heading', { name: 'مشخصات سالن', exact: true })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('سالن نسخه تازه');
  const path = new URL(page.url()).pathname;
  const id = path.split('/').at(-1);
  await page.getByLabel('نام سالن', { exact: true }).fill('ورودی حفظ‌شده');
  await page.getByRole('button', { name: 'بارگذاری نسخه تازه' }).click();
  await page.getByRole('button', { name: 'ادامه ویرایش' }).click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('ورودی حفظ‌شده');
  await page.route('**/settings', (route) =>
    route.request().method() === 'GET' ? route.abort() : route.continue(),
  );
  await page.getByRole('button', { name: 'بارگذاری نسخه تازه' }).click();
  await page.getByRole('button', { name: 'دریافت نسخه تازه و کنارگذاشتن تغییرها' }).click();
  await expect(page.getByRole('alert').first()).toContainText('ارتباط کامل نشد');
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('ورودی حفظ‌شده');
  await page.unroute('**/settings');
  await stack.pool.query('UPDATE app.businesses SET name=$2, version=version+1 WHERE id=$1', [
    id,
    'نسخه جدید سرور',
  ]);
  await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'اطلاعات تغییر' })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('ورودی حفظ‌شده');
  await page.getByRole('button', { name: 'بارگذاری نسخه تازه' }).click();
  await page.getByRole('button', { name: 'دریافت نسخه تازه و کنارگذاشتن تغییرها' }).click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('نسخه جدید سرور');
  await page.getByLabel('نام سالن', { exact: true }).fill('تغییر لغوشده');
  await page.getByRole('button', { name: 'بارگذاری نسخه تازه' }).click();
  await page.getByRole('button', { name: 'دریافت نسخه تازه و کنارگذاشتن تغییرها' }).click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('نسخه جدید سرور');
  await stack.pool.query(
    "UPDATE app.sessions SET expires_at=now()-interval '1 second',created_at=now()-interval '1 day' WHERE user_id=(SELECT user_id FROM app.business_memberships WHERE business_id=$1)",
    [id],
  );
  await page.getByRole('button', { name: 'بارگذاری نسخه تازه' }).click();
  await expect(page.getByRole('link', { name: 'ورود دوباره', exact: true })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveCount(0);
});

test('uncertain creation retries one intent and disables duplicate saves while pending', async ({
  page,
  context,
  stack,
}) => {
  await registerAndLogin(page, stack.origin, `retry-design-${randomUUID()}@example.com`);
  await page.goto(`${stack.origin}/manage/new`);
  await page.getByLabel('نام سالن', { exact: true }).fill('سالن یک درخواست');
  await page.getByLabel('شهر', { exact: true }).fill('تهران');
  const keys: (string | undefined)[] = [];
  let pending = false;
  let release = () => {};
  let completedRequest = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/businesses', async (route) => {
    keys.push(route.request().headers()['idempotency-key']);
    if (!completedRequest) {
      // Commit on the real server, then lose its response: retry must replay one salon.
      await route.fetch();
      completedRequest = true;
      await route.abort();
    } else {
      pending = true;
      await gate;
      await route.continue();
    }
  });
  try {
    await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
    await expect(page.getByText('نتیجه ذخیره مشخص نیست.', { exact: false })).toBeVisible();
    await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('سالن یک درخواست');
    await expect(page.getByLabel('نام سالن', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'تلاش دوباره با همان درخواست' }).click();
    await expect(page.getByRole('button', { name: 'در حال ذخیره…', exact: true })).toBeDisabled();
    expect(pending).toBe(true);
    release();
    await expect(page.getByRole('heading', { name: 'مشخصات سالن', exact: true })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBeTruthy();
    expect(keys[1]).toBe(keys[0]);
    expect(
      (
        await stack.pool.query('SELECT count(*)::int AS n FROM app.businesses WHERE name=$1', [
          'سالن یک درخواست',
        ])
      ).rows[0].n,
    ).toBe(1);
    expect(
      await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
    ).toEqual({ local: 0, session: 0 });
    expect(
      (await context.cookies()).find((cookie) => cookie.name === 'hair_salon_session')?.httpOnly,
    ).toBe(true);
  } finally {
    release();
  }
});

test('guest, long real email, loading, read errors and retry keep the account usable', async ({
  page,
  stack,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto(`${stack.origin}/account`);
  await expect(page.getByRole('link', { name: 'ورود با ایمیل', exact: true })).toBeVisible();
  await mkdir('../work/account-management-redesign/states', { recursive: true });
  await page.screenshot({ path: '../work/account-management-redesign/states/guest-320.png' });
  const email = `${'owner'.repeat(12)}@${'salon'.repeat(10)}.example.com`;
  await registerAndLogin(page, stack.origin, email);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '../work/account-management-redesign/states/long-email-320.png' });
  await page.route('**/api/v1/me', (route) => route.abort());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'حساب بارگذاری نشد' })).toBeVisible();
  await page.unroute('**/api/v1/me');
  await page.getByRole('button', { name: 'تلاش دوباره' }).click();
  await expect(page.getByTestId('account-email')).toHaveText(email);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/me/businesses?*', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.getByRole('link', { name: 'مدیریت سالن‌های من', exact: true }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'در حال بارگذاری سالن‌ها' }),
    ).toBeVisible();
    await page.screenshot({ path: '../work/account-management-redesign/states/loading-320.png' });
    release();
    await expect(page.getByRole('heading', { name: 'هنوز سالنی ندارید' })).toBeVisible();
  } finally {
    release();
  }
});
