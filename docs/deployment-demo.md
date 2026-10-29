# Vercel demo deployment

Public URL: https://distributed-url-shortener-two.vercel.app/

This is a frontend demonstration, not the deployed distributed system. Sample data:
30 links, fixed historical click timestamps and 3 flagged links. Shortening and Allow/Block
change tab memory only; reload restores fixtures. Copy copies a code, not a working URL.
No API keys are required or stored, and entered URLs are never fetched or sent to an API.
Static pages and assets are still served by Vercel; following external documentation links
navigates to GitHub. No analytics/LLM/backend service is contacted by demo operations.

## Project settings and redeploy

1. In Vercel, open the existing project → Settings → Build and Deployment.
2. Set Root Directory to `frontend`, Framework Preset to Next.js, Build Command to
   `npm run build`, and use Node 22.x. The lock file installs exact resolved packages.
3. In Environment Variables, set `NEXT_PUBLIC_DEMO_MODE=true` for Production and, if
   desired, Preview. Without an override VERCEL_ENV=production enables demo mode;
   ordinary local builds default to real API mode. `false` always selects real API mode.
4. Remove any unnecessary API credentials/private endpoint settings from this frontend
   project. Do not add secrets: NEXT_PUBLIC variables are public browser configuration.
   Demo builds ignore NEXT_PUBLIC_API_URL; real mode uses it as before.
5. Merge the reviewed branch into the project's production branch, then deploy that
   commit (Deployments → Redeploy, without using the old build cache if troubleshooting).
6. Confirm the deployment commit SHA and successful build log. Open the public URL in
   a fresh tab: expect the amber demo banner, no API-key input, and the new page title.
7. Create a code, copy it, visit Dashboard, review a flagged record, then reload:
   all fixtures should reset. Browser Network must show no backend calls. Verify the
   icon and `/opengraph-image`, and inspect the title/description/og:image in `<head>`.

This task does not require Vercel credentials in the repository or a backend deployment.
The existing production page was inspected, but this branch's deployment is a separate
manual release step; do not describe it as live until the deployed commit is verified.

## Local verification

From `frontend/`:

```sh
npm ci --no-audit --no-fund
npm run lint
npm test
npx tsc --noEmit
NEXT_PUBLIC_DEMO_MODE=false npm run build
NEXT_PUBLIC_DEMO_MODE=true npm run build
npm run check:demo-build
npx playwright install chromium
npm run test:e2e
```

Playwright starts the built server on 127.0.0.1:3100, checks metadata, copy, navigation,
reset and review behavior. CI installs Chromium with Linux dependencies. The artifact
scanner checks browser JS, generated HTML/RSC/body assets for known credential patterns,
private endpoint URLs and credential environment values; it never prints matched values.
It cannot prove the absence of every possible secret. Never supply secrets to this build.
For interactive local demo development: `NEXT_PUBLIC_DEMO_MODE=true npm run dev`.

## Rendering investigation

On 2026-10-29, Chromium inspection of the production URL returned
`document.title = "URL Shortener Dashboard"`, `head` display `none`, and `title` display
`none`. Metadata text leaking into the visible page was not reproduced. Existing metadata
was generic and sharing/icon metadata incomplete. This change supplies typed metadata,
sharing image and icon, without inserting a manual head or rendering metadata in the body.
The browser regression checks head visibility and sharing assets. If an old deployment
still displays a bug, retain its deployment SHA and screenshot for a reproducible diagnosis.
