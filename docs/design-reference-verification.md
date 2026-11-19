# Design-reference verification

2026-11-19, branch step-15-12a-design-reference. Branch already existed and was checked out; preserved the user's staged prototype. No application changes under frontend/ or app/. No prototype install/run, live service access, paid plan, commit or push.

| Command | Exit | Actual result |
|---|---|---|
| make check | 0 | 713 passed, 37 deselected, 2 warnings; Black/isort/Flake8/mypy clean; promtool 22 rules and rule tests SUCCESS |
| npm_config_offline=true make frontend-check | 0 | ESLint, 27 unit tests, TypeScript clean; Node 22.23.4 |
| make mcp-test | 0 | lint/types clean; 35 passed |
| pytest tests/test_design_reference_boundary.py -q | 0 | 3 passed |
| gitleaks dir docs/design-reference --redact (before) | 1 | 10 credential-like example findings in 7 files; no values printed |
| gitleaks dir docs/design-reference --redact (after) | 0 | No leaks found; no allowlist |
| gitleaks git --staged --redact | 0 | No leaks found |
| git diff --check / git diff --cached --check | 0 | Clean after removing imported trailing whitespace |

Actual gate excerpts:

```text
713 passed, 37 deselected, 2 warnings in 67.17s (0:01:07)
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
# tests 27
# pass 27
# fail 0
35 passed in 1.41s
```

Full local records (temporary, not committed artifacts): /tmp/design-reference-check.log, /tmp/design-reference-frontend.log, /tmp/design-reference-mcp.log, /tmp/design-reference-boundary.log. Scan JSON/logs are redacted. Initial scan failures were resolved by sanitizing documentation examples, not by excluding them. Initial staged whitespace failures were fixed.

No server.ts, server.js, db.json or .env* files existed to remove. Removed obsolete package scripts and replaced runnable setup instructions with a design-only README. Secret scanning includes the directory. Docker exclusion and Vercel/frontend-root boundaries were checked statically; no Docker image build or live Vercel deployment was performed. This step is not a visual/accessibility/license approval of the generated source. See design-port-plan.md and design-reference-scan.md.
