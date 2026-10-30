# ADR 0033: Supported frontend dependencies and blocking npm audit

## Context
The old Next 14/React 18/Tailwind 3 dependency tree had 27 audit findings, including
high and critical entries. The frontend audit job was non-blocking. Generated UI
components already used several Tailwind 4 utilities with incomplete v3 theme support.

## Decision
Use the current stable Next 16.4.3 release with React 19.3.1 and matching Next ESLint
configuration. Migrate to Tailwind 4's PostCSS plugin and explicit CSS theme tokens.
Retain strict TypeScript checking, selecting TypeScript 6 because the ESLint parser
rejects TypeScript 7's changed compiler API. Use ESLint 9, supported by all Next plugins.
Remove axios, the runtime shadcn CLI, direct react-is, autoprefixer and the old animation
plugin. Keep existing checked-in UI components and charts; Recharts installs react-is
as a required peer through normal npm resolution. Do not disable peer checks.

Run npm audit at high severity in blocking CI. A small wrapper preserves the complete
JSON artifact and supports explicit package/range/advisory-set exceptions with reasons
and expiry. There are no active exceptions. Invalid reports, network failures and
expired exceptions fail closed. Dependabot groups compatible frontend updates while
retaining pip, Docker and GitHub Actions coverage.

## Consequences
Next build no longer runs lint; the explicit lint job remains required. Tailwind 4
requires modern browsers (Safari 16.4+, Chrome 111+, Firefox 128+ per its upgrade guide).
The exception policy is reviewed configuration, not an automatic bypass. Audit results
are point-in-time evidence, not an exploitability analysis or production certification.
Production deployment remains separate from this local migration.

Sources: [Next 16 upgrade](https://nextjs.org/docs/app/guides/upgrading/version-16),
[Tailwind 4 upgrade](https://tailwindcss.com/docs/upgrade-guide).
