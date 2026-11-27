import {test,expect,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async ({page}) => {
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:'window.turnstile={render:(el,o)=>{o.callback("fixture");return "test"},remove:()=>{}}'}));
});
const api='http://127.0.0.1:3199';
const secret='fixture-only-key-secret-never-real';
const initial={id:1,name:'Build script',prefix:'fixture1',scopes:['read'],created_at:'2026-11-27T12:34:00',last_used_at:null,revoked_at:null as string|null};
async function login(page:Page) {
 await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill('owner@example.test');await page.getByLabel('Password',{exact:true}).fill('test-password-only');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page).toHaveURL(/dashboard$/);
}
async function keys(page:Page) {
 let rows=[{...initial}],revokes=0;
 const posts:{name:string;scopes:string[]}[]=[];
 await page.route(`${api}/api-keys`,async route=>{
  if(route.request().method()==='POST') {
   const payload=route.request().postDataJSON();posts.push(payload);
   const id=rows.length+1;rows.push({...initial,id,name:payload.name,scopes:payload.scopes});
   return route.fulfill({status:201,json:{id,name:payload.name,prefix:'fixture2',scopes:payload.scopes,key:secret}});
  }
  return route.fulfill({json:rows});
 });
 await page.route(`${api}/api-keys/1`,route=>{revokes++;rows=rows.map(row=>({...row,revoked_at:'2026-11-27T13:00:00'}));return route.fulfill({status:204});});
 return {posts,revokes:()=>revokes};
}
async function create(page:Page,scope='write') {
 await page.getByRole('button',{name:'Create key',exact:true}).click();
 await page.getByLabel('Key name',{exact:true}).fill('Automation');await page.getByRole('dialog').getByLabel('Scopes',{exact:true}).selectOption(scope);
 await page.getByRole('dialog').getByRole('button',{name:'Create key',exact:true}).click();await expect(page.getByRole('dialog',{name:'Save your API key'})).toBeVisible();
}
async function noSecret(page:Page) {
 await expect(page.locator('body')).not.toContainText(secret);
 expect(await page.evaluate(value=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]).includes(value),secret)).toBe(false);
 expect(page.url()).not.toContain(secret);
}
test('create, copy failure/success, dismiss, route unmount and scope mappings',async({page,context})=>{
 const state=await keys(page);const logs:string[]=[];page.on('console',message=>logs.push(message.text()));
 await context.grantPermissions(['clipboard-read','clipboard-write']);await login(page);await page.goto('/api-keys');await expect(page).toHaveURL(/\/app\/keys$/);
 await expect(page.getByText('27 Nov 2026, 12:34 UTC')).toBeVisible();await expect(page.getByText('Never used')).toBeVisible();
 for(const scope of ['read','write','admin']) {
  await create(page,scope);expect(state.posts.at(-1)?.scopes).toEqual(scope==='write'?['read','write']:[scope]);
  expect(await page.locator('[aria-live], [role="status"], [role="alert"]').allTextContents()).not.toContain(secret);
  expect(await page.evaluate(value=>Array.from(document.querySelectorAll('[aria-live], [role="status"], [role="alert"]')).some(element=>element.textContent?.includes(value)),secret)).toBe(false);
  await page.getByRole('button',{name:'Copy key'}).click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(secret);
  await page.getByRole('button',{name:'Dismiss secret'}).click();await noSecret(page);
 }
 await create(page);
 await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>Promise.reject(new Error('denied'))}));
 await page.getByRole('button',{name:'Copy key'}).click();await expect(page.getByText('Copy failed; select the key manually.')).toBeVisible();
 await page.goto('/settings');await noSecret(page);await page.goto('/app/keys');await noSecret(page);
 expect(logs.some(message=>message.includes(secret))).toBe(false);
});
test('revoke cancel preserves key, confirmation revokes named key',async({page})=>{
 const state=await keys(page);await login(page);await page.goto('/app/keys');const button=page.getByRole('button',{name:'Revoke Build script'});
 await button.click();await expect(page.getByRole('dialog')).toContainText('Build script');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(state.revokes()).toBe(0);await expect(button).toBeFocused();
 await button.click();await page.getByRole('button',{name:'Confirm revoke'}).click();await expect(page.getByText('Revoked',{exact:true})).toBeVisible();expect(state.revokes()).toBe(1);await expect(button).toHaveCount(0);await expect(page.getByRole('heading',{name:'Workspace keys'})).toBeFocused();
});
for(const role of ['member','viewer','owner']) test(`permissions explain denial: ${role}`,async({page})=>{
 let me=0;await page.route(`${api}/me`,async route=>{me++;const response=await route.fetch();await route.fulfill({response,json:{...await response.json(),role}});});
 await page.route(`${api}/api-keys`,route=>route.fulfill({status:403,json:{detail:'Forbidden'}}));
 await login(page);await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'API keys',exact:true}).click();
 await expect(page.getByLabel('Key access')).toContainText('Only workspace owners and admins');await expect(page.getByRole('button',{name:'Create key',exact:true})).toHaveCount(0);expect(me).toBe(1);
});
test('workspace change clears visible secret and reloads with new workspace header',async({page})=>{
 await keys(page);await login(page);await page.goto('/app/keys');await create(page);
 const request=page.waitForRequest(req=>req.url()===`${api}/api-keys`&&req.method()==='GET'&&req.headers()['x-workspace-id']?.endsWith('0002'));
 await page.getByLabel('Workspace',{exact:true}).selectOption({label:'Team'},{force:true});await request;await noSecret(page);await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('late create response after unmount cannot reveal the secret on another page',async({page})=>{
 await keys(page);await login(page);await page.goto('/app/keys');let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});let started!:()=>void;const start=new Promise<void>(resolve=>{started=resolve;});
 await page.route(`${api}/api-keys`,async route=>{
  if(route.request().method()!=='POST') return route.fulfill({json:[]});started();await held;await route.fulfill({status:201,json:{id:2,name:'Late',prefix:'fixture2',scopes:['read'],key:secret}});
 });
 await page.getByRole('button',{name:'Create key',exact:true}).click();await page.getByLabel('Key name').fill('Late');await page.getByRole('dialog').getByRole('button',{name:'Create key',exact:true}).click();await start;
 await page.locator('a[href="/settings"]').first().evaluate(element=>(element as HTMLElement).click());await expect(page).toHaveURL(/settings$/);release();await noSecret(page);await page.goto('/app/keys');await noSecret(page);
});
test('account export, trusted verification and deletion confirmation without deleting',async({page})=>{
 let deletions=0;await page.route(`${api}/me`,async route=>{
  if(route.request().method()==='DELETE') {deletions++;return route.fulfill({status:500});}
  const response=await route.fetch();await route.fulfill({response,json:{...await response.json(),email_verified:false}});
 });
 await page.route(`${api}/me/export`,route=>route.fulfill({json:{profile:{display_name:'Fixture'},links:[]}}));
 await login(page);await page.goto('/account');await expect(page.getByText('Email not verified',{exact:false})).toBeVisible();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export my data'}).click();expect((await download).suggestedFilename()).toBe('relaymark-data.json');await expect(page.locator('main [role="status"]')).toContainText('Your export has been downloaded.');
 await page.route(`${api}/me/export`,route=>route.fulfill({status:503,json:{detail:'offline'}}));await page.getByRole('button',{name:'Export my data'}).click();await expect(page.locator('main [role="status"]')).toContainText('temporarily unavailable');
 const remove=page.getByRole('button',{name:'Delete account',exact:true});await expect(remove).toBeDisabled();await page.getByLabel('Type DELETE to confirm').fill('delete');await expect(remove).toBeDisabled();await page.getByLabel('Type DELETE to confirm').fill('DELETE');await expect(remove).toBeEnabled();await page.getByLabel('Type DELETE to confirm').clear();await expect(remove).toBeDisabled();expect(deletions).toBe(0);
 await expect(page.getByText('Your profile and links are purged after 30 days when cleanup runs.',{exact:false})).toBeVisible();await expect(page.locator('main [role="status"]')).toHaveCount(1);
});
test('global sign-out only happens after confirmation and retains expiry warning',async({page})=>{
 let logouts=0;await page.route(`${api}/auth/v1/logout*`,route=>{logouts++;expect(route.request().url()).toContain('scope=global');return route.fulfill({json:{}});});
 await login(page);await page.goto('/account');const trigger=page.getByRole('button',{name:'Sign out everywhere',exact:true});await trigger.click();await expect(page.getByRole('dialog')).toContainText('Already issued access tokens can remain valid until expiry.');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(logouts).toBe(0);await expect(trigger).toBeFocused();
 await trigger.click();await page.getByRole('button',{name:'Confirm sign out everywhere'}).click();await expect(page).toHaveURL(/login/);expect(logouts).toBe(1);
});
test('empty keys and demo settings navigation have no fabricated key controls',async({page})=>{
 await login(page);await page.goto('/app/keys');await expect(page.getByText('No API keys yet',{exact:true})).toBeVisible();
 await page.goto('/demo/settings');const nav=page.getByRole('navigation',{name:'Settings sections'});await expect(nav.getByRole('link')).toHaveCount(1);await expect(nav.getByRole('link',{name:'Appearance'})).toHaveAttribute('aria-current','page');
});
for(const theme of ['light','dark']) test(`account, keys and all dialogs axe and phone layout: ${theme}`,async({page})=>{
 await page.addInitScript(theme=>localStorage.setItem('relaymark-theme',theme),theme);await keys(page);await login(page);
 async function check(name:string) {
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:320,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`/tmp/account-${theme}-${name}.png`,fullPage:true});
 }
 await page.goto('/account');await expect(page.getByLabel('Display name')).toHaveValue('Test owner');await check('profile');await page.getByRole('button',{name:'Sign out everywhere',exact:true}).click();await check('sessions');await page.keyboard.press('Escape');
 await page.goto('/app/keys');await expect(page.getByRole('button',{name:'Revoke Build script'})).toBeVisible();await check('keys');
 await page.getByRole('button',{name:'Create key',exact:true}).click();await expect(page.getByRole('dialog')).toHaveAttribute('data-design','v2');await check('create');await page.keyboard.press('Escape');
 await create(page,'admin');await check('secret');await page.getByRole('button',{name:'Dismiss secret'}).click();await noSecret(page);
 await page.getByRole('button',{name:'Revoke Build script'}).click();await check('revoke');await page.keyboard.press('Escape');
});
