import { test, expect, signUp } from "./fixtures";
import type { Page } from "@playwright/test";

async function newPlaylist(page: Page) {
  await page.getByRole("button", { name: "New playlist" }).click();
  await expect(page).toHaveURL(/\/playlist\//);
  await expect(page.getByRole("heading", { name: "This playlist is empty" })).toBeVisible();
}
async function addBySearch(page: Page, q: string) {
  await page.getByLabel("Search for songs to add").fill(q);
  const first = page.getByRole("region", { name: "Find songs to add" }).getByRole("button", { name: /^Add / }).first();
  await expect(first).toBeVisible();
  await first.click();
}

test.describe("F04 playlists", () => {
  test("F04-H1/E1 create, add by search, duplicate asks first", async ({ page, a11y }) => {
    await signUp(page);
    await newPlaylist(page);
    await a11y("playlist empty");
    await addBySearch(page, "Rain on Tin");
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(2); // header + 1
    await addBySearch(page, "Rain on Tin");
    const dlg = page.getByRole("dialog", { name: "Are you sure?" });
    await expect(dlg).toContainText("already in");
    await dlg.getByRole("button", { name: "Cancel" }).click();
    await page.reload();
    await expect(page.getByRole("row")).toHaveCount(2);
    await a11y("playlist filled");
  });

  test("F04-H2 add from the row menu to an existing playlist", async ({ page }) => {
    await signUp(page);
    await newPlaylist(page);
    const name = (await page.getByRole("heading", { level: 1 }).textContent())!;
    await page.goto("/album/ar02al1");
    const row = page.getByRole("row").nth(1);
    await row.hover();
    await row.getByRole("button", { name: /^More options for/ }).click();
    await page.getByRole("menuitem", { name: "Add to playlist" }).click();
    await page.getByRole("menuitem", { name }).click();
    await expect(page.getByRole("status")).toContainText(`Added to ${name}`);
  });

  test("F04-E2/E5/E6/E3 rename rules, move, remove, delete", async ({ page }) => {
    await signUp(page);
    await newPlaylist(page);
    await addBySearch(page, "Grid Runner");
    await page.getByLabel("Search for songs to add").fill("");
    await addBySearch(page, "Cold Water");
    await expect(page.getByRole("row")).toHaveCount(3);
    // rename: empty refused, long name accepted
    await page.getByRole("heading", { level: 1 }).getByRole("button").click();
    const dlg = page.getByRole("dialog", { name: "Edit playlist" });
    await dlg.getByLabel("Name").fill("   ");
    await dlg.getByRole("button", { name: "Save" }).click();
    await expect(dlg.getByRole("alert")).toHaveText("Give the playlist a name.");
    const long = "Songs for the long drive home after a very good day 🚗 é";
    await dlg.getByLabel("Name").fill(long);
    await dlg.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(long);
    // move first song down
    const rows = page.getByRole("row");
    const first = (await rows.nth(1).getAttribute("aria-label"))!;
    await rows.nth(1).hover();
    await rows.nth(1).getByRole("button", { name: /^More options/ }).click();
    await page.getByRole("menuitem", { name: "Move down" }).click();
    await page.reload();
    await expect(page.getByRole("row").nth(2)).toHaveAttribute("aria-label", first);
    // remove it
    await page.getByRole("row").nth(2).hover();
    await page.getByRole("row").nth(2).getByRole("button", { name: /^More options/ }).click();
    await page.getByRole("menuitem", { name: "Remove from this playlist" }).click();
    await expect(page.getByRole("row")).toHaveCount(2);
    // delete
    await page.getByRole("button", { name: `More options for ${long}` }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("complementary", { name: "Navigation and collection" }).getByText(long)).toHaveCount(0);
  });

  test("F04-N1 deleted or unknown playlist shows an error page", async ({ page }) => {
    await page.goto("/playlist/00000000-0000-0000-0000-000000000000");
    await expect(page.getByRole("heading", { name: "That didn't load" })).toBeVisible();
    await expect(page.getByText("Playlist not found.")).toBeVisible();
  });
});
