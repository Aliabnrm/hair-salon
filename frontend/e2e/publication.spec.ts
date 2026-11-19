import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test-stack';
import { registerAndLogin, fill } from './fixtures/account-flow';
const now = '2026-11-03T06:00:00Z';
test.use({ availabilityNow: now });
async function nav(page: Page, name: string) {
  await page
    .getByRole('navigation', { name: 'مدیریت سالن', exact: true })
    .getByRole('link', { name, exact: true })
    .click();
}
test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.businesses,app.users,app.auth_attempt_buckets CASCADE');
});
test('owner publishes immediately, customer books the same salon and moderation remains independent', async ({
  page,
  browser,
  stack,
}, testInfo) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(10000);
  await page.clock.setFixedTime(new Date(now));
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
  const readiness = page.getByRole('region', { name: 'آماده‌سازی دریافت نوبت' });
  await expect(readiness.getByText(/سالن هنوز در کاوش دیده نمی‌شود/)).toBeVisible();
  await expect(readiness.getByText('آدرس عمومی را وارد کنید.', { exact: true })).toBeVisible();
  const notPublic = await page.request.get(
    stack.origin + '/api/v1/catalog/salons?q=' + encodeURIComponent('مسیر واقعی'),
  );
  expect(notPublic.ok()).toBe(true);
  expect((await notPublic.json()).data.items).toHaveLength(0);
  await readiness.getByRole('link', { name: 'ادامه به انتشار سالن' }).click();
  await expect(page.getByText('آدرس عمومی را وارد کنید.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'انتشار سالن' })).toBeDisabled();
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
  await expect(page.getByRole('status').getByText('برنامه هفتگی ذخیره شد')).toBeVisible();
  await page.getByLabel('برنامه چه کسی؟').selectOption({ label: 'متخصص قابل نمایش' });
  await page.getByRole('button', { name: 'افزودن بازه شنبه', exact: true }).click();
  await page.getByRole('button', { name: 'ذخیره برنامه هفتگی' }).click();
  await expect(page.getByRole('status').getByText('برنامه هفتگی ذخیره شد')).toBeVisible();
  await nav(page, 'انتشار');
  await expect(
    page.getByText('اطلاعات لازم تکمیل است؛ می‌توانید سالن را همین حالا منتشر کنید.'),
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
  expect((await page.request.get(stack.origin + '/api/v1/catalog/salons/' + id)).status()).toBe(
    404,
  );
  expect(
    (await stack.pool.query('SELECT count(*)::int n FROM app.reviewer_permissions WHERE active'))
      .rows[0].n,
  ).toBe(0);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'انتشار سالن', exact: true }).click();
  await expect(
    page.getByText('سالن شما در فهرست عمومی دیده می‌شود و در زمان‌های آزاد قابل رزرو است.'),
  ).toBeVisible();
  const reviewContext = await browser.newContext(),
    anonymous = await browser.newContext();
  try {
    const customer = await anonymous.newPage();
    await customer.clock.setFixedTime(new Date(now));
    const reviewer = await reviewContext.newPage(),
      reviewEmail = 'reviewer-' + randomUUID() + '@example.com';
    await reviewer.clock.setFixedTime(new Date(now));
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
    await expect(reviewer.getByRole('button', { name: 'تعلیق انتشار', exact: true })).toBeVisible();
    await customer.goto(stack.origin);
    await customer.getByRole('searchbox').fill('مسیر واقعی');
    await customer.getByRole('link', { name: /سالن مسیر واقعی انتشار/ }).click();
    await expect(
      customer.getByRole('heading', { name: 'سالن مسیر واقعی انتشار', exact: true }),
    ).toBeVisible();
    await expect(
      customer
        .getByRole('region', { name: 'خدمات و قیمت‌ها' })
        .getByText('۲۵۰٬۰۰۰ تومان', { exact: true }),
    ).toBeVisible();
    await expect(customer.getByRole('link', { name: /تماس با سالن/ })).toHaveAttribute(
      'href',
      'tel:+989121234567',
    );
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
    await customer.locator('main').evaluate((main) => {
      main.scrollTop = 0;
      return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    await expect(
      customer.getByRole('link', { name: 'انتخاب زمان و رزرو', exact: true }),
    ).toBeInViewport({ ratio: 1 });
    await expect(customer.getByRole('navigation', { name: 'ناوبری اصلی' })).toBeInViewport({
      ratio: 1,
    });
    const enlargedLayout = await customer.locator('main').evaluate((main) => {
      const bounds = main.getBoundingClientRect();
      return {
        fits: main.scrollWidth <= main.clientWidth,
        overflowing: [...main.querySelectorAll<HTMLElement>('*')]
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && (box.left < bounds.left - 1 || box.right > bounds.right + 1);
          })
          .slice(0, 10)
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            text: element.textContent?.slice(0, 60),
          })),
      };
    });
    await customer.screenshot({
      path: testInfo.outputPath('public-320-enlarged.png'),
      animations: 'disabled',
    });
    expect(enlargedLayout.fits, JSON.stringify(enlargedLayout.overflowing)).toBe(true);
    // Normal writes throughout: new salon -> owner publication -> discovery -> committed booking -> owner's diary.
    await customer.getByRole('link', { name: 'انتخاب زمان و رزرو', exact: true }).click();
    await customer.locator('[data-date="2026-11-07"]').click();
    await customer.locator('[data-slot]').first().click();
    await customer.getByRole('link', { name: 'ادامه رزرو' }).click();
    await expect(customer.getByText('هنوز نوبتی ثبت نشده است.', { exact: true })).toBeVisible();
    await expect(customer.getByRole('region', { name: 'جزئیات زمان انتخاب‌شده' })).toContainText(
      'سالن مسیر واقعی انتشار',
    );
    expect((await stack.pool.query('SELECT count(*)::int n FROM app.appointments')).rows[0].n).toBe(
      0,
    );
    const anonymousWrite = await customer.request.post(stack.origin + '/api/v1/appointments', {
      headers: { Origin: stack.origin, 'Idempotency-Key': randomUUID() },
      data: {},
    });
    expect(anonymousWrite.status()).toBe(401);
    await customer.getByRole('link', { name: 'ورود با ایمیل', exact: true }).click();
    await customer.getByRole('link', { name: 'ثبت‌نام', exact: true }).click();
    const customerEmail = 'publication-customer-' + randomUUID() + '@example.com';
    await expect(customer.getByRole('heading', { name: 'ساخت حساب آراسته' })).toBeVisible();
    await fill(customer, customerEmail);
    await customer.getByRole('button', { name: 'ساخت حساب', exact: true }).click();
    await customer.getByRole('link', { name: 'رفتن به ورود' }).click();
    await expect(customer.getByRole('heading', { name: 'ورود به آراسته' })).toBeVisible();
    await fill(customer, customerEmail);
    await customer.getByRole('button', { name: 'ورود', exact: true }).click();
    await expect(customer).toHaveURL(/\/book\?/);
    await customer.getByLabel('نام و نام خانوادگی مراجعه‌کننده').fill('مشتری سالن تازه');
    await customer.getByLabel('موبایل تماس', { exact: true }).fill('09123456789');
    await customer.getByRole('button', { name: 'ثبت نهایی نوبت', exact: true }).click();
    await expect(customer.getByRole('heading', { name: 'نوبت شما قطعی است' })).toBeVisible();
    const appointmentId = new URL(customer.url()).pathname.split('/').at(-1);
    await page.goto(stack.origin + root);
    await expect(readiness.getByRole('link', { name: 'مشاهده صفحه عمومی و رزرو' })).toBeVisible();
    await readiness.getByRole('link', { name: 'نوبت‌های مشتریان این سالن' }).click();
    await expect(
      page.getByRole('heading', { name: 'برای این بازه و فیلتر نوبتی پیدا نشد' }),
    ).toBeVisible();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'روز بعد', exact: true }).click();
    const booking = page.getByRole('link').filter({ hasText: 'مشتری سالن تازه' });
    await expect(booking).toHaveAttribute('href', root + '/appointments/' + appointmentId);
    const otherOwner = await reviewer.request.get(
      stack.origin + `/api/v1/businesses/${id}/appointments?date=2026-11-07&staff_id=any`,
    );
    expect(otherOwner.status()).toBe(404);
    expect((await stack.pool.query('SELECT business_id FROM app.appointments')).rows).toEqual([
      { business_id: id },
    ]);
    await page.screenshot({ path: testInfo.outputPath('new-salon-booking-in-owner-diary.png') });
    await customer.goto(stack.origin + '/salons/' + id);
    // A valid price edit stays public and preserves the earlier booking agreement.
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
    expect((await customer.reload())?.status()).toBe(200);
    await expect(
      customer
        .getByRole('region', { name: 'خدمات و قیمت‌ها' })
        .getByText('۲۶۰٬۰۰۰ تومان', { exact: true }),
    ).toBeVisible();
    await customer.goto(stack.origin + '/appointments/' + appointmentId);
    await expect(customer.getByText('۲۵۰٬۰۰۰ تومان', { exact: true })).toBeVisible();
    await page.goto(stack.origin + root + '/publication');
    await page.getByRole('button', { name: 'توقف انتشار', exact: true }).click();
    await expect(page.getByRole('button', { name: 'انتشار سالن', exact: true })).toBeVisible();
    expect(
      (await customer.request.get(stack.origin + '/api/v1/catalog/salons/' + id)).status(),
    ).toBe(404);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'انتشار سالن', exact: true }).click();
    await expect(page.getByRole('button', { name: 'توقف انتشار', exact: true })).toBeVisible();
    await reviewer.reload();
    await reviewer.getByLabel('دلیل رد یا تعلیق').fill('اصلاح اطلاعات تماس لازم است');
    await reviewer.getByRole('button', { name: 'تعلیق انتشار', exact: true }).click();
    await expect(reviewer.getByText('اصلاح اطلاعات تماس لازم است', { exact: true })).toBeVisible();
    expect((await customer.goto(stack.origin + '/salons/' + id))?.status()).toBe(404);
    await page.reload();
    await expect(page.getByRole('button', { name: 'انتشار سالن', exact: true })).toHaveCount(0);
    await reviewer.getByRole('button', { name: 'رفع تعلیق و انتشار', exact: true }).click();
    await expect(reviewer.getByRole('button', { name: 'تعلیق انتشار', exact: true })).toBeVisible();
    expect(
      (await customer.request.get(stack.origin + '/api/v1/catalog/salons/' + id)).status(),
    ).toBe(200);
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

test('an existing pending salon offers immediate owner publication instead of waiting', async ({
  page,
  stack,
}) => {
  const { seedAvailability } = await import('../../backend/test/helpers/availability-fixture');
  const data = await seedAvailability(stack.pool, '2026-11-03');
  const email = 'pending-owner-' + randomUUID() + '@example.com';
  await registerAndLogin(page, stack.origin, email);
  const owner = (await stack.pool.query('SELECT id FROM app.users WHERE email=$1', [email])).rows[0]
    .id;
  await stack.pool.query('UPDATE app.business_memberships SET user_id=$2 WHERE business_id=$1', [
    data.business,
    owner,
  ]);
  // Existing persisted v1 pending state; normal new requests are covered above without this fixture.
  await stack.pool.query("UPDATE app.businesses SET state='pending_review' WHERE id=$1", [
    data.business,
  ]);
  await page.goto(`${stack.origin}/manage/${data.business}/publication`);
  await expect(page.getByRole('button', { name: 'انتشار سالن', exact: true })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'انتشار سالن', exact: true }).click();
  await expect(page.getByRole('button', { name: 'توقف انتشار', exact: true })).toBeVisible();
  expect(
    (await page.request.get(`${stack.origin}/api/v1/catalog/salons/${data.business}`)).status(),
  ).toBe(200);
  expect(
    (await stack.pool.query('SELECT count(*)::int n FROM app.reviewer_permissions WHERE active'))
      .rows[0].n,
  ).toBe(0);
});
