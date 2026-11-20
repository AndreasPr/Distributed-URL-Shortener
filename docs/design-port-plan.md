# Design-reference port plan

Inspected 2026-11-19. Planning only: no production frontend/backend changes. The prototype was already staged on the requested branch. No prototype packages were installed or executed. Paths below are relative to `docs/design-reference/src` unless stated otherwise.

## Build and scanning boundary

Backend Docker excludes docs plus an explicit design-reference rule. Frontend Docker builds from frontend/; the Vercel project must retain Root Directory frontend (see hosting runbook). Root .vercelignore also excludes the prototype for root uploads. Next, ESLint, tsc, Node tests and Playwright run inside frontend and cannot discover this sibling directory through their current entry points. Make lint/typecheck target app/ and eval/; pytest testpaths is tests. Explicit Black/isort/Flake8/mypy/pytest exclusions defend recursive discovery. No global pre-commit exclusion or Gitleaks allowlist was added. Do not import prototype files into frontend or change the Vercel root. Cloud dashboard configuration was not inspected live.

## Routes and pages

Statuses: **exists-restyle** keeps an existing contract; **exists-differs** has partial/semantically different behavior; **new-UI-only** needs no new backend for the stated restricted scope; **new-needs-backend** is not implementable by styling; **out-of-scope** must not be promised. Prototype routes are not a migration instruction.

| Prototype page | Existing destination | Status | Backend / constraint |
|---|---|---|---|
| `pages/AboutPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/BlogPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/ChangelogPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/ContactPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/DesignSystemPage.tsx` | /design | exists-restyle | Use existing Relaymark components, no parallel token engine |
| `pages/DevelopersPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/DocsPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/FeaturesPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/LandingPage.tsx` | / | exists-restyle | No new API; preserve sign-in state and /demo entry |
| `pages/LinkInBioPublicPage.tsx` | none | new-needs-backend | Public handle lookup/moderation needed; fixture not published |
| `pages/PricingPage.tsx` | free limits documentation | exists-differs | No billing API; use actual free caps from config |
| `pages/QrCodesPage.tsx` | future local QR UI | new-UI-only | Generate locally from real short URL; no external QR service |
| `pages/ReportPage.tsx` | /report/[code] | exists-differs | POST /reports requires Turnstile; never mock submission success |
| `pages/SecurityPage.tsx` | /abuse and security docs | exists-differs | No PGP endpoint, no unverified compliance guarantees |
| `pages/StatusPage.tsx` | /health | exists-differs | GET /health, /status; no historical incidents or uptime SLA feed |
| `pages/UseCasesPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/admin/AdminCustomersPage.tsx` | none | out-of-scope | No customer CRM/list/support-note API; do not expose user data |
| `pages/admin/AdminFlaggedPage.tsx` | /flagged | exists-differs | GET /admin/flagged; POST /admin/flagged/{code}/review; reports/disable/suspend endpoints in trust.py |
| `pages/admin/AdminFlagsPage.tsx` | none | out-of-scope | GET /status exposes effective flags; no toggle API, configure env on host |
| `pages/admin/AdminOverviewPage.tsx` | future admin overview | new-needs-backend | /admin/usage and /admin/activity/{code} partial only; no cluster/customer aggregates |
| `pages/app/AnalyticsPage.tsx` | /analytics | exists-differs | GET /analytics/{short_code}; no geographic/device/unique-visitor attribution |
| `pages/app/BioPage.tsx` | none | new-needs-backend | No profile/link-in-bio persistence or published handle route |
| `pages/app/DashboardPage.tsx` | /dashboard | exists-differs | GET /urls; prototype aggregate metrics are simulated |
| `pages/app/LinkDetailPage.tsx` | future detail UI | new-needs-backend | GET /urls/{code}/status and /analytics/{code} cover status/clicks; update/rules/password require new contracts |
| `pages/app/LinksPage.tsx` | /dashboard | exists-differs | GET /urls, POST /shorten, DELETE /urls/{code}; edit/bulk/tags unavailable |
| `pages/app/McpPage.tsx` | MCP docs/UI | new-UI-only | Existing separate MCP server via HTTP API; no hosted MCP registration API |
| `pages/app/settings/AccountPage.tsx` | /account | exists-differs | GET /me, GET /me/export, DELETE /me; Supabase profile/session operations |
| `pages/app/settings/AuditPage.tsx` | workspace audit UI | new-UI-only | GET /workspaces/{workspace_id}/audit; admin permission required |
| `pages/app/settings/BillingPage.tsx` | none | out-of-scope | No paid plans, invoices or payment provider |
| `pages/app/settings/KeysPage.tsx` | /app/keys, /api-keys | exists-differs | GET/POST /api-keys, DELETE /api-keys/{key_id}; real secret shown once |
| `pages/app/settings/MembersPage.tsx` | workspace UI extension | new-UI-only | GET/POST /workspaces/{workspace_id}/members; PATCH/DELETE member; pending invitations only, no sending |
| `pages/app/settings/SettingsLayout.tsx` | shared layout | exists-restyle | Next layout/components only; preserve auth guards |
| `pages/app/settings/UsagePage.tsx` | usage UI | exists-differs | GET /admin/usage is PLATFORM ADMIN ONLY; tenant usage endpoint needed for ordinary users |
| `pages/app/settings/WebhooksPage.tsx` | none | new-needs-backend | No webhook subscriptions/delivery logs/retry API |
| `pages/auth/LoginPage.tsx` | /login | exists-differs | Supabase SSR/PKCE; /me, not prototype mock login |
| `pages/auth/OnboardingPage.tsx` | existing onboarding checklist | exists-differs | GET /me, GET/POST /workspaces; do not invent completed setup |
| `pages/legal/AupPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/legal/CookiesPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/legal/DpaPage.tsx` | none | out-of-scope | No signed DPA or compliance commitment |
| `pages/legal/LegalDocumentLayout.tsx` | shared layout | exists-restyle | Next layout/components only; preserve auth guards |
| `pages/legal/PrivacyPage.tsx` | /privacy | exists-restyle | Keep actual processors/retention and template label |
| `pages/legal/RefundsPage.tsx` | none | out-of-scope | No payments or refund service |
| `pages/legal/SubprocessorsPage.tsx` | public content / repository docs | new-UI-only | Curate factual content; contact uses configured abuse contact/report; no fake submission backend |
| `pages/legal/TermsPage.tsx` | /terms | exists-restyle | Keep legal template disclaimer |
| `pages/system/BlockedLinkPage.tsx` | /warn/[code] and blocked response | exists-differs | Malicious HTTP451; warning continuation rechecks policy |
| `pages/system/EmailVerificationPage.tsx` | verification UI | exists-differs | /me email_verified from trusted backend; not metadata |
| `pages/system/ExpiredLinkPage.tsx` | redirect error UI | exists-differs | Existing HTTP 410 on expired links |
| `pages/system/MaintenancePage.tsx` | ReliabilityBanner | exists-differs | GET /status and /health; preserve cold-start retry window |
| `pages/system/NotFoundPage.tsx` | Next not-found | exists-differs | Real 404 response, not a cosmetic route |
| `pages/system/RateLimitedPage.tsx` | existing rate-limit feedback | exists-differs | 429 and Retry-After; do not simulate success |
| `pages/system/ServerErrorPage.tsx` | error boundary | exists-differs | Preserve real error status, no stack traces |

### Exact route inventory (including redirects and layout routes)

| Prototype path | Element / redirect |
|---|---|
| `/login` | `LoginPage` |
| `/onboarding` | `OnboardingPage` |
| `/` | `MarketingLayout` |
| `/` (index) | `LandingPage` |
| `/pricing` | `PricingPage` |
| `/features` | `FeaturesPage` |
| `/docs` | `DocsPage` |
| `/changelog` | `ChangelogPage` |
| `/status` | `StatusPage` |
| `/about` | `AboutPage` |
| `/contact` | `ContactPage` |
| `/blog` | `BlogPage` |
| `/security` | `SecurityPage` |
| `/report` | `ReportPage` |
| `/qr-codes` | `QrCodesPage` |
| `/link-in-bio` | `LinkInBioPublicPage` |
| `/bio/:handle` | `LinkInBioPublicPage` |
| `/use-cases` | `UseCasesPage` |
| `/developers` | `DevelopersPage` |
| `/legal/terms` | `TermsPage` |
| `/legal/privacy` | `PrivacyPage` |
| `/legal/aup` | `AupPage` |
| `/legal/cookies` | `CookiesPage` |
| `/legal/refunds` | `RefundsPage` |
| `/legal/dpa` | `DpaPage` |
| `/legal/subprocessors` | `SubprocessorsPage` |
| `/design-system` | `DesignSystemPage` |
| `/app` | `AppLayout` |
| `/app/` (index) | `DashboardPage` |
| `/app/links` | `LinksPage` |
| `/app/links/:id` | `LinkDetailPage` |
| `/app/bio` | `BioPage` |
| `/app/analytics` | `AnalyticsPage` |
| `/app/mcp` | `McpPage` |
| `/app/keys` | `Navigate` → `/app/settings/keys` |
| `/app/webhooks` | `Navigate` → `/app/settings/webhooks` |
| `/app/billing` | `Navigate` → `/app/settings/billing` |
| `/app/members` | `Navigate` → `/app/settings/members` |
| `/app/usage` | `Navigate` → `/app/settings/usage` |
| `/app/settings` | `SettingsLayout` |
| `/app/settings/` (index) | `Navigate` → `/app/settings/keys` |
| `/app/settings/keys` | `KeysPage` |
| `/app/settings/webhooks` | `WebhooksPage` |
| `/app/settings/members` | `MembersPage` |
| `/app/settings/billing` | `BillingPage` |
| `/app/settings/usage` | `UsagePage` |
| `/app/settings/account` | `AccountPage` |
| `/app/settings/audit` | `AuditPage` |
| `/app/design-system` | `DesignSystemPage` |
| `/admin` | `AdminLayout` |
| `/admin/` (index) | `AdminOverviewPage` |
| `/admin/flagged` | `AdminFlaggedPage` |
| `/admin/customers` | `AdminCustomersPage` |
| `/admin/flags` | `AdminFlagsPage` |
| `/admin/preview` | `AdminPreview` |
| `/404` | `NotFoundPage` |
| `/500` | `ServerErrorPage` |
| `/429` | `RateLimitedPage` |
| `/maintenance` | `MaintenancePage` |
| `/expired-link` | `ExpiredLinkPage` |
| `/blocked-link` | `BlockedLinkPage` |
| `/email-verification-needed` | `EmailVerificationPage` |
| `/verify-email` | `EmailVerificationPage` |
| `*` | `NotFoundPage` |

## Components, layouts, contexts and datasets

Every reusable source is inventoried below. No component is approved for wholesale copying. Existing production counterparts live in frontend/components/, frontend/components/ui/, frontend/lib/ and frontend/app/layout.tsx.

| Prototype source | Status | Port destination / constraint |
|---|---|---|
| `components/.DS_Store` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/common/PageStateSimulator.tsx` | new-UI-only | Development /design only; never override actual request errors |
| `components/links/CreateEditLinkModal.tsx` | new-needs-backend | Create exists, but edit/tags/rules/bulk do not; see feature gaps below |
| `components/links/CsvImportModal.tsx` | new-needs-backend | Create exists, but edit/tags/rules/bulk do not; see feature gaps below |
| `components/links/QrCodeModal.tsx` | new-UI-only | Local generation/URL builder only; preserve destination validation and do not contact external renderers |
| `components/links/UtmBuilderModal.tsx` | new-UI-only | Local generation/URL builder only; preserve destination validation and do not contact external renderers |
| `components/navigation/CommandPalette.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/navigation/MarketingFooter.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/navigation/MarketingHeader.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/navigation/Sidebar.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/navigation/Topbar.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/navigation/WorkspaceSwitcher.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `components/showcase/AdminPreview.tsx` | new-UI-only | Optional /design examples only, never fake admin/marketing metrics in live UI |
| `components/showcase/AppShellSlot.tsx` | new-UI-only | Optional /design examples only, never fake admin/marketing metrics in live UI |
| `components/showcase/ComponentShowcase.tsx` | new-UI-only | Optional /design examples only, never fake admin/marketing metrics in live UI |
| `components/showcase/MarketingPreview.tsx` | new-UI-only | Optional /design examples only, never fake admin/marketing metrics in live UI |
| `design-system/Badge.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Button.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Card.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/CodeBlock.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Dialog.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/EmptyState.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Icons.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Input.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/PricingCard.tsx` | out-of-scope | Paid tiers not offered; replace with factual free-limit explanation |
| `design-system/Select.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Skeleton.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/StatCard.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Table.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Tabs.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/Toast.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/index.ts` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `design-system/tokens.ts` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `layouts/AdminLayout.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `layouts/AppLayout.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `layouts/MarketingLayout.tsx` | exists-restyle | Existing Relaymark UI primitives/shell; retain keyboard, focus, ARIA and theme behavior |
| `context/AppDataContext.tsx` | exists-differs | Never port localStorage keys/customer/flag persistence; use real api.ts or route-scoped demo client. Local invoices, webhook logs, pendingInvites and generated key secrets are mock datasets too. |
| `context/ThemeContext.tsx` | exists-differs | Use existing next-themes; do not replace auth storage. |
| `context/ToastContext.tsx` | exists-differs | Use existing Sonner integration. |
| `context/WorkspaceContext.tsx` | exists-differs | Use real /workspaces and X-Workspace-ID; viewer role and tenant 404 rules must remain. |

### Mock exports

All exports are in `mock/index.ts`; schemas in `mock/types.ts`. They are fabricated, not API response fixtures or evidence.

| Dataset | Status / replacement |
|---|---|
| `mockCurrentUser` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockWorkspaces` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockShortLinks` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockAnalytics` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockApiKeys` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockWebhooks` | new-needs-backend: new tenant model and reviewed contracts |
| `mockMcpServerConfig` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockBillingPlans` | out-of-scope: simulated commerce/infrastructure/control data |
| `mockBioThemes` | new-needs-backend: new tenant model and reviewed contracts |
| `mockInitialBioProfile` | new-needs-backend: new tenant model and reviewed contracts |
| `mockAdminClusterNodes` | out-of-scope: simulated commerce/infrastructure/control data |
| `mockAuditLogs` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockFaqs` | new-UI-only: replace with factual editorial content |
| `mockBlogPosts` | new-UI-only: replace with factual editorial content |
| `mockChangelog` | new-UI-only: replace with factual editorial content |
| `mockStatusComponents` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockStatusIncidents` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockAdminOverviewMetrics` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockFlaggedLinks` | exists-differs: use real authenticated APIs; synthetic values only under /demo |
| `mockCustomers` | out-of-scope: simulated commerce/infrastructure/control data |
| `mockInitialSystemFlags` | out-of-scope: simulated commerce/infrastructure/control data |

`main.tsx`, `App.tsx`, `index.css`, `index.html`, `vite.config.ts`, `tsconfig.json`, `metadata.json`, and package.json are prototype scaffolding, **out-of-scope** for copying: retain Next App Router, nonce CSP, metadata and existing build scripts. package.json is dependency inventory only; obsolete scripts invoking the removed server were deleted.

## Implied feature gaps (future, not approved scope)

| Feature | Backend/table/limit needs | Abuse and cost implications |
|---|---|---|
| Editing titles/tags/destinations, archive, bulk CSV | New PATCH contract, metadata columns/tag model; bulk admission counts each item against existing daily/workspace caps; archive is not current soft-delete | Destination changes need validation, reclassification, eviction and audit; CSV formula injection, file/row limits; DB/worker load |
| Custom domains | Verified domain ownership model, domain mapping, certificate/routing lifecycle; keep globally unique codes | Domain takeover, phishing; external infrastructure may cost money: defer |
| Password links and targeting by country/device/percentage | New hashed-secret schema, unlock flow, policy rules and deterministic redirect selection | Brute force, tracking and cache correctness; no plaintext passwords; extra DB/cache work |
| Geographic/device/agent/unique analytics and retention filters | Event schema/aggregate endpoints, minimization/retention policy, historical migration | Fingerprinting and bot attribution uncertainty; extra storage; never infer these from existing click totals |
| Webhooks and retries | Tenant subscriptions, delivery/outbox tables and signature verification, capped retries and disable controls | SSRF, replay, credential leaks, amplification and outbound bandwidth; no automatic implementation |
| Link-in-bio, public handles, uploaded avatars | Profile/ordered-link tables, handle moderation, per-plan link/asset caps, published endpoint | Impersonation, tracking, malicious destinations; storage/CDN costs; no external avatars by default |
| Billing/invoices/upgrades/refunds | Payment contracts, subscription/invoice tables and entitlements absent | Paid services excluded; remove purchase controls, not simulated successful checkout |
| CRM, workspace bans, admin flag editor | Global authorization and audited control APIs absent; user suspension is narrower than workspace ban | Tenant data exposure and accidental global shutdown; no client-side authority |
| Member invitation cancellation and mail | Pending invite exists; mail sending/cancel API must be separately checked/designed | Spam, account enumeration; current no-email promise retained |
| QR and UTM helpers | Local-only implementation can use existing shortened URL; no new persistence needed | Do not leak destinations to a remote QR API; labels must not imply dynamic QR tracking |

Free plan is currently 20 links/user/day and 200/workspace by configurable defaults, not the prototype tiers. Preserve verified human or verified-owner-key creation, scopes and last-owner protections. New features must have their own ADR/tests before expanding the backend.

## Existing features that must survive

Keep /demo strictly in-memory and route-scoped; no real requests or key requirement there. Preserve Supabase cookie sessions, OAuth account selection, PKCE callback, local-auth option, safe next paths, signup/recovery CAPTCHA, email verification, profile changes and global logout. Retain /signup, /forgot-password, /reset-password and /auth/callback even though the prototype lacks equivalent flows.

Keep Turnstile /report/[code], /abuse contact, /warn/[code] continuation, malicious451/expired410/deleted404 enforcement, platform-admin /flagged, denylist/report history/user suspension; do not replace them with fake client state. Keep real workspace switching, viewer role, key creation/copy-once/revocation, workspace audit, /me/export and delayed-purge deletion. Retain /terms and /privacy template labels, /health, /design, metadata/security headers, /s/:code redirect proxy and real short base URL. Preserve cold-start banner, kill switches, quota enforcement and 402/403/404/429/5xx messages. Mock workspace roles omit viewer despite invite UI offering it: do not copy that type.

## Misleading claims and assets to remove before any port

Remove edge-network/global-anycast/Redis-cluster claims, 12ms or other invented latency/uptime numbers, fake customers/testimonials/logos, fictional domains and personal social/contact links. Evidence may only come from docs/claims.md, performance/chaos/evaluation results with their limitations. Hosted topology is one Render process with Redis Streams and managed dependencies, not the prototype cluster.

Replace Unsplash avatars/photos with owned/licensed local assets or initials; remove the sample PGP key and fake security-report workflow in pages/SecurityPage.tsx (its disclosure examples are not proof of a reporting service). Do not publish invented DPA/refund guarantees or claims about data residency/certifications. External links and image/font references are untrusted content, not permission to contact them. Retained mock values remain solely in this excluded reference, never in production or evidence.

## Proposed small PR sequence

1. Tokens/typography and selected primitives on /design only. Run frontend lint, tsc, unit tests and shell Playwright light/dark axe checks.
2. Public landing/content and local licensed assets. Run demo.spec.ts, metadata checks and build artifact privacy scan; manually review factual claims.
3. Sidebar/topbar/command palette responsive restyle. Run shell.spec.ts and auth.spec.ts; keyboard/focus/mobile checks.
4. Links list/create UI using existing contracts only. Run demo + auth + trust browser tests; backend URL/tenancy/plan tests if contracts touched.
5. Analytics/status presentation using actual fields. Run API client unit tests and reliability.spec.ts; show unavailable rather than fabricated metrics.
6. Account/keys/workspace/member/audit UI in separate small PRs. Run auth.spec.ts and backend authorization matrix/tenant-isolation/last-owner tests; preserve copy-once and export/deletion.
7. Review/report/warning and legal templates. Run trust.spec.ts, CAPTCHA and cross-tenant platform-admin tests, axe on public pages.
8. Optional QR/UTM local helpers only after scope approval. Unit tests for URL encoding, no network, and accessibility. Any remaining backend feature gets a separate design decision before implementation.

Each PR: npm run lint, tsc --noEmit, npm test, npm run build and affected Playwright tests. Backend changes additionally require make check and PostgreSQL integration tests. Never replace passing real-provider-contract fixtures with mocks copied from the prototype.

## Risks and review gates

No dependency lock or license/provenance file is supplied for the prototype. React Router, Vite, Express, dotenv, Google GenAI, motion and lucide are not automatically approved production dependencies. Check package and asset licenses/provenance before reuse; use existing components instead of installing this manifest. No license clearance or vulnerability-free claim is made. Generated code can contain accessibility gaps (focus trap/return, Escape, keyboard tables, live-region ambiguity, contrast, reduced motion), encoding artifacts and broken links. Tests and manual review are required.

Replacing Next with BrowserRouter breaks proxy/session/SSR/metadata/CSP assumptions. Importing AppDataContext leaks fabricated localStorage authority into live auth/tenancy; localStorage must never hold session tokens or real key secrets. Mock analytics, billing and admin controls must not appear as real state. Font/CDN/image requests can violate CSP/privacy and cause offline failures. Keep Gitleaks enabled for this directory and never add a broad allowlist to accommodate sample credentials.

## Step 15.12b status (2026-11-19)

Tokens, typography and button/badge/card/input/table/tabs/dialog/skeleton: **implemented for /design review only** via scoped styles on existing primitives. EmptyState, StatCard and CodeBlock: **implemented UI-only /design examples**. DesignSystemPage mapping is now an implemented opt-in gallery; all other route mappings above remain proposed. `/demo/design` stays v1. No production route migration, PageStateSimulator, backend feature or prototype dependency was adopted. See [token documentation](design-tokens.md) and [verification](design-tokens-verification.md).
