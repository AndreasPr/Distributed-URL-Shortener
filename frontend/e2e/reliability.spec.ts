import { test, expect } from "@playwright/test";

test("cold start displays waking state then a health-driven badge", async ({ page }) => {
  let calls = 0;
  await page.route("**/health", async route => {
    calls++;
    if (calls === 1) await new Promise(resolve => setTimeout(resolve, 4500));
    await route.fulfill({ json: { status: "ok", db: "reachable", redis: "reachable" } });
  });
  await page.goto("/login");
  await expect(page.getByText("Waking up the free-tier server, this takes up to about a minute")).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("Server: healthy")).toBeVisible({ timeout: 6000 });
  await expect(page.getByText("Failed to fetch", { exact: true })).toHaveCount(0);
});

test("kill switches have explicit banners and signup is disabled", async ({ page }) => {
  await page.route("**/status", route => route.fulfill({ json: { signups_enabled:false, link_creation_enabled:false, llm_enabled:false, read_only_mode:true } }));
  await page.goto("/signup");
  await expect(page.getByText("Read-only mode: changes are paused. Existing links still work.")).toBeVisible();
  await expect(page.getByText("New account signup is temporarily disabled.")).toBeVisible();
  await expect(page.getByText("Link creation is temporarily disabled.")).toBeVisible();
  await expect(page.getByText("AI checks are paused; heuristic safety checks remain active.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
});
