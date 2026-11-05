import { test, expect } from './fixtures/test-stack';
import { seedAvailability } from '../../backend/test/helpers/availability-fixture';
import type { Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.use({ availabilityNow: '2026-11-03T06:00:00Z' });
let data: Awaited<ReturnType<typeof seedAvailability>>;
test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  data = await seedAvailability(stack.pool, '2026-11-03');
});
const times = (origin: string, query = '') => `${origin}/salons/${data.business}/times${query}`;
async function ready(page: Page) {
  await expect(page.locator('[data-slot]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'تازه‌سازی زمان‌ها', exact: true })).toBeEnabled();
}
test('salon booking action stays visible and contextual back links preserve the booking journey', async ({
  page,
  stack,
}) => {
  test.setTimeout(60_000);
  await mkdir('../work/booking-journey-ux', { recursive: true });
  await page.goto(`${stack.origin}/salons/${data.business}`);
  const action = page.getByRole('region', { name: 'رزرو نوبت سالن' });
  const reserve = action.getByRole('link', { name: 'انتخاب زمان و رزرو', exact: true });
  for (const width of [320, 360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('main').evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(reserve).toBeInViewport();
    expect(
      await page.locator('main').evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: `../work/booking-journey-ux/profile-${width}.png`,
      animations: 'disabled',
    });
    await page.locator('main').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(reserve).toBeInViewport();
    const footerBox = await action.boundingBox();
    const navBox = await page.getByRole('navigation', { name: 'ناوبری اصلی' }).boundingBox();
    if (!footerBox || !navBox)
      throw new Error('Booking action and main navigation must be visible.');
    expect(footerBox.y + footerBox.height).toBeLessThanOrEqual(navBox.y + 1);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('link', { name: 'انتخاب زمان برای کوتاهی دقیق', exact: true }).click();
  await ready(page);
  await expect(page.getByLabel('خدمت', { exact: true })).toHaveValue(data.service);
  await expect(action).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: 'بازگشت به صفحه سالن', exact: true }),
  ).toBeInViewport();
  await page.screenshot({
    path: '../work/booking-journey-ux/times-390.png',
    animations: 'disabled',
  });
  await page.locator('[data-slot]').first().click();
  const next = page.getByRole('link', { name: 'ادامه رزرو', exact: true });
  await expect(next).toBeInViewport();
  await page.screenshot({
    path: '../work/booking-journey-ux/selected-390.png',
    animations: 'disabled',
  });
  await next.click();
  await expect(page.getByRole('heading', { name: 'تأیید و ثبت نوبت', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'ورود با ایمیل', exact: true })).toBeInViewport();
  await expect(page.getByRole('region', { name: 'خلاصه انتخاب' })).toHaveCount(0);
  const selectedUrl = new URL(page.url());
  await page.screenshot({
    path: '../work/booking-journey-ux/guest-checkout-390.png',
    animations: 'disabled',
  });
  await page.getByRole('link', { name: 'ورود با ایمیل', exact: true }).click();
  await expect(page.getByRole('link', { name: 'بازگشت به رزرو', exact: true })).toHaveAttribute(
    'href',
    selectedUrl.pathname + selectedUrl.search,
  );
  await page.screenshot({
    path: '../work/booking-journey-ux/sign-in-390.png',
    animations: 'disabled',
  });
  await page.getByRole('link', { name: 'ثبت‌نام', exact: true }).click();
  await page.getByRole('link', { name: 'بازگشت به ورود', exact: true }).click();
  await page.getByRole('link', { name: 'بازگشت به رزرو', exact: true }).click();
  await page.getByRole('link', { name: 'بازگشت به انتخاب زمان', exact: true }).click();
  await ready(page);
  await expect(page.getByLabel('خدمت', { exact: true })).toHaveValue(data.service);
  expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
    0,
  );
  await page.getByRole('link', { name: 'بازگشت به صفحه سالن', exact: true }).click();
  await expect(reserve).toBeInViewport();
  await page.goto(stack.origin + '/sign-in?returnTo=/appointments');
  await expect(page.getByRole('link', { name: 'بازگشت به نوبت‌ها', exact: true })).toHaveAttribute(
    'href',
    '/appointments',
  );
});
test('anonymous real public flow, accurate buffers, any/specific, summary and URL history', async ({
  page,
  stack,
}) => {
  await page.goto(`${stack.origin}/salons/${data.business}`);
  await page.getByRole('link', { name: 'انتخاب زمان و رزرو', exact: true }).click();
  await ready(page);
  await expect(page.getByText('خدمت، روز و ساعت مناسب خود را انتخاب کنید.')).toBeVisible();
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
  await expect(summary).toContainText('ثبت نهایی در گام بعد است');
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
  await expect(page.getByText('برای این روز زمان آزادی پیدا نشد.', { exact: false })).toBeVisible();
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
  await expect(page.locator('article [role="alert"]')).toContainText('در حال حاضر قابل رزرو نیست');
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
  await page.getByRole('button', { name: 'تازه‌سازی زمان‌ها', exact: true }).click();
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
  await page.getByRole('button', { name: 'تازه‌سازی زمان‌ها', exact: true }).click();
  await expect(page.locator('article [role="alert"]')).toContainText('در حال حاضر قابل رزرو نیست');
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
    .getByRole('button', { name: 'تازه‌سازی زمان‌ها', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'تازه‌سازی زمان‌ها', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.screenshot({ path: '../work/sprint-06-mobile-200-percent.png' });
});
