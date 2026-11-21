const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript'), fs = require('node:fs'), vm = require('node:vm');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/link-dates.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
const { expiryState, linkStats, timestamp } = context.exports;
test('expiry compares instants, treats naive backend dates as UTC and handles boundaries', () => {
  const now = Date.parse('2030-03-10T07:00:00Z');
  for (const zone of ['UTC','America/Chicago','Pacific/Auckland']) {
    const previous = process.env.TZ; process.env.TZ = zone;
    try {
      assert.equal(timestamp('2030-03-10T07:00:00'), now);
      assert.equal(expiryState('2030-03-10T02:00:00-05:00',now),'expired');
      assert.equal(expiryState('2030-03-10T07:00:00.001Z',now),'future');
      assert.equal(expiryState(null,now),'none'); assert.equal(expiryState('invalid',now),'invalid');
    } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
  }
});
test('statistics count only supplied rows and the next seven days', () => {
  const now = Date.parse('2030-01-01T00:00:00Z');
  const stats = linkStats([null,'2030-01-01T00:00:00Z','2030-01-08T00:00:00Z','2030-01-08T00:00:01Z'].map(expires_at => ({expires_at,click_count:2})),now);
  assert.equal(stats.links,4); assert.equal(stats.clicks,8); assert.equal(stats.expired,1); assert.equal(stats.expiring,1);
});
