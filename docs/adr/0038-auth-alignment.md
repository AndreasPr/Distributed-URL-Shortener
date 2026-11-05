# 0038: Trusted email, platform authority and auth deployment guards

## Context

PR #70's tenancy and PR #72's JWT implementation already provide human Principals.
Their branch labels differ from roadmap numbering; preserve their history. Email
was conservatively unverified, workspace admin keys could access workspace-filtered
review/activity, and Supabase Data API roles had no explicit ACL hardening.

## Decision

Use authenticated `/auth/v1/user` metadata, not editable JWT/user metadata, for
email confirmation and the email-based platform allowlist. Persist each hourly
attempt under a user row lock before network I/O, including failed attempts.
Preserve previous trusted state on outages. Reject anonymous sessions and gate
all protected human mutations on verified email; API keys remain independent.

Global review/activity is an explicitly named platform permission, available only
to verified allowlisted humans. Workspace roles cannot grant it. Key issuance is
capped by current creator membership; delegated keys preserve provenance and
member removal revokes them transactionally. Demotion invalidates oversized keys.

Use namespaced actor-plus-IP write buckets and dedicated IP auth buckets, failing
closed when Redis cannot enforce them. Require Supabase mode in production. Local
mode needs a verifiable loopback Uvicorn listener or explicit acknowledgement,
always with a critical startup warning. Unknown/custom listener configurations
fail closed unless acknowledged.

Keep RLS enabled. Where Supabase roles exist, revoke direct and PUBLIC-inherited
application privileges and creator defaults. Keep plain Postgres deployments a
privilege no-op. Do not restore insecure grants on downgrade.

## Consequences and alternatives

Hourly metadata can be stale and outages can extend existing verified/admin
status. Checking every request would improve freshness but increase provider
coupling and request volume; clearing status on outage conflicts with the required
availability policy. The persistent attempt timestamp adds migration `0007`.

Global endpoints intentionally stop accepting API keys; current MCP global tools
need a future human-token transport. The local demo explicitly allowlists its fake
owner and acknowledges container binding while publishing only loopback ports.

PUBLIC revocation is necessary because PostgreSQL ACLs have no DENY override.
The ACL migration affects the current migration creator's defaults and application
schema routines, excluding extension routines; unrelated creator roles and role
inheritance need operator review. Owner-role bypass means this is not a tenant-RLS
claim. Browser OAuth UI remains future, so end-to-end auth claims remain PARTIAL.
