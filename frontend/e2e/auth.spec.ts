import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test.beforeEach(async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: 'window.turnstile={render:(el,options)=>{options.callback("fixture-captcha");return "test"},remove:()=>{}}',
    }),
  );
});
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("owner@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-only");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
test("protected routes redirect safely and landing is not demo mode", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Demo mode")).toHaveCount(0);
  await page.goto("/dashboard?view=links");
  await expect(page).toHaveURL(/login\?next=/);
  await page.goto("/login?next=https://evil.example");
  await page.getByRole("button", { name: "Continue with GitHub" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
test("cookie login, workspace switch, forbidden role and rate limit message", async ({
  page,
  context,
}) => {
  await login(page);
  await expect(page.getByText("personal-code", { exact: true })).toBeVisible();
  await page
    .getByLabel("Workspace", { exact: true })
    .selectOption({ label: "Team" });
  await expect(page.getByText("team-code", { exact: true })).toBeVisible();
  await expect(page.getByText("personal-code", { exact: true })).toHaveCount(0);
  await page.getByLabel("Long URL").fill("https://example.com/test");
  await page.getByRole("button", { name: "Shorten", exact: true }).click();
  await expect(
    page.getByText("Too many requests.", { exact: false }),
  ).toContainText("7");
  await page.goto("/flagged");
  await expect(
    page.getByText("You do not have permission", { exact: false }),
  ).toBeVisible();
  expect(
    (await context.cookies()).some((c) => c.name.includes("auth-token")),
  ).toBeTruthy();
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k !== "relaymark-theme"),
    ),
  ).toEqual([]);
  await page.goto("/login");
  await expect(page).toHaveURL(/dashboard$/);
});
test("expired invalid session cannot reach protected content", async ({
  page,
  context,
}) => {
  await login(page);
  const expired = await (
    await page.request.get("http://127.0.0.1:3199/fixture/expired")
  ).json();
  const cookies = await context.cookies();
  // Stop the old page's refresh/fetch tasks before simulating a later expired visit.
  await page.goto("about:blank");
  for (const cookie of cookies.filter((c) => c.name.includes("auth-token"))) {
    await context.addCookies([
      {
        ...cookie,
        value:
          "base64-" +
          Buffer.from(JSON.stringify(expired)).toString("base64url"),
      },
    ]);
  }
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});
for (const path of ["/login", "/signup", "/forgot-password", "/reset-password"])
  test(`auth accessibility and nonce: ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(response?.headers()["content-security-policy"]).toContain("'nonce-");
    expect(response?.headers()["content-security-policy"]).not.toContain(
      "script-src 'self' 'unsafe-inline'",
    );
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
test("account is accessible and sign out clears the session", async ({
  page,
}) => {
  await login(page);
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Delete account", exact: true }),
  ).toBeDisabled();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
});

test("signup and recovery submit CAPTCHA without real provider traffic", async ({
  page,
}) => {
  await page.goto("/signup");
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password-only");
  const signup = page.waitForRequest((request) =>
    request.url().includes("/auth/v1/signup"),
  );
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  expect((await signup).postDataJSON().gotrue_meta_security.captcha_token).toBe(
    "fixture-captcha",
  );
  await expect(page.getByRole("status")).toContainText("Check your email");
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill("new@example.test");
  const recovery = page.waitForRequest((request) =>
    request.url().includes("/auth/v1/recover"),
  );
  await page.getByRole("button", { name: "Send reset email" }).click();
  expect(
    (await recovery).postDataJSON().gotrue_meta_security.captcha_token,
  ).toBe("fixture-captcha");
  await expect(page.getByRole("status")).toContainText("If an account exists");
});

test("password update and global sign-out use the provider contracts", async ({
  page,
}) => {
  await login(page);
  await page.goto("/reset-password");
  await page
    .getByLabel("Password", { exact: true })
    .fill("new-fixture-password");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("status")).toContainText("Password updated");
  await page.goto("/account");
  const logout = page.waitForRequest((request) =>
    request.url().includes("/auth/v1/logout"),
  );
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  expect((await logout).url()).toContain("scope=global");
  await expect(page).toHaveURL(/login/);
});


test("API network failure does not claim the user's email is unverified", async ({ page }) => {
  await login(page);
  await page.route('http://127.0.0.1:3199/me', route => route.abort('failed'));
  await page.goto('/account');
  await expect(page.getByText('Verification status unavailable', { exact: false })).toBeVisible();
  await expect(page.getByText('Email not verified', { exact: false })).toHaveCount(0);
});


test('public header reflects sign-in, logo navigation and sign-out', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header').getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
  await login(page);
  await page.getByRole('link', { name: 'Relaymark', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
  await expect(page.locator('header').getByRole('link', { name: 'Test owner', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
  await page.reload();
  await page.locator('header').getByRole('link', { name: 'Test owner', exact: true }).click();
  await expect(page.getByLabel('Display name')).toHaveValue('Test owner');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/');
  await expect(page.locator('header').getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
});


for (const provider of ['Google', 'GitHub']) test(`${provider} sends the appropriate account-selection parameters`, async ({ page }) => {
  await page.goto('/login');
  const authorization = page.waitForRequest(request => request.url().includes('/auth/v1/authorize'));
  await page.getByRole('button', { name: `Continue with ${provider}` }).click();
  const url = new URL((await authorization).url());
  expect(url.searchParams.get('provider')).toBe(provider.toLowerCase());
  expect(url.searchParams.get('prompt')).toBe(provider === 'Google' ? 'select_account' : null);
  await expect(page).toHaveURL(/dashboard$/);
});
