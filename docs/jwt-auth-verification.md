# JWT authentication verification

Branch: `step-15-2-jwt-auth`. Verified locally November 4, 2026.
No live Supabase login or account credentials were used. JWT tests use locally
generated RSA/EC key pairs and fake JWKS responses.

## Passing checks (actual excerpts)

`make check`, exit 0:
```text
84 files would be left unchanged.
Success: no issues found in 78 source files
TOTAL                                       2836    173  93.90%
517 passed, 27 deselected, 6 warnings in 47.22s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```

`make frontend-check`, exit 0 (npm ci, ESLint, tests, TypeScript):
```text
# pass 15
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

`make mcp-test`, exit 0:
```text
14 files would be left unchanged.
Success: no issues found in 14 source files
35 passed in 2.46s
```

JWT regression tests cover expired/not-yet-valid tokens,
wrong issuer/audience, missing expiry, malformed subjects, unknown keys, rotation,
none/HS256 confusion, tampering, ES256, bounded/malformed JWKS, network/read errors,
disabled/deleted users, database roles, credentials ambiguity, generic errors,
metrics, OpenAPI schemes, local mode, concurrent signing-key initialization and
production refusal.

## Final PostgreSQL/Redis integration gate

After the final authentication-metric update, `make lint typecheck` passed and
`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock make test-integration`
exited 0. This includes all unit tests plus disposable-service integration tests:

```text
TOTAL                                       2837    171  93.97%
Required test coverage of 93.6% reached. Total coverage: 93.97%
531 passed, 13 deselected, 7 warnings in 61.29s (0:01:01)
```

The real PostgreSQL test issues eight concurrent first-login transactions and
asserts exactly one user and one owner membership in a single personal workspace.
Testcontainers context managers/Ryuk cleaned up the disposable test services.
The existing combined coverage floor (93.6%) was retained.

Staged Gitleaks scan: exit 0, no leaks found. `git diff --check`: exit 0.

## Demo verification

`make demo` exited 0 and built both backend and production frontend images.
Owner and viewer `/me` calls returned 200 with their respective database roles;
both could read the default page of 20 seeded links. A headless Playwright browser
visited `/dashboard` without entering a key:
```text
Browser automatic login: 200
Authenticated first page: 200 links: 20
Bearer header sent: true
PASS: default 20-link page; no API key entered
```

`make demo-down` exited 0:
```text
Demo containers, volumes and credentials removed. Normal stack untouched.
```
The private seed-output log containing one-time demo keys was deleted.

## Initial failures and limits

The first sandboxed full gate failed four socket-binding smoke/k6 tests; the same
gate passed with local server/Docker permissions. The first ad-hoc browser check
incorrectly expected 30 rows in the default response. The API correctly paginates
at 20; the corrected check passed. Neither failure was hidden or used to weaken a
repository test. A final mypy failure caught an overly narrow inferred key type after the local
key concurrency fix; an explicit RSA/EC/legacy-secret union fixed it. Existing
FastAPI/Starlette deprecation warnings remain.

Full local logs: `/tmp/jwt-check-final.log`, `/tmp/jwt-frontend-final.log`,
`/tmp/jwt-mcp.log`, `/tmp/jwt-focused-final.log`, and
`/tmp/jwt-integration-final.log`. These local artifacts are not committed.

Live Supabase integration remains a manual check against your project's asymmetric
signing keys. This step does not implement the Supabase browser OAuth/refresh UI,
RLS policies, or multi-process local demo signing keys; see [auth.md](auth.md).
