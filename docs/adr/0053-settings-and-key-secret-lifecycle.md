# 0053 — Settings navigation and page-local key secrets

## Context

Account and key pages already have working authenticated contracts. The design reference invents key generation, billing and other settings that these contracts do not provide. Key secrets must not survive leaving the page or changing workspaces, including when a create response arrives late.

## Decision

Use a shared SettingsNav for Appearance, Account and API keys; demo exposes Appearance only. Keep existing URLs, Supabase operations and the API client. Account and keys consume the existing shell identity instead of requesting another /me. Email verification comes only from that trusted response, never editable metadata.

A workspace-keyed component owns secret state. Dismiss/Escape/outside-close wipes it; workspace-change and effect cleanup invalidate in-flight results. Late responses cannot repopulate state after navigation. The secret has a dedicated dialog and never enters status announcements, URLs, application logs or browser storage. Copy is explicit, with a failure message; clipboard contents remain under the user's control. This is UI lifecycle isolation, not a claim that JavaScript strings can be securely erased from process memory.

Keep read → [read], read/write → [read, write], admin → [admin]. Backend authorization remains authoritative. Preserve 403 status as APIError while retaining existing messages so a server denial can render an explanatory state. List metadata types include created/last-use timestamps; the create response has its own narrower type. Format offsetless timestamps explicitly as UTC using the existing parser.

Global sign-out now requires confirmation but still revokes refresh sessions and warns that issued access tokens can remain valid until expiry. Account deletion retains its exact 30-day cleanup wording and typed DELETE gate. No backend or dependency changes.

## Consequences

Keys and account operations are real, not demo simulations. Shared identity reduces duplicate requests; a 403 overrides an outdated role indication. The page cannot recover a dismissed secret; operators must revoke/recreate when necessary. Created-at uses a naive database timestamp/default NOW(), so the existing UTC database convention must be retained; this UI cannot repair values historically written in a differently configured database timezone. Member/audit/billing/webhook screens remain out of scope.
