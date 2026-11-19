import { test, expect, signUp } from "./fixtures";

test.describe("F03 heart a song", () => {
  test("F03-E1 logged out heart asks to log in", async ({ page, a11y }) => {
    await page.goto("/album/ar01al1");
    const row = page.getByRole("row").nth(1);
    await row.hover();
    await row.getByRole("button", { name: /^Heart / }).click();
    await expect(page.getByRole("dialog", { name: "You'll need an account" })).toBeVisible();
    await a11y("login prompt");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("F03-H1/E3 heart, see it in Hearted songs, unheart", async ({ page, a11y }) => {
    await signUp(page);
    await page.goto("/album/ar01al1");
    const row = page.getByRole("row").nth(2);
    const title = (await row.getAttribute("aria-label"))!.split(" by ")[0];
    await row.hover();
    await row.getByRole("button", { name: `Heart ${title}` }).click();
    await expect(page.getByRole("status")).toContainText("Saved to your hearted songs");
    await expect(page.getByRole("link", { name: /Hearted songs/ }).first()).toContainText("1 song");
    await page.getByRole("link", { name: /Hearted songs/ }).first().click();
    await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();
    await a11y("hearted songs");
    const r = page.getByRole("row", { name: new RegExp(title) });
    await r.hover();
    await r.getByRole("button", { name: `Remove ${title} from hearted songs` }).click();
    await expect(page.getByRole("heading", { name: "No hearted songs yet" })).toBeVisible();
  });
});
