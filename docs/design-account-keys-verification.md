# Account and API keys verification — step 15.12g

Branch: `step-15-12g-account-keys`. Verified locally on 2026-11-27. This is a frontend-only change, with no dependency, backend, migration, OAuth, CSP or storage change. [ADR 0053](adr/0053-settings-and-key-secret-lifecycle.md) records the lifecycle/data decisions.

## Implemented scope

- `/account`, `/app/keys` and `/settings` opt their own main into v2 tokens and the existing bundled font. All new dialogs explicitly opt in because Radix portals do not inherit the page wrapper. No global token overrides.
- `SettingsNav` links Appearance, Account and API keys with `aria-current`; `/demo/settings` shows Appearance only. `/api-keys` still redirects to `/app/keys`; the demo keys note remains static, with no fabricated credentials. No billing, webhooks, members, audit, usage or plan section was added.
- Account has Profile, Data export, Sessions and Danger zone sections. Trusted verification/role comes from shared `/me`, not Supabase metadata. Profile display-name and session operations remain Supabase operations. Export keeps its download filename and success/failure messages. One page-level polite status region announces results.
- Global sign-out requires a dialog confirmation and repeats the existing access-token-expiry warning. LocalAuth still explains that automatic demo login ends by stopping the isolated demo. The DELETE gate and exact 30-day delayed-cleanup/Supabase-identity wording are retained. Browser tests never submit account deletion.
- Key cards show name, prefix, scope badges, created/last-used dates and Active/Revoked state. Create has scoped descriptions; Admin explicitly warns about managing other keys. Scope mapping stays read → `[read]`, read/write → `[read, write]`, admin → `[admin]`; backend `Principal.allows` already treats admin scope as sufficient, so no added scopes are invented.
- The one-time secret dialog clears on Dismiss, Escape, close, workspace change and page unmount. A workspace-keyed component plus request-generation checks rejects late async results. The secret is never passed into live announcements, storage, URLs or application logs. Copy failures are visible; deliberate clipboard copying is not treated as application persistence. JavaScript heap erasure is not claimed.
- Key access uses the shared identity, not an extra `/me`. Members/viewers see an explanation; a server 403 also overrides an outdated admin role. The API client now preserves status 403 in `APIError` while retaining its existing user-facing messages. Creation/revocation use existing endpoints only.

## Timestamp investigation

`app/models/api_key.py` uses SQLAlchemy `TIMESTAMP` without timezone. `created_at` has server default `func.now()`; `app/services/api_keys.py::utcnow()` explicitly converts current UTC to a naive datetime for last-use/revocation writes. `list_keys()` serializes with `isoformat()`, without a suffix for these naive values.

`frontend/lib/key-dates.ts` reuses `link-dates.timestamp`, which appends Z only when no offset is present, then renders an absolute date with `timeZone: "UTC"` and a visible UTC suffix. Null last-use is “Never used”; invalid input is “Date unavailable.” Tests change the process time zone to New York, Auckland and UTC and verify that `2026-11-27T12:34:00.123456` remains 12:34 UTC; an explicit -05:00 offset is also preserved correctly.

This follows the repository's UTC convention. Server-default NOW() cast to a naive TIMESTAMP depends on the database session timezone; no live database timezone was inspected or changed. Values historically written under a different database timezone cannot be repaired by this formatter. `ProgrammaticKey` now includes created_at and last_used_at. The create response type is narrowed to the fields actually returned by POST, rather than claiming it contains list-only timestamps.

## Tests and actual results

Commands run with Node 22.23.4. Production builds and browser tests use an isolated temporary frontend copy excluding `.env*`, generated output and dependency directories, then copying the existing installed dependencies. The existing local fake identity provider runs on 3199 and Next on 3100. No real user key or provider credential was used, and no live account was deleted.

| Check | Result | Complete local log |
|---|---|---|
| `npm run lint` | Exit 0; no diagnostics | `/tmp/account-lint-verified.log` |
| `npx tsc --noEmit` | Exit 0; no diagnostics | `/tmp/account-types-verified.log` |
| `npm test` | Exit 0; 48 passed | `/tmp/account-unit-verified.log` |
| `npm run build` | Retry exit 0; first attempt exit 1 as described below | `/tmp/account-build-verified.log`, `/tmp/account-build-verified-retry.log` |
| Affected Playwright suites | Exit 0; 51 passed | `/tmp/account-browser-verified.log` |

Actual unit output excerpt:

```text
# tests 48
# suites 0
# pass 48
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 1961.952
```

Browser command:

```bash
npx playwright test e2e/account-keys.spec.ts e2e/auth.spec.ts e2e/shell.spec.ts e2e/links.spec.ts e2e/demo.spec.ts --reporter=list
```

```text
51 passed (17.0s)
```

`frontend/tests/key-dates.test.cjs` verifies UTC/null/invalid date handling. `frontend/tests/api.test.cjs` covers typed 403 without changing the message. `frontend/e2e/account-keys.spec.ts` covers scope mappings, secret copy/failure/dismiss/no DOM or storage retention, no live-region/log/URL leakage, workspace-change cleanup and headers, a late create response after client navigation, revoke cancel/confirm, shared-identity role denial and server 403, export success/failure, trusted verification, typed deletion gating without deletion, global sign-out cancel/confirm, empty state, demo nav, 320px width and light/dark axe on account/keys and every new dialog. The only intentional change to auth.spec.ts clicks the new confirmation before expecting global sign-out.

Screenshots were captured under `/tmp/account-{light,dark}-*.png`; the light account and dark keys phone screenshots were visually inspected. They contain only synthetic fixtures. No build output, screenshot, report, environment file or secret is staged/committed.

## Failures encountered and practical limits

- Initial lint rejected an effect's direct reload call and the cleanup ref access. The initial load is now scheduled with an invalidation check and cleanup uses the captured lifecycle ref; no lint rule was disabled.
- The first new browser run omitted the existing CAPTCHA stub, so sign-in could not proceed. It was stopped (exit 130), the stub added, and the suites rerun. This was a test setup failure, not evidence of production CAPTCHA correctness.
- The next browser run had 46 passed / 5 failed (exit 1): four were an ambiguous Scopes selector matching card badges and the create select; one revealed that the API client discarded 403 status. Scoped the selector to the dialog and fixed/tested typed 403. Final run passed all 51, with no retries or skipped failing tests.
- Next 16.4.3 compiled and type-checked but its existing security-advisory hook interrupted initial builds (exit 1). Identical retries exited 0. No advisory was suppressed and no dependency changed; the existing warning is unresolved. Passing the retry does not establish dependency security.
- No real Supabase profile/session/export flow, hosted deployment, live database timezone, LocalAuth browser build or Safari/Firefox was exercised. LocalAuth code paths/messages are preserved and build/type-checked, but not manually verified here. Clipboard assertions use Chromium's test permission grant, not proof every browser grants access.
- No backend file changed or backend bug was demonstrated; `make check`, authorization-matrix, tenant-isolation, integration and MCP suites were not rerun for this frontend-only step. Existing backend authorization remains authoritative; UI role checks do not replace it.


Repository gate `make frontend-check`: exit 0 (`/tmp/account-frontend-check-final.log`), including npm ci from the unchanged lock, lint, 48 unit tests and TypeScript. Final review also adds a successful-revoke focus assertion: cancellation returns to the trigger; successful revocation returns to the Workspace keys heading because its old action disappears. Final source checks are recorded above; complete logs remain local and are not committed.
