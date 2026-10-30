const fs = require('node:fs')
const { spawnSync } = require('node:child_process')

function evaluate(report, policy, today = new Date().toISOString().slice(0, 10)) {
  if (report.error || report.auditReportVersion !== 2 || !report.vulnerabilities || !report.metadata || !Array.isArray(policy.exceptions)) throw new Error('Invalid audit report or exception policy')
  for (const item of policy.exceptions) {
    if (!item.package || !item.range || !item.reason?.trim() || !Array.isArray(item.advisories) || !item.advisories.length || !/^\d{4}-\d{2}-\d{2}$/.test(item.expires) || !Number.isFinite(Date.parse(item.expires)) || item.expires <= today) throw new Error('Invalid or expired audit exception')
  }
  function advisories(name, seen = new Set()) {
    if (seen.has(name)) return []
    seen.add(name)
    const finding = report.vulnerabilities[name]
    if (!finding || !Array.isArray(finding.via)) throw new Error('Incomplete audit dependency chain')
    return finding.via.flatMap(item => typeof item === 'string' ? advisories(item, seen) : [item.url])
  }
  const blocked = [], accepted = []
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    if (!['high', 'critical'].includes(finding.severity)) continue
    const urls = [...new Set(advisories(name))].sort()
    const exception = policy.exceptions.find(item => item.package === name && item.range === finding.range && urls.length > 0 && JSON.stringify([...item.advisories].sort()) === JSON.stringify(urls))
    ;(exception ? accepted : blocked).push(name)
  }
  return { blocked, accepted }
}
if (require.main === module) {
  try {
    const result = spawnSync('npm', ['audit', '--audit-level=high', '--json'], { encoding: 'utf8' })
    if (result.error || result.signal || ![0, 1].includes(result.status)) throw new Error('npm audit failed to execute')
    fs.writeFileSync('npm-audit.json', result.stdout)
    const report = JSON.parse(result.stdout)
    const { blocked, accepted } = evaluate(report, JSON.parse(fs.readFileSync('audit-exceptions.json', 'utf8')))
    console.log('Audit counts:', JSON.stringify(report.metadata.vulnerabilities))
    console.log('Documented exceptions:', accepted.length ? accepted.join(', ') : 'none')
    if (blocked.length) throw new Error(`Unexcepted high/critical findings: ${blocked.join(', ')}`)
    console.log('Audit gate: PASS')
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
module.exports = { evaluate }
