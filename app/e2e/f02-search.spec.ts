import { test, expect, playPause, player } from "./fixtures";

test.describe("F02 search and play", () => {
  test("F02-H1 search an artist, play a song with Enter", async ({ page, a11y }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Explore by sound" })).toBeVisible();
    await a11y("browse");
    await page.getByRole("searchbox", { name: "Search" }).or(page.getByLabel("Search", { exact: true })).fill("Neon Atlas");
    await expect(page).toHaveURL(/\/search\/Neon%20Atlas/);
    await expect(page.getByRole("region", { name: "Best match" })).toContainText("Neon Atlas");
    await a11y("search results");
    const row = page.getByRole("region", { name: "Songs" }).getByRole("row").nth(1);
    const name = (await row.getAttribute("aria-label"))!.split(" by ")[0];
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(playPause(page)).toHaveAccessibleName("Pause");
    await expect(player(page).getByRole("link").first()).toHaveText(name);
  });

  test("F02-E1 no results", async ({ page, a11y }) => {
    await page.goto("/search/qqqzzzxx");
    await expect(page.getByRole("heading", { name: 'Nothing matches "qqqzzzxx"' })).toBeVisible();
    await a11y("search empty");
  });

  test("F02-E2/E3/E4 wildcards, emoji/accents, very long query", async ({ page }) => {
    for (const q of ["%_\\", "café 🎧", "x".repeat(150)]) {
      await page.goto("/search/" + encodeURIComponent(q));
      await expect(page.getByRole("heading", { name: /Nothing matches/ })).toBeVisible();
    }
  });

  test("F02-E5/E6 filters and back button", async ({ page }) => {
    await page.goto("/search/lo");
    await page.getByRole("button", { name: "Artists" }).click();
    await expect(page.getByRole("region", { name: "Artists" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Albums" })).toHaveCount(0);
    await page.goto("/search/moth");
    await page.goBack();
    await expect(page).toHaveURL(/\/search\/lo$/);
  });
});
