const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function client() {
  const source = fs.readFileSync(path.join(__dirname, '../lib/demo-api.ts'), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const context = { exports: {}, URL, fetch: () => { throw new Error('Demo must not fetch') } }
  vm.runInNewContext(compiled, context)
  return new context.exports.DemoAPIClient()
}
test('deterministic fixtures, clicks, health and independent tab state', async () => {
  const api = client()
  assert.equal((await api.listUrls(100)).length, 30)
  assert.equal((await api.listFlagged()).length, 3)
  const history = await api.getAnalytics('sample01')
  assert.equal(history.total_clicks, 12)
  assert.equal(history.timestamps.length, 12)
  assert.equal('total_urls' in await api.getHealth(), false)
  await api.reviewFlagged('sample01', 'allow')
  await api.reviewFlagged('sample02', 'block')
  assert.equal((await api.listFlagged()).length, 1)
  assert.equal((await client().listFlagged()).length, 3)
  await api.deleteUrl('sample03')
  assert.equal((await api.listFlagged()).length, 0)
  await assert.rejects(api.getAnalytics('sample03'), /not found/)
})
test('local shortening validates input and collisions, without network', async () => {
  const api = client()
  api.setApiKey('unused-placeholder')
  assert.equal((await api.shorten('https://example.com')).short_code, 'demo31')
  assert.equal((await api.shorten('https://example.com', 'local')).short_code, 'local')
  await assert.rejects(api.shorten('https://example.com', 'local'), /already taken/)
  await assert.rejects(api.shorten('javascript:alert(1)'), /HTTP/)
  await assert.rejects(api.shorten('https://name:pass@example.com'), /credentials/)
  await assert.rejects(api.shorten('https://example.com', 'admin'), /reserved/)
  await assert.rejects(api.shorten('https://example.com', undefined, '2020-01-01'), /future/)
  await assert.rejects(api.reviewFlagged('missing', 'allow'), /not found/)
})
test('expiry is present and create/delete stays in memory', async () => {
  const api = client()
  assert.ok((await api.listUrls()).every(row => row.expires_at === null))
  const expiry = '2099-01-01T12:00:00Z'
  const row = await api.shorten('https://example.com', 'expiry-test', expiry)
  assert.equal((await api.listUrls())[0].expires_at, expiry)
  await api.deleteUrl(row.short_code)
  assert.ok(!(await api.listUrls()).some(item => item.short_code === row.short_code))
})

test('demo status and bounded lists mirror real contracts without fetch', async () => {
 const api=client(); assert.equal((await api.listUrls()).length,20); assert.equal((await api.listUrls(1)).length,1);
 for(const limit of [0,-1,101]) await assert.rejects(api.listUrls(limit),/Limit/);
 assert.equal((await api.getUrlStatus('sample04')).status,'active');
 assert.equal((await api.getUrlStatus('sample03')).status,'blocked');
 await api.reviewFlagged('sample03','allow'); assert.equal((await api.getUrlStatus('sample03')).status,'active');
 await api.deleteUrl('sample04'); assert.equal((await api.getUrlStatus('sample04')).status,'deleted');
 await assert.rejects(api.getUrlStatus('missing'),error => error.status===404);
 assert.equal((await api.getControls()).read_only_mode,false);
});
