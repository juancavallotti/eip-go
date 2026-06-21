import { test, expect } from "@playwright/test";

/**
 * Renders repo samples in the real editor and captures canvas screenshots for the
 * docs site. Each PNG maps to a `data-shot` placeholder in docs/index.html — see
 * docs/SCREENSHOTS.md. Run with `npm run screenshots` (boots the editor with SSO
 * disabled via playwright.config.ts).
 */

// sample slug (samples/<slug>.yaml) -> docs/assets/screenshots/<out>.png
const SHOTS = [
  { sample: "ai-router", out: "01-flow-canvas" },
  { sample: "error-handling", out: "02-error-flow" },
  { sample: "http-orders", out: "03-flow-overview" },
];

const OUT_DIR = "../docs/assets/screenshots";

for (const { sample, out } of SHOTS) {
  test(`screenshot ${sample} -> ${out}`, async ({ page }) => {
    await page.goto(`/preview?sample=${sample}`);

    // The sample loads client-side (fetch + dispatch), so wait for a flow card
    // to render on the canvas before shooting.
    const canvas = page.locator("main.canvas-grid");
    await expect(canvas.locator("section").first()).toBeVisible({
      timeout: 15_000,
    });
    // Let layout settle (fonts, arrows between blocks) before the capture.
    await page.waitForTimeout(500);

    await canvas.screenshot({ path: `${OUT_DIR}/${out}.png` });
  });
}
