import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const row = { short_code: 'one', long_url: 'https://example.com/path', created_at: '2030-01-01T00:00:00Z', expires_at: null, click_count: 7 };
async function login(page: Page) {
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,o)=>{o.callback("fixture");return "test"},remove:()=>{}}'}));
  await page.goto('/login'); await page.getByLabel('Email', {exact:true}).fill('owner@example.test'); await page.getByLabel('Password', {exact:true}).fill('test-password-only'); await page.getByRole('button',{name:'Sign in',exact:true}).click(); await expect(page).toHaveURL(/dashboard$/);
}
test('copy, clipboard failure, delete cancel and already-gone refresh without status fanout', async ({page,context}) => {
  let rows = [row]; let deleted = 0; let statusCalls = 0;
  await page.route('**/urls/*/status', route => { statusCalls++; return route.fulfill({json:{status:'active'}}); });
  await page.route('http://127.0.0.1:3199/urls', route => route.fulfill({json:rows}));
  await page.route('http://127.0.0.1:3199/urls/one', route => { deleted++; rows=[]; return route.fulfill({status:404,json:{detail:'Not found'}}); });
  await login(page); await context.grantPermissions(['clipboard-read','clipboard-write']);
  await page.getByRole('button',{name:'Copy one',exact:true}).click(); expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://127.0.0.1:3199/one');
  await page.evaluate(() => Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>Promise.reject(new Error('denied'))}));
  await page.getByRole('button',{name:'Copy one',exact:true}).click(); await expect(page.getByText('Copy unavailable; select the link to copy it manually.')).toBeVisible();
  const remove = page.getByRole('button',{name:'Delete one',exact:true}); await remove.click(); await page.getByRole('button',{name:'Cancel',exact:true}).click(); await expect(remove).toBeFocused(); expect(deleted).toBe(0);
  await remove.click(); await page.getByRole('button',{name:'Confirm delete',exact:true}).click(); await expect(page.getByText('No links yet')).toBeVisible(); expect(deleted).toBe(1); expect(statusCalls).toBe(0);
});
test('viewer is read-only using shared identity', async ({page}) => {
  let identities=0;
  await page.route('http://127.0.0.1:3199/me', async route => { identities++; const response=await route.fetch(); await route.fulfill({response,json:{...await response.json(),role:'viewer'}}); });
  await page.route('http://127.0.0.1:3199/urls', route => route.fulfill({json:[row]}));
  await login(page); await expect(page.getByText('This workspace is read-only for viewers.',{exact:false})).toBeVisible(); await expect(page.getByLabel('Long URL',{exact:true})).toHaveCount(0); await expect(page.getByRole('button',{name:'Delete one',exact:true})).toHaveCount(0); expect(identities).toBe(1);
});
test('loading, list failure, retry and empty state', async ({page}) => {
  let release!: () => void; const held = new Promise<void>(resolve => {release=resolve}); let fail=true;
  await page.route('http://127.0.0.1:3199/urls', async route => { await held; await route.fulfill(fail ? {status:503,json:{detail:'Unavailable'}} : {json:[]}); });
  await login(page); await expect(page.getByRole('status',{name:'Loading links'})).toBeVisible(); release(); await expect(page.getByText('The service is temporarily unavailable. Please retry.')).toBeVisible(); fail=false; await page.getByRole('button',{name:'Retry',exact:true}).click(); await expect(page.getByText('No links yet')).toBeVisible(); await expect(page.getByRole('link',{name:'Go to create form'})).toHaveAttribute('href','#create-link');
});
for (const theme of ['light','dark']) test(`dashboard and delete dialog axe, phone layout: ${theme}`,async ({page}) => {
  await page.addInitScript(theme => localStorage.setItem('relaymark-theme',theme),theme);
  await page.route('http://127.0.0.1:3199/urls',route => route.fulfill({json:[row,{...row,short_code:'expired',expires_at:'2000-01-01T00:00:00Z'}]}));
  await login(page); await expect(page.getByRole('button',{name:'Delete one',exact:true})).toBeVisible(); await expect(page.locator('main[data-design="v2"]')).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:320,height:900}); expect(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'Delete one',exact:true}).click(); await expect(page.getByRole('dialog')).toHaveAttribute('data-design','v2'); expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]); await page.keyboard.press('Escape'); await expect(page.getByRole('button',{name:'Delete one',exact:true})).toBeFocused();
  await page.screenshot({path:`/tmp/links-${theme}-phone.png`,fullPage:true});
});
test('demo create refreshes list and deletion is local',async ({page}) => {
  await page.goto('/demo/dashboard'); await page.getByLabel('Long URL',{exact:true}).fill('https://example.com/new'); await page.getByLabel('Custom alias').fill('local-new'); await page.getByRole('button',{name:'Shorten',exact:true}).click(); await expect(page.getByRole('button',{name:'Delete local-new',exact:true})).toBeVisible(); await page.getByRole('button',{name:'Delete local-new',exact:true}).click(); await page.getByRole('button',{name:'Confirm delete',exact:true}).click(); await expect(page.getByRole('button',{name:'Delete local-new',exact:true})).toHaveCount(0);
});
