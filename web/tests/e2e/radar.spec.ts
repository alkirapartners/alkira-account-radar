import { expect, test } from "@playwright/test";

test.describe("account radar", () => {
  test("scores a pasted list and sorts it with the best fit on top", async ({ page }) => {
    await page.goto("/radar");
    await page.locator("textarea#accounts").fill("Acme\nGlobex\nInitech");
    await page.getByRole("button", { name: /score accounts/i }).click();

    await expect(page.getByText(/of 3 scored/i)).toBeVisible({ timeout: 30_000 });

    const scores = await page
      .getByRole("img", { name: /Fit score \d+ of 10/ })
      .evaluateAll((meters) => meters.map((meter) => Number(/(\d+) of 10/.exec(meter.getAttribute("aria-label") ?? "")?.[1])));
    expect(scores).toHaveLength(3);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  test("hands a scored account to the brief generator, name filled in", async ({ page }) => {
    await page.goto("/radar");
    await page.locator("textarea#accounts").fill("Acme");
    await page.getByRole("button", { name: /score accounts/i }).click();
    await expect(page.getByText(/of 1 scored/i)).toBeVisible({ timeout: 30_000 });

    const handoff = page.getByRole("link", { name: /generate brief/i }).first();
    await expect(handoff).toHaveAttribute("href", /^\/\?company=Acme/);
    await handoff.click();

    await expect(page.getByLabel("Company")).toHaveValue("Acme");
    await expect(page).toHaveURL("/");
  });

  test("refuses more than 40 accounts with a friendly message", async ({ page }) => {
    await page.goto("/radar");
    const tooMany = Array.from({ length: 41 }, (_, index) => `Co${index}`).join("\n");
    await page.locator("textarea#accounts").fill(tooMany);
    await page.getByRole("button", { name: /score accounts/i }).click();

    await expect(page.getByRole("main").getByRole("alert")).toContainText(/40 or fewer/i);
  });

  test("keeps a scored batch and reopens it from history", async ({ page }) => {
    await page.goto("/radar");
    await page.locator("textarea#accounts").fill("Historic One\nHistoric Two");
    await page.getByRole("button", { name: /score accounts/i }).click();
    await expect(page.getByText(/of 2 scored/i)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("navigation", { name: "Past batches" }).getByRole("link").first().click();

    await expect(page).toHaveURL(/\/radar\/batch\/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("2 accounts");
    await expect(page.getByRole("heading", { name: "Historic One" })).toBeVisible();
  });

  test("deletes a single result", async ({ page }) => {
    await page.goto("/radar");
    await page.locator("textarea#accounts").fill("Stays Here\nGoes Away");
    await page.getByRole("button", { name: /score accounts/i }).click();
    await expect(page.getByText(/of 2 scored/i)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Delete result for Goes Away" }).click();

    await expect(page.getByRole("heading", { name: "Goes Away" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Stays Here" })).toBeVisible();
  });
});
