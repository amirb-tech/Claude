import { test, expect, player, playPause, elapsedMs } from "./fixtures";

test.describe("F01 play something from home", () => {
  test("F01-H1/E1 card play starts the album, second press pauses", async ({ page, a11y }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await a11y("home (logged out)");
    const shelf = page.getByRole("region", { name: "Fresh releases" });
    const card = shelf.getByRole("link").first();
    const title = (await card.textContent())!;
    await card.hover();
    await shelf.getByRole("button", { name: `Play ${title}` }).click();
    await expect(playPause(page)).toHaveAccessibleName("Pause");
    await expect.poll(() => elapsedMs(page), { timeout: 8000 }).toBeGreaterThan(500);
    await expect(player(page).getByRole("link").first()).not.toBeEmpty();
    await shelf.getByRole("button", { name: `Pause ${title}` }).click();
    await expect(playPause(page)).toHaveAccessibleName("Play");
  });

  test("F01-E3 refresh restores the last song paused", async ({ page }) => {
    await page.goto("/album/ar03al1");
    await page.getByRole("button", { name: "Play Cold Water" }).click();
    await expect(playPause(page)).toHaveAccessibleName("Pause");
    const song = await player(page).getByRole("link").first().textContent();
    await page.reload();
    await expect(player(page).getByRole("link").first()).toHaveText(song!);
    await expect(playPause(page)).toHaveAccessibleName("Play");
  });

  test("F01-E2 mobile width: no horizontal scroll, bottom nav", async ({ page, a11y }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await a11y("home mobile");
  });
});
