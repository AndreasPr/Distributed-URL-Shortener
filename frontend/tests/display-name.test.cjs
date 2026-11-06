const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/auth/display-name.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
test('display name prefers explicit profile name with safe OAuth fallbacks', () => {
 const name = context.exports.displayName;
 assert.equal(name({display_name: ' Preferred ', full_name: 'Provider'}), 'Preferred');
 assert.equal(name({display_name: '', full_name: 'Google name'}), 'Google name');
 assert.equal(name({name: 'GitHub name'}), 'GitHub name');
 assert.equal(name({display_name: {role: 'admin'}, name: 42}), '');
 assert.equal(name(undefined), '');
});
