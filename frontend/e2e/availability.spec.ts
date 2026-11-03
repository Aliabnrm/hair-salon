import { test, expect } from './fixtures/test-stack';
import { seedAvailability } from '../../backend/test/helpers/availability-fixture';
import type { Page } from '@playwright/test';

test.use({ availabilityNow: '2026-11-03T06:00:00Z' });
let data: Awaited<ReturnType<typeof seedAvailability>>;
test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  data = await seedAvailability(stack.pool, '2026-11-03');
});
const times = (origin: string, query = '') => `${origin}/salons/${data.business}/times${query}`;
async function ready(page: Page) {
  await expect(page.locator('[data-slot]').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'دریافت دوباره زمان‌ها', exact: true }),
  ).toBeEnabled();
}
test('anonymous real public flow, accurate buffers, any/specific, summary and URL history', async ({
  page,
  stack,
}) => {
  await page.goto(`${stack.origin}/salons/${data.business}`);
  await page.getByRole('link', { name: 'بررسی زمان‌ها', exact: true }).click();
  await ready(page);
  await expect(
    page.getByText('زمان‌ها بر اساس برنامه ثبت‌شده سالن هستند؛ ثبت آنلاین نوبت هنوز فعال نیست.'),
  ).toBeVisible();
  await page.getByLabel('خدمت', { exact: true }).selectOption(data.service);
  await ready(page);
  await expect(page.locator('[data-slot]')).toHaveCount(4);
  await expect(page.locator('[data-slot]').first()).toHaveAttribute(
    'aria-label',
    'شروع 10:30، پایان 11:00',
  );
  await page.locator('[data-slot]').first().click();
  const summary = page.getByRole('region', { name: 'خلاصه انتخاب' });
  await expect(summary).toContainText('۲۵۰٬۰۰۰ تومان');
  await expect(summary).toContainText('این انتخاب نوبت ثبت‌شده نیست');
  await page.getByLabel('متخصص', { exact: true }).selectOption(data.staff);
  await ready(page);
  await expect(summary).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`staff_id=${data.staff}`));
  await page.locator('[data-date="2026-11-05"]').click();
  await ready(page);
  await expect(page).toHaveURL(/date=2026-11-05/);
  await page.reload();
  await ready(page);
  await expect(page.locator('[data-date="2026-11-05"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-date="2026-11-06"]').click();
  await ready(page);
  await page.goBack();
  await ready(page);
  await expect(page.locator('[data-date="2026-11-05"]')).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await ready(page);
  await expect(page.locator('[data-date="2026-11-06"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('متخصص', { exact: true }).selectOption(data.second);
  await ready(page);
  await page.locator('[data-slot]').first().click();
  await page.getByLabel('خدمت', { exact: true }).selectOption(data.freeService);
  await ready(page);
  await expect(page.getByLabel('متخصص', { exact: true })).toHaveValue('any');
  await expect(summary).toHaveCount(0);
  await page.locator('[data-slot]').first().click();
  await expect(summary).toContainText('۰ تومان');
  await expect(summary).toContainText('۱۷ دقیقه');
  await expect(page.getByRole('button', { name: /تأیید رزرو|ثبت نوبت|ادامه/ })).toHaveCount(0);
});
test('closed days, invalid/expired links, hidden staff and reset have distinct honest states', async ({
  page,
  stack,
}) => {
  await page.goto(times(stack.origin, `?service_id=${data.service}&date=2026-11-04`));
  await expect(
    page.getByText('در این روز زمانی طبق برنامه ثبت‌شده پیدا نشد.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('[data-slot]')).toHaveCount(0);
  await page.goto(times(stack.origin, `?service_id=${data.service}&date=2026-11-02`));
  await expect(page.locator('article [role="alert"]')).toContainText(
    'این تاریخ دیگر در محدوده مجاز نیست',
  );
  await page.getByRole('button', { name: 'بازگشت به تاریخ‌های مجاز', exact: true }).click();
  await ready(page);
  await expect(page.locator('[data-date="2026-11-03"]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto(times(stack.origin, '?date=wrong'));
  await expect(page.locator('article [role="alert"]')).toContainText('نشانی انتخاب معتبر نیست');
  await page.goto(times(stack.origin, `?service_id=${data.service}&staff_id=${data.hidden}`));
  await expect(page.locator('article [role="alert"]')).toContainText('دیگر در دسترس عمومی نیست');
  await expect(page.locator('[data-slot]')).toHaveCount(0);
});
test('a network failure hides stale slots, retry and focus refresh reflect real new data and unpublication', async ({
  page,
  stack,
}) => {
  await page.goto(times(stack.origin, `?service_id=${data.service}`));
  await ready(page);
  await page.locator('[data-slot]').first().click();
  await page.route('**/api/v1/catalog/salons/*/availability?*', (r) => r.abort());
  await page.getByRole('button', { name: 'دریافت دوباره زمان‌ها', exact: true }).click();
  await expect(page.locator('article [role="alert"]')).toBeVisible();
  await expect(page.locator('[data-slot]')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'خلاصه انتخاب' })).toHaveCount(0);
  await page.unroute('**/api/v1/catalog/salons/*/availability?*');
  await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  await ready(page);
  await stack.pool.query('UPDATE app.services SET price_irr=0,duration_minutes=17 WHERE id=$1', [
    data.service,
  ]);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await ready(page);
  await page.locator('[data-slot]').first().click();
  await expect(page.getByRole('region', { name: 'خلاصه انتخاب' })).toContainText('۰ تومان');
  await expect(page.getByRole('region', { name: 'خلاصه انتخاب' })).toContainText('۱۷ دقیقه');
  await stack.pool.query(
    "UPDATE app.businesses SET state='suspended',current_request_id=NULL WHERE id=$1",
    [data.business],
  );
  await page.getByRole('button', { name: 'دریافت دوباره زمان‌ها', exact: true }).click();
  await expect(page.locator('article [role="alert"]')).toContainText('دیگر در دسترس عمومی نیست');
  await expect(page.locator('[data-slot]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'بازگشت به کاوش سالن‌ها' })).toBeVisible();
});
test('rapid dates abort earlier requests, and delayed responses cannot replace current intent', async ({
  page,
  stack,
}) => {
  await page.goto(times(stack.origin, `?service_id=${data.service}`));
  await ready(page);
  let release: (() => void) | undefined;
  const delayed = new Promise<void>((resolve) => {
    release = resolve;
  });
  let waiting = false;
  await page.route('**/api/v1/catalog/salons/*/availability?*', async (route) => {
    if (new URL(route.request().url()).searchParams.get('from') === '2026-11-20') {
      waiting = true;
      await delayed;
    }
    await route.continue().catch(() => undefined); // Expected when the superseded request is aborted.
  });
  await page.locator('[data-date="2026-11-20"]').click();
  await expect.poll(() => waiting).toBe(true);
  await expect(page.locator('[data-slot]')).toHaveCount(0);
  await page.locator('[data-date="2026-11-21"]').click();
  await ready(page);
  release?.();
  await expect(page).toHaveURL(/date=2026-11-21/);
  await expect(page.locator('[data-date="2026-11-21"]')).toHaveAttribute('aria-pressed', 'true');
  expect((await page.locator('[data-slot]').first().getAttribute('data-slot'))?.slice(0, 10)).toBe(
    '2026-11-21',
  );
});
test('mobile, desktop, keyboard and enlarged text keep every action reachable inside AppShell', async ({
  page,
  stack,
}) => {
  await page.goto(times(stack.origin, `?service_id=${data.service}`));
  await ready(page);
  for (const width of [320, 360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    const button = page.locator('[data-slot]').first();
    await button.scrollIntoViewIfNeeded();
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    const nav = page.getByRole('navigation').last(),
      navBox = await nav.boundingBox();
    if (box && navBox) expect(box.y + box.height).toBeLessThanOrEqual(navBox.y);
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  await page.locator('[data-slot]').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('region', { name: 'خلاصه انتخاب' })).toBeVisible();
  await page
    .getByRole('button', { name: 'دریافت دوباره زمان‌ها', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: 'دریافت دوباره زمان‌ها', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: '../work/sprint-06-mobile-200-percent.png' });
});
