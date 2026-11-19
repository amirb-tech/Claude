import { test, expect, signUp } from "./fixtures";

test.describe("F08 sign up and log in", () => {
  test("F08-H1/E2 sign up with the keyboard only", async ({ page, a11y }) => {
    await page.goto("/signup");
    await a11y("signup");
    await page.getByLabel("Email").focus();
    await page.keyboard.type(`kb${Date.now()}@example.test`);
    await page.keyboard.press("Tab"); await page.keyboard.type("Keys");
    await page.keyboard.press("Tab"); await page.keyboard.type("listen-all-day");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: /Keys/ })).toBeVisible();
  });

  test("F08-N1 wrong password, F08-N2 email taken", async ({ page, browser, a11y }) => {
    const email = await signUp(page, "Owner");
    const p2 = await (await browser.newContext()).newPage();
    await p2.goto("/login");
    await a11y("login");
    await p2.getByLabel("Email").fill(email);
    await p2.getByLabel("Password").fill("not-the-password");
    await p2.getByRole("button", { name: "Log in" }).click();
    await expect(p2.getByRole("alert")).toHaveText("That email and password don't match.");
    await expect(p2).toHaveURL(/\/login$/);
    await p2.goto("/signup");
    await p2.getByLabel("Email").fill(email.toUpperCase());
    await p2.getByLabel("Profile name").fill("Copy");
    await p2.getByLabel("Password").fill("listen-all-day");
    await p2.getByRole("button", { name: "Create account" }).click();
    await expect(p2.getByRole("alert")).toContainText("already has an account");
  });

  test("F08-E1 double-click Create account makes one account and signs in", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(`dbl${Date.now()}@example.test`);
    await page.getByLabel("Profile name").fill("Double");
    await page.getByLabel("Password").fill("listen-all-day");
    await page.getByRole("button", { name: "Create account" }).dblclick();
    await expect(page.getByRole("heading", { level: 1, name: /Double/ })).toBeVisible();
  });

  test("F08-E3 a bad session cookie means logged out", async ({ page, context }) => {
    await context.addCookies([{ name: "sid", value: "forged-token", url: "http://localhost:3201" }]);
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
  });

  test("F08 settings: log out", async ({ page, a11y }) => {
    await signUp(page, "Leaver");
    await page.goto("/settings");
    await a11y("settings");
    await page.getByRole("button", { name: /^Account:/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /^Account:/ })).toHaveCount(0);
  });
});
