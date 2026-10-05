import { expect, type Page } from "@playwright/test";

/** Seeded in dev/fixtures.mjs. */
export const RICH_BRIEF = "0b6f2c1e-6f0e-4a57-9a3e-1d2c3b4a5f60";
export const SPANISH_BRIEF = "9c8b7a65-4321-4fed-b0a9-876543210fed";
export const SPARSE_BRIEF = "11111111-2222-4333-8444-555555555555";
export const MISSING_BRIEF = "00000000-0000-4000-8000-000000000000";

const BRIEF_URL = /\/briefs\/[0-9a-f-]{36}/;

/** Generate a brief from the home page and wait until its page is showing. */
export async function generateBrief(page: Page, company: string): Promise<string> {
  await page.goto("/");
  await page.getByLabel("Company").fill(company);
  await page.getByRole("button", { name: /generate brief/i }).click();
  await page.waitForURL(BRIEF_URL);
  await expect(page.getByRole("heading", { level: 1, name: company })).toBeVisible();
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}

export async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
}
