# Browser and kind CI repair — 2026-11-13

## Findings and scoped changes

The supplied frontend log reports 26 passing tests and one axe failure on
`/reset-password`: enabled button text had 3.27:1 contrast, below 4.5:1.
The shared Button used `transition-all` together with `disabled:opacity-50`.
When CAPTCHA enabled the button, its opacity continued animating through
low-contrast intermediate values. Button transitions now list color, background,
border, shadow and transform explicitly; opacity changes immediately.
The new browser regression verifies opacity immediately after enabling a button.
No axe rule, retry or accessibility assertion was disabled.

The Kubernetes log excerpt supplied contains Grafana background plugin timeouts
and successful startup messages for other dependencies, but lacks the failing
API traceback/deployment wait. Those messages alone do not prove the job's cause.
A separate defect was reproduced from the actual API manifest configuration:

```text
Original manifest configuration exit: 1
ValueError: Production requires AUTH_MODE=supabase; local and apikey_only are forbidden
```

The local/kind base declared production while using API-key authentication,
plaintext cluster Redis and localhost CORS. It now declares development; hosted
production validation remains unchanged. The regression test imports settings
with manifest literals and isolated fixture values, without cloud credentials.

## Local validation

Tests ran with CPython 3.11.14 and Node 22.23.4. Browser build/tests ran in a
temporary tracked-source copy excluding all `.env` files, against the local fake
identity provider. The developer's running app and secrets were not used.

Actual excerpts, all exit 0:

```text
make check
Success: no issues found in 88 source files
TOTAL                                       3689    228  93.82%
658 passed, 37 deselected, 2 warnings in 63.30s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS

make frontend-check
# tests 23
# pass 23
# fail 0
# followed by successful TypeScript check; ESLint also passed

npm run build
# production build completed successfully
npm run test:e2e -- --workers=2
28 passed (17.3s)

make mcp-test
Success: no issues found in 14 source files
35 passed in 0.84s
```

Full local logs: `/tmp/ci-repair-check-final.log`, `/tmp/ci-repair-frontend.log`,
`/tmp/ci-repair-build.log`, `/tmp/ci-repair-browser.log`, `/tmp/ci-repair-mcp.log`.
The first backend gate failed on the new test's single-document YAML reader;
that test now selects the Deployment from all YAML documents. Focused rerun:
10 passed. The complete corrected gate above passed.

GitHub-hosted runner success must still be established by pushing these changes
and rerunning CI. Local success is not a claim that the remote jobs have run.

## Additional reproduced load-gate defect

With the API startup fix, the first kind run reached Ready and passed HTTP smoke:

```text
PASS: health; shorten; redirect 307; analytics=1; metrics; auth=401; rate-limit=429
GoError: Authenticated setup failed: HTTP 429
```

The smoke throttling loop created links until the verified user's daily allowance
was exhausted. A different key for the same user did not reset that allowance.
The loop now retries the already-existing alias, requiring 409 conflicts until
429 with Retry-After. This consumes limiter tokens without creating more links.
The fake-server regression asserts exactly one creation; unexpected statuses
still fail. No production quota or k6 threshold was increased or disabled.
Focused smoke tests: 3 passed (exit 0). The initial sandboxed invocation could
not bind localhost and failed with PermissionError; rerunning with local-server
permission passed. `bash -n` and ShellCheck passed (exit 0).

The new browser regression was also run against the original `transition-all`
style in the temporary copy and failed as intended (exit 1): expected opacity
`1`, received `0.5`. The working tree retains the fixed style; the full corrected
28-test run is recorded above. Log: `/tmp/ci-repair-old-button.log`.

## Final kind run

Executed in the isolated source copy:
`KIND_NAME=relaymark-ci-repair RUN_K6=true RESULTS_DIR=/tmp/ci-repair-kind-final bash scripts/kind_smoke.sh`

Exit 0. Actual excerpts:

```text
Summary: 57 resources found in 1 file - Valid: 57, Invalid: 0, Errors: 0, Skipped: 0
Summary: 52 resources found in 1 file - Valid: 52, Invalid: 0, Errors: 0, Skipped: 0
deployment "api" successfully rolled out
deployment "worker" successfully rolled out
deployment "abuse-worker" successfully rolled out
Deployment ready. Run scripts/smoke_test.sh against a port-forward.
PASS: health; shorten; redirect 307; analytics=1; metrics; auth=401; rate-limit=429
http_req_duration{name:redirect}: p(95)=19.03ms
http_req_failed{name:redirect}: 0.00% 0 out of 151
checks_succeeded: 100.00% 302 out of 302
dropped_iterations: 0
151 complete and 0 interrupted iterations
Deleted nodes: ["relaymark-ci-repair-control-plane"]
```

All four k6 thresholds passed. These are local smoke-load measurements, not a
capacity claim. Disposable cluster cleanup completed; existing user clusters and
Compose services were not modified. Complete log: `/tmp/ci-repair-kind-final.log`;
JSON results: `/tmp/ci-repair-kind-final/k6-summary.json`.
