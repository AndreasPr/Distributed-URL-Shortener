# CI runner compatibility repair

The supplied GitHub logs show Python 3.11.14 setup and Playwright 1.56.1 Chromium
installation failing on Ubuntu 26.04 before application tests run. Pinning hosted
jobs to Ubuntu 24.04 addresses both installer compatibility boundaries. The Python
release manifest and installed Playwright dependency map confirm 24.04 support;
see [ADR 0036](adr/0036-explicit-ci-runner-os.md).

Local validation output excerpts, all exit 0:

```text
actionlint
(no output)

.venv/bin/python -m pytest tests/test_ci_workflows.py -q
5 passed in 0.74s

make check
480 passed, 26 deselected, 6 warnings in 50.41s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS

make frontend-check
# tests 13
# pass 13
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false

make mcp-test
35 passed in 1.52s
```

Lint/type checks passed as part of these gates. Complete session logs are in
`/tmp/runner-check.log`, `/tmp/runner-frontend.log`, and `/tmp/runner-mcp.log`.
These local macOS checks do not execute actions/setup-python or Linux browser
package installation. A new GitHub run on the fix commit remains required. Rerunning
the old failing commit will still use ubuntu-latest. No hosted workflow was dispatched
and no application dependencies, interpreter versions, or checks were disabled.
