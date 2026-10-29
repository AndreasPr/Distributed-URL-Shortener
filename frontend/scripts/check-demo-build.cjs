const fs = require('node:fs')
const path = require('node:path')
// Scan browser-delivered code/data, not Next's server runtime (which implements localhost binding).
const patterns = [
  /https?:\/\/(?:localhost|127(?:\.\d+){3}|0\.0\.0\.0|169\.254(?:\.\d+){2}|10(?:\.\d+){3}|192\.168(?:\.\d+){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d+){2}|\[(?:::1|[fF][cCdD][^\]]*|[fF][eE]80[^\]]*)\]|api|backend|redis|postgres|[^/\s"']+\.(?:internal|local))(?=[:/\s"']|$)/i,
  /AIza[\w-]{35}|sk-ant-[\w-]{20,}|gh[pousr]_[\w]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
]
function inspect(text) {
  return patterns.some(pattern => pattern.test(text)) || Object.entries(process.env).some(([key, value]) =>
    /(?:API_KEY|TOKEN|PASSWORD|SECRET)$/.test(key) && value && value.length >= 8 && text.includes(value))
}
function files(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]) }
if (require.main === module) {
  const targets = [...files('.next/static'), ...files('.next/server/app').filter(file => /\.(html|rsc|body)$/.test(file))]
  const failures = targets.filter(file => inspect(fs.readFileSync(file, 'utf8')))
  if (failures.length) { console.error('Demo artifact privacy check failed (values redacted):', failures); process.exit(1) }
  console.log(`Demo artifact privacy check: PASS (${targets.length} public artifacts; known key patterns, private URLs, environment credential values)`)
}
module.exports = { inspect }
