# App shell verification — step 15.12d

Date: 2026-11-21. Branch: `step-15-12d-app-shell`.

## Implemented boundary

- `AppShell.tsx`: real sidebar/topbar and explicit drawer/palette portal scopes use v2 and bundled Inter. The `#main-content` parent has no v2 attribute or font class; page sources, global tokens and page-content styling are unchanged. The sidebar collapses in memory and stays below the service banner in document flow. Demo retains v1 chrome and its sample-data banner.
- `WorkspaceIdentity.tsx` and `WorkspaceSwitcher.tsx`: one shared initial `/me` for shell navigation and switching. Review queue is absent until `platform_admin=true`, regardless of workspace role. Demo shows the sample queue. Successful switches validate X-Workspace-ID and refresh content; failed switches restore the prior workspace, leave it selectable and hide privileged navigation. Existing page/API authorization is unchanged.
- Palette Create link resolves through `pathFor('/dashboard')`; Account and Free plan limits use their actual global routes, not nonexistent demo counterparts. The trigger says “Go to page” and keeps its existing accessible name.
- `ShellAccountMenu.tsx`: existing signOut helper, Account and Settings. LocalAuth keeps its existing account link; no new local logout mechanism. No new persistence.
- `public/PublicHeader.tsx`: below sm, a disclosure button controls the unchanged public navigation; Escape closes it and returns focus. Desktop navigation remains visible independently of disclosure state. `LegacyFooter`, legacy auth/legal/report headers, nonce CSP, API client and ReliabilityBanner implementation remain unchanged.
- No dependencies, backend changes, prototype imports, fake navigation destinations or new routes.

## Test coverage

`frontend/e2e/shell.spec.ts` adds or extends:

| Behavior | Evidence |
| --- | --- |
| Create link reaches a visible Long URL form | Real and demo palette cases |
| Review queue absent/present in sidebar, drawer, palette | `/me` intercepted with false/true platform_admin; exactly one initial shell `/me` |
| Workspace headers and viewer behavior | Viewer fixture switches to Team; records X-Workspace-ID; failed return switch restores Team and remains selectable |
| V1 content isolation | `#main-content.closest('[data-design]')` is null; shell chrome is v2 |
| Collapse and active navigation | Expanded state changes; Links retains aria-current |
| Keyboard and portals | Skip-link focus; drawer focus trap; palette input focus; Escape/focus return; explicit v2 DialogContent |
| Accessibility | Light/dark axe for shell, open palette, open drawer; open marketing disclosure in both themes |
| Small screens | 320px real shell/public navigation without horizontal overflow |
| Account controls | Existing signOut through the menu reaches login |
| Marketing navigation | Keyboard open, next-link focus, Escape return, close after link navigation |

Existing auth tests retain cookie login, workspace switching, forbidden-page handling, safe next paths and account behavior. Existing demo tests retain in-memory interactions and no API traffic. Existing public tests cover all ten routes, metadata/nonce checks, light/dark mobile/desktop axe, and the committed demo/privacy screenshots. The old gallery isolation test now explicitly recognizes that authenticated `/login` redirects to `/dashboard`: only navigation is v2 there, not content.

## Environment and outcomes

Node 22.23.4, CPython 3.11.14, macOS Chromium. Production build/browser tests run in an isolated `/private/tmp/shell-new/frontend` copy, with fixture environment variables, the local fake identity provider and repository Python path. Real environment files were not copied or read. No live authentication, hosted API, backend deployment or paid service was used.

| Check | Actual result |
| --- | --- |
| `make frontend-check` | Exit 0; npm ci, ESLint, 33 unit tests, TypeScript |
| `npm run lint` | Exit 0, no findings |
| `npx tsc --noEmit` | Exit 0, no diagnostics |
| `npm test` (source and built copy) | Exit 0; 33 passed, 0 failed; includes prohibited-copy/build scan |
| `npm run build` | Exit 0 on retry; initial permitted builds exit 1 for existing Next.js advisory |
| `npx playwright test e2e/shell.spec.ts e2e/demo.spec.ts e2e/auth.spec.ts e2e/public.spec.ts --reporter=list` | Exit 0; 42 passed (16.5s) |
| `git diff --check` | Exit 0 |
| Scope comparison with HEAD | Backend, page sources, API client, proxy and dependency manifests unchanged |

Actual final output excerpts:

```text
> url-shortener-frontend@0.1.0 lint
> eslint . --max-warnings=0

# tests 33
# pass 33
# fail 0

42 passed (16.5s)
```

Full local session records: `/tmp/shell-frontend-check.log`, `/tmp/shell-lint-final.log`, `/tmp/shell-types-final.log`, `/tmp/shell-unit-final.log`, `/tmp/shell-built-unit.log`, `/tmp/shell-build-final.log`, `/tmp/shell-build-final-retry.log`, `/tmp/shell-browser-verified.log`. Logs and inspection screenshots in `/tmp` are not committed.

Initial test runs failed on test setup/assertions: missing fake CAPTCHA in the new login helper, the old authenticated-/login isolation assumption, an ambiguous Next route-announcer alert selector, and manually setting theme classes mid-color-transition. These were corrected without suppressing accessibility checks; the theme test now uses the actual ThemeToggle/next-themes flow. Final runs pass. An initial sandbox build stalled and was interrupted (exit 130); permitted local worker execution completed the build.

## What remains unverified or limited

- Next.js 16.4.3 still reports its existing security advisory; an exit-0 retry is not remediation. No dependency change was authorized in this step.
- Live Supabase/Render/Vercel and Linux CI were not tested. Auth and role tests use the existing locally minted token fixture and controlled `/me` responses. LocalAuth's retained account link was inspected, not separately deployed.
- Accessibility evidence covers the tested Chromium states and viewport widths, not every browser/assistive-technology combination. Reduced-motion CSS remains in effect; no new animated collapse behavior was introduced.
- Existing demo/privacy golden screenshots pass with their existing 1% tolerance and service-status mask. The demo intentionally receives the palette label/destination fix; its data and visual theme stay unchanged. Real dashboard screenshots were manually inspected for v2 chrome/v1 content and an unobscured service banner.
- Navigation filtering is not security enforcement. Direct forbidden requests still rely on existing page/API 403 behavior; no backend permission model changed. Identity changes elsewhere require the next `/me` refresh to update navigation.
- Backend/MCP/Kubernetes/integration checks are outside this frontend-only scope and were not run.
- Changes are not committed, pushed or deployed.
