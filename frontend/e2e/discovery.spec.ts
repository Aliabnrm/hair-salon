import { test, expect } from './fixtures/test-stack';
import { seedPublicSalons } from './fixtures/public-salons';
test.beforeEach(async ({ stack }) => {
  await seedPublicSalons(stack.pool);
});
test('real public filters are shareable, normalize Persian and restore browser history', async ({
  page,
  stack,
}) => {
  await page.goto(stack.origin);
  await expect(page.getByText('۲ سالن در این صفحه', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'بانوان', exact: true }).click();
  await page.getByRole('button', { name: 'رنگ مو', exact: true }).click();
  await page.getByRole('searchbox').fill('نيلوفر');
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByRole('link', { name: /آزمون کشف نیلوفر/ })).toBeVisible();
  await expect(page.getByText('۱ سالن در این صفحه', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('ناموجود');
  await expect(page.getByRole('heading', { name: 'سالنی پیدا نشد' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('نيلوفر');
  await expect(page.getByRole('link', { name: /آزمون کشف نیلوفر/ })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole('searchbox')).toHaveValue('ناموجود');
  await page.getByRole('button', { name: 'پاک کردن فیلترها', exact: true }).click();
  await expect(page.getByText('۲ سالن در این صفحه', { exact: true })).toBeVisible();
  const card = page.getByRole('link', { name: /آزمون کشف نیلوفر/ });
  await expect(card).toHaveAttribute('href', /\/salons\/[a-f0-9-]{36}$/);
  await card.click();
  await expect(page.getByRole('heading', { name: 'خدمات و قیمت‌ها' })).toBeVisible();
  await expect(page.getByRole('link', { name: '+989121234567', exact: true })).toHaveAttribute(
    'href',
    'tel:+989121234567',
  );
  await expect(page.getByRole('button', { name: 'رزرو', exact: true })).toHaveCount(0);
});
test('real locations trap focus and an empty database never falls back to sample salons', async ({
  page,
  stack,
}) => {
  await page.goto(stack.origin);
  const opener = page.getByRole('button', { name: /تغییر شهر و محله/ });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'بستن', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'نمایش سالن‌ها', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: 'کاشان', exact: true }).click();
  await dialog.getByRole('button', { name: 'یاس', exact: true }).click();
  await dialog.getByRole('button', { name: 'نمایش سالن‌ها', exact: true }).click();
  await expect(page.getByText('۱ سالن در این صفحه', { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/city=.*district=/);
  await stack.pool.query("UPDATE app.businesses SET state='draft',current_request_id=NULL");
  await page.reload();
  await expect(page.getByRole('heading', { name: 'سالنی پیدا نشد' })).toBeVisible();
  await expect(page.getByRole('region').locator('img')).toHaveCount(0);
  await opener.click();
  await expect(
    dialog.getByText(
      'هنوز سالنی منتشر نشده است؛ پس از انتشار، شهرهای واقعی اینجا نمایش داده می‌شوند.',
    ),
  ).toBeVisible();
});
test('network failures and late responses never masquerade as empty or replace newer filters', async ({
  page,
  context,
  stack,
}) => {
  await page.goto(stack.origin);
  await expect(page.getByText('۲ سالن در این صفحه', { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('searchbox').fill('قطعی');
  await expect(
    page.getByRole('alert').filter({ hasText: 'دریافت سالن‌ها انجام نشد' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'سالنی پیدا نشد' })).toHaveCount(0);
  await context.setOffline(false);
  await page.getByRole('button', { name: 'تلاش دوباره', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'سالنی پیدا نشد' })).toBeVisible();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route('**/api/v1/catalog/salons?**', async (route) => {
    const q = new URL(route.request().url()).searchParams.get('q');
    if (q === 'قدیمی') {
      requested = true;
      await gate;
    }
    await route.continue().catch(() => undefined);
  });
  try {
    await page.getByRole('searchbox').fill('قدیمی');
    await expect.poll(() => requested).toBe(true);
    await page.getByRole('searchbox').fill('نيلوفر');
    await expect(page.getByRole('link', { name: /آزمون کشف نیلوفر/ })).toBeVisible();
    release();
    await expect(page.getByRole('searchbox')).toHaveValue('نيلوفر');
    await expect(page.getByText('۱ سالن در این صفحه', { exact: true })).toBeVisible();
  } finally {
    release();
    await page.unroute('**/api/v1/catalog/salons?**');
  }
});

test('cursor navigation stays in the URL and filter changes reset the page', async ({
  page,
  stack,
}) => {
  await page.goto(stack.origin + '/?limit=1');
  await expect(page.getByText('۱ سالن در این صفحه', { exact: true })).toBeVisible();
  const first = await page.getByRole('region').getByRole('link').first().getAttribute('href');
  await page.getByRole('button', { name: 'صفحه بعد', exact: true }).click();
  await expect(page).toHaveURL(/cursor=/);
  await expect(page.getByText('۱ سالن در این صفحه', { exact: true })).toBeVisible();
  expect(await page.getByRole('region').getByRole('link').first().getAttribute('href')).not.toBe(
    first,
  );
  await page.goBack();
  await expect(page.getByRole('region').getByRole('link').first()).toHaveAttribute(
    'href',
    first ?? '',
  );
  await page.getByRole('button', { name: 'آقایان', exact: true }).click();
  await expect(page).not.toHaveURL(/cursor=/);
  await expect(page.getByRole('link', { name: /آزمون کشف ماهور/ })).toBeVisible();
});
