// Capture full-page screenshots of the running app for visual review.
//
//   node dev/shots.mjs <outDir> [baseUrl]
//
// Expects the app (and the mock API) to be running. Not part of the test suite.

import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "@playwright/test";

const outDir = process.argv[2];
const baseUrl = process.argv[3] ?? "http://localhost:3100";
if (!outDir) {
  process.stderr.write("usage: node dev/shots.mjs <outDir> [baseUrl]\n");
  process.exit(1);
}

const RICH_BRIEF = "0b6f2c1e-6f0e-4a57-9a3e-1d2c3b4a5f60";
const SPARSE_BRIEF = "11111111-2222-4333-8444-555555555555";
const SPANISH_BRIEF = "9c8b7a65-4321-4fed-b0a9-876543210fed";

const PAGES = [
  { name: "home", path: "/" },
  { name: "brief", path: `/briefs/${RICH_BRIEF}` },
  { name: "brief-sparse", path: `/briefs/${SPARSE_BRIEF}` },
  { name: "brief-es", path: `/briefs/${SPANISH_BRIEF}` },
  { name: "radar", path: "/radar" },
  { name: "not-found", path: "/briefs/00000000-0000-4000-8000-000000000000" },
];

/** States that need interaction to reach. */
const SCENARIOS = [
  {
    name: "generating",
    async run(page) {
      await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
      await page.getByLabel("Company").fill("Acme Robotics");
      await page.getByRole("button", { name: /generate brief/i }).click();
      await page.waitForTimeout(4500);
    },
  },
  {
    name: "radar-scoring",
    async run(page) {
      await page.goto(baseUrl + "/radar", { waitUntil: "networkidle" });
      await page.locator("textarea#accounts").fill("Acme Robotics\nGlobex\nInitech\nZzyx Holdings\nWayne Enterprises\nUmbrella Health");
      await page.getByRole("button", { name: /score accounts/i }).click();
      await page.waitForTimeout(2600);
    },
    fullPage: true,
  },
  {
    name: "radar-results",
    async run(page) {
      await page.getByText(/of 6 scored/i).waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1200);
    },
    fullPage: true,
  },
  {
    name: "delete-dialog",
    async run(page) {
      await page.goto(baseUrl + `/briefs/${RICH_BRIEF}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: "More actions" }).first().click();
      await page.getByRole("menuitem", { name: /delete brief/i }).click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: "account-menu",
    async run(page) {
      await page.goto(baseUrl + "/", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: /account menu/i }).click();
      await page.waitForTimeout(500);
    },
  },
];

const only = (process.env.SHOTS_ONLY ?? "").split(",").filter(Boolean);
const widths = (process.env.SHOTS_WIDTHS ?? "1440,390").split(",").map(Number);
/** Long enough for the entrance stagger and the score count to finish. */
const SETTLE_MS = 1800;

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();

for (const width of widths) {
  const context = await browser.newContext({
    viewport: { width, height: width < 600 ? 844 : 900 },
    deviceScaleFactor: width < 600 ? 2 : 1,
  });
  const page = await context.newPage();
  const problems = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(String(error)));

  for (const target of PAGES) {
    if (only.length > 0 && !only.includes(target.name)) continue;
    await page.goto(baseUrl + target.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(SETTLE_MS);
    const file = join(outDir, `${target.name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    process.stdout.write(`${file}${overflow ? "  (HORIZONTAL OVERFLOW)" : ""}\n`);
  }
  for (const scenario of SCENARIOS) {
    if (only.length > 0 && !only.includes(scenario.name)) continue;
    await scenario.run(page);
    const file = join(outDir, `${scenario.name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: scenario.fullPage ?? false });
    process.stdout.write(`${file}\n`);
  }
  if (problems.length > 0) process.stdout.write(`console errors at ${width}:\n  ${[...new Set(problems)].join("\n  ")}\n`);
  await context.close();
}

await browser.close();
