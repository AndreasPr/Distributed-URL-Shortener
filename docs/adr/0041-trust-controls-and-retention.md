# 0041 — Trust controls and retention

## Context
Verified authentication alone does not prevent short-link abuse, quota races, or retention of deleted users' data. Programmatic clients must remain usable without allowing ownerless creation.

## Decision
Creation requires an active, verified human, directly or through their owned API key. The free plan permits 20 successful creations per UTC day per user and 200 non-deleted links per workspace. PostgreSQL locks the user and workspace and commits quota usage with the link; Redis rate limits remain a separate burst control. Failed creation rolls back usage; deletion does not refund the daily budget.

New users' suspicious links receive a provisional verdict in the creation transaction. Suspicious links enter a public warning flow; Continue rechecks the stored destination and current block/deletion/expiry state. Malicious or denied destinations cannot continue. Heuristics run without fetching destinations; LLM use is explicit and budgeted.

Public category-only reports require server-verified Turnstile hostname/action and an IP bucket. Platform admins manage global reports, domain denial and suspensions; workspace admins can read only their workspace audit log. No report free text or visitor IP is stored in the report table.

Deletion disables owned links and keys immediately. The abuse worker runs repeatable retention cleanup hourly (also `python -m app.cli purge`): deleted profiles and owned links after 30 days, reports/audits after 90 days, quota counters after 31 days. A SHA-256 subject tombstone prevents a still-valid provider identity from recreating the deleted account. RLS remains enabled without public policies on new tables.

## Consequences
Database locking gives cross-instance quota enforcement; it adds contention for prolific users/workspaces. Suspicious links require an extra click, with false-positive risk. CAPTCHA and rate limits reduce but do not eliminate malicious reports. The warning acknowledgement is a UI interaction, not a security credential; the service is deliberately a redirector, and Continue can be called directly.

Retention depends on worker execution; sleeping free-tier hosts delay cleanup. Provider identities, backups and broker copies need separate operator erasure/retention. Tombstones remain pseudonymous data. Application-role access remains privileged despite RLS; repository authorization is still required. Public launch requires a configured abuse mailbox and reviewed legal templates.
