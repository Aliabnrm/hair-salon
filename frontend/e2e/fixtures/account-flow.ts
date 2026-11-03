import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const password = 'test-only-ui-password';
export async function fill(page: Page, email: string, secret = password) {
  await page.getByLabel('ایمیل', { exact: true }).fill(email);
  await page.getByLabel('رمز عبور', { exact: true }).fill(secret);
}
export async function registerAndLogin(page: Page, origin: string, email: string) {
  await page.goto(`${origin}/sign-up`);
  await fill(page, email);
  await page.getByRole('button', { name: 'ساخت حساب', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'درخواست ثبت‌نام دریافت شد' })).toBeVisible();
  expect((await page.context().cookies()).some((c) => c.name === 'hair_salon_session')).toBe(false);
  await page.getByRole('link', { name: 'رفتن به ورود' }).click();
  await fill(page, email);
  await page.getByRole('button', { name: 'ورود', exact: true }).click();
  await expect(page.getByTestId('account-email')).toHaveText(email);
}
