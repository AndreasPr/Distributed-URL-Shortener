# Prepared PR description

Before this PR, `/admin/flagged`, `/admin/flagged/{code}/review` and `/admin/activity/{code}` checked `require_admin` (`review:manage`): workspace admins/owners and admin-scoped API keys were accepted, and the queries filtered by the Principal's workspace. `platform_admin` was always false. They were not global queues.

This changes those routes into global platform operations requiring a verified, server-allowlisted human. Workspace admin roles and API keys no longer grant global review/activity access. API-key-only MCP review/activity tools consequently return explicit 403 failures until a human-token transport exists.

The historical labels in PR #70 (15.1 users-workspaces) and PR #72 (15.2 jwt-auth) map to roadmap 15.2 tenancy and 15.3 JWT auth. Their implementations and history are retained.

Changes:
- Trusted Supabase user endpoint email confirmation, persisted hourly attempt limits, anonymous-session rejection and verified-human mutation gating.
- Platform email allowlist, actor+IP write limits and per-IP login/me limits.
- Creator-role scope ceilings, delegated-key provenance and transactional revocation on member removal.
- Migration 0007 for the check timestamp; 0008 revokes existing Supabase-role/PUBLIC application privileges and creator defaults, with no ACL changes on plain Postgres. RLS remains enabled; downgrade does not regrant privileges.
- Production requires Supabase; local listeners require loopback or explicit acknowledgement and a critical warning.
- Auth/security/threat-model/API/claims docs and an ADR addendum, without claiming a browser OAuth UI.

Deployment considerations:
- Migrate to 0008 first. Set production AUTH_MODE=supabase, an HTTPS SUPABASE_URL, and the environment-only SUPABASE_ANON_KEY for trusted email refreshes.
- Empty platform allowlists deny all global review/activity access. Verified email can remain stale during provider outages by explicit policy.
- Container local-auth listeners need LOCAL_AUTH_I_UNDERSTAND=true; demo published ports remain loopback-only.
- Existing Data API clients relying on removed grants must move through the backend. Additional object-creator roles and inherited role grants need operator review.

Validation results and exact test mapping are recorded in docs/auth-alignment-verification.md. No real Supabase key/token is used in tests; fake HTTP and disposable PostgreSQL/Redis are used.

Final gates (exit 0): make check (562 tests), make test-integration (579 tests,
93.84% combined coverage), frontend check (15 tests plus lint/types), MCP check
(35 tests plus lint/types), Docker migration suite (4 tests), staged Gitleaks and
diff checks. Live Supabase and browser OAuth were not tested.
