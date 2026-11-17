# 0046 — Free-tier reliability with bounded retries and encrypted backups

## Context

Free services sleep, restart and enforce quotas. The browser previously surfaced
transport failures immediately. Scheduled checks are not exact clocks; provider
billing measurements are not all accessible from an application database.
Backups in public repositories must remain confidential without storing a private
key in CI. Redirect availability must survive admission switches.

## Decision

Use shared, bounded 90-second readiness checks with a three-second waking state
and exponential backoff; never replay an uncertain mutation. Preserve real auth
errors. Read health/control status into a visible banner, with no network in demo.
Use a primary external five-minute monitor plus an explicitly enabled scheduled
GitHub backup monitor. Count steady-state health PINGs, not invented provider bills.

Use pg_dump via the IPv4 Supabase SESSION pooler on 5432, compressed custom format,
streamed to age with a committed public recipient. Upload only success-validated
ciphertext for 14 days. The private identity remains with the operator. Restore
requires an empty loopback database, complete decryption authentication, a single
transaction and cleanup. Test using disposable real PostgreSQL and synthetic data.

Platform-admin `/admin/usage` exposes aggregate measurements and unknown status.
Per explicit user approval, this endpoint alone also accepts a currently valid
admin-scope key whose active verified owner is a configured platform admin. This
enables unattended quota checks without a browser refresh token or a new global
admin bypass. Hourly checks deduplicate issues and escalate at 70%/90%; no automatic
paid upgrade. Provider-only billing metrics remain manual dashboard checks.

Environment switches gate local account provisioning, link creation, LLM calls
and product mutations. Read-only mode preserves login for existing users, redirects
and warning continuation. Workers/analytics still write; it is not SQL read-only.
Supabase's upstream signup setting remains separately controlled by the operator.

## Consequences

No guaranteed always-on uptime, durable Redis events, precise schedules, provider
billing attribution, or complete Supabase restore is claimed. Multiple monitors
and background consumers add Redis traffic. Process-local budget resets are
explicit. Backups omit cluster roles/ACLs, platform settings and storage objects;
provider schemas/extensions may need a Supabase-compatible recovery environment.
Losing the private age identity loses the archives. Nightly jobs and monitors stay
off until configured. Live smoke is at most 20 GETs and is never run automatically.
