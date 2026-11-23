import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const origin='http://127.0.0.1:3199';
const link={short_code:'one',long_url:'https://example.com/plain-text',created_at:'2026-01-01T12:00:00Z',expires_at:null,click_count:2};
const analytics={short_code:'one',total_clicks:2,timestamps:[new Date().toISOString(),new Date().toISOString()]};
async function login(page:Page) {
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,o)=>{o.callback("fixture");return "test"},remove:()=>{}}'}));
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('owner@example.test');await page.getByLabel('Password',{exact:true}).fill('test-password-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/dashboard$/);
}
async function fixture(page:Page,status='active',rows:typeof link[]=[link]) {
 await page.route(`${origin}/urls?limit=100`,route=>route.fulfill({json:rows}));
 await page.route(`${origin}/urls/one/status`,route=>route.fulfill({json:{short_code:'one',status,expires_at:status==='expired'?'2000-01-01T00:00:00Z':null,verdict:status==='blocked'?'malicious':'clean'}}));
 await page.route(`${origin}/analytics/*`,route=>route.fulfill({json:analytics}));
}
test('analytics selector, query, manual search, table, empty and retry',async({page})=>{
 await fixture(page);await login(page);await page.goto('/analytics?code=one');await expect(page.getByRole('region',{name:'Click analytics'})).toBeVisible();
 await page.getByRole('button',{name:'Show as table'}).click();await expect(page.getByRole('table')).toBeVisible();await expect(page.getByRole('row')).toHaveCount(31);
 await page.getByLabel('Visible window').selectOption('7');await expect(page.getByRole('row')).toHaveCount(8);
 await page.getByLabel('Latest links').selectOption('one');await expect(page.getByText('Time zone:',{exact:false})).toBeVisible();
 let fail=true;await page.route(`${origin}/analytics/empty`,route=>route.fulfill(fail?{status:503,json:{detail:'offline'}}:{json:{short_code:'empty',total_clicks:0,timestamps:[]}}));
 await page.getByRole('textbox',{name:'Short code'}).fill('empty');await page.getByRole('button',{name:'Search',exact:true}).click();await expect(page.locator('main [role="alert"]')).toContainText('temporarily unavailable');fail=false;await page.getByRole('button',{name:'Retry',exact:true}).click();await expect(page.getByText('No clicks recorded',{exact:true})).toBeVisible();
});
for(const status of ['active','expired','blocked']) test(`detail ${status}, missing latest-list destination, no outgoing destination link`,async({page})=>{
 await fixture(page,status,status==='active'?[]:[link]);await login(page);await page.goto('/links/one');await expect(page.getByText(status,{exact:true})).toBeVisible();
 if(status==='active') await expect(page.getByText('Destination not shown (not among your latest 100 links)')).toBeVisible();
 else {await expect(page.getByText('Destination: https://example.com/plain-text')).toBeVisible();await expect(page.locator('a[href="https://example.com/plain-text"]')).toHaveCount(0);}
 if(status==='blocked') await expect(page.getByText('This link is blocked by abuse review.',{exact:false})).toBeVisible();
});
test('detail not found, viewer read-only and confirmed deletion',async({page})=>{
 await fixture(page);let viewer=true;
 await page.route(`${origin}/me`,async route=>{const response=await route.fetch();await route.fulfill({response,json:{...await response.json(),role:viewer?'viewer':'owner'}});});
 await login(page);await page.goto('/links/one');await expect(page.getByText('active',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Delete link',exact:true})).toHaveCount(0);
 viewer=false;await page.reload();const remove=page.getByRole('button',{name:'Delete link',exact:true});await remove.click();await page.keyboard.press('Escape');await expect(remove).toBeFocused();
 await page.route(`${origin}/urls/one`,route=>route.fulfill({json:{success:true}}));await remove.click();await page.getByRole('button',{name:'Confirm delete'}).click();await expect(page).toHaveURL(/dashboard$/);
 await page.route(`${origin}/urls/one/status`,route=>route.fulfill({status:404,json:{detail:'Not found'}}));await page.goto('/links/one');await expect(page.getByRole('heading',{name:'Link not found'})).toBeVisible();
});
test('demo detail navigation and deletion stay in memory',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await page.goto('/demo/dashboard');await page.getByRole('link',{name:'sample04',exact:true}).click();await expect(page).toHaveURL(/demo\/links\/sample04$/);await expect(page.getByText('This is not a working redirect link.')).toBeVisible();await page.getByRole('button',{name:'Copy',exact:true}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('sample04');await page.getByRole('button',{name:'Delete link',exact:true}).click();await page.getByRole('button',{name:'Confirm delete'}).click();await expect(page).toHaveURL(/demo\/dashboard$/);await expect(page.getByRole('link',{name:'sample04',exact:true})).toHaveCount(0);
});
test('health shows degraded 503 and aggregates internals without totals',async({page})=>{
 await login(page);await page.route(`${origin}/health`,route=>route.fulfill({status:503,json:{status:'degraded',db:'reachable',redis:'unreachable',workers:{private_worker:{healthy:false,lag:50}},migrations:'ready'}}));await page.goto('/health');await expect(page.locator('main')).toContainText('degraded');await expect(page.locator('main')).toContainText('not ready');await expect(page.getByText('Status at page load.')).toBeVisible();await expect(page.locator('main')).not.toContainText('private_worker');await expect(page.locator('main')).not.toContainText('Total URLs');await expect(page.getByRole('heading',{name:'Current controls'})).toBeVisible();
});
test('health cold-start hides raw errors and recovers',async({page})=>{
 await login(page);let fail=true;await page.route(`${origin}/health`,route=>fail?route.abort():route.fulfill({json:{status:'ok',db:'reachable',redis:'reachable'}}));await page.goto('/health');await expect(page.getByText('Waking up the free-tier server, this takes up to about a minute')).toBeVisible();await expect(page.locator('main [role="alert"]')).toHaveCount(0);fail=false;await expect(page.locator('main')).toContainText('reachable',{timeout:20000});
});
test('health unreachable after 90 seconds offers safe retry',async({page})=>{
 await login(page);await page.clock.install();await page.route(`${origin}/health`,route=>route.abort());await page.goto('/health');
 for(let i=0;i<20;i++){await page.clock.runFor(5000);await page.waitForTimeout(20);}
 await expect(page.locator('main [role="alert"]')).toContainText('taking longer than expected');await expect(page.getByRole('button',{name:'Retry',exact:true})).toBeVisible();
});
for(const theme of ['light','dark']) test(`analytics, detail and health axe and phone width: ${theme}`,async({page})=>{
 await page.addInitScript(theme=>localStorage.setItem('relaymark-theme',theme),theme);await fixture(page);await login(page);
 for(const path of ['/analytics?code=one','/links/one','/health']) {
  await page.goto(path);await expect(page.locator('main[data-design="v2"]')).toBeVisible();
  if(path!=='/health') await expect(page.getByRole('region',{name:'Click analytics'})).toBeVisible();else await expect(page.getByRole('heading',{name:'Current controls'})).toBeVisible();
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:`/tmp/analytics-${theme}-${path.split('?')[0].replaceAll('/','-')}.png`,fullPage:true});
 }
});
