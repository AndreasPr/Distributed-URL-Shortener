import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('shell destinations, palette keyboard navigation, theme persistence', async ({ page }) => {
  await page.goto('/demo')
  for (const name of ['Links', 'Analytics', 'Review queue', 'API keys', 'Settings', 'Health']) await expect(page.getByRole('navigation').getByRole('link', { name, exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open command palette' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+k')
  await expect(page.getByLabel('Search commands')).toBeFocused()
  await page.getByLabel('Search commands').fill('Settings')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/settings$/)
  await expect(page.getByRole('link', { name: 'Settings', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'dark', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['relaymark-theme'])
  await page.keyboard.press('Meta+k')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('mobile drawer closes on navigation and restores focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo')
  const menu = page.getByRole('button', { name: 'Open navigation' })
  await menu.click()
  await page.getByRole('dialog').getByRole('link', { name: 'Links', exact: true }).click()
  await expect(page).toHaveURL(/dashboard$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await menu.click()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

for (const theme of ['light', 'dark']) test(`gallery accessibility and overlays: ${theme}`, async ({ page }) => {
  await page.goto('/demo/settings')
  await page.getByRole('button', { name: theme, exact: true }).click()
  await page.goto('/demo/design')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  const trigger = page.getByRole('button', { name: 'Open example dialog' })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.getByRole('button', { name: 'Example menu' }).click()
  await page.getByRole('menuitem', { name: 'View sample details' }).click()
  await expect(page.getByText('Sample action selected')).toBeVisible()
  await page.getByRole('tab', { name: 'Components', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Foundations' })).toHaveAttribute('aria-selected', 'true')
})

for (const theme of ['light', 'dark']) test(`v2 design isolation, contrast and portal: ${theme}`, async ({ page, context }) => {
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.turnstile={render:(el,options)=>{options.callback("fixture-captcha");return "test"},remove:()=>{}}',
  }))
  await page.addInitScript(theme => localStorage.setItem('relaymark-theme', theme), theme)
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('owner@example.test')
  await page.getByLabel('Password', { exact: true }).fill('test-password-only')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/dashboard$/)
  await page.goto('/design')
  await expect(page.locator('main[data-design="v2"]')).toBeVisible()
  await expect(page.locator('html')).toHaveClass(new RegExp(theme))
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  const trigger = page.getByRole('button', { name: 'Open example dialog' })
  await trigger.click()
  await expect(page.getByRole('dialog')).toHaveAttribute('data-design', 'v2')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.screenshot({ path: `/tmp/design-v2-${theme}.png`, fullPage: true })
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Code copy status' })).toHaveText('Code copied.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('make demo')
  await page.evaluate(() => Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('denied')) }))
  await page.getByRole('button', { name: 'Copy code', exact: true }).click()
  await expect(page.getByRole('status', { name: 'Code copy status' })).toContainText('Copy unavailable')
  await page.getByRole('tab', { name: 'Components', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Foundations' })).toHaveAttribute('aria-selected', 'true')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.goto('/login')
  await expect(page).toHaveURL(/dashboard$/)
  expect(await page.locator('#main-content').evaluate(el => el.closest('[data-design]'))).toBeNull()
  for (const path of ['/demo', '/demo/design']) {
    await page.goto(path)
    await expect(page.locator('[data-design="v2"]')).toHaveCount(0)
    const primary = await page.locator('body').evaluate(el => getComputedStyle(el).getPropertyValue('--primary').trim())
    expect(primary).toBe(theme === 'light' ? '#0f766e' : '#5eead4')
  }
})

async function shellLogin(page: import('@playwright/test').Page) {
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.turnstile={render:(el,options)=>{options.callback("fixture-captcha");return "test"},remove:()=>{}}',
  }));
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill('owner@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
for (const demo of [false, true]) test(`palette Create link opens the form: demo=${demo}`, async ({ page }) => {
  if (demo) await page.goto('/demo/settings'); else { await shellLogin(page); await page.goto('/settings'); }
  await page.getByRole('button', { name: 'Open command palette' }).click();
  await page.getByLabel('Search commands').fill('Create link');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(demo ? /\/demo\/dashboard$/ : /\/dashboard$/);
  await expect(page.getByLabel('Long URL', { exact: true })).toBeVisible();
});
for (const admin of [false, true]) test(`review navigation uses shared platform-admin identity: ${admin}`, async ({ page }) => {
  let calls = 0;
  await page.route('http://127.0.0.1:3199/me', async route => {
    calls++;
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), platform_admin: admin } });
  });
  await shellLogin(page);
  await expect(page.getByLabel('Workspace', { exact: true })).toHaveValue(/.+/);
  expect(calls).toBe(1);
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Review queue' })).toHaveCount(admin ? 1 : 0);
  await page.getByRole('button', { name: 'Open command palette' }).click();
  await page.getByLabel('Search commands').fill('Review queue');
  await expect(page.getByRole('option', { name: 'Review queue' })).toHaveCount(admin ? 1 : 0);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Review queue' })).toHaveCount(admin ? 1 : 0);
  await page.keyboard.press('Escape');
});
for (const theme of ['light', 'dark']) test(`shell scopes, keyboard and axe: ${theme}`, async ({ page }) => {
  await page.addInitScript(theme => localStorage.setItem('relaymark-theme', theme), theme);
  await shellLogin(page);
  const content = page.locator('#main-content');
  expect(await content.evaluate(el => el.closest('[data-design]'))).toBeNull();
  await expect(page.locator('header[data-design="v2"]')).toBeVisible();
  await page.getByRole('link', { name: 'Skip to content' }).focus();
  await page.keyboard.press('Enter');
  await expect(content).toBeFocused();
  await page.screenshot({ path: `/tmp/shell-${theme}-desktop.png`, fullPage: true });
  await expect(page.getByRole('complementary', { name: 'Service status' })).toBeVisible();
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();
  await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Links', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Expand sidebar' }).click();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  const palette = page.getByRole('button', { name: 'Open command palette' });
  await palette.click();
  await expect(page.getByRole('dialog')).toHaveAttribute('data-design', 'v2');
  await expect(page.getByLabel('Search commands')).toBeFocused();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(palette).toBeFocused();
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  const drawer = page.getByRole('button', { name: 'Open navigation' });
  await drawer.click();
  await page.screenshot({ path: `/tmp/shell-${theme}-drawer.png`, fullPage: true });
  await expect(page.getByRole('dialog')).toHaveAttribute('data-design', 'v2');
  for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))).toBeTruthy();
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape'); await expect(drawer).toBeFocused();
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login$/);
});
test('marketing disclosure keyboard and 320px layout', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('relaymark-theme', 'light'));
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Public menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Public navigation' })).toBeHidden();
  await menu.focus(); await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark') await page.getByRole('button', { name: 'Toggle color theme' }).click();
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([]);
  }
  await menu.focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Features' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await menu.click();
  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: 'Features' }).click();
  await expect(page).toHaveURL(/features$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
test('viewer workspace switch preserves headers and failure rollback', async ({ page }) => {
  let denySwitch = false;
  const headers: string[] = [];
  await page.route('http://127.0.0.1:3199/me', async route => {
    const workspace = route.request().headers()['x-workspace-id'] ?? '';
    headers.push(workspace);
    if (denySwitch) return route.fulfill({ status: 403, json: { detail: 'Forbidden' } });
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), role: 'viewer', platform_admin: false } });
  });
  await shellLogin(page);
  const select = page.getByLabel('Workspace', { exact: true });
  await expect(select).toBeEnabled();
  const personal = await select.inputValue();
  await select.selectOption({ label: 'Team' });
  await expect(page.getByText('http://127.0.0.1:3199/team-code', { exact: true })).toBeVisible();
  const team = await select.inputValue();
  expect(headers.at(-1)).toBe(team);
  denySwitch = true;
  await select.selectOption({ label: 'Personal' });
  await expect(page.locator('header').getByRole('alert')).toContainText('permission');
  await expect(select).toHaveValue(team);
  expect(headers.at(-1)).toBe(personal);
  await expect(select).toBeEnabled();
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Review queue' })).toHaveCount(0);
});
