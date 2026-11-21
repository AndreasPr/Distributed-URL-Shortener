# 0050: Shared shell identity for navigation and workspace selection

## Context

The switcher already requests `/me`. The new role-aware navigation needs the same platform-admin value without issuing a second request or treating workspace-admin status as global authority. Demo pages must never request real identity.

## Decision

Mount an in-memory WorkspaceIdentityProvider only around the real app shell. It owns the initial `/me` promise and shares the result with navigation and WorkspaceSwitcher. The switcher retains the existing API client's X-Workspace-ID selection and validates a proposed switch with a fresh `/me`; successful switches refresh the shared identity and notify content through the existing workspace-changed event. Failed switches restore the previous API workspace and remove privileged navigation until a successful identity refresh. No persistence or backend authorization changes.

Render Review queue only for explicit platform_admin=true (or the isolated demo). Navigation is not an authorization boundary; the existing page and API still reject forbidden access. Reuse existing signOut for the account menu, with the existing account link retained in LocalAuth mode rather than inventing local logout.

## Consequences

The shared identity lives for the real-shell mount, not globally across login/logout or demo boundaries. This avoids a second initial identity fetch for navigation. Membership changes made elsewhere become visible on the next identity request; backend permissions remain authoritative on every operation. Page-owned identity requests such as account details are outside this shell-only sharing contract. V2 scope applies only to real navigation surfaces and explicitly to their portals, never to the content parent. Demo navigation keeps v1 styling.
