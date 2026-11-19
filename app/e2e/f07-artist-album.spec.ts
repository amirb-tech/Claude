import { test, expect, signUp, playPause } from "./fixtures";

test.describe("F07 browse an artist then an album", () => {
  test("F07-H1 genre → artist → album → play", async ({ page, a11y }) => {
    await page.goto("/search");
    await page.getByRole("link", { name: "Chiptune" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Chiptune" })).toBeVisible();
    await page.getByRole("link", { name: "Pixel Moth" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Pixel Moth" })).toBeVisible();
    await a11y("artist");
    await page.getByRole("region", { name: "Releases" }).getByRole("link", { name: "Extra Life" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Extra Life" })).toBeVisible();
    await a11y("album");
    await page.getByRole("button", { name: "Play Extra Life" }).click();
    await expect(playPause(page)).toHaveAccessibleName("Pause");
  });

  test("F07-E1/E2 follow artist and save album show in the collection", async ({ page }) => {
    await signUp(page);
    await page.goto("/artist/ar06");
    await page.getByRole("button", { name: "Follow" }).click();
    await expect(page.getByRole("button", { name: "Following" })).toBeVisible();
    await page.goto("/album/ar06al1");
    await page.getByRole("button", { name: "Save album to your collection" }).click();
    const side = page.getByRole("complementary", { name: "Navigation and collection" });
    await expect(side.getByRole("link", { name: /Juniper Static/ }).first()).toBeVisible();
    await expect(side.getByRole("link", { name: /Slow Orbit/ })).toBeVisible();
    await page.getByRole("button", { name: "Remove album from your collection" }).click();
    await expect(side.getByRole("link", { name: /Slow Orbit/ })).toHaveCount(0);
  });
});
