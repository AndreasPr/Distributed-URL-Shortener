const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = process.env.REPOSITORY_ROOT || path.resolve(__dirname, '../..');
function load(relative) {
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const context = { exports: {}, URL };
  vm.runInNewContext(compiled, context);
  return context.exports;
}
const content = load('lib/content/public-pages.ts');
function inspectClaims(value) {
  if (!value || typeof value !== 'object') return;
  if ('evidence' in value) {
    assert.equal(typeof value.evidence, 'string');
    assert.ok(!value.evidence.includes('..') && !path.isAbsolute(value.evidence));
    assert.ok(fs.statSync(path.join(root, value.evidence)).isFile(), value.evidence);
  }
  for (const child of Object.values(value)) inspectClaims(child);
}
test('every public claim has an existing repository evidence file', () => {
  inspectClaims(content.publicPages); inspectClaims(content.publicCopy);
  for (const page of content.publicPages) {
    assert.ok(page.lead.evidence);
    for (const section of page.sections) for (const claim of section.claims) assert.ok(claim.evidence);
  }
  inspectClaims(load('lib/content/changelog.ts').changelog);
});
test('public route inventory is exact; no private or demo routes are indexed', () => {
  assert.deepEqual(Array.from(content.publicPaths).sort(), ['/', '/about', '/changelog', '/contact', '/developers', '/docs', '/features', '/pricing', '/security', '/use-cases'].sort());
  for (const source of ['app/robots.ts', 'app/sitemap.ts']) assert.ok(fs.readFileSync(path.join(__dirname, '..', source), 'utf8').includes('publicPaths'));
});
const forbidden = [['un','splash'], ['fonts.','googleapis'], ['fonts.','gstatic'], ['relay','.mk'], ['relaymark','.dev'], ['Shrink','ify'], ['any','cast'], ['12','ms']].map(parts => parts.join('').toLowerCase());
function walk(folder) {
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(item => {
    if (['node_modules', '.git', '.next', 'test-results', 'playwright-report', '.env', '.env.local'].includes(item.name)) return [];
    const file = path.join(folder, item.name);
    return item.isDirectory() ? walk(file) : /\.(tsx?|[cm]?js|css|svg|html|rsc|body|md|json)$/.test(item.name) ? [file] : [];
  });
}
test('frontend sources and generated app artifacts contain no prohibited prototype copy/assets', () => {
  const base = path.resolve(__dirname, '..');
  const files = [...walk(base), ...walk(path.join(base, '.next'))];
  const bad = files.filter(file => forbidden.some(term => fs.readFileSync(file, 'utf8').toLowerCase().includes(term)));
  assert.deepEqual(bad.map(file => path.relative(base, file)), []);
});
