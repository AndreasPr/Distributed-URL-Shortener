# Frontend audit after upgrade

Captured 2026-10-30 with `cd frontend && npm run audit`.
The wrapper executes `npm audit --audit-level=high --json`; exit 0. Includes production and development dependencies.

```json
{
  "info": 0,
  "low": 0,
  "moderate": 0,
  "high": 0,
  "critical": 0,
  "total": 0
}
```

**No audit exceptions are active.** Zero findings describes this registry snapshot, not a security guarantee.

| Dependency | Selected version |
|---|---|
| next | 16.4.3 |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| tailwindcss | 4.3.3 |
| @tailwindcss/postcss | 4.3.3 |
| eslint-config-next | 16.4.3 |
| eslint | 9.39.5 |
| typescript | 6.0.3 |

Lockfile SHA-256: `0b0e6a4510bb5f41971dc0aba524f3dc10416516b97cbddc48ef59995fe91a68`.

Next 16.4.3 was the npm stable (`latest`) release when checked. React 19.3.1 and Tailwind 4.3.3 were current stable releases. TypeScript 6.0.3 is deliberately retained: the installed typescript-eslint rejects TS 7.0. ESLint 9.39.5 is compatible with the declared peer ranges of Next’s React/import/accessibility plugins; npm marks ESLint 9 deprecated. This maintenance limitation is not a suppressed vulnerability.

Removed app-level axios, react-is and shadcn CLI dependencies, plus autoprefixer and tailwindcss-animate. Existing Recharts charts require react-is as a transitive peer; it cannot be eliminated without replacing the charts. The CLI-provided stylesheet was replaced by checked-in Tailwind theme tokens.

## Blocking policy

CI now runs `npm run audit` without continue-on-error. It retains the complete ignored npm-audit.json artifact and blocks unexcepted high/critical findings. Registry/process errors also fail. Low/moderate findings are reported but non-blocking. `frontend/audit-exceptions.json` is empty. Future entries must match the exact package, affected range and complete advisory URL set, with a nonempty reason and expiry date. No severity-wide or wildcard exceptions are supported. Unit tests cover denial, matching, mismatches, expiry and report errors.

## Validation output excerpts

All final commands below exited 0, using Node 22.23.4.

```text
npm run audit:
  Audit counts: {"info":0,"low":0,"moderate":0,"high":0,"critical":0,"total":0}
  Documented exceptions: none
  Audit gate: PASS

npm run lint:
  eslint . --max-warnings=0 (no findings)

npm test:
  tests 11; pass 11; fail 0

npm run build (NEXT_PUBLIC_DEMO_MODE=false and true):
  Next.js 16.4.3 (Turbopack)
  Compiled successfully
  /, /analytics, /dashboard, /flagged, /health, /opengraph-image prerendered

npm run test:e2e:
  4 passed

npm run check:demo-build:
  PASS (55 public artifacts)

make frontend-check:
  npm ci, ESLint, 11 tests and strict tsc passed

make check:
  432 passed, 23 deselected, 6 warnings in 53.14s
  Prometheus: SUCCESS: 22 rules found; SUCCESS

make mcp-test:
  35 passed in 2.28s
```

Actionlint and git diff --check also pass. No backend integration or kind deployment was rerun: this change concerns frontend dependencies and the audit job. No Vercel deployment or hosted Actions run was triggered.

## Migration failures resolved

- TypeScript 7 broke the parser and tests that use the compiler API; selected compatible TypeScript 6 rather than ignoring type errors.
- ESLint 10 had conflicting plugin peer ranges; selected 9 and documented its deprecation.
- The host’s legacy-peer-deps=true setting skipped the required react-is chart peer; committed project .npmrc restores normal peer resolution. No forced install is required.
- The new React lint rule caught synchronous effect state updates in the flagged page. Initial loading state is now set at initialization; API promise callbacks update results, and cleanup suppresses updates after unmount.
- One initial install command was started at repository root, then interrupted before it wrote a root manifest; the correct frontend install was rerun. No root dependency files are included.

See the [before report](frontend-audit-before.md), [ADR](adr/0033-supported-frontend-and-blocking-audit.md), and [developer policy](developer.md).
