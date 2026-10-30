import { test, expect } from '@playwright/test'

test('metadata stays in head and assets load', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Relaymark | Links with clarity')
  expect(await page.locator('head').evaluate(el => getComputedStyle(el).display)).toBe('none')
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute('content', /opengraph-image/)
  expect((await page.request.get('/icon.svg')).ok()).toBeTruthy()
  expect((await page.request.get('/opengraph-image')).headers()['content-type']).toContain('image/png')
  await expect(page.getByLabel('Demo mode')).toBeVisible()
  await expect(page.getByLabel('API key', { exact: true })).toHaveCount(0)
})

test('shorten, copy, navigate and reload without API traffic or persistence', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const forbidden: string[] = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.origin !== 'http://127.0.0.1:3100' || request.method() !== 'GET' || /\/(shorten|urls|admin|health)$/.test(url.pathname) && request.resourceType() === 'fetch' && request.headers()['rsc'] !== '1') forbidden.push(request.url())
  })
  await page.goto('/')
  await page.getByLabel('Long URL').fill('https://example.com/hello?private=never-send')
  await page.getByLabel('Custom alias (optional)').fill('local-demo')
  await page.getByRole('button', { name: 'Shorten', exact: true }).click()
  await expect(page.getByText('This is not a working redirect link.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Copy code' }).click()
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('local-demo')
  await page.getByRole('link', { name: 'Links', exact: true }).click()
  await expect(page.getByText('local-demo', { exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(31)
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0])
  await page.reload()
  await expect(page.locator('tbody tr')).toHaveCount(30)
  expect(forbidden).toEqual([])
})

test('allow and block mutate only the sample queue; analytics and health are samples', async ({ page }) => {
  await page.goto('/flagged')
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(3)
  await page.getByRole('button', { name: 'Allow', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Block', exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Block', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(1)
  await page.getByRole('link', { name: 'Links', exact: true }).click()
  await page.getByRole('link', { name: 'Review queue', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(1)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Allow', exact: true })).toHaveCount(3)
  await page.getByRole('link', { name: 'Analytics', exact: true }).click()
  await page.getByRole('textbox', { name: 'Short code' }).fill('sample01')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.getByText('12', { exact: true }).first()).toBeVisible()
  await page.goto('/health')
  await expect(page.getByLabel('Demo mode')).toBeVisible()
})

test('landing layout fits a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Small links. Clear signals.', exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  const colors = await page.getByRole('button', { name: 'Shorten', exact: true }).evaluate(el => {
    const style = getComputedStyle(el)
    return { background: style.backgroundColor, foreground: style.color }
  })
  expect(colors.background).not.toBe('rgba(0, 0, 0, 0)')
  expect(colors.background).not.toBe(colors.foreground)
})
