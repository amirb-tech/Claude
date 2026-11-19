import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type Fixtures = { a11y: (label?: string) => Promise<void> };

/** Every test: fail on console errors (except expected 4xx resource logs) and on any 5xx. */
export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      if (/Failed to load resource: the server responded with a status of 4\d\d/.test(m.text())) return; // intended 401/404/409 answers
      problems.push(`console error: ${m.text()}`);
    });
    page.on("pageerror", (e) => problems.push(`page error: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 500) problems.push(`${r.status()} on ${r.url()}`); });
    await use(page);
    expect(problems, problems.join("\n")).toEqual([]);
  },
  a11y: async ({ page }, use) => {
    await use(async (label = page.url()) => {
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${label}: ${v.id} (${v.impact}) ${v.help} -> ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  },
});
export { expect };

let n = 0;
export async function signUp(page: Page, name = "Tester") {
  const email = `t${Date.now()}${process.pid}${n++}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Profile name").fill(name);
  await page.getByLabel("Password").fill("listen-all-day");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(name) })).toBeVisible();
  return email;
}

export const player = (page: Page) => page.getByRole("contentinfo", { name: "Player" });
export const playPause = (page: Page) => player(page).getByRole("button", { name: /^(Play|Pause)$/ });
export async function songRow(page: Page, title: string | RegExp) {
  return page.getByRole("row", { name: title }).first();
}
export async function elapsedMs(page: Page) {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLInputElement>('input[aria-label="Seek"]');
    return el ? Number(el.value) : -1;
  });
}
