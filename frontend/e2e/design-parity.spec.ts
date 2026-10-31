import { test, expect } from './fixtures/test-stack';
// Values come from the extracted Make source; source-to-implementation images are recorded in the design ledger.
for (const width of [320, 360, 390, 430, 768, 1024, 1440])
  test(`Figma layout contract and RTL remain usable at ${width}px`, async ({
    page,
    stack,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(stack.origin);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const visual = await page.locator('[data-app-shell]').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        width: el.getBoundingClientRect().width,
        font: style.fontFamily,
        bg: style.backgroundColor,
      };
    });
    expect(visual.width).toBe(
      width >= 1280 ? 832 : width >= 768 ? 704 : Math.min(width, 480),
    );
    expect(visual.font).toContain('Vazirmatn');
    expect(visual.bg).toBe('rgb(248, 250, 252)');
    expect(
      await page
        .getByRole('searchbox')
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeCloseTo(54, 3);
    const images = page.locator('main img');
    await images.evaluateAll((imgs) =>
      imgs.forEach((img) => {
        if (img instanceof HTMLImageElement) img.loading = 'eager';
      }),
    );
    await expect
      .poll(() =>
        images.evaluateAll((imgs) =>
          imgs.every(
            (img) =>
              img instanceof HTMLImageElement &&
              img.complete &&
              img.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    await expect(
      page.getByRole('navigation', { name: 'ناوبری اصلی' }),
    ).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath(`discovery-${width}.png`),
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'ناخن', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('۲ نتیجه', { exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('ناموجود');
    await expect(
      page.getByRole('button', { name: 'پاک کردن فیلترها', exact: true }),
    ).toBeVisible();
  });
