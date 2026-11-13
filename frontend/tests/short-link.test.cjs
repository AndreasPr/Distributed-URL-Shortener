const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(env, fetch) {
  const source = fs.readFileSync(require('node:path').join(__dirname, '../lib/short-link.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS }}).outputText;
  const context = { exports: {}, process: { env }, fetch, URL, Response, Headers, AbortSignal };
  vm.runInNewContext(code, context); return context.exports;
}
test('copy base uses /s when explicitly configured, otherwise direct API', () => {
  assert.equal(load({NEXT_PUBLIC_SHORT_BASE_URL:'https://web.example/s/'}).shortLink('abc'), 'https://web.example/s/abc');
  assert.equal(load({NEXT_PUBLIC_API_URL:'https://api.example'}).shortLink('abc'), 'https://api.example/abc');
});
test('proxy preserves exact 307 and Location without following or credentials', async () => {
  let seen;
  const api = load({API_ORIGIN:'https://api.example', NODE_ENV:'production'}, async (url, options) => {
    seen = {url, options}; return new Response(null, {status:307, headers:{Location:'https://example.com/path?x=1'}});
  });
  const result = await api.proxyShort('abc');
  assert.equal(result.status, 307);
  assert.equal(result.headers.get('Location'), 'https://example.com/path?x=1');
  assert.equal(seen.options.redirect, 'manual');
  assert.equal(seen.options.headers, undefined);
  assert.equal(seen.url, 'https://api.example/abc');
});
test('missing origin and invalid code fail closed; errors never leak', async () => {
  assert.equal((await load({}).proxyShort('abc')).status,503);
  assert.equal((await load({}).proxyShort('../health')).status,404);
});
