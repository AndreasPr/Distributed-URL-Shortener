# Relaymark frontend

Use Node 22.13+ and `npm ci`. Copy `.env.example` only if `.env.local` does not exist.
Run `npm run dev` and open http://localhost:3000. `/` is public; `/demo` contains
browser-only sample data. Real workspace pages require Supabase login, or the
explicit isolated LocalAuth provider used by `make demo`.

See [frontend authentication](../docs/frontend.md) for configuration, cookie/PKCE
security, API key management at `/app/keys`, account deletion semantics and the
fake-provider Playwright commands. Never paste programmatic keys into browser
configuration. `NEXT_PUBLIC_DEMO_MODE` no longer controls the site.

Checks: `npm run build`, `npm run lint`, `npm test`, `npm run test:e2e` (the latter
requires the documented fixture build and the root `.venv`).
