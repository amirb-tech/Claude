import { test, expect, player, playPause, elapsedMs } from "./fixtures";
import type { Page } from "@playwright/test";

const nowTitle = (page: Page) => player(page).getByRole("link").first();

async function startAlbum(page: Page) {
  await page.goto("/album/ar02al1"); // 5 songs
  await page.getByRole("button", { name: "Play Grid Runner" }).click();
  await expect(playPause(page)).toHaveAccessibleName("Pause");
}
const titles = async (page: Page) =>
  (await page.getByRole("row").evaluateAll((rs) => rs.slice(1).map((r) => r.getAttribute("aria-label")!.split(" by ")[0])));

test.describe("F05 playback controls", () => {
  test("F05-H1 next, previous, previous-after-3s restarts", async ({ page, a11y }) => {
    await startAlbum(page);
    const t = await titles(page);
    await expect(nowTitle(page)).toHaveText(t[0]);
    await page.getByRole("button", { name: "Next" }).click();
    await expect(nowTitle(page)).toHaveText(t[1]);
    await expect.poll(() => elapsedMs(page), { timeout: 10_000 }).toBeGreaterThan(3500);
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(nowTitle(page)).toHaveText(t[1]); // restarted, same song
    await expect.poll(() => elapsedMs(page)).toBeLessThan(2500);
    await page.getByRole("button", { name: "Previous" }).click();
    await expect(nowTitle(page)).toHaveText(t[0]);
    await a11y("album playing");
  });

  test("F05-E1/E2 shuffle keeps current song, repeat cycles", async ({ page }) => {
    await startAlbum(page);
    const first = await nowTitle(page).textContent();
    const shuffle = page.getByRole("button", { name: "Shuffle" });
    await shuffle.click();
    await expect(shuffle).toHaveAttribute("aria-pressed", "true");
    await expect(nowTitle(page)).toHaveText(first!);
    // shuffle visits every song once before repeating
    const seen = new Set([first]);
    for (let i = 0; i < 4; i++) {
      await page.getByRole("button", { name: "Next" }).click();
      await expect(nowTitle(page)).not.toHaveText([...seen].pop()!);
      seen.add(await nowTitle(page).textContent());
    }
    expect(seen.size).toBe(5);
    const repeat = page.getByRole("button", { name: /^Repeat/ });
    await expect(repeat).toHaveAccessibleName("Repeat: off");
    await repeat.click(); await expect(repeat).toHaveAccessibleName("Repeat: all");
    await repeat.click(); await expect(repeat).toHaveAccessibleName("Repeat: this song");
    await repeat.click(); await expect(repeat).toHaveAccessibleName("Repeat: off");
  });

  test("F05-E3 seek with the keyboard", async ({ page }) => {
    await startAlbum(page);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const seek = page.getByRole("slider", { name: "Seek" });
    await seek.focus();
    for (let i = 0; i < 40; i++) await page.keyboard.press("ArrowRight");
    await expect.poll(() => elapsedMs(page)).toBeGreaterThan(5000);
  });

  test("F05-E4 volume and mute, remembered after reload", async ({ page }) => {
    await startAlbum(page);
    const vol = page.getByRole("slider", { name: "Volume" });
    await vol.fill("0.3");
    await expect(vol).toHaveValue("0.3");
    await page.getByRole("button", { name: "Mute" }).click();
    await expect(page.getByRole("button", { name: "Unmute" })).toBeVisible();
    await expect(vol).toHaveValue("0");
    await page.getByRole("button", { name: "Unmute" }).click();
    await page.reload();
    await expect(page.getByRole("slider", { name: "Volume" })).toHaveValue("0.3");
  });

  test("F05-E5 Space toggles playback, but not while typing", async ({ page }) => {
    await startAlbum(page);
    await page.getByRole("heading", { level: 1 }).click();
    await page.keyboard.press("Space");
    await expect(playPause(page)).toHaveAccessibleName("Play");
    await page.keyboard.press("Space");
    await expect(playPause(page)).toHaveAccessibleName("Pause");
    await page.getByRole("link", { name: "Search" }).first().click();
    await page.getByLabel("Search", { exact: true }).fill("a b");
    await expect(playPause(page)).toHaveAccessibleName("Pause");
  });

  test("F05-E6 end of album with repeat off stops on the last song", async ({ page }) => {
    await page.goto("/album/ar05al2"); // single: one song
    await page.getByRole("button", { name: "Play Boss Room" }).first().click(); // header button (the row has one too)
    await expect(playPause(page)).toHaveAccessibleName("Pause");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(playPause(page)).toHaveAccessibleName("Play");
    await expect(nowTitle(page)).toHaveText("Boss Room");
  });
});
