const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Execute the actual TypeScript client with an isolated network fake.
function clientUnderTest() {
  const requests = []
  const source = fs.readFileSync(path.join(__dirname, '../lib/api.ts'), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const context = {
    require: (name) => { if (name === './demo-api') return {}; throw new Error(name) },
    AbortSignal, exports: {}, process: { env: {} },
    fetch: async (url, options = {}) => {
      requests.push({ url, options })
      return { ok: true, json: async () => ({ short_code: 'example' }) }
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
  assert.equal(requests[0].options.headers, undefined)
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
