import { mkdir } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test-stack';
import { registerAndLogin } from './fixtures/account-flow';

// Current runs must not replace the historical Sprint 4 design evidence.
const directory = '../work/account-management-redesign/current';
async function capture(page: Page, name: string) {
  const phase = process.env.REDESIGN_CAPTURE_PHASE ?? 'after';
  for (const width of [320, 360, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.reload();
    if (name === 'account') await expect(page.getByTestId('account-email')).toBeVisible();
    else if (name === 'new' || name === 'settings')
      await expect(page.getByLabel('نام سالن', { exact: true })).toBeVisible();
    else if (name === 'empty') await expect(page.getByText(/هنوز سالنی ندارید/)).toBeVisible();
    else
      await expect(
        page.getByRole('link', { name: /سالن آراسته/ }).filter({ hasText: 'مدیریت' }),
      ).toBeVisible();
    await expect(page.locator('.skeleton')).toHaveCount(0);
    await page.locator('main').evaluate((main) => {
      main.scrollTop = 0;
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    await expect(page.getByRole('navigation', { name: 'ناوبری اصلی', exact: true })).toBeVisible();
    if (phase === 'after') await expect(page.locator('main header')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `${directory}/${phase}-${name}-${width}.png`,
      animations: 'disabled',
    });
    if (width === 320 && (name === 'new' || name === 'settings')) {
      const action = page.getByRole('button', {
        name:
          name === 'new'
            ? 'ساخت سالن پیش‌نویس'
            : phase === 'before'
              ? 'ذخیره مشخصات'
              : 'ذخیره تغییرات',
        exact: true,
      });
      await action.scrollIntoViewIfNeeded();
      const actionBox = await action.boundingBox();
      const navigationBox = await page
        .getByRole('navigation', { name: 'ناوبری اصلی', exact: true })
        .boundingBox();
      expect(
        actionBox && navigationBox && actionBox.y + actionBox.height <= navigationBox.y,
      ).toBeTruthy();
      await page.screenshot({
        path: `${directory}/${phase}-${name}-controls-320.png`,
        animations: 'disabled',
      });
    }
  }
}

test('real private account and four management routes at mobile and desktop widths', async ({
  page,
  stack,
}) => {
  test.setTimeout(90_000);
  await mkdir(directory, { recursive: true });
  await stack.pool.query('TRUNCATE app.auth_attempt_buckets');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await registerAndLogin(page, stack.origin, 'design-review@example.com');
  await capture(page, 'account');
  await page.getByRole('link', { name: 'مدیریت سالن‌های من', exact: true }).click();
  await expect(page.getByText(/هنوز سالنی ندارید/)).toBeVisible();
  await capture(page, 'empty');
  await page
    .getByRole('link', { name: /افزودن سالن|ساخت اولین سالن/, exact: false })
    .first()
    .click();
  await expect(page.getByLabel('نام سالن', { exact: true })).toBeVisible();
  await capture(page, 'new');
  await page.getByLabel('نام سالن', { exact: true }).fill('سالن آراسته');
  const select = page.getByRole('combobox', { name: 'نوع سالن' });
  if (await select.count()) await select.selectOption('women');
  else await page.getByRole('radio', { name: 'زنانه', exact: true }).check();
  await page.getByLabel('شهر', { exact: true }).fill('تهران');
  await page.getByRole('button', { name: 'ساخت سالن پیش‌نویس' }).click();
  await expect(page.getByRole('heading', { name: 'مشخصات سالن', exact: true })).toBeVisible();
  await expect(page.getByLabel('نام سالن', { exact: true })).toHaveValue('سالن آراسته');
  await capture(page, 'settings');
  const settingsUrl = page.url();
  await page.getByRole('link', { name: 'سالن‌های من', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /سالن آراسته/ }).filter({ hasText: 'مدیریت' }),
  ).toBeVisible();
  await capture(page, 'salons');
  if ((process.env.REDESIGN_CAPTURE_PHASE ?? 'after') === 'after') {
    await page.goto(settingsUrl);
    await expect(page.getByLabel('نام سالن', { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(async () => {
      document.documentElement.style.fontSize = '200%';
      document.querySelector<HTMLElement>('main')!.style.scrollbarGutter = 'stable';
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    const reflow = await page.locator('main').evaluate((main) => {
      const bounds = main.getBoundingClientRect();
      return {
        fits: main.scrollWidth <= main.clientWidth,
        overflow: [...main.querySelectorAll<HTMLElement>('*')]
          .filter((element) => {
            // The management tabs intentionally scroll inside their own navigation.
            if (element.closest('nav')) return false;
            const box = element.getBoundingClientRect();
            return box.width > 0 && (box.left < bounds.left || box.right > bounds.right);
          })
          .map((element) => ({ tag: element.tagName, classes: element.className })),
      };
    });
    expect(reflow.fits, JSON.stringify(reflow.overflow)).toBe(true);
    const phone = page.getByLabel('موبایل عمومی سالن (اختیاری)');
    await phone.focus();
    const refresh = page.getByRole('button', { name: 'بارگذاری نسخه تازه', exact: true });
    await refresh.focus();
    await expect(refresh).toBeFocused();
    await refresh.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        refresh.evaluate((button) => {
          const control = button.getBoundingClientRect();
          const main = document.querySelector('main')?.getBoundingClientRect();
          return Boolean(main && control.top >= main.top && control.bottom <= main.bottom);
        }),
      )
      .toBe(true);
    await page.screenshot({
      path: '../work/account-management-redesign/states/text-200-percent-320.png',
      animations: 'disabled',
    });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '';
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(stack.origin);
  await expect(page.getByRole('heading').first()).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
  });
  await page.screenshot({
    path: `${directory}/${process.env.REDESIGN_CAPTURE_PHASE ?? 'after'}-discovery-390.png`,
    animations: 'disabled',
  });
});
