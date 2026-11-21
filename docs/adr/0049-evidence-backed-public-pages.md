# 0049: Evidence-backed public pages

## Context

The root page describes only an older browser demo while the operator reports the hosted app is live. The design prototype mixes real feature ideas with simulated services and unsupported marketing claims.

## Decision

Opt ten public pages into v2 using one server PublicPage wrapper and typed content records with repository evidence. Preserve the existing API client, session link, local-auth destination, nonce CSP and /demo behavior. Bypass legacy shell/header/footer only for the exact opt-in route list. Keep all other page sources and appearance unchanged. Use local assets/fonts only and generate the changelog from actual selected merge commits, not deployment assumptions.

Link to repository API notes without claiming a live reference has been checked. Label creation caps as documented configurable defaults. Add a minimal SECURITY.md because none existed, using only the existing operator-contact path with no invented private-reporting guarantees. Contact reads the existing server-only mailbox setting and has no form.

## Consequences

File-existence checks detect broken evidence links but do not prove semantic truth; each claim was also reviewed against implementation/docs. Hosted availability is not reverified here. Full marketing chrome, private pages, legal templates, billing and new backend features remain out of scope. Public navigation/header/footer retain existing session and theme controls. Robots/sitemap inventory is not access control; real authorization remains unchanged.
