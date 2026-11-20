const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../app/globals.css'), 'utf8');
function tokens(selector) {
  const body = css.slice(css.indexOf(selector)).split('}')[0];
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/g)].map(m => [m[1], m[2]]));
}
function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function ratio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
for (const selector of ['[data-design="v2"] {', '.dark [data-design="v2"] {']) {
  test(`AA token pairs ${selector}`, () => {
    const t = tokens(selector);
    for (const [fg, bg] of [['foreground', 'background'], ['card-foreground', 'card'], ['popover-foreground', 'popover'], ['primary-foreground', 'primary'], ['secondary-foreground', 'secondary'], ['muted-foreground', 'muted'], ['muted-foreground', 'card'], ['accent-foreground', 'accent'], ['destructive', 'background']]) assert.ok(ratio(t[fg], t[bg]) >= 4.5, `${fg}/${bg}`);
    for (const bg of ['background', 'card']) for (const fg of ['ring', 'input']) assert.ok(ratio(t[fg], t[bg]) >= 3, `${fg}/${bg}`);
  });
}
test('v2 style rules are scoped and no prototype imports are used', () => {
  const rules = css.split('/* Design v2')[1];
  for (const match of rules.matchAll(/([^{}]+)\{/g)) for (const selector of match[1].split(',')) assert.ok(selector.includes('[data-design="v2"]'), selector);
  const page = fs.readFileSync(path.join(__dirname, '../app/design/page.tsx'), 'utf8');
  assert.ok(page.includes('usePathname() === "/design"'));
  assert.ok(page.includes('next/font/local'));
  assert.ok(!page.includes('docs/design-reference'));
});
