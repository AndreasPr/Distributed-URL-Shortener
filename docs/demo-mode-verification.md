# Browser demo verification — 2026-10-29

Branch: step-9-4-demo-mode. No backend changes, real credentials, cloud deployment or paid
services. Vercel production was inspected read-only; production release of this branch
and its Vercel build logs remain a manual verification step in [deployment-demo.md](deployment-demo.md).

## Actual output excerpts (exit 0 unless stated)

`make frontend-check` (npm ci, lint, unit tests, TypeScript):

```text
✔ No ESLint warnings or errors
ℹ tests 9
ℹ pass 9
ℹ fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```

`NEXT_PUBLIC_DEMO_MODE=false NEXT_TELEMETRY_DISABLED=1 npm run build` and
`NEXT_PUBLIC_DEMO_MODE=true NEXT_TELEMETRY_DISABLED=1 npm run build`, from frontend:

```text
✓ Compiled successfully
✓ Generating static pages (9/9)
○ (Static) prerendered as static content
```

`npm run check:demo-build`:

```text
Demo artifact privacy check: PASS (36 public artifacts; known key patterns, private URLs, environment credential values)
```

`npm run test:e2e`:

```text
Running 4 tests using 4 workers
✓ landing layout fits a mobile viewport
✓ metadata stays in head and assets load
✓ shorten, copy, navigate and reload without API traffic or persistence
✓ allow and block mutate only the sample queue; analytics and health are samples
4 passed (4.3s)
```

Desktop screenshot was also visually inspected. Browser inputs stay in memory; navigation
preserves changes, reload resets, storage remains empty, and the client makes no backend
requests. Tests distinguish Next's RSC navigation/prefetch requests from API fetches.

`make check` with local socket access:

```text
TOTAL                                       2369    152  93.58%
430 passed, 23 deselected, 6 warnings in 23.27s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```

`make mcp-test`:

```text
Success: no issues found in 14 source files
35 passed in 2.57s
```

`actionlint .github/workflows/ci.yml` and `git diff --check`: exit 0, no output.
`python scripts/check_readme.py`:

```text
PASS: README 205 lines (<300)
PASS: 54 Markdown links checked (local paths/anchors and URL syntax)
PASS: 32 command examples checked against repository targets/scripts/config
PASS: bash examples parse; no stack/deployment command was executed
NOTE: 8 external URLs need online HTTP verification; localhost endpoints need running services
```

## Failed attempts and limits

- First make check: 427 passed, 3 failed because the sandbox disallowed localhost socket
  binding (`PermissionError: [Errno 1] Operation not permitted`). Retried with socket access;
  all 430 passed. No application change was needed.
- First Playwright run: 2 passed, 1 failed because the test misidentified Next's `/health`
  RSC prefetch as an API call. Corrected the assertion to recognize the RSC header.
- Two initial npm invocations were accidentally issued at repository root and failed
  ENOENT (there is no root package.json); rerun correctly from frontend.
- Host Node 23.9 produced an existing dependency engine warning. CI and documented Vercel
  settings use Node 22.x. Build/test succeeded here; no claim of a completed hosted CI run.
- The reported visible metadata defect was not reproduced on production: both head and
  title computed display were none. Generic metadata was replaced, sharing assets supplied,
  and regression tests added. Private Vercel build logs were not accessed.
- Secret-pattern scanning is not a comprehensive security proof. No secrets were provided
  to Vercel; existing ignored environment files were neither changed nor printed.
