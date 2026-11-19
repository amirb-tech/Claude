import { test, expect, signUp } from "./fixtures";

test.describe("F09 organise the collection", () => {
  test("F09-E1/H1 empty guidance, then filters and sort", async ({ page, a11y }) => {
    await signUp(page);
    const side = page.getByRole("complementary", { name: "Navigation and collection" });
    await expect(side.getByText(/Nothing saved yet/)).toBeVisible();
    await page.goto("/artist/ar01"); await page.getByRole("button", { name: "Follow" }).click();
    await page.goto("/album/ar02al1"); await page.getByRole("button", { name: "Save album to your collection" }).click();
    await page.getByRole("button", { name: "New playlist" }).click();
    await expect(page).toHaveURL(/playlist/);
    await side.getByRole("button", { name: "Artists" }).click();
    await expect(side.getByRole("link", { name: /Harbor Lights/ })).toBeVisible();
    await expect(side.getByRole("link", { name: /Grid Runner/ })).toHaveCount(0);
    await side.getByRole("button", { name: "Artists" }).click();
    await side.getByRole("button", { name: /^Sort:/ }).click();
    await expect(side.getByRole("button", { name: /^Sort: A to Z/ })).toBeVisible();
    await page.goto("/collection");
    await a11y("collection page");
  });

  test("F09-E2 collapsed rail is remembered", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Collapse your collection" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expand your collection" })).toBeVisible();
  });
});

test("FIX-4 setting hides personal shelves on Home", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "New playlist" }).click();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Your playlists" })).toBeVisible();
  await page.goto("/settings");
  await page.getByLabel("Hide my recent listening and playlists on Home").check();
  await page.goto("/");
  await expect(page.getByRole("region", { name: "Most played this week" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Your playlists" })).toHaveCount(0);
});
