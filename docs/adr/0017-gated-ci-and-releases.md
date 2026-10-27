# ADR 0017: Gated CI and release images

## Context

The old CD triggers could publish independently of successful tests and required a
personal token. Unit-only checks did not validate PostgreSQL or a deployed system.

## Decision

Use reusable CI for PR/main checks and tag release dependencies. Build and scan on
PRs without publishing. Only semantic version tags may publish, using a narrowly
scoped built-in token and the exact image artifact that passed Trivy. Keep tests,
security scans, frontend/MCP checks and kind smoke visible as independent jobs.
Use the existing Redis Streams CI overlay and a bounded 30-second redirect load gate.
Suspend migrations until dependency readiness; a cold kind run demonstrated that
starting the migration deadline alongside image pulls could expire before PostgreSQL.
Use explicit shell exits for smoke assertions: macOS Bash 3.2 did not honor errexit
for failed compound `[[ ]]` commands, which negative-response tests caught.

## Consequences and alternatives

A reusable workflow repeats tests on release tags but avoids trusting an unrelated
previous workflow run. Passing an image artifact costs storage but avoids rebuilding
an unscanned release image. npm audit and optional Codecov are reports; pip-audit,
Trivy and coverage remain blocking. Existing vulnerable locks therefore block
release until corrected in scoped dependency work, rather than hidden exceptions.
Kind validates deployment independently from Python mocks; it cannot reproduce all
production networking or prove long-term SLOs. SHA-pinned actions require updates,
handled by Dependabot. No paid service, PAT, or persistent cloud deployment is added.
