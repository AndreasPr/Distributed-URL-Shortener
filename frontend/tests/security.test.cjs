const { test } = require('node:test')
const assert = require('node:assert/strict')

test('production security headers cover every route without eval or wildcard origins', async () => {
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  try {
    delete require.cache[require.resolve('../next.config.js')]
    const config = require('../next.config.js')
    const [rule] = await config.headers()
    assert.equal(rule.source, '/:path*')
    const headers = Object.fromEntries(rule.headers.map(h => [h.key, h.value]))
    assert.equal(headers['X-Content-Type-Options'], 'nosniff')
    assert.equal(headers['Referrer-Policy'], 'no-referrer')
    assert.ok(headers['Content-Security-Policy'].includes("frame-ancestors 'none'"))
    assert.ok(!headers['Content-Security-Policy'].includes('unsafe-eval'))
    assert.ok(!headers['Content-Security-Policy'].includes('*'))
  } finally { process.env.NODE_ENV = previous }
})
