import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("public warning explains the host and rechecks a block on Continue", async ({ page }) => {
  await page.route("**/warnings/test-code", route => route.fulfill({ json: { host: "example.com", reasons: ["public_report"] } }));
  await page.route("**/warnings/test-code/continue", route => route.fulfill({ status: 451, json: { detail: "Link blocked" } }));
  await page.goto("/warn/test-code");
  await expect(page.getByText("example.com", { exact: true })).toBeVisible();
  await expect(page.getByText("Someone reported this link for review.")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "This link is blocked" })).toContainText("blocked");
  await expect(page).toHaveURL(/\/warn\/test-code$/);
});

test("public report sends CAPTCHA and category without authentication", async ({ page }) => {
  await page.route("https://challenges.cloudflare.com/**", route => route.fulfill({ contentType: "application/javascript", body: 'window.turnstile={render:(el,o)=>{o.callback("fixture-captcha");return "fixture"},remove:()=>{}}' }));
  let received = false;
  await page.route("**/reports", async route => {
    expect(route.request().headers().authorization).toBeUndefined();
    expect(route.request().postDataJSON()).toEqual({ short_code: "test-code", category: "phishing", captcha_token: "fixture-captcha" });
    received = true;
    await route.fulfill({ status: 202, json: { status: "received" } });
  });
  await page.goto("/report/test-code");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByRole("status")).toContainText("Report received");
  expect(received).toBe(true);
});

for (const path of ["/terms", "/privacy", "/abuse"]) {
  test(`public policy and accessibility: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByText(/Template, not legal advice/).first()).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations).toEqual([]);
  });
}
