import { defineConfig, devices } from "@playwright/test";

const PORT = 3201;
export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "off",
    // headless Chromium with audio allowed after a click, as in a real browser
    launchOptions: { args: ["--autoplay-policy=user-gesture-required"] },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `bash e2e/serve.sh ${PORT}`,
    url: `http://localhost:${PORT}/api/me`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
