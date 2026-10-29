# 0027: Browser-only hosted demo

## Context
The Vercel frontend has no backend. Requiring API keys there gives visitors a broken
experience; hosting the complete stack or embedding shared credentials would violate
the free, credential-free demo objective.

## Decision
Select an in-memory implementation of the existing typed client interface at build time.
Enable it by default only when VERCEL_ENV=production, with an explicit true/false override.
Keep all mutations in tab memory, reset on reload, and never pretend generated codes redirect.
Use reserved example domains, a persistent sample-data banner, and local review state.
Metadata uses Next's Metadata API, an SVG icon and a build-generated Open Graph image;
fonts use the system stack to eliminate build-time Google font downloads.
CI builds both modes, scans public artifacts, and runs Playwright against the demo build.

## Consequences
No backend credentials or paid hosting are necessary. Reloads lose changes deliberately;
no database, queue, classifier or telemetry is actually running in the hosted demo.
The real client and its auth/timeout contract tests remain intact. A build-time flag
requires rebuilding to switch modes; separate tabs cannot share demo mutations.
Pattern scanning is defense in depth, not proof that every possible secret is detectable.
