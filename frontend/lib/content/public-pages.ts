export const repository = "https://github.com/AndreasPr/Distributed-URL-Shortener";
export const siteOrigin = "https://distributed-url-shortener-two.vercel.app";
export const evidenceUrl = (file: string) => `${repository}/blob/master/${file}`;
export type Claim = { text: string; evidence: string };
export type ContentSection = { title: string; claims: Claim[]; link?: { label: string; href: string } };
export type PublicContent = { path: string; title: string; eyebrow: string; lead: Claim; sections: ContentSection[] };
const claim = (text: string, evidence: string): Claim => ({ text, evidence });
export const publicPages: PublicContent[] = [
  { path: "/", title: "Small links. Clear signals.", eyebrow: "RELAYMARK / SHORT LINKS, WITH CONTEXT", lead: claim("A short-link service with workspaces, API keys, click analytics and abuse review. Use the hosted app, or explore sample data in a one-click browser demo.", "docs/claims.md"), sections: [
    { title: "A workspace for your links", claims: [claim("Create links with optional aliases and expiry, then manage them within a workspace. Creation requires a verified user or a key owned by one.", "docs/trust-controls.md")], link: { label: "Explore the features", href: "/features" } },
    { title: "Understand what happens next", claims: [claim("Clicks are processed asynchronously. Analytics can arrive after the redirect; they are not a guarantee of complete delivery.", "docs/claims.md")], link: { label: "Read the API notes", href: "/docs" } },
    { title: "Build with the API or MCP", claims: [claim("Scoped API keys support automation. The separate MCP server exposes tools over the API and blocks writes by default.", "docs/mcp.md")], link: { label: "Developer guide", href: "/developers" } },
    { title: "Hosted on free tiers", claims: [claim("The frontend runs on Vercel, the API on Render, and sign-in uses Supabase. Cold starts and provider quotas are part of this deployment.", "docs/hosting-runbook.md"), claim("The /demo sandbox uses sample data in browser memory. It needs no API key, resets on reload and does not create real short links.", "docs/deployment-demo.md")], link: { label: "Free plan limits", href: "/pricing" } },
  ] },
  { path: "/features", title: "Useful links. Explicit controls.", eyebrow: "FEATURES", lead: claim("Link management, workspace permissions and review tools built around the same API.", "docs/security.md"), sections: [
    { title: "Create and manage", claims: [claim("Create a short link with an optional custom alias and future expiry. Soft deletion removes it from normal listings and prevents redirects.", "docs/api-changes.md")] },
    { title: "Share a workspace", claims: [claim("Owner, admin, member and viewer roles control access. API-key scopes are constrained by the creator's permissions.", "docs/auth.md")] },
    { title: "Read click analytics", claims: [claim("Per-code analytics expose click counts and timestamps. Queued processing can lag, and hosted free-tier restarts can lose pending events.", "docs/hosted-limits.md")] },
    { title: "Review abuse signals", claims: [claim("Heuristics flag suspicious patterns without fetching the destination page. Optional model assistance is bounded by configuration and budget; a flag is not proof of wrongdoing.", "docs/abuse-pipeline.md"), claim("Warning pages, abuse reports and administrative review help control suspicious links. Malicious links are blocked.", "docs/trust-controls.md")], link: { label: "Security and reporting", href: "/security" } },
  ] },
  { path: "/docs", title: "Start with the contracts.", eyebrow: "DOCUMENTATION", lead: claim("Use the repository documentation for API behavior, authentication and operating limits.", "docs/api-changes.md"), sections: [
    { title: "Short links and analytics", claims: [claim("POST /shorten creates a link. GET /urls lists visible links; DELETE /urls/{code} soft-deletes one. GET /analytics/{code} requires read access.", "app/api/routes.py")], link: { label: "API behavior and changes", href: evidenceUrl("docs/api-changes.md") } },
    { title: "Authentication and workspaces", claims: [claim("Browser sessions use Supabase authentication. Programmatic clients send X-API-Key; requests must not send both an API key and a bearer token.", "docs/auth.md")], link: { label: "Authentication guide", href: evidenceUrl("docs/auth.md") } },
    { title: "MCP tools", claims: [claim("The mcp-server directory contains an on-demand server that calls the API. Writes need explicit opt-in; some global review tools require human platform-admin authentication that the key-only transport does not support.", "docs/claims.md")], link: { label: "MCP setup and limitations", href: evidenceUrl("docs/mcp.md") } },
    { title: "Run it yourself", claims: [claim("make demo starts an isolated local stack with deterministic sample data. Local Kafka and Redis Streams profiles are distinct from the hosted single-process setup.", "docs/demo-script.md")], link: { label: "Local demo instructions", href: evidenceUrl("docs/demo-script.md") } },
  ] },
  { path: "/developers", title: "Automate with scoped access.", eyebrow: "DEVELOPERS", lead: claim("Use an API key owned by an active, verified user. Keep the key private and request only the scopes your integration needs.", "docs/security.md"), sections: [
    { title: "Create a key", claims: [claim("Sign in, choose your workspace and open API keys. Create a key within your role's permissions and copy the secret once. List operations return metadata, not the secret.", "docs/auth.md")], link: { label: "Manage API keys", href: "/app/keys" } },
    { title: "Write permission and limits", claims: [claim("POST /shorten requires write permission and verified ownership. User and workspace creation caps apply to keys too; do not retry a timed-out creation blindly.", "docs/trust-controls.md"), claim("Rate-limited requests return HTTP 429 with Retry-After. Other failures, including insufficient scope or plan limits, need their own handling.", "docs/api-changes.md")] },
    { title: "A minimal request", claims: [claim("Set API_ORIGIN to the API origin configured for this deployment, not the frontend origin. Replace the placeholder key privately. The example creates a harmless destination link.", "app/api/routes.py")] },
  ] },
  { path: "/use-cases", title: "A smaller link, a clearer workflow.", eyebrow: "USE CASES", lead: claim("Use the existing link, workspace and API controls for everyday sharing and automation.", "docs/design.md"), sections: [
    { title: "Share documentation", claims: [claim("Choose an available alias for a documentation link and inspect its click history. Counts are coarse analytics, not a unique-person measurement.", "app/api/routes.py")] },
    { title: "Time-bound sharing", claims: [claim("An expiry can stop a link redirecting after a chosen time. It does not remove the destination from the internet.", "docs/api-changes.md")] },
    { title: "Controlled automation", claims: [claim("Use a scoped API key for a script or configure the MCP server for on-demand tools. Keep write tools disabled until deliberately needed.", "docs/mcp.md")] },
  ] },
  { path: "/about", title: "Built to make tradeoffs visible.", eyebrow: "ABOUT RELAYMARK", lead: claim("Relaymark combines a usable short-link interface with an inspectable implementation and documented limits.", "README.md"), sections: [
    { title: "Inspect the decisions", claims: [claim("Architecture decisions, tests, evaluation results and known limitations are maintained in the repository.", "docs/claims.md")], link: { label: "Evidence and limitations", href: evidenceUrl("docs/claims.md") } },
    { title: "Two ways to explore", claims: [claim("The hosted app uses real accounts and services. The separate /demo route is an in-memory sandbox; it does not use those services for its sample interactions.", "docs/deployment-demo.md")], link: { label: "Explore the demo", href: "/demo" } },
  ] },
  { path: "/changelog", title: "Changes you can inspect.", eyebrow: "MERGED WORK", lead: claim("This list records selected merged roadmap steps, not versioned releases or deployment dates. Step labels preserve the names used in the original branches.", "docs/adr/README.md"), sections: [] },
  { path: "/security", title: "Controls, with clear boundaries.", eyebrow: "SECURITY", lead: claim("Authentication, tenant permissions and abuse controls reduce risk. They do not establish a guarantee that every destination is safe.", "docs/threat-model.md"), sections: [
    { title: "Account and workspace access", claims: [claim("The backend verifies tokens and derives workspace roles from membership. API keys carry scopes; cross-workspace access is restricted.", "docs/security.md")], link: { label: "Security model", href: evidenceUrl("docs/security.md") } },
    { title: "Report a link", claims: [claim("The public report flow uses a security check and creates a review item. It does not require an account.", "docs/trust-controls.md")], link: { label: "Abuse and contact", href: "/abuse" } },
    { title: "Report a vulnerability", claims: [claim("Use the configured operator contact described in the security policy. Do not include private keys or session tokens in a public issue.", "SECURITY.md")], link: { label: "Security policy", href: evidenceUrl("SECURITY.md") } },
  ] },
  { path: "/contact", title: "Contact the operator.", eyebrow: "CONTACT", lead: claim("For an abusive short link, the existing report flow is the preferred route. This page does not submit messages.", "frontend/app/abuse/page.tsx"), sections: [
    { title: "Reporting safely", claims: [claim("Provide the short code and a concise explanation. Never send passwords, API keys or authentication tokens. Reports are reviewed; automated flags alone are not proof of wrongdoing.", "frontend/app/abuse/page.tsx")], link: { label: "Open abuse reporting", href: "/abuse" } },
  ] },
  { path: "/pricing", title: "Free plan limits.", eyebrow: "FREE PLAN", lead: claim("Documented defaults: 20 links per user per day and 200 links per workspace; the operator can change these.", "app/core/config.py"), sections: [
    { title: "Creation caps", claims: [claim("These are configuration defaults, not a live quota reading. The public status endpoint exposes kill switches, not plan caps. Check the API response when creating a link.", "app/api/routes.py"), claim("A daily creation cap can return 429; a workspace link cap can return 402. API-key creation counts against its verified owner's allowance.", "docs/trust-controls.md")] },
    { title: "Hosted capacity", claims: [claim("Free-tier sleep, memory, storage and provider quotas affect this deployment. Cold starts can delay the first request; pending hosted events can be lost on a restart.", "docs/hosted-limits.md")], link: { label: "Hosted limits", href: evidenceUrl("docs/hosted-limits.md") } },
    { title: "Paid tiers", claims: [claim("Planned, not available. There are no purchase or upgrade controls here.", "docs/design-port-plan.md")] },
  ] },
];
export function contentFor(path: string): PublicContent {
  const page = publicPages.find(page => page.path === path);
  if (!page) throw new Error("Unknown public content page");
  return page;
}
export const publicPaths = publicPages.map(page => page.path);
export const publicCopy = {
  skip: "Skip to content", brand: "Relaymark", demo: "Explore the demo", login: "Sign in with GitHub", local: "Open local workspace",
  nav: [{ label: "Features", href: "/features" }, { label: "Docs", href: "/docs" }, { label: "Free plan", href: "/pricing" }, { label: "Security", href: "/security" }],
  footer: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Abuse and contact", href: "/abuse" }, { label: "GitHub", href: repository }],
  more: [{ label: "Developers", href: "/developers" }, { label: "Use cases", href: "/use-cases" }, { label: "About", href: "/about" }, { label: "Changelog", href: "/changelog" }, { label: "Contact", href: "/contact" }],
  evidenceLabel: "Repository evidence", architectureTitle: "Inside the local stack", architectureAlt: "Local architecture: frontend and MCP connect to the API, database, cache, event bus, workers and telemetry", architectureCaption: claim("This diagram shows the local stack, including Kafka and separate workers. The hosted profile uses Redis Streams and runs the consumers in the API process.", "docs/hosted-profile.md"),
  contactMissing: claim("The operator has not configured an abuse mailbox yet. Public launch is not ready until this contact is set.", "frontend/app/abuse/page.tsx"),
  contactLabel: "Contact the operator:", exampleTitle: "Create a short link", originLabel: "Configured API origin:", originMissing: "No API origin is configured in this build. Obtain it from the operator before running the example.",
  curl: 'curl --fail-with-body -X POST "$API_ORIGIN/shorten" \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: <YOUR_API_KEY>" \\\n  -d \'{"long_url":"https://example.com/"}\'',
};
