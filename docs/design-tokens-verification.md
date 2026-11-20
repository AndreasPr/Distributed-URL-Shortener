# Design tokens verification — 15.12b

2026-11-19. Branch: step-15-12b-design-tokens. No dependencies added, package/lock files unchanged. Backend, root layout, proxy/CSP, next-themes, Sonner, cmdk and existing shadcn implementations unchanged. Existing global CSS prefix verified byte-for-byte identical. New styles are scoped; /demo/design remains v1.

## Actual checks

| Command | Exit | Result |
|---|---|---|
| npm run lint | 0 | ESLint, no warnings |
| npx tsc --noEmit | 0 | No errors |
| npm test | 0 | 30 passed, 0 failed (existing v1 contrast tests retained plus v2 tests) |
| npm_config_offline=true make frontend-check | 0 | npm ci, lint, tests and types passed; before final additive test adjustments (28 tests then) |
| npm run build, initial | 1 | Compilation/type generation completed, then existing Next 16.4.3 security advisory interrupted |
| npm run build, retry | 0 | Production build completed; advisory remains unresolved, no package upgrade performed |
| npx playwright test e2e/shell.spec.ts --reporter=list, final | 0 | 6 passed (5.8s) |
| git diff --check | 0 | Clean |

Final excerpts:

```text
lint=0 types=0 unit=0
# tests 30
# pass 30
# fail 0
6 passed (5.8s)
```

Full local logs: /tmp/design-v2-lint-final.log, /tmp/design-v2-tsc-final.log, /tmp/design-v2-unit-final.log, /tmp/design-v2-build.log, /tmp/design-v2-build-retry.log, /tmp/design-v2-browser3.log. These are temporary evidence, not committed build artifacts.

## Browser evidence

Existing v1 gallery light/dark and desktop/mobile shell checks pass. New /design checks cover WCAG2A/AA and WCAG2.1AA axe scans on the gallery, foundations and open dialog; keyboard tab activation; Escape/focus return; clipboard copy and denial feedback; mobile overflow. Non-design routes /, /login (authenticated redirect), /demo and /demo/design have no v2 attribute and retain original primary tokens. Screenshots /tmp/design-v2-light.png and /tmp/design-v2-dark.png were inspected visually. No all-route pixel-baseline claim is made.

The first browser attempts failed because the new test lacked an authenticated fixture session, then lacked the fake CAPTCHA response needed for fixture login. Tests were corrected to use the existing login contract and intercepted CAPTCHA; production auth was not weakened. No real Supabase account or real env file was used. Build/tests ran from an isolated copy with the existing fake identity provider and fixture API values.

## Limits

The existing Next.js security advisory is not fixed by a successful build retry; upgrading dependencies is separate scope. No hosted deployment, real identity provider, exhaustive browser matrix or manual screen-reader audit was performed. Backend and MCP gates were not repeated for this frontend-only change. The selected text token pairs meet >=4.5:1, and input/focus token pairs >=3:1; future compositions must still be tested. Inter is bundled with next/font/local from the already installed font package, so no network font fetch or fallback was necessary.
