import { test, expect } from './fixtures/test-stack';
import { seedAvailability } from '../../backend/test/helpers/availability-fixture';
test.use({ availabilityNow: '2026-11-03T20:31:00Z', timezoneId: 'America/Los_Angeles' });
test('uses the new Tehran day after midnight, even in a browser in a different timezone', async ({
  page,
  stack,
}) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
  const data = await seedAvailability(stack.pool, '2026-11-04');
  await page.goto(
    `${stack.origin}/salons/${data.business}/times?service_id=${data.service}&date=2026-11-03`,
  );
  await expect(page.locator('article [role="alert"]')).toContainText(
    'این تاریخ دیگر در محدوده مجاز نیست',
  );
  await page.getByRole('button', { name: 'بازگشت به تاریخ‌های مجاز', exact: true }).click();
  await expect(page.locator('[data-slot]').first()).toBeVisible();
  await expect(page.locator('[data-date="2026-11-04"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-date="2026-12-03"]')).toBeVisible();
  await expect(page.locator('[data-date="2026-11-03"]')).toHaveCount(0);
  await expect(page.locator('[data-date="2026-12-04"]')).toHaveCount(0);
  await page.locator('[data-date="2026-12-03"]').click();
  await expect(page).toHaveURL(/date=2026-12-03/);
  await expect(page.locator('[data-slot]').first()).toHaveAttribute('data-slot', /^2026-12-03T/);
  await page.getByLabel('خدمت', { exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('متخصص', { exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'روزهای قبل', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'روزهای بعد', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-date="2026-11-04"]')).toBeFocused();
});
