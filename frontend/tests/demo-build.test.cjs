const { test } = require('node:test')
const assert = require('node:assert/strict')
const { inspect } = require('../scripts/check-demo-build.cjs')
test('artifact scanner rejects private endpoints and credential values', () => {
  for (const text of ['http://localhost:8000', 'https://10.2.3.4/api', 'http://172.30.0.2', 'http://[::1]:8000', 'http://redis.internal', 'http://169.254.169.254/', 'http://[fd00::1]:8080', 'http://api:8000']) assert.equal(inspect(text), true)
  assert.equal(inspect('https://example.com/docs'), false)
  process.env.DEMO_TEST_API_KEY = 'synthetic-scanner-placeholder'
  assert.equal(inspect('synthetic-scanner-placeholder'), true)
  delete process.env.DEMO_TEST_API_KEY
})
test('demo selection is route-scoped and has no global config override', () => {
  const config = require('../next.config')
  assert.equal(config.env, undefined)
})

test('SDK fallback exception is exact; application private endpoints still fail', () => {
 assert.equal(inspect('http://localhost:9999'), true)
 assert.equal(inspect('http://localhost:9999', true), false)
 assert.equal(inspect('http://localhost:8000', true), true)
 assert.equal(inspect('http://127.0.0.1:9999', true), true)
})
