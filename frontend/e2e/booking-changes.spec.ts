import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test-stack';
import { registerAndLogin } from './fixtures/account-flow';
import { seedAvailability } from '../../backend/test/helpers/availability-fixture';
const now = '2026-11-03T06:00:00Z';
test.use({ availabilityNow: now, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' });
let data: Awaited<ReturnType<typeof seedAvailability>>;
test.beforeEach(async ({ stack, page }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  data = await seedAvailability(stack.pool, '2026-11-03');
  await page.clock.setFixedTime(new Date(now));
});
async function book(page: Page, origin: string, day = '2026-11-05') {
  await registerAndLogin(page, origin, 'change-customer@example.com');
  await page.goto(
    `${origin}/salons/${data.business}/book?` +
      new URLSearchParams({
        service_id: data.service,
        staff_id: data.staff,
        starts_at: day + 'T07:00:00.000Z',
      }),
  );
  await page.getByLabel('نام و نام خانوادگی مراجعه‌کننده').fill('مشتری تغییر زمان');
  await page.getByLabel('موبایل تماس', { exact: true }).fill('۰۹۱۲۳۴۵۶۷۸۹');
  await page.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
  return page.url().split('/').at(-1)!;
}
async function selectReplacement(page: Page, date = '2026-11-06') {
  await page.getByRole('link', { name: 'تغییر زمان نوبت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'زمان مناسب‌تری انتخاب کنید' })).toBeVisible();
  await page.locator(`[data-date="${date}"]`).click();
  await page.locator('[data-slot="' + date + 'T07:00:00.000Z"]').click();
  await expect(page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true })).toBeEnabled();
}
test('customer changes the same booking, owner sees its new day/history, customer cancels and capacity returns', async ({
  page,
  browser,
  stack,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await book(page, stack.origin);
  const original = (
    await stack.pool.query('SELECT code,snapshot FROM app.appointments WHERE id=$1', [id])
  ).rows[0];
  await selectReplacement(page);
  await page
    .getByRole('combobox', { name: 'متخصص نوبت تازه', exact: true })
    .selectOption(data.second);
  await page.locator('[data-slot="2026-11-06T07:00:00.000Z"]').click();
  await page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'زمان جدید نوبت ثبت شد' })).toBeVisible();
  await page.getByRole('link', { name: 'مشاهده نوبت و تاریخچه' }).click();
  await expect(page.getByRole('heading', { name: 'تاریخچه نوبت', exact: true })).toBeVisible();
  await expect(page.getByText('تغییر زمان یا متخصص · توسط مشتری', { exact: true })).toBeVisible();
  const row = (await stack.pool.query('SELECT * FROM app.appointments WHERE id=$1', [id])).rows[0];
  expect(row.code).toBe(original.code);
  expect(row.version).toBe(2);
  expect(row.staff_id).toBe(data.second);
  expect(row.snapshot.price_irr).toBe(original.snapshot.price_irr);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    owner = await context.newPage();
  try {
    await owner.clock.setFixedTime(new Date(now));
    await registerAndLogin(owner, stack.origin, 'change-owner@example.com');
    const ownerId = (
      await stack.pool.query("SELECT id FROM app.users WHERE email='change-owner@example.com'")
    ).rows[0].id;
    await stack.pool.query('UPDATE app.business_memberships SET user_id=$2 WHERE business_id=$1', [
      data.business,
      ownerId,
    ]);
    await owner.goto(`${stack.origin}/manage/${data.business}/appointments`);
    for (let i = 0; i < 2; i++)
      await owner.getByRole('button', { name: 'روز بعد', exact: true }).click();
    await expect(owner.getByRole('link').filter({ hasText: 'مشتری تغییر زمان' })).toHaveCount(0);
    await owner.getByRole('button', { name: 'روز بعد', exact: true }).click();
    await owner.getByRole('link').filter({ hasText: 'مشتری تغییر زمان' }).click();
    await expect(
      owner.getByText('تغییر زمان یا متخصص · توسط مشتری', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'لغو با دلیل', exact: true }).click();
    await page.getByLabel('دلیل لغو', { exact: true }).fill('تغییر برنامه شخصی');
    await page.getByRole('button', { name: 'تأیید لغو نوبت', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'این نوبت لغو شده است' })).toBeVisible();
    await owner.reload();
    await expect(owner.getByRole('heading', { name: 'این نوبت لغو شده است' })).toBeVisible();
    await expect(owner.getByText('لغو نوبت · توسط مشتری', { exact: true })).toBeVisible();
    const publicTimes = await page.request.get(
      `${stack.origin}/api/v1/catalog/salons/${data.business}/availability?` +
        new URLSearchParams({
          service_id: data.service,
          staff_id: data.second,
          from: '2026-11-06',
          to: '2026-11-06',
        }),
    );
    expect(
      (await publicTimes.json()).data.days[0].slots.some(
        (s: { starts_at: string }) => s.starts_at === '2026-11-06T07:00:00.000Z',
      ),
    ).toBe(true);
    expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
      1,
    );
  } finally {
    await context.close();
  }
});
test('a replacement taken after selection reports conflict and preserves the original booking', async ({
  page,
  browser,
  stack,
}) => {
  const id = await book(page, stack.origin);
  await selectReplacement(page);
  const context = await browser.newContext(),
    rival = await context.newPage();
  try {
    await registerAndLogin(rival, stack.origin, 'change-rival@example.com');
    const response = await rival.request.post(`${stack.origin}/api/v1/appointments`, {
      headers: { Origin: stack.origin, 'Idempotency-Key': randomUUID() },
      data: {
        business_id: data.business,
        service_id: data.service,
        staff_id: data.staff,
        starts_at: '2026-11-06T07:00:00.000Z',
        expected_price_irr: 2500000,
        expected_duration_minutes: 30,
        customer_name: 'مشتری دیگر',
        customer_mobile: '09123456789',
      },
    });
    expect(response.status()).toBe(201);
    await page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'این زمان دیگر آزاد نیست' }),
    ).toBeVisible();
    const row = (
      await stack.pool.query('SELECT starts_at,version FROM app.appointments WHERE id=$1', [id])
    ).rows[0];
    expect(row.starts_at.toISOString()).toBe('2026-11-05T07:00:00.000Z');
    expect(row.version).toBe(1);
    await page.getByRole('button', { name: 'دریافت تازه‌ترین نوبت و زمان‌ها' }).click();
    await expect(page.locator('[data-slot="2026-11-06T07:00:00.000Z"]')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
test('lost change response recovers the same committed version after reload without persisting contact', async ({
  page,
  stack,
}) => {
  const id = await book(page, stack.origin);
  await selectReplacement(page);
  await page.route('**/api/v1/appointments/*/rescheduling', async (route) => {
    const result = await route.fetch();
    expect(result.status()).toBe(200);
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true }).click();
  await expect(page.getByRole('button', { name: 'بررسی نتیجه درخواست' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'متخصص نوبت تازه' })).toBeDisabled();
  const storage = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
  expect(storage).not.toMatch(/09123456789|مشتری تغییر زمان|customer_mobile/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'زمان جدید نوبت ثبت شد' })).toBeVisible();
  const events = (
    await stack.pool.query(
      "SELECT count(*)::int n FROM app.booking_events WHERE appointment_id=$1 AND action='rescheduled'",
      [id],
    )
  ).rows[0].n;
  expect(events).toBe(1);
});
test('mobile, desktop, 200% text and expired deadline retain honest accessible actions', async ({
  page,
  stack,
}) => {
  const id = await book(page, stack.origin);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await selectReplacement(page);
  const folder = fileURLToPath(new URL('../../work/sprint-08-screens/', import.meta.url));
  await mkdir(folder, { recursive: true });
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    if (width === 390 || width === 1280)
      await page.screenshot({ path: folder + `reschedule-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addStyleTag({ content: 'html{font-size:200% !important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true })).toBeFocused();
  await page.screenshot({ path: folder + 'reschedule-text-200.png', fullPage: true });
  await page.goto(`${stack.origin}/appointments/${id}`);
  await page.screenshot({ path: folder + 'customer-detail-390.png', fullPage: true });
  const near = await page.request.post(`${stack.origin}/api/v1/appointments`, {
    headers: { Origin: stack.origin, 'Idempotency-Key': randomUUID() },
    data: {
      business_id: data.business,
      service_id: data.service,
      staff_id: data.staff,
      starts_at: '2026-11-03T07:00:00.000Z',
      expected_price_irr: 2500000,
      expected_duration_minutes: 30,
      customer_name: 'نوبت نزدیک',
      customer_mobile: '09123456789',
    },
  });
  expect(near.status()).toBe(201);
  const nearId = (await near.json()).data.id;
  await page.goto(`${stack.origin}/appointments/${nearId}`);
  await expect(page.getByRole('link', { name: 'تغییر زمان نوبت', exact: true })).toHaveCount(0);
  await expect(page.getByText(/مهلت تغییر آنلاین این نوبت گذشته است/)).toBeVisible();
  await page.goto(`${stack.origin}/appointments/${nearId}/reschedule`);
  await expect(page.getByText(/این نوبت امکان تغییر آنلاین ندارد/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'تأیید تغییر زمان', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
