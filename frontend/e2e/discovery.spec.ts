import { test, expect } from './fixtures/test-stack';
test('combined filters, Persian search, empty results and reset use explicit fixtures', async ({
  page,
  stack,
}) => {
  await page.goto(stack.origin);
  await expect(page.getByText('۶ نتیجه', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      'سالن‌ها، قیمت‌ها و ساعت‌ها نمایشی‌اند؛ رزرو هنوز فعال نیست.',
    ),
  ).toBeVisible();
  await page.getByRole('button', { name: 'بانوان', exact: true }).click();
  await page.getByRole('button', { name: 'رنگ مو', exact: true }).click();
  await expect(page.getByText('۲ نتیجه', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('نيلوفر');
  await expect(
    page.getByRole('button', { name: 'نمایش سالن نمونه سالن زیبایی نیلوفر' }),
  ).toBeVisible();
  await expect(page.getByText('۱ نتیجه', { exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('سالنی که وجود ندارد');
  await expect(
    page.getByRole('heading', { name: 'نتیجه‌ای پیدا نشد' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'پاک کردن فیلترها', exact: true })
    .click();
  await expect(page.getByText('۶ نتیجه', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'ناخن', exact: true }).click();
  await page.getByRole('button', { name: 'آقایان', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'همه خدمات', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'نمایش سالن نمونه پیرایش ماهور' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('این سالن نمونه است');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'نوبت‌های من', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('رزرو هنوز فعال نیست');
  await expect(
    page.getByRole('button', { name: 'نوبت‌های من', exact: true }),
  ).not.toContainText('۳');
});
test('location sheet traps keyboard focus, restores it, and applies a city with an empty reset', async ({
  page,
  stack,
}) => {
  await page.goto(stack.origin);
  const opener = page.getByRole('button', { name: /تغییر شهر و محله/ });
  await opener.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'بستن', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    dialog.getByRole('button', { name: 'نمایش سالن‌ها', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    dialog.getByRole('button', { name: 'بستن', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await opener.click();
  await dialog.getByRole('button', { name: 'مشهد', exact: true }).click();
  await dialog.getByRole('button', { name: 'سجاد', exact: true }).click();
  await dialog
    .getByRole('button', { name: 'نمایش سالن‌ها', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'نتیجه‌ای پیدا نشد' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'پاک کردن فیلترها', exact: true })
    .click();
  await expect(page.getByText('۲ نتیجه', { exact: true })).toBeVisible();
});
