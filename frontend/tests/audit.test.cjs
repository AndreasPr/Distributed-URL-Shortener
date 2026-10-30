const { test } = require('node:test')
const assert = require('node:assert/strict')
const { evaluate } = require('../scripts/audit.cjs')
const report = severity => ({ auditReportVersion: 2, metadata: {}, vulnerabilities: { sample: { severity, range: '<2', via: [{ url: 'https://example.com/advisory' }] } } })
const exception = { package: 'sample', range: '<2', advisories: ['https://example.com/advisory'], reason: 'Synthetic policy fixture only', expires: '2099-01-01' }
test('audit blocks high and critical but allows lower severities', () => {
  for (const severity of ['high', 'critical']) assert.deepEqual(evaluate(report(severity), { exceptions: [] }).blocked, ['sample'])
  assert.deepEqual(evaluate(report('moderate'), { exceptions: [] }).blocked, [])
})
test('exceptions require exact advisory set, range, reason and unexpired date', () => {
  assert.deepEqual(evaluate(report('high'), { exceptions: [exception] }).accepted, ['sample'])
  assert.deepEqual(evaluate(report('high'), { exceptions: [{ ...exception, range: '<1' }] }).blocked, ['sample'])
  assert.deepEqual(evaluate(report('high'), { exceptions: [{ ...exception, advisories: ['other'] }] }).blocked, ['sample'])
  for (const change of [{ reason: '' }, { expires: '2000-01-01' }]) assert.throws(() => evaluate(report('high'), { exceptions: [{ ...exception, ...change }] }))
  assert.throws(() => evaluate({ error: 'registry unavailable' }, { exceptions: [] }))
})
