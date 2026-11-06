const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
test('near-expiry cookie sessions share one refresh and propagate new access token', async () => {
 let refreshes = 0
 const auth = {
  getSession: async () => ({ data: { session: { access_token: 'old', expires_at: 1 } } }),
  refreshSession: async () => { refreshes++; await new Promise(resolve => setTimeout(resolve, 10)); return { data: { session: { access_token: 'new' } } } },
 }
 const context = { exports: {}, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://example.test', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fixture-public' } }, require: () => ({ createBrowserClient: () => ({ auth }) }) }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/auth/browser.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
 const tokens = await Promise.all([context.exports.accessToken(), context.exports.accessToken()])
 assert.deepEqual(tokens, ['new', 'new'])
 assert.equal(refreshes, 1)
})
test('HTTP errors are distinct and a 401 clears the cookie session', async () => {
 let status = 402, signedOut = 0, destination = ''
 const context = {
  exports: {}, URL, AbortSignal, process: { env: {} },
  window: { location: { origin: 'https://app.example.test', pathname: '/dashboard', assign: url => { destination = url } } },
  require: name => name === './demo-api' ? { DemoAPIClient: class {} } : { accessToken: async () => 'fixture-token', signOut: async () => { signedOut++ } },
  fetch: async () => ({ ok: false, status, headers: { get: () => '7' }, json: async () => ({}) }),
 }
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/api.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context)
 const client = new context.exports.APIClient()
 for (const [code, message] of [[402,/plan limit/],[403,/permission/],[404,/not found/],[429,/Retry after 7/],[503,/temporarily unavailable/],[401,/session expired/]]) {
  status = code; await assert.rejects(client.listUrls(), message)
 }
 assert.equal(signedOut, 1)
 assert.equal(destination, 'https://app.example.test/login?error=session')
})
