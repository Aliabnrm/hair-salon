import { test, expect } from './fixtures/test-stack';
import { registerAndLogin, fill } from './fixtures/account-flow';
import { seedAvailability } from '../../backend/test/helpers/availability-fixture';
import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const now = '2026-11-03T06:00:00Z';
test.use({ availabilityNow: now, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' });
let data: Awaited<ReturnType<typeof seedAvailability>>;
test.beforeEach(async ({ stack, page }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  data = await seedAvailability(stack.pool, '2026-11-03');
  await page.clock.setFixedTime(new Date(now));
});
const checkout = (origin: string) =>
  origin +
  `/salons/${data.business}/book?` +
  new URLSearchParams({
    service_id: data.service,
    staff_id: data.staff,
    starts_at: '2026-11-03T07:00:00.000Z',
  });
async function contact(page: Page, name = 'مشتری مرورگر') {
  await page.getByLabel('نام و نام خانوادگی مراجعه‌کننده').fill(name);
  await page.getByLabel('موبایل تماس', { exact: true }).fill('۰۹۱۲۳۴۵۶۷۸۹');
  await expect(page.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true })).toBeEnabled();
}
async function ownerAccount(
  page: Page,
  origin: string,
  pool: Parameters<typeof seedAvailability>[0],
) {
  await page.clock.setFixedTime(new Date(now));
  await registerAndLogin(page, origin, 'booking-owner@example.com');
  const r = await pool.query("SELECT id FROM app.users WHERE email='booking-owner@example.com'");
  await pool.query('UPDATE app.business_memberships SET user_id=$2 WHERE business_id=$1', [
    data.business,
    r.rows[0].id,
  ]);
}
test('anonymous→signup→login return, receipt, real owner agenda, cancellation and manual shared ledger', async ({
  page,
  browser,
  stack,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `${stack.origin}/salons/${data.business}/times?service_id=${data.service}&staff_id=${data.staff}`,
  );
  await page.locator('[data-slot]').first().click();
  await expect(page.getByText('هنوز نوبتی ثبت نشده؛ ثبت نهایی در گام بعد است.')).toBeVisible();
  await page.getByRole('link', { name: 'ادامه رزرو' }).click();
  await expect(page.getByText('هنوز نوبتی ثبت نشده است.', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'جزئیات زمان انتخاب‌شده' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true })).toHaveCount(0);
  expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
    0,
  );
  await page.getByRole('link', { name: 'ورود با ایمیل', exact: true }).click();
  await page.getByRole('link', { name: 'ثبت‌نام', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ساخت حساب آراسته' })).toBeVisible();
  await fill(page, 'booking-customer@example.com');
  await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click();
  await page.getByRole('link', { name: 'رفتن به ورود' }).click();
  await expect(page.getByRole('heading', { name: 'ورود به آراسته' })).toBeVisible();
  await fill(page, 'booking-customer@example.com');
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page).toHaveURL(/\/book\?/);
  await contact(page);
  await page.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
  const receipt = page.url();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    timezoneId: 'Europe/London',
  });
  const owner = await context.newPage();
  try {
    await ownerAccount(owner, stack.origin, stack.pool);
    await owner.goto(`${stack.origin}/manage/${data.business}/appointments`);
    await expect(owner.getByRole('link').filter({ hasText: 'مشتری مرورگر' })).toBeVisible();
    await owner.getByRole('link').filter({ hasText: 'مشتری مرورگر' }).click();
    await expect(owner.getByText('09123456789', { exact: true })).toBeVisible();
    await owner.getByRole('button', { name: 'لغو با دلیل' }).click();
    await owner.getByLabel('دلیل لغو', { exact: true }).fill('هماهنگی تلفنی برای تغییر برنامه');
    await owner.getByRole('button', { name: 'تأیید لغو نوبت' }).click();
    await expect(owner.getByRole('heading', { name: 'این نوبت لغو شده است' })).toBeVisible();
    await page.goto(receipt);
    await expect(page.getByRole('heading', { name: 'این نوبت لغو شده است' })).toBeVisible();
    await owner.goto(`${stack.origin}/manage/${data.business}/appointments/new`);
    await owner.getByRole('combobox', { name: 'خدمت', exact: true }).selectOption(data.service);
    await owner.getByRole('button', { name: '10:30', exact: true }).click();
    await owner.getByLabel('نام و نام خانوادگی مراجعه‌کننده').fill('مراجعه تلفنی');
    await owner.getByLabel('موبایل تماس (اختیاری)').fill('09123456789');
    await owner.getByRole('button', { name: 'ثبت قطعی نوبت دستی', exact: true }).click();
    await expect(owner.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
    await owner.goto(`${stack.origin}/manage/${data.business}/appointments`);
    await expect(owner.getByRole('link').filter({ hasText: 'مراجعه تلفنی' })).toBeVisible();
    await page.goto(`${stack.origin}/appointments`);
    await expect(page.getByRole('link').filter({ hasText: 'لغوشده' })).toHaveCount(1);
    expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
      2,
    );
  } finally {
    await context.close();
  }
});
test('two authenticated sessions race the same selected time; only a committed receipt succeeds', async ({
  page,
  browser,
  stack,
}) => {
  test.setTimeout(60000);
  await registerAndLogin(page, stack.origin, 'race-a@example.com');
  const context = await browser.newContext();
  const second = await context.newPage();
  try {
    await second.clock.setFixedTime(new Date(now));
    await registerAndLogin(second, stack.origin, 'race-b@example.com');
    await Promise.all([page.goto(checkout(stack.origin)), second.goto(checkout(stack.origin))]);
    await contact(page, 'مشتری اول');
    await contact(second, 'مشتری دوم');
    let arrivals = 0,
      release: () => void = () => {};
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    for (const p of [page, second])
      await p.route('**/api/v1/appointments', async (route) => {
        if (route.request().method() === 'POST') {
          arrivals++;
          if (arrivals === 2) release();
          await barrier;
        }
        await route.continue();
      });
    await Promise.all([
      page.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true }).click(),
      second.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true }).click(),
    ]);
    await expect
      .poll(async () => [page, second].filter((p) => /\/appointments\//.test(p.url())).length)
      .toBe(1);
    const loser = /\/appointments\//.test(page.url()) ? second : page;
    await expect(
      loser.getByText('این زمان دیگر آزاد نیست؛ زمان دیگری انتخاب کنید.', { exact: true }),
    ).toBeVisible();
    expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
      1,
    );
  } finally {
    await context.close();
  }
});
test('lost response after a real commit recovers the same receipt after reload without persisting contact', async ({
  page,
  stack,
}) => {
  await registerAndLogin(page, stack.origin, 'uncertain@example.com');
  await page.goto(checkout(stack.origin));
  await contact(page);
  await page.route(
    '**/api/v1/appointments',
    async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      await route.abort('failed');
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true }).click();
  await expect(page.getByRole('button', { name: 'بررسی نتیجه درخواست' })).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
  expect(storage).not.toContain('09123456789');
  expect(storage).not.toContain('مشتری مرورگر');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
  expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
    1,
  );
});
test('mobile layouts, 200% text, keyboard focus and retained agenda on refresh error', async ({
  page,
  stack,
}) => {
  test.setTimeout(60000);
  await ownerAccount(page, stack.origin, stack.pool);
  await page.goto(`${stack.origin}/manage/${data.business}/appointments/new`);
  await page.getByRole('combobox', { name: 'خدمت', exact: true }).selectOption(data.service);
  await page.getByRole('button', { name: '10:30', exact: true }).click();
  await page.getByLabel('نام و نام خانوادگی مراجعه‌کننده').fill('آزمون نمایش موبایل');
  await page.getByRole('button', { name: 'ثبت قطعی نوبت دستی', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
  await page.goto(`${stack.origin}/manage/${data.business}/appointments`);
  await expect(page.getByRole('link').filter({ hasText: 'آزمون نمایش موبایل' })).toBeVisible();
  const folder = fileURLToPath(new URL('../../work/sprint-07-screens/', import.meta.url));
  await mkdir(folder, { recursive: true });
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({ path: folder + `agenda-${width}.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: 'html { font-size: 200%; }' });
  expect(await page.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveCount(1);
  await page.route('**/api/v1/businesses/*/appointments?*', (r) => r.abort());
  await page.getByRole('button', { name: 'تازه‌سازی نوبت‌ها' }).click();
  await expect(page.locator('article [role="alert"]')).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: 'آزمون نمایش موبایل' })).toBeVisible();
});
