const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const css = readFileSync('app/globals.css', 'utf8')
function luminance(hex) {
  const rgb = hex.match(/[a-f\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}
for (const selector of [':root', '.dark']) test(`${selector} semantic text meets AA contrast`, () => {
  const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0]
  const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(match => [match[1], match[2]]))
  for (const [foreground, background] of [['foreground', 'background'], ['card-foreground', 'card'], ['primary-foreground', 'primary'], ['secondary-foreground', 'secondary'], ['muted-foreground', 'muted'], ['accent-foreground', 'accent'], ['destructive', 'card']]) {
    const values = [luminance(tokens[foreground]), luminance(tokens[background])].sort((a, b) => b - a)
    assert.ok((values[0] + 0.05) / (values[1] + 0.05) >= 4.5, `${foreground}/${background}`)
  }
})
