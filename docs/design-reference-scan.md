# Design reference static scan

2026-11-19. No network requests, package installs or prototype execution. Static inspection found no executable fetch/axios/WebSocket client call; the WebSocket match is a security claim, not a constructor. Reports intentionally identify files and categories only, never credential values or external URL values.

Gitleaks initially reported ten findings across seven files: credential-like documentation samples (curl-auth-header and generic-api-key). Sanitized to explicit placeholders; no allowlist added. Follow-up `gitleaks dir docs/design-reference --redact` exits 0 with zero findings. This is not proof that no undiscovered secret exists; no credential validity was tested.

server.ts, db.json and .env* were absent, including hidden-file inventory; none needed deletion. Removed obsolete package.json scripts that invoked server.ts/server.js/db.json. Removed the original README's runnable/Gemini setup instructions. No remote Google-font/CDN loader or analytics tracker signature was found; index.css imports the local Tailwind package. Remote image/link references and sample code remain quarantined; Unsplash image sources could fetch if rendered. SecurityPage's security-report examples are not an approved integration. Gemini remains a manifest dependency/metadata mention, not a discovered live call in the supplied source.

Key-related identifiers include fullSecret, mockApiKeys, createApiKey and apiKeys in AppDataContext/mock code. They are simulation, not secure storage. No secret values are included in this report.

| File | Static reference category |
|---|---|
| `docs/design-reference/metadata.json` | Gemini dependency/metadata |
| `docs/design-reference/package.json` | Gemini dependency/metadata |
| `docs/design-reference/src/components/links/CreateEditLinkModal.tsx` | remote asset/link reference |
| `docs/design-reference/src/components/links/CsvImportModal.tsx` | remote asset/link reference |
| `docs/design-reference/src/components/links/QrCodeModal.tsx` | remote asset/link reference |
| `docs/design-reference/src/components/links/UtmBuilderModal.tsx` | remote asset/link reference |
| `docs/design-reference/src/components/navigation/MarketingFooter.tsx` | remote asset/link reference |
| `docs/design-reference/src/components/showcase/ComponentShowcase.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/context/AppDataContext.tsx` | credential example, remote asset/link reference, Unsplash |
| `docs/design-reference/src/design-system/Icons.tsx` | remote asset/link reference |
| `docs/design-reference/src/mock/index.ts` | remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/AboutPage.tsx` | remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/BlogPage.tsx` | remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/DesignSystemPage.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/pages/DevelopersPage.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/pages/DocsPage.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/pages/FeaturesPage.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/pages/LandingPage.tsx` | credential example, remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/LinkInBioPublicPage.tsx` | remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/QrCodesPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/ReportPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/SecurityPage.tsx` | remote asset/link reference, PGP sample |
| `docs/design-reference/src/pages/admin/AdminFlaggedPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/app/BioPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/app/DashboardPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/app/LinkDetailPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/app/LinksPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/app/McpPage.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/pages/app/settings/AccountPage.tsx` | remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/app/settings/KeysPage.tsx` | credential example |
| `docs/design-reference/src/pages/app/settings/MembersPage.tsx` | remote asset/link reference, Unsplash |
| `docs/design-reference/src/pages/app/settings/WebhooksPage.tsx` | remote asset/link reference |
| `docs/design-reference/src/pages/auth/OnboardingPage.tsx` | credential example, remote asset/link reference |
| `docs/design-reference/src/pages/legal/SubprocessorsPage.tsx` | remote asset/link reference |
