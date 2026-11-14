# Peer-only IP mode verification — 2026-11-13

Branch: `step-15-6b-peer-ip-mode`. No Render or other live hosted service was
contacted. No credentials or paid resources were added. Frontend dependencies
were installed from the offline npm cache.

## Behavior and evidence

| Contract | Test/evidence |
|---|---|
| Default remains trusted_proxies; production requires restricted nonempty ranges | `test_explicit_mode_required_and_validated`, existing hosted guard tests |
| Explicit peer_only permits empty proxy configuration | `test_explicit_mode_required_and_validated` |
| IPv4/IPv6 trust-all ranges rejected even in peer_only | `test_unrestricted_proxies_always_rejected` |
| Forwarded IP headers ignored even from an allowlisted peer | `test_peer_ignores_all_forwarded_headers_even_from_allowlisted_peer` |
| User/key buckets still enforce 429 and isolate identities | `test_authenticated_buckets_still_limit_and_isolate_principals` (both modes and identity types) |
| /me uses a post-auth per-principal bucket in peer_only | Same test, including independent identities and rejection of exhausted identity |
| Anonymous requests cannot exhaust shared peer buckets | `test_peer_public_routes_do_not_consume_shared_bucket_and_reports_keep_captcha` |
| Anonymous shortening is rejected; reports require CAPTCHA | Same test; `test_report_requires_captcha_and_enters_queue` tests invalid and valid CAPTCHA in both modes |
| Warning once per startup | `test_peer_warning_once_per_startup` |
| Hosted opt-in; no required guessed CIDRs | `test_render_blueprint_has_free_web_and_private_keyvalue` |

New tests are in `tests/test_peer_ip_mode.py`; existing contracts extended in
`tests/test_hosted_profile.py` and `tests/test_trust_controls.py`.

Peer-only explicitly disables anonymous IP enforcement, not just header parsing.
This avoids one visitor exhausting a shared platform bucket. It does **not**
provide per-visitor attribution, per-visitor anonymous limits or general DoS
protection. Turnstile, verified-owner creation, principal mutation limits and
PostgreSQL caps remain. /me moves to post-auth principal limiting; dev-login
remains unavailable in production. Uvicorn peer rewriting remains disabled.

## Actual checks

```text
.venv/bin/python -m pytest tests/test_peer_ip_mode.py tests/test_trust_controls.py -q
45 passed, 2 warnings in 1.86s
exit 0

npm_config_offline=true make frontend-check  # Node 22.23.4
# tests 23
# pass 23
# fail 0
# ESLint and tsc --noEmit --incremental false passed

make mcp-test
Success: no issues found in 14 source files
35 passed in 0.66s
exit 0
```

During development, collection first caught a missing Request import. The initial
full gate then failed two newly added test assertions: an anonymous /me expected
200 instead of 401, and startup logging used LogRecord.message instead of
getMessage(). These were corrected; the application authentication policy was not
relaxed. The initial gate returned exit 2 (672 passed, 2 failed).

Complete local logs: `/tmp/peer-focused-final.log`, `/tmp/peer-check-final.log`,
`/tmp/peer-frontend.log`, `/tmp/peer-mcp.log`. Temporary logs are not committed.
Real Render proxy behavior, kind and full service integration were not tested in
this step. Deployment success remains an operator check after CI and redeploy.

Final full gate (exit 0), actual excerpts:

```text
make check
Success: no issues found in 88 source files
TOTAL                                       3706    231  93.77%
675 passed, 37 deselected, 2 warnings in 61.70s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```

Black, isort, Flake8, mypy and Prometheus rule validation/unit tests passed.
Frontend-check exited 0 (offline install, lint, 23 unit tests, TypeScript).
Offline README checker: 242 lines, 59 links, 33 commands checked, exit 0.
Additional local documentation paths: 75 resolved, exit 0. External links were
not contacted. `git diff --check` passed. No changes were pushed or deployed.
