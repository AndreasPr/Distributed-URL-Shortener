# Auth alignment verification

Branch: `step-15-3a-auth-alignment`. Verified locally on 2026-11-05.
Historical PR #70 and #72 labels are retained; their roadmap scopes are tenancy
(15.2) and JWT authentication (15.3).

## Gap-to-test map

| Gap | Implementation | Evidence |
| --- | --- | --- |
| Trusted email, bounded HTTP, hourly attempt budget | `app/services/email_verification.py`, `user_auth.py`, revision 0007 | `tests/test_auth_alignment.py`: `test_trusted_confirmation_and_hourly_attempt_limit`, `test_outage_keeps_previous_and_claims_cannot_verify`, `test_email_response_subject_and_size_limits`, `test_email_http_contract_and_metrics`; `tests/integration/test_jwt_provisioning.py::test_hourly_email_budget_is_shared_across_sessions` |
| Anonymous rejection | `app/services/jwt_auth.py` | `test_anonymous_session_is_generic_401` |
| Verified human mutations, keys exempt | `app/api/auth.py` | `test_unverified_humans_read_but_cannot_mutate`, `test_api_keys_unaffected_by_email_gate`, `test_all_protected_mutations_use_verification_gate` |
| Verified-email platform allowlist and global boundary | `user_auth.py`, `app/api/routes.py` | `test_platform_boundary_and_global_queue`; integration tenant-boundary tests |
| Principal/IP limits, pre-auth IP limits | `app/middleware/rate_limiter.py` | `test_namespaced_principal_and_ip_write_buckets`, `test_auth_ip_limit_before_authentication`, `test_actor_ip_pair_and_auth_store_failure` |
| Key ceilings, revocation, secret once | `app/services/api_keys.py`, `app/api/workspaces.py` | `test_key_scope_ceiling`, `test_key_removal_demotion_and_one_time_secret`, `test_delegated_key_creator_is_retained_and_removed` |
| Conditional ACL migration, RLS retained | revision 0008 | `tests/integration/test_auth_role_privileges.py`: plain-Postgres no-op and stand-in-role existing/default grant tests; migration up/down suite |
| Production and local-listener guards | `app/core/config.py`, `app/services/auth_startup.py` | `test_production_requires_supabase`, `test_production_requires_https_origin`, `test_local_listener_guard`, `test_local_seed_verified` |
| Documentation and honest claims | auth/security/threat-model/API/claims docs, ADR 0035 addendum and 0038 | Auth remains PARTIAL: backend tested; browser Supabase login UI not implemented |

Unqualified test names above are in `tests/test_auth_alignment.py`.

## Actual checks

All commands below exited 0. Excerpts are from local command output; warning
counts are retained rather than represented as warning-free runs.

`make check`:
```text
Success: no issues found in 80 source files
562 passed, 30 deselected, 6 warnings in 52.58s
Checking rules/slo.yml
  SUCCESS: 22 rules found
  SUCCESS
```
Black, isort and Flake8 also passed. Unit coverage was 93.77%; the combined
integration gate is the authoritative coverage-floor check.

`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock make test-integration`:
```text
Required test coverage of 93.6% reached. Total coverage: 93.84%
579 passed, 13 deselected, 7 warnings in 69.31s (0:01:09)
```
This includes real PostgreSQL/Redis tests, the conditional ACL migration and
concurrent email-refresh budgeting. The coverage floor remains 93.6%.

`git diff --cached --check` and `gitleaks protect --staged --redact --no-banner`:
```text
no leaks found
```
Both exited 0; the diff check printed no errors.

`make frontend-check` (Node 22.23.4):
```text
# pass 15
# fail 0
cd frontend && ./node_modules/.bin/tsc --noEmit --incremental false
```
Dependency installation, ESLint and TypeScript completed successfully.

`make mcp-test`:
```text
Success: no issues found in 14 source files
35 passed in 2.69s
```
MCP Black/isort/Flake8 passed too. These tests do not establish that API-key
transport can access the newly human-only global endpoints.

`RUN_DOCKER_TESTS=1 .venv/bin/python -m pytest tests/test_migrations.py tests/test_tenancy_migrations.py -m docker --no-cov`:
```text
4 passed, 2 deselected in 8.70s
```

## Scope and limitations

- Fake Supabase HTTP, locally signed test tokens and disposable PostgreSQL/Redis
  were used. No live Supabase project, real credential or browser OAuth login was
  tested. Optional Kafka tests were not requested or run.
- Earlier runs exposed obsolete admin-key expectations, unverified test fixtures,
  lint/type issues and sandbox socket restrictions. Expectations and code were
  corrected; gates were rerun with local service access. Existing framework
  deprecation warnings remain.
- Supabase outages preserve the previous verified state; platform access can
  therefore remain stale during an outage. The hourly timestamp budgets attempts,
  including failures, across database sessions.
- Global review/activity now rejects API keys and ordinary workspace admins.
  Existing MCP global tools return explicit failures until a human-token transport
  is implemented. Workspace-scoped key management remains supported.
- Migrate to head before deployment. Production requires Supabase configuration;
  local container listeners need explicit acknowledgement. No production deploy
  or fresh demo stack was performed in this step.
- ACL defaults apply to the migration object creator. Arbitrary inherited grants
  need operator review; owner-role RLS bypass remains. Downgrade intentionally
  does not restore unsafe grants.
