import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { DOC_BRIEF, RICH_BRIEF, generateBrief, hasHorizontalOverflow } from "./helpers";

const SCREENS = [
  { name: "home", path: "/" },
  { name: "brief", path: `/briefs/${RICH_BRIEF}` },
  { name: "document brief", path: `/briefs/${DOC_BRIEF}` },
  { name: "radar", path: "/radar" },
];
const WIDTHS = [320, 768, 1024, 1440];
/** Long enough for the entrance animations to finish before measuring. */
const SETTLE_MS = 1200;

test.describe("accessibility", () => {
  for (const screen of SCREENS) {
    test(`${screen.name} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(screen.path);
      await page.waitForTimeout(SETTLE_MS);

      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));

      expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
    });
  }
});

test.describe("the Export menu", () => {
  test("has no serious accessibility violations while it is open", async ({ page }) => {
    await page.goto(`/briefs/${DOC_BRIEF}`);
    await page.waitForTimeout(SETTLE_MS);
    await page.getByRole("button", { name: "Export" }).first().click();
    await expect(page.getByRole("menu", { name: "Export" })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));

    expect(serious.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(" | ")}`)).toEqual([]);
  });
});

test.describe("responsive layout", () => {
  test("the open Export menu fits inside a 320px screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`/briefs/${DOC_BRIEF}`);
    await page.waitForTimeout(SETTLE_MS);
    await page.getByRole("button", { name: "Export" }).first().click();

    const menu = page.getByRole("menu", { name: "Export" });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  for (const screen of SCREENS) {
    for (const width of WIDTHS) {
      test(`${screen.name} fits a ${width}px screen without sideways scrolling`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(screen.path);
        await page.waitForTimeout(SETTLE_MS);

        expect(await hasHorizontalOverflow(page)).toBe(false);
        await testInfo.attach(`${screen.name}-${width}`, {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
      });
    }
  }
});

test.describe("keyboard", () => {
  test("tabbing through the top bar keeps your place, and reaches the pinned bar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/briefs/${RICH_BRIEF}`);
    await page.waitForTimeout(SETTLE_MS);

    // Far enough down that the brief's own header has gone and the pinned bar has taken over.
    await page.evaluate(() => window.scrollTo(0, 700));
    const pinnedDownload = page.locator("div.fixed").getByRole("link", { name: /download pdf/i });
    await expect(pinnedDownload).toBeVisible();
    const place = await page.evaluate(() => window.scrollY);
    expect(place).toBeGreaterThan(0);

    // The top bar has four stops: the logo, the two tools and the account menu.
    await page.getByRole("link", { name: /alkira partner tools/i }).focus();
    for (let stop = 0; stop < 3; stop += 1) {
      await page.keyboard.press("Tab");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(place);
    }

    // The next stop is the pinned bar, still there because the page has not moved.
    await page.keyboard.press("Tab");
    await expect(pinnedDownload).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(place);
  });
});

test.describe("reduced motion", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("a brief can still be generated, and numbers show without counting", async ({ page }) => {
    await generateBrief(page, "Calm Motion Co");

    // No settle time: with motion reduced the score is its final value at once.
    const digits = page.locator("section").first().locator("[aria-hidden='true']", { hasText: /^4$/ });
    await expect(digits).toBeVisible({ timeout: 1000 });
  });
});

test.describe("security headers", () => {
  test("every page carries a nonce-based policy that forbids inline scripts and framing", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers() ?? {};
    const csp = headers["content-security-policy"] ?? "";

    expect(csp).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+' 'strict-dynamic'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
  });

  test("uses a different nonce for each request", async ({ request }) => {
    const nonceOf = async () => /'nonce-([^']+)'/.exec((await request.get("/")).headers()["content-security-policy"] ?? "")?.[1];

    expect(await nonceOf()).not.toBe(await nonceOf());
  });

  test("runs with no console errors or policy violations", async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(message.text());
    });
    page.on("pageerror", (error) => problems.push(String(error)));

    await generateBrief(page, "Quiet Console plc");
    await page.goto("/radar");
    await page.waitForTimeout(SETTLE_MS);

    expect(problems).toEqual([]);
  });
});
