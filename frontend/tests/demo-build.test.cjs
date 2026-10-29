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
test('Vercel production defaults to demo; explicit false and local builds retain real API', () => {
  const keys = ['VERCEL_ENV', 'NEXT_PUBLIC_DEMO_MODE', 'NEXT_PUBLIC_API_URL']
  const previous = keys.map(key => process.env[key])
  function config() { delete require.cache[require.resolve('../next.config')]; return require('../next.config') }
  try {
    keys.forEach(key => delete process.env[key])
    assert.equal(config().env.NEXT_PUBLIC_DEMO_MODE, 'false')
    process.env.VERCEL_ENV = 'production'
    assert.equal(config().env.NEXT_PUBLIC_DEMO_MODE, 'true')
    assert.equal(config().env.NEXT_PUBLIC_API_URL, '')
    process.env.NEXT_PUBLIC_DEMO_MODE = 'false'
    assert.equal(config().env.NEXT_PUBLIC_DEMO_MODE, 'false')
  } finally { keys.forEach((key, i) => previous[i] === undefined ? delete process.env[key] : process.env[key] = previous[i]) }
})
