import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { publicPaths, contentFor, siteOrigin } from '../lib/content/public-pages';
for (const theme of ['light', 'dark']) for (const width of [1280, 390]) {
  test(`public pages: ${theme}, ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('relaymark-theme', theme), theme);
    const externalAssets: string[] = [];
    page.on('request', request => {
      if (['image', 'font', 'stylesheet'].includes(request.resourceType()) && new URL(request.url()).origin !== 'http://127.0.0.1:3100') externalAssets.push(request.url());
    });
    for (const route of publicPaths) {
      await page.goto(route);
      await expect(page.locator('[data-public-page]')).toHaveAttribute('data-public-page', route);
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(contentFor(route).title);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#public-content')).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations, route).toEqual([]);
      expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).href).toBe(new URL(route, siteOrigin).href);
      await expect(page).toHaveTitle(/^Relaymark \| /);
      const response = await page.request.get(route);
      expect(response.headers()['content-security-policy']).toContain("'nonce-");
      if (route === '/') await page.screenshot({ path: `/tmp/public-${theme}-${width}.png`, fullPage: true });
    }
    expect(externalAssets).toEqual([]);
  });
  test(`preserved demo and privacy: ${theme}, ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('relaymark-theme', theme), theme);
    for (const route of ['/demo', '/privacy']) {
      await page.goto(route);
      await expect(page.locator('[data-design="v2"]')).toHaveCount(0);
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      // Freeze dynamic health status only; body/layout/typography remain in the snapshot.
      await expect(page).toHaveScreenshot(`${route.slice(1)}-${theme}-${width}.png`, { fullPage: true, animations: 'disabled', maxDiffPixelRatio: 0.01, mask: [page.getByRole('complementary', { name: 'Service status' })] });
    }
  });
}
test('public metadata inventory and real contact fallback', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByRole('status').filter({ hasText: 'The operator has not configured an abuse mailbox yet.' })).toBeVisible();
  await expect(page.locator('form')).toHaveCount(0);
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  for (const route of publicPaths) expect(sitemap).toContain(`<loc>${new URL(route, siteOrigin).href}</loc>`);
  expect(sitemap).not.toContain('/demo');
  expect(sitemap).not.toContain('/dashboard');
  const robots = await (await page.request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /');
  expect(robots).toContain('Allow: /$');
  await page.goto('/developers');
  await expect(page.locator('pre')).toContainText('X-API-Key: <YOUR_API_KEY>');
});
