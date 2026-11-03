import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test-stack';
import { registerAndLogin } from './fixtures/account-flow';
async function nav(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'مدیریت سالن', exact: true })
    .getByRole('link', { name, exact: true })
    .click();
}
test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
});
test('owner requests, independent reviewer decides and anonymous customer sees only reviewed data', async ({
  page,
  browser,
  stack,
}, testInfo) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(10000);
  const ownerEmail = 'publication-owner-' + randomUUID() + '@example.com';
  await registerAndLogin(page, stack.origin, ownerEmail);
  await page.goto(stack.origin + '/manage/new');
  await page.getByLabel('نام سالن', { exact: true }).fill('سالن مسیر واقعی انتشار');
  await page.getByLabel('شهر', { exact: true }).fill('تهران');
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByRole('heading', { name: 'مشخصات سالن', exact: true })).toBeVisible();
  const root = new URL(page.url()).pathname,
    id = root.split('/').at(-1);
  if (!id) throw new Error('Missing business');
  await nav(page, 'انتشار');
  await expect(page.getByText('آدرس عمومی را وارد کنید.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'ارسال درخواست انتشار' })).toBeDisabled();
  await nav(page, 'مشخصات');
  await page.getByLabel('آدرس عمومی (اختیاری)').fill('تهران، نشانی عمومی مسیر آزمون');
  await page.getByLabel('موبایل عمومی سالن (اختیاری)').fill('09121234567');
  await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByText('مشخصات ذخیره شد.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('آدرس عمومی (اختیاری)')).toHaveValue(
    'تهران، نشانی عمومی مسیر آزمون',
  );
  await expect(page.getByLabel('موبایل عمومی سالن (اختیاری)')).toHaveValue('+989121234567');
  await nav(page, 'خدمات');
  await page.getByRole('button', { name: 'خدمت جدید', exact: true }).click();
  await page.getByLabel('نام خدمت', { exact: true }).fill('کوتاهی واقعی');
  await page.getByLabel('دسته خدمت', { exact: true }).selectOption('haircut');
  await page.getByLabel('قیمت (تومان)', { exact: true }).fill('۲۵۰۰۰۰');
  await page.getByRole('button', { name: 'ذخیره خدمت', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'کوتاهی واقعی', exact: true })).toBeVisible();
  await nav(page, 'متخصصان');
  await page.getByRole('button', { name: 'متخصص جدید', exact: true }).click();
  await page.getByLabel('نام نمایشی متخصص').fill('متخصص قابل نمایش');
  await page.getByLabel('کوتاهی واقعی', { exact: true }).check();
  await page.getByLabel('نمایش نام متخصص در پروفایل عمومی سالن').check();
  await page.getByRole('button', { name: 'ذخیره متخصص' }).click();
  await expect(page.getByRole('heading', { name: 'متخصص قابل نمایش', exact: true })).toBeVisible();
  await nav(page, 'ساعات کاری');
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByLabel('شنبه شروع 1', { exact: true }).fill('09:00');
  await page.getByLabel('شنبه پایان 1', { exact: true }).fill('18:00');
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByText('با موفقیت ذخیره شد.', { exact: true })).toBeVisible();
  await page.getByLabel('برنامه چه کسی؟').selectOption({ label: 'متخصص قابل نمایش' });
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByText('با موفقیت ذخیره شد.', { exact: true })).toBeVisible();
  await nav(page, 'انتشار');
  await expect(
    page.getByText('اطلاعات لازم تکمیل است؛ می‌توانید درخواست بررسی بفرستید.'),
  ).toBeVisible();
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const activeTab = page
      .getByRole('navigation', { name: 'مدیریت سالن', exact: true })
      .getByRole('link', { name: 'انتشار', exact: true });
    await expect(activeTab).toHaveAttribute('aria-current', 'page');
    await expect
      .poll(async () => {
        const bounds = await activeTab.boundingBox();
        return Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width);
      })
      .toBe(true);
    expect(await page.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: testInfo.outputPath(`owner-publication-${width}.png`),
      animations: 'disabled',
    });
  }
  await page.setViewportSize({ width: 320, height: 900 });
  const ownerZoom = await page.addStyleTag({ content: 'html {font-size:200% !important;}' });
  expect(await page.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await ownerZoom.evaluate((el) => el.parentNode?.removeChild(el));
  await page.getByRole('link', { name: 'پیش‌نمایش خصوصی' }).click();
  await expect(
    page.getByRole('heading', { name: 'سالن مسیر واقعی انتشار', exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/پیش‌نمایش خصوصی؛/)).toBeVisible();
  await page.goto(stack.origin + root + '/publication');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ارسال درخواست انتشار' }).click();
  await expect(page.getByText('درخواست شما در انتظار بررسی است.')).toBeVisible();
  const reviewContext = await browser.newContext(),
    anonymous = await browser.newContext();
  try {
    const customer = await anonymous.newPage();
    const privateResponse = await customer.goto(stack.origin + '/salons/' + id);
    expect(privateResponse?.status()).toBe(404);
    await expect(customer.getByRole('heading', { name: 'سالن در دسترس نیست' })).toBeVisible();
    const reviewer = await reviewContext.newPage(),
      reviewEmail = 'reviewer-' + randomUUID() + '@example.com';
    await registerAndLogin(reviewer, stack.origin, reviewEmail);
    const user = (await stack.pool.query('SELECT id FROM app.users WHERE email=$1', [reviewEmail]))
      .rows[0].id;
    await stack.pool.query('INSERT INTO app.reviewer_permissions(user_id,active) VALUES($1,true)', [
      user,
    ]);
    await reviewer.reload();
    await reviewer.getByRole('link', { name: 'بررسی درخواست‌های انتشار' }).click();
    await reviewer.getByRole('link', { name: 'سالن مسیر واقعی انتشار', exact: true }).click();
    for (const width of [320, 360, 390, 430, 1280]) {
      await reviewer.setViewportSize({ width, height: 900 });
      expect(
        await reviewer.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await reviewer.screenshot({
        path: testInfo.outputPath(`review-${width}.png`),
        animations: 'disabled',
      });
    }
    await reviewer.setViewportSize({ width: 320, height: 900 });
    const reviewZoom = await reviewer.addStyleTag({ content: 'html {font-size:200% !important;}' });
    expect(await reviewer.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await reviewZoom.evaluate((el) => el.parentNode?.removeChild(el));
    await reviewer.getByRole('button', { name: 'تأیید انتشار', exact: true }).click();
    await expect(reviewer.getByRole('button', { name: 'تعلیق انتشار', exact: true })).toBeVisible();
    await customer.goto(stack.origin);
    await customer.getByRole('searchbox').fill('مسیر واقعی');
    await customer.getByRole('link', { name: /سالن مسیر واقعی انتشار/ }).click();
    await expect(
      customer.getByRole('heading', { name: 'سالن مسیر واقعی انتشار', exact: true }),
    ).toBeVisible();
    await expect(customer.getByText('۲۵۰٬۰۰۰ تومان', { exact: true })).toBeVisible();
    await expect(
      customer.getByRole('link', { name: '+989121234567', exact: true }),
    ).toHaveAttribute('href', 'tel:+989121234567');
    for (const width of [320, 360, 390, 430, 1280]) {
      await customer.setViewportSize({ width, height: 900 });
      expect(
        await customer.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await customer.screenshot({
        path: testInfo.outputPath(`public-${width}.png`),
        animations: 'disabled',
      });
    }
    await customer.setViewportSize({ width: 320, height: 900 });
    await customer.addStyleTag({ content: 'html {font-size:200% !important;}' });
    expect(await customer.locator('main').evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    // A real owner mutation removes publication; the next anonymous request is an actual 404.
    await page.goto(stack.origin + root + '/services');
    const categoriesGate = Promise.withResolvers<void>();
    await page.route('**/api/v1/catalog/categories', async (route) => {
      await categoriesGate.promise;
      await route.continue();
    });
    try {
      const categoriesRequest = page.waitForRequest('**/api/v1/catalog/categories');
      await page.getByRole('button', { name: 'ویرایش کوتاهی واقعی', exact: true }).click();
      await categoriesRequest;
      await page.getByLabel('قیمت (تومان)', { exact: true }).fill('۲۶۰۰۰۰');
      const save = page.getByRole('button', { name: 'ذخیره خدمت', exact: true });
      await expect(save).toBeDisabled();
      categoriesGate.resolve();
      await expect(page.getByLabel('دسته خدمت', { exact: true })).toHaveValue('haircut');
      await expect(save).toBeEnabled();
      await save.click();
      await expect(page.getByText('۲۶۰٬۰۰۰ تومان', { exact: false })).toBeVisible();
    } finally {
      categoriesGate.resolve();
      await page.unrouteAll({ behavior: 'wait' });
    }
    expect((await customer.reload())?.status()).toBe(404);
    await page.goto(stack.origin + root + '/publication');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'ارسال درخواست انتشار' }).click();
    await expect(page.getByText('درخواست شما در انتظار بررسی است.')).toBeVisible();
    await reviewer.reload();
    await reviewer.getByLabel('دلیل رد یا تعلیق').fill('نشانی را دقیق‌تر کنید');
    await reviewer.getByRole('button', { name: 'رد درخواست', exact: true }).click();
    await expect(reviewer.getByText('نشانی را دقیق‌تر کنید', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('نشانی را دقیق‌تر کنید', { exact: true })).toBeVisible();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'ارسال درخواست انتشار' }).click();
    await expect(page.getByText('درخواست شما در انتظار بررسی است.')).toBeVisible();
    await reviewer.reload();
    await reviewer.getByRole('button', { name: 'تأیید انتشار', exact: true }).click();
    await expect(reviewer.getByRole('button', { name: 'تعلیق انتشار', exact: true })).toBeVisible();
    await reviewer.getByLabel('دلیل رد یا تعلیق').fill('اصلاح اطلاعات تماس لازم است');
    await reviewer.getByRole('button', { name: 'تعلیق انتشار', exact: true }).click();
    await expect(reviewer.getByText('اصلاح اطلاعات تماس لازم است', { exact: true })).toBeVisible();
    expect((await customer.goto(stack.origin + '/salons/' + id))?.status()).toBe(404);
    await stack.pool.query('UPDATE app.reviewer_permissions SET active=false WHERE user_id=$1', [
      user,
    ]);
    await reviewer.reload();
    await expect(reviewer.getByText('این حساب دسترسی بررسی انتشار ندارد.')).toBeVisible();
    await expect(
      reviewer.getByRole('heading', { name: 'سالن مسیر واقعی انتشار', exact: true }),
    ).toHaveCount(0);
    await page.goto(stack.origin + '/account');
    await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
    await page.goto(stack.origin + root + '/preview');
    await expect(page.getByRole('heading', { name: 'ورود به حساب لازم است' })).toBeVisible();
  } finally {
    await reviewContext.close();
    await anonymous.close();
  }
});
