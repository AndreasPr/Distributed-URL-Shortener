const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
test('return destinations reject external, encoded and control-character redirects', () => {
 const context = { exports: {}, URL }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/auth/redirect.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context)
 for (const value of ['https://evil.test', '//evil.test', '/%2fevil.test', '/\\evil.test', '/%0aevil', '/auth/callback', '/login']) assert.equal(context.exports.safeNext(value), '/dashboard')
 assert.equal(context.exports.safeNext('/analytics?code=abc'), '/analytics?code=abc')
})
