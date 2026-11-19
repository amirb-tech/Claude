import { test, expect, player } from "./fixtures";
import type { Page } from "@playwright/test";

async function queueRow(page: Page, n: number) {
  const row = page.getByRole("row").nth(n);
  const title = (await row.getAttribute("aria-label"))!.split(" by ")[0];
  await row.hover();
  await row.getByRole("button", { name: /^More options/ }).click();
  await page.getByRole("menuitem", { name: "Add to queue" }).click();
  return title;
}

test.describe("F06 queue", () => {
  test("F06-H1/E2 queued song plays next and survives a new album", async ({ page, a11y }) => {
    await page.goto("/album/ar03al1");
    const queued = await queueRow(page, 4); // nothing playing: starts it
    await expect(player(page).getByRole("link").first()).toHaveText(queued);
    await page.goto("/album/ar04al1");
    await page.getByRole("button", { name: "Play Basement Hours" }).click();
    const next = await queueRow(page, 3);
    await page.getByRole("link", { name: "Search" }).first().click();
    await page.getByLabel("Search", { exact: true }).fill("Rain on Tin");
    await page.getByRole("region", { name: "Albums" }).getByRole("link", { name: "Rain on Tin" }).click();
    await page.getByRole("button", { name: "Play Rain on Tin" }).first().click(); // new context; queue stays
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    const panel = page.getByRole("complementary", { name: "Queue" });
    await expect(panel.getByRole("heading", { name: "Your queue" })).toBeVisible();
    await expect(panel).toContainText(next);
    await a11y("queue panel");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(player(page).getByRole("link").first()).toHaveText(next);
  });

  test("F06-E1 remove and clear", async ({ page }) => {
    await page.goto("/album/ar04al1");
    await page.getByRole("button", { name: "Play Basement Hours" }).click();
    const a = await queueRow(page, 2);
    await queueRow(page, 3);
    await queueRow(page, 4);
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    const panel = page.getByRole("complementary", { name: "Queue" });
    await panel.getByRole("button", { name: `Remove ${a} from queue` }).click();
    await expect(panel.getByRole("button", { name: `Remove ${a} from queue` })).toHaveCount(0);
    await panel.getByRole("button", { name: "Clear" }).click();
    await expect(panel.getByRole("heading", { name: "Your queue" })).toHaveCount(0);
  });

  test("F06-E3 queue survives a page refresh (BUG-003)", async ({ page }) => {
    await page.goto("/album/ar04al1");
    await page.getByRole("button", { name: "Play Basement Hours" }).first().click();
    const q = await queueRow(page, 3);
    await page.reload();
    await page.getByRole("button", { name: "Queue", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Queue" }).getByRole("button", { name: `Remove ${q} from queue` })).toBeVisible();
  });
});
