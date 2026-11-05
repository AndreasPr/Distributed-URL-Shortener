# Deploying the public frontend and sample demo

The existing Vercel project is https://distributed-url-shortener-two.vercel.app/.
This branch changes its routing; these changes are not claimed deployed until a
Vercel deployment is verified.

- Root directory: `frontend`; framework: Next.js; build: `npm run build`.
- Use Node 22.13+ (CI uses 22.23.4).
- `/` is the public landing page. `/demo` and its nested pages contain sample data.
- Remove NEXT_PUBLIC_DEMO_MODE: it no longer controls the site.
- Leave NEXT_PUBLIC_LOCAL_AUTH false. Never publish the local owner-login mode.
- Without Supabase configuration, visitors can explore `/demo`; real app routes
  redirect to `/login`, which explains unavailable sign-in when attempted.
- To enable real sign-in, configure NEXT_PUBLIC_SUPABASE_URL and
  NEXT_PUBLIC_SUPABASE_ANON_KEY, then a browser-reachable NEXT_PUBLIC_API_URL.
  Set NEXT_PUBLIC_EMAIL_AUTH=true only when email auth is configured. Set
  NEXT_PUBLIC_TURNSTILE_SITE_KEY and enable CAPTCHA enforcement in Supabase.
  See [frontend setup](frontend.md) for provider redirect settings.
- Never add a service-role key or backend secret to Vercel or NEXT_PUBLIC variables.

Redeploy after changing public environment settings. The frontend needs dynamic
Next.js rendering for per-request CSP nonces and auth cookies; it is not a static
export. Browser-only demo means the sample operations do not call an API, not that
Next.js page delivery runs without a server.

After deployment: visit `/`, `/demo`, and `/login`; verify no sample banner on `/`,
no API traffic from `/demo`, and redirects from `/dashboard` without a session.
Configured deployments additionally need a live OAuth login/callback check,
workspace check and sign-out check. No backend is created by deploying this UI.

The sample dataset resets on reload and is not a measurement of live analytics,
security classification or service health. Recorded local-stack results remain in
the performance, chaos and evaluation documents.
