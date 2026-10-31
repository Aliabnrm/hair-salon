import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/test-stack';

const password = 'test-only-ui-password';
async function fill(page: Page, email: string, secret = password) {
  await page.getByLabel('ایمیل', { exact: true }).fill(email);
  await page.getByLabel('رمز عبور', { exact: true }).fill(secret);
}
async function registerAndLogin(page: Page, origin: string, email: string) {
  await page.goto(`${origin}/sign-up`);
  await fill(page, email);
  await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'درخواست ثبت‌نام دریافت شد' }),
  ).toBeVisible();
  expect(
    (await page.context().cookies()).some(
      (c) => c.name === 'hair_salon_session',
    ),
  ).toBe(false);
  await page.getByRole('link', { name: 'رفتن به ورود' }).click();
  await fill(page, email);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByTestId('account-email')).toHaveText(email);
}
test.beforeEach(async ({ stack }) => {
  await stack.pool.query('TRUNCATE app.auth_attempt_buckets');
});

test('real forms register, sign in, reload, separate two accounts and revoke logout across navigation', async ({
  page,
  context,
  browser,
  stack,
}) => {
  const first = `ui-${randomUUID()}@example.com`;
  const second = `ui-${randomUUID()}@example.com`;
  await registerAndLogin(page, stack.origin, first);
  await expect(
    page.getByText('مالکیت ایمیل تأیید نشده است.', { exact: false }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('account-email')).toHaveText(first);
  const cookie = (await context.cookies()).find(
    (c) => c.name === 'hair_salon_session',
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  const other = await browser.newContext();
  try {
    const otherPage = await other.newPage();
    await registerAndLogin(otherPage, stack.origin, second);
    await expect(page.getByTestId('account-email')).toHaveText(first);
    await page
      .getByRole('button', { name: 'خروج از حساب', exact: true })
      .click();
    await expect(
      page.getByRole('link', { name: 'ورود با ایمیل' }),
    ).toBeVisible();
    await otherPage.reload();
    await expect(otherPage.getByTestId('account-email')).toHaveText(second);
    await page.getByRole('link', { name: 'کاوش', exact: true }).click();
    await page.getByRole('link', { name: 'حساب', exact: true }).click();
    await expect(page).toHaveURL(`${stack.origin}/account`);
    await expect(
      page.getByRole('link', { name: 'ورود با ایمیل' }),
    ).toBeVisible();
    await expect(page.getByTestId('account-email')).toHaveCount(0);
    if (!cookie) throw new Error('Expected owned test cookie.');
    await context.addCookies([cookie]);
    await page.reload();
    await expect(
      page.getByRole('link', { name: 'ورود با ایمیل' }),
    ).toBeVisible();
  } finally {
    await other.close();
  }
});

test('a failed network request resets the form and a retry reaches the real server', async ({
  page,
  context,
  stack,
}) => {
  const email = `retry-${randomUUID()}@example.com`;
  await registerAndLogin(page, stack.origin, email);
  await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
  await page.getByRole('link', { name: 'ورود با ایمیل' }).click();
  await fill(page, email);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(
    page.getByRole('form', { name: 'ورود با ایمیل' }).getByRole('alert'),
  ).toContainText('ارتباط برقرار نشد');
  await expect(
    page.getByRole('form', { name: 'ورود با ایمیل' }).getByRole('alert'),
  ).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'ورود', exact: true }),
  ).toBeEnabled();
  await context.setOffline(false);
  await fill(page, email, 'wrong-test-only-password');
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(
    page.getByRole('form', { name: 'ورود با ایمیل' }).getByRole('alert'),
  ).toHaveText('ایمیل یا رمز درست نیست.');
  await fill(page, email);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByTestId('account-email')).toHaveText(email);
});

test('pending login disables duplicate submission until the real API completes', async ({
  page,
  stack,
}) => {
  const email = `pending-${randomUUID()}@example.com`;
  await registerAndLogin(page, stack.origin, email);
  await page.getByRole('button', { name: 'خروج از حساب', exact: true }).click();
  await page.getByRole('link', { name: 'ورود با ایمیل' }).click();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  await page.route('**/api/v1/auth/login', async (route) => {
    calls++;
    await gate;
    await route.continue();
  });
  try {
    await fill(page, email);
    await page.getByRole('button', { name: 'ورود', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'در حال ارسال…' }),
    ).toBeDisabled();
    await expect(page.getByLabel('ایمیل', { exact: true })).toBeDisabled();
    release();
    await expect(page.getByTestId('account-email')).toHaveText(email);
    expect(calls).toBe(1);
  } finally {
    release();
  }
});

test('focus refresh cannot restore the old user while real logout is pending', async ({
  page,
  stack,
}) => {
  const email = `focus-${randomUUID()}@example.com`;
  await registerAndLogin(page, stack.origin, email);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let currentUserReads = 0;
  page.on('request', (request) => {
    if (request.url() === `${stack.origin}/api/v1/me`) currentUserReads++;
  });
  await page.route('**/api/v1/auth/logout', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page
      .getByRole('button', { name: 'خروج از حساب', exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: 'در حال خروج…' }),
    ).toBeDisabled();
    const before = currentUserReads;
    await page.evaluate(async () => {
      window.dispatchEvent(new Event('focus'));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
    });
    expect(currentUserReads).toBe(before);
    release();
    await expect(
      page.getByRole('link', { name: 'ورود با ایمیل' }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('link', { name: 'ورود با ایمیل' }),
    ).toBeVisible();
  } finally {
    release();
  }
});
