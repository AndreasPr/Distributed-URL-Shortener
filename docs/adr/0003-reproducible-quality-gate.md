# ADR 0003: Reproducible Python and blocking quality gates

Date: 2026-10-15
Status: Accepted

## Context

Normal pytest crashed before collection, and CI tolerated type errors, omitted MCP/frontend checks, and installed floating Python dependencies. Frontend lint prompted for configuration. The local readline import reproduces the crash without pytest in Anaconda CPython 3.11.5.

## Decision

Pin CPython 3.11.14 for local development, Docker, and CI. Recreate the project environment with a clean uv-managed build, retaining the old environment locally. Use normal pytest capture rather than a permanent workaround. Pin uv 0.9.9 and readable direct dependency inputs; generate hashed universal runtime, MCP, and combined development locks from a shared resolution.

Use Make as the command interface, with blocking formatting, linting, typing, and tests. CI invokes the same targets and adds MCP and frontend gates. Configure Next's core-web-vitals preset without rule suppressions. Keep frontend installation reproducible through npm ci. Add matching local pre-commit checks and pinned Gitleaks with narrowly anchored placeholder exceptions.

Use SQLAlchemy's typed mappings with explicit existing SQL types/nullability, explicit optional initialization state, and accurate URL/return annotations instead of application-wide type ignores. Regression tests preserve mapped schema characteristics, default logging output, and the worker's unconfigured-database failure. Split long strings, normalize embedded Lua indentation, and remove unused assignments without changing successful request behavior.

## Consequences

Existing environments must be recreated; a version file alone cannot repair a native extension. Native failure is localized to the old interpreter/libraries, but the exact offending native instruction was not identified. Dependency and frontend upgrades remain deliberate follow-up work. Full integration testing, Kubernetes readiness, and historical secret remediation remain outside this gate. Pre-commit setup needs initial network access; generated reports and environment backups remain ignored.
