const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Execute the actual TypeScript client with an isolated network fake.
function clientUnderTest(env = {}, response = null) {
  const requests = []
  const source = fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const context = {
    require: (name) => { if (name === './reliability') return { unavailableMessage: 'The server is taking longer than expected.', probeHealth: async base => (await context.fetch(base + '/health', {headers:{}})).json() }; if (name === './demo-api') return { DemoAPIClient: class {} }; if (name === './auth/browser') return { accessToken: async () => '', signOut: async () => {} }; throw new Error(name) },
    AbortSignal, exports: {}, process: { env },
    fetch: async (url, options = {}) => {
      requests.push({ url, options })
      return response || { ok: true, json: async () => ({ short_code: 'example', access_token: 'local-test-token', expires_in: 900 }) }
    },
  }
  vm.runInNewContext(compiled, context)
  return { client: new context.exports.APIClient('http://test'), requests }
}

test('protected reads and writes send only the in-memory key', async () => {
  const { client, requests } = clientUnderTest()
  client.setApiKey('test-placeholder')
  await client.shorten('https://example.com')
  await client.listUrls()
  await client.getAnalytics('example')
  await client.deleteUrl('example')
  assert.equal(requests.length, 4)
  for (const { options } of requests) {
    assert.equal(options.headers['X-API-Key'], 'test-placeholder')
    assert.ok(options.signal instanceof AbortSignal)
  }
  assert.equal(requests[3].options.method, 'DELETE')
})

test('public health omits the key and forgetting removes it from requests', async () => {
  const { client, requests } = clientUnderTest()
  client.setApiKey('test-placeholder')
  await client.getHealth()
  assert.equal(requests[0].options.headers['X-API-Key'], undefined)
  client.setApiKey('')
  await client.listUrls()
  assert.equal(requests[1].options.headers['X-API-Key'], undefined)
})

test('a fresh client has no persisted key', async () => {
  const first = clientUnderTest()
  first.client.setApiKey('test-placeholder')
  const second = clientUnderTest()
  await second.client.shorten('https://example.com')
  assert.equal(second.requests[0].options.headers['X-API-Key'], undefined)
})

test('flagged list and review use admin key, encoded code and bounded fetch', async () => {
  const { client, requests } = clientUnderTest()
  client.setApiKey('test-placeholder')
  await client.listFlagged(50)
  await client.reviewFlagged('a/b', 'block')
  assert.equal(requests[0].url, 'http://test/admin/flagged?limit=50&offset=50')
  assert.equal(requests[1].url, 'http://test/admin/flagged/a%2Fb/review')
  assert.equal(requests[1].options.method, 'POST')
  assert.equal(JSON.parse(requests[1].options.body).decision, 'block')
  for (const { options } of requests) {
    assert.equal(options.headers['X-API-Key'], 'test-placeholder')
    assert.ok(options.signal instanceof AbortSignal)
  }
})


test('bearer credentials and API keys are mutually exclusive', async () => {
  const { client, requests } = clientUnderTest()
  client.setApiKey('test-key')
  client.setBearerToken('test-token')
  await client.listUrls()
  assert.equal(requests[0].options.headers.Authorization, 'Bearer test-token')
  assert.equal(requests[0].options.headers['X-API-Key'], undefined)
  client.setApiKey('test-key')
  await client.listUrls()
  assert.equal(requests[1].options.headers.Authorization, undefined)
})

test('local demo signs in once for concurrent requests, keeping the token in memory', async () => {
  const { client, requests } = clientUnderTest({ NEXT_PUBLIC_LOCAL_AUTH: 'true' })
  await Promise.all([client.listUrls(), client.listFlagged()])
  assert.equal(requests.filter(r => r.url.endsWith('/auth/dev-login')).length, 1)
  assert.equal(JSON.parse(requests[0].options.body).user, 'owner')
  for (const request of requests.slice(1)) {
    assert.equal(request.options.headers.Authorization, 'Bearer local-test-token')
    assert.equal(request.options.headers['X-API-Key'], undefined)
  }
})

test('workspace header is sent with bearer credentials', async () => {
  const { client, requests } = clientUnderTest()
  client.setBearerToken('fixture-token')
  client.setWorkspace('workspace-two')
  await client.listUrls()
  assert.equal(requests[0].options.headers['X-Workspace-ID'], 'workspace-two')
})

test('listUrls preserves expiry and delete exposes 404 without changing its message', async () => {
  const rows = [{ short_code: 'one', long_url: 'https://example.com', created_at: '2030-01-01T00:00:00Z', expires_at: null, click_count: 0 }]
  const { client } = clientUnderTest({}, { ok: true, status: 200, json: async () => rows })
  assert.deepEqual(await client.listUrls(), rows)
  const missing = clientUnderTest({}, { ok: false, status: 404, json: async () => ({ detail: 'Not found' }) })
  await assert.rejects(missing.client.deleteUrl('one'), error => error.status === 404 && error.message.includes('not found in your workspace'))
})

test('bounded list, encoded status and public controls use the intended contracts', async () => {
  const {client,requests}=clientUnderTest();
  await client.listUrls(100); await client.getUrlStatus('a/b'); await client.getControls();
  assert.equal(requests[0].url,'http://test/urls?limit=100');
  assert.equal(requests[1].url,'http://test/urls/a%2Fb/status');
  assert.equal(requests[2].url,'http://test/status');
  assert.equal(requests[2].options.headers.Authorization,undefined);
});

test('key listing retains a typed 403 without changing the user-facing message', async () => {
  const {client}=clientUnderTest({}, {ok:false,status:403,json:async()=>({detail:'Forbidden'})});
  await assert.rejects(client.keys(),error=>error.status===403 && error.message==='You do not have permission to perform this action.');
});
