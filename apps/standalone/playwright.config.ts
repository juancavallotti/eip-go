import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the docs screenshot harness (pnpm run screenshots).
 *
 * It boots the standalone editor dev server and drives the /preview route, which
 * renders a repo sample on a pure editor canvas — no auth, no orchestrator, so
 * there is no sign-in wall to clear.
 *
 * Shots render at 1440x900 with deviceScaleFactor 2 so the PNGs are crisp on the
 * landing page. Outputs land in docs/assets/screenshots/.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    colorScheme: "dark",
  },
  projects: [
    {
      name: "chromium",
      // Spread the device first, then override so the hi-res settings win
      // (Desktop Chrome pins viewport 1280x720 @ 1x otherwise).
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
      },
    },
  ],
  webServer: {
    command: "pnpm run dev",
    url: "http://localhost:3000/preview?sample=hello-world",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
