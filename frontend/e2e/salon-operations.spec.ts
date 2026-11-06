import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures/test-stack';
import { registerAndLogin } from './fixtures/account-flow';
import { seedAvailability } from '../../backend/test/helpers/availability-fixture';
import type { Page } from '@playwright/test';
const screens = fileURLToPath(new URL('../../work/sprint-09-screens/', import.meta.url));
const now = '2026-11-03T06:00:00Z';
test.use({ availabilityNow: now, timezoneId: 'America/Los_Angeles', reducedMotion: 'reduce' });
let data: Awaited<ReturnType<typeof seedAvailability>>;
test.beforeEach(async ({ stack, page }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  data = await seedAvailability(stack.pool, '2026-11-03');
  await page.clock.setFixedTime(new Date(now));
});
async function owner(page: Page, stack: { origin: string; pool: import('pg').Pool }) {
  await registerAndLogin(page, stack.origin, 'operations-owner@example.com');
  const id = (
    await stack.pool.query("SELECT id FROM app.users WHERE email='operations-owner@example.com'")
  ).rows[0].id;
  await stack.pool.query('UPDATE app.business_memberships SET user_id=$2 WHERE business_id=$1', [
    data.business,
    id,
  ]);
  return id;
}
async function seedPast(stack: { origin: string; pool: import('pg').Pool }, actor: string) {
  // A previous-day appointment is inserted as one valid ledger transaction; production has no backdated booking route.
  const id = randomUUID(),
    tx = await stack.pool.connect();
  try {
    await tx.query('BEGIN');
    await tx.query(
      `INSERT INTO app.appointments(id,business_id,service_id,staff_id,booking_user_id,created_by,code,source,starts_at,ends_at,snapshot)
 VALUES($1,$2,$3,$4,$5,$5,$6,'online','2026-11-02T07:00:00Z','2026-11-02T07:30:00Z',$7::jsonb)`,
      [
        id,
        data.business,
        data.service,
        data.staff,
        actor,
        id.replaceAll('-', '').slice(0, 16),
        JSON.stringify({
          business_name: 'سالن زمان نیلوفر',
          business_address: null,
          business_phone: null,
          service_name: 'کوتاهی دقیق',
          staff_name: 'متخصص اول',
          price_irr: 2500000,
          duration_minutes: 30,
          buffer_before_minutes: 10,
          buffer_after_minutes: 5,
          service_version: 1,
          customer_name: 'مشتری مراجعه دیروز',
          customer_mobile: '09123456789',
          timezone: 'Asia/Tehran',
          policy: 'سیاست آزمون',
        }),
      ],
    );
    await tx.query(
      "INSERT INTO app.schedule_allocations(appointment_id,business_id,staff_id,occupied_start,occupied_end) VALUES($1,$2,$3,'2026-11-02T06:50:00Z','2026-11-02T07:35:00Z')",
      [id, data.business, data.staff],
    );
    await tx.query(
      "INSERT INTO app.booking_events(appointment_id,version,actor_id,action) VALUES($1,1,$2,'created')",
      [id, actor],
    );
    await tx.query('COMMIT');
    return id;
  } catch (e) {
    await tx.query('ROLLBACK');
    throw e;
  } finally {
    tx.release();
  }
}
test('owner records, corrects and shares result; week summary and filters reflect the same booking', async ({
  page,
  browser,
  stack,
}) => {
  const customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    customer = await customerContext.newPage();
  try {
    await registerAndLogin(customer, stack.origin, 'operations-customer@example.com');
    const customerId = (
      await stack.pool.query(
        "SELECT id FROM app.users WHERE email='operations-customer@example.com'",
      )
    ).rows[0].id;
    const id = await seedPast(stack, customerId);
    await owner(page, stack);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${stack.origin}/manage/${data.business}/appointments`);
    await page.getByRole('button', { name: 'روز قبل', exact: true }).click();
    await expect(page.getByRole('region', { name: 'خلاصه برنامه سالن' })).toContainText(
      'منتظر ثبت نتیجه',
    );
    await page.getByRole('link').filter({ hasText: 'مشتری مراجعه دیروز' }).click();
    await page.getByRole('button', { name: 'ثبت نتیجه مراجعه', exact: true }).click();
    await page.getByRole('combobox', { name: 'نتیجه نوبت', exact: true }).selectOption('completed');
    await page.getByRole('button', { name: 'تأیید نتیجه مراجعه', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'این نوبت انجام شده است' })).toBeVisible();
    await customer.goto(`${stack.origin}/appointments/${id}`);
    await expect(customer.getByRole('heading', { name: 'این نوبت انجام شده است' })).toBeVisible();
    await expect(customer.getByText('نتیجه: انجام‌شده', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'اصلاح با دلیل', exact: true }).click();
    await page.getByRole('combobox', { name: 'نتیجه نوبت', exact: true }).selectOption('no_show');
    await page.getByLabel('دلیل اصلاح نتیجه').fill('ثبت نتیجه اشتباه بود؛ مشتری مراجعه نکرد');
    await page.getByRole('button', { name: 'تأیید نتیجه مراجعه', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'برای این نوبت عدم حضور ثبت شده است' }),
    ).toBeVisible();
    await customer.reload();
    await expect(
      customer.getByText('اصلاح نتیجه مراجعه · توسط سالن', { exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'بازگشت به نوبت‌ها', exact: true }).click();
    await page.getByRole('button', { name: 'روز قبل', exact: true }).click();
    await page.getByRole('button', { name: 'فهرست هفته', exact: true }).click();
    await page.getByRole('combobox', { name: 'وضعیت نوبت', exact: true }).selectOption('completed');
    await expect(
      page.getByRole('heading', { name: 'برای این بازه و فیلتر نوبتی پیدا نشد' }),
    ).toBeVisible();
    await page.getByRole('combobox', { name: 'وضعیت نوبت', exact: true }).selectOption('no_show');
    await expect(page.getByRole('link').filter({ hasText: 'مشتری مراجعه دیروز' })).toHaveCount(1);
  } finally {
    await customerContext.close();
  }
});
test('block create/release reaches real public capacity and remains usable on mobile and large text', async ({
  page,
  stack,
}) => {
  await owner(page, stack);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${stack.origin}/manage/${data.business}/appointments`);
  await page.getByRole('button', { name: 'مسدودکردن زمان', exact: true }).click();
  await page.getByRole('combobox', { name: 'متخصص مسدودی', exact: true }).selectOption(data.staff);
  await page.getByLabel('شروع مسدودی', { exact: true }).fill('10:30');
  await page.getByLabel('پایان مسدودی', { exact: true }).fill('11:00');
  await page.getByLabel('دلیل خصوصی مسدودی', { exact: true }).fill('استراحت خصوصی متخصص');
  await mkdir(screens, { recursive: true });
  await page.screenshot({ path: screens + 'block-form-390.png', fullPage: true });
  await page.getByRole('button', { name: 'تأیید مسدودی زمان', exact: true }).click();
  await expect(
    page.getByText('مسدودی ثبت شد؛ وضعیت فعلی در فهرست زیر نمایش داده می‌شود.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'متخصص اول · زمان مسدود' })).toBeVisible();
  const url = `${stack.origin}/api/v1/catalog/salons/${data.business}/availability?service_id=${data.service}&staff_id=${data.staff}&from=2026-11-03&to=2026-11-03`;
  const blocked = await page.request.get(url),
    body = await blocked.json();
  expect(JSON.stringify(body)).not.toContain('استراحت خصوصی');
  expect(
    body.data.days[0].slots.some(
      (s: { starts_at: string }) => s.starts_at === '2026-11-03T07:00:00.000Z',
    ),
  ).toBe(false);
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.locator('body').evaluate((el) => el.scrollWidth <= window.innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => (document.documentElement.style.fontSize = '200%'));
  expect(await page.locator('body').evaluate((el) => el.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'رفع مسدودی', exact: true }).click();
  await page.getByLabel('دلیل رفع مسدودی', { exact: true }).fill('استراحت لغو شد');
  await page.getByRole('button', { name: 'تأیید رفع مسدودی', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'متخصص اول · مسدودی رفع‌شده' })).toBeVisible();
  const freed = await page.request.get(url);
  expect(
    (await freed.json()).data.days[0].slots.some(
      (s: { starts_at: string }) => s.starts_at === '2026-11-03T07:00:00.000Z',
    ),
  ).toBe(true);
});
test('lost block response after commit recovers on reload with the same resource and no private reason in storage', async ({
  page,
  stack,
}) => {
  await owner(page, stack);
  await page.goto(`${stack.origin}/manage/${data.business}/appointments`);
  await page.getByRole('button', { name: 'مسدودکردن زمان', exact: true }).click();
  await page.getByRole('combobox', { name: 'متخصص مسدودی', exact: true }).selectOption(data.staff);
  await page.getByLabel('دلیل خصوصی مسدودی', { exact: true }).fill('دلیل خصوصی قطع شبکه');
  await page.route(
    `**/api/v1/businesses/${data.business}/schedule-blocks`,
    async (route) => {
      await route.fetch();
      await route.abort('failed');
    },
    { times: 1 },
  );
  await page.getByRole('button', { name: 'تأیید مسدودی زمان', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'بررسی نتیجه درخواست', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => JSON.stringify(sessionStorage))).not.toContain('دلیل خصوصی');
  await page.reload();
  await page.getByRole('button', { name: 'مسدودکردن زمان', exact: true }).click();
  await expect(
    page.getByText('مسدودی ثبت شد؛ وضعیت فعلی در فهرست زیر نمایش داده می‌شود.', { exact: true }),
  ).toBeVisible();
  expect(
    (await stack.pool.query('SELECT count(*)::int n FROM app.schedule_blocks')).rows[0].n,
  ).toBe(1);
});
