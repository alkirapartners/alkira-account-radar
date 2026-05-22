import { test, expect } from "@playwright/test";

test.describe("radar flow", () => {
  test.beforeEach(async ({ context }) => {
    await context.setExtraHTTPHeaders({ "X-Auth-Email": "partner@example.com" });
  });

  test("paste 3 accounts and see streaming results", async ({ page }) => {
    await page.goto("/");
    await page.locator("textarea#accounts").fill("Acme\nGlobex\nInitech");
    await page.getByRole("button", { name: /score accounts/i }).click();

    await expect(page.getByRole("status").first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/of 3 done|3 of 3 scored/i)).toBeVisible({ timeout: 120_000 });

    const briefBtn = page.getByRole("link", { name: /generate brief/i }).first();
    await expect(briefBtn).toBeVisible();
    const href = await briefBtn.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toContain("company=");
  });

  test("41 accounts blocks with friendly error", async ({ page }) => {
    await page.goto("/");
    const big = Array.from({ length: 41 }, (_, i) => `Co${i}`).join("\n");
    await page.locator("textarea#accounts").fill(big);
    await page.getByRole("button", { name: /score accounts/i }).click();
    await expect(page.getByRole("alert")).toContainText(/40 or fewer/i);
  });
});
