import { test, expect, signUp } from "./fixtures";

test.describe("cross-cutting", () => {
  test("X-2 unknown route shows not found", async ({ page, a11y }) => {
    await page.goto("/no/such/page");
    await expect(page.getByRole("heading", { name: "This page wandered off" })).toBeVisible();
    await a11y("404");
  });

  test("X-3 two tabs: a heart in one shows in the other after reload", async ({ page, context }) => {
    await signUp(page);
    const tab2 = await context.newPage();
    await tab2.goto("/collection/hearted");
    await expect(tab2.getByRole("heading", { name: "No hearted songs yet" })).toBeVisible();
    await page.goto("/album/ar07al1");
    const row = page.getByRole("row").nth(1);
    await row.hover();
    await row.getByRole("button", { name: /^Heart / }).click();
    await expect(page.getByRole("status")).toContainText("Saved");
    await tab2.reload();
    await expect(tab2.getByRole("row")).toHaveCount(2);
  });

  test("design system page passes axe", async ({ page, a11y }) => {
    await page.goto("/design");
    await expect(page.getByRole("heading", { name: "Design system" })).toBeVisible();
    await a11y("design");
  });
});

test("privacy and terms pages render and pass axe", async ({ page, a11y }) => {
  for (const [path, h] of [["/privacy", "Privacy"], ["/terms", "Terms"]]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: h })).toBeVisible();
    await a11y(path);
  }
});
