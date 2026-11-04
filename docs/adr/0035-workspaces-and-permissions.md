# 0035: Workspace tenancy and a shared permission model

## Context

Global API-key scopes previously exposed all links, analytics, reviews and key
metadata. We need a tenant boundary while retaining public globally unique short
codes and existing key secrets. The clarified scope supersedes the earlier step
12.1 reference: plan limits are 15.2; Supabase Auth JWT verification is 15.3.

## Decision

Use UUID workspace and user IDs, where a user ID will equal a verified Supabase
`sub`. Store no passwords or duplicate external subject. Workspace membership has
one owner/admin/member/viewer role per user/workspace; invites remain separate
pending email rows. Backfill all existing tenant records into a stable `legacy`
workspace without inventing user owners. Retain the original key creator ID on
URLs and add nullable human-creator IDs to tenant records.

Use one immutable Principal and one `require_permission` implementation, with a
role table intersected with API-key scopes. API keys are workspace-bound machine
actors and never owners/platform admins. Human Principals are an explicit future
extension, exercised through trusted dependency overrides in tests, never request
headers. Workspace admins manage keys through HTTP or the trusted operator CLI.

Tenant repository reads/mutations require explicit workspace arguments. Public
redirect lookups and trusted ingestion are explicitly named exceptions: stored
short codes determine tenancy, not caller-supplied event metadata. Unknown and
cross-tenant resources both return 404. Member mutations filter ownership within
the workspace. Public health's global aggregate count is retained for compatibility.
A workspace row lock serializes last-owner checks; merely locking the member being
changed would allow two concurrent owners to remove each other.

Enable PostgreSQL RLS without policies on all tables, including migration metadata,
as requested. Non-owner roles are default-denied; the current owner-role application
continues using explicit query predicates. Do not claim database-enforced isolation
for the owner role. Verified identity context and policies belong to 15.3.

## Alternatives and consequences

Separate databases/schemas per tenant increase local deployment and migration
complexity. Relying only on handlers risks an unfiltered repository; required
workspace parameters and SQL-filter tests guard that boundary. Enabling FORCE RLS
without policies now would stop the current application and migration process.
Implicit user IDs from key creators would confuse machine and human identities.

Existing secrets and redirects work after migration. Write keys now delete only
links they created; unowned legacy links require admin. Owner endpoints are
implemented but intentionally unavailable to API-key-only callers until 15.3.
Invites neither send mail nor grant access. Downgrade loses tenancy attribution
and identity rows; use it only with a backup and explicit migration planning.
The `plan` field is storage only, not quota enforcement.

Evidence: `tests/test_tenancy.py`, `tests/test_tenancy_migrations.py`, existing auth
and MCP contracts, and `tests/integration/test_redis_postgres.py`.
