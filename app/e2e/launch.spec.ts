import { test, expect } from "./fixtures";

test("landing page: hero, fixes, pricing, CTA, passes axe on desktop and phone", async ({ page, a11y }) => {
  await page.goto("/welcome");
  await expect(page.getByRole("heading", { level: 1, name: "Plays what you pick." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your list, only your list" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByRole("img", { name: /player with an album playing/ })).toBeVisible();
  await a11y("welcome desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await a11y("welcome mobile");
  await page.getByRole("link", { name: "Start listening" }).first().click();
  await expect(page).toHaveURL("/");
});
