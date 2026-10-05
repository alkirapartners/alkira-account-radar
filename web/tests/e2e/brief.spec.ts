import { expect, test } from "@playwright/test";

import { MISSING_BRIEF, RICH_BRIEF, SPANISH_BRIEF, SPARSE_BRIEF, generateBrief } from "./helpers";

test.describe("generating a brief", () => {
  test("writes a brief and opens its own page", async ({ page }) => {
    const id = await generateBrief(page, "Acme Robotics");

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    await expect(page).toHaveTitle("Alkira | Acme Robotics");
    await expect(page.getByRole("img", { name: /Alkira Fit 4 of 5, strong fit/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conversation Starters" })).toBeVisible();
  });

  test("lists the new brief first on the home page", async ({ page }) => {
    await generateBrief(page, "Listed First Ltd");

    await page.goto("/");

    await expect(page.getByRole("listitem").filter({ hasText: "Listed First Ltd" }).first()).toBeVisible();
    await expect(page.locator("main ul li").first()).toContainText("Listed First Ltd");
  });

  test("can be done from the keyboard alone", async ({ page }) => {
    await page.goto("/");
    // The library arriving means the page is interactive, not just painted.
    await page.getByRole("link", { name: /Northwind Logistics/ }).first().waitFor();

    await page.keyboard.press("/");
    await expect(page.getByLabel("Company")).toBeFocused();
    await page.keyboard.type("Keyboard Only Inc");
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { level: 1, name: "Keyboard Only Inc" })).toBeVisible();
  });

  test("asks for a name instead of spending a generation on nothing", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: /generate brief/i }).click();

    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Enter a company name.");
    await expect(page).toHaveURL("/");
  });

  test("marks research that was reused", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Company").fill("reuse");
    await page.getByRole("button", { name: /generate brief/i }).click();

    await expect(page.getByText(/Reused research from/)).toBeVisible();
    await expect(page).toHaveURL(/\?reused=\d{4}-\d{2}-\d{2}$/);
  });
});

test.describe("when generation does not finish", () => {
  for (const { company, message } of [
    { company: "fail", message: /Something went wrong while writing this brief/ },
    { company: "drop", message: /The connection dropped\. Your brief may still finish/ },
    { company: "busy", message: /already being written for you/ },
    { company: "limit", message: /reached today's limit/ },
  ]) {
    test(`"${company}" explains what happened and keeps the form ready`, async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Company").fill(company);
      await page.getByRole("button", { name: /generate brief/i }).click();

      await expect(page.getByRole("main").getByRole("alert")).toContainText(message);
      await expect(page.getByLabel("Company")).toHaveValue(company);
      await expect(page.getByRole("button", { name: /generate brief/i })).toBeEnabled();
      await expect(page).toHaveURL("/");
    });
  }
});

test.describe("the library", () => {
  test("search and sort live in the address, and survive opening a brief and coming back", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Search your briefs").fill("meridian");
    await page.getByRole("radio", { name: "Highest fit" }).click();

    await expect(page).toHaveURL(/q=meridian/);
    await expect(page).toHaveURL(/sort=fit/);
    await expect(page.locator("main ul li")).toHaveCount(1);

    await page.getByRole("link", { name: /Meridian Health Partners/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Meridian Health Partners" })).toBeVisible();
    await page.goBack();

    await expect(page.getByLabel("Search your briefs")).toHaveValue("meridian");
    await expect(page.getByRole("radio", { name: "Highest fit" })).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("main ul li")).toHaveCount(1);
  });

  test("says so when nothing matches, and clears in one click", async ({ page }) => {
    await page.goto("/?q=zzzznothing");

    await expect(page.getByText(/No briefs match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();

    await expect(page.getByRole("link", { name: /Northwind Logistics/ }).first()).toBeVisible();
    await expect(page).not.toHaveURL(/q=/);
  });

  test("a company linked from the radar lands in the field without generating", async ({ page }) => {
    await page.goto("/?company=Wayne+Enterprises&domain=wayne.com");

    await expect(page.getByLabel("Company")).toHaveValue("Wayne Enterprises");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /generate brief/i })).toBeEnabled();
  });
});

test.describe("a brief's page", () => {
  test("downloads the PDF from the API", async ({ page, request }) => {
    await page.goto(`/briefs/${RICH_BRIEF}`);
    const link = page.getByRole("link", { name: /download pdf/i }).first();

    await expect(link).toHaveAttribute("href", `/api/brief/briefs/${RICH_BRIEF}/pdf`);
    const response = await request.get(`/api/brief/briefs/${RICH_BRIEF}/pdf`);
    expect(response.headers()["content-type"]).toBe("application/pdf");
    expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
  });

  test("copies a conversation starter", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/briefs/${RICH_BRIEF}`);

    await page.getByRole("button", { name: "Copy question 1" }).click();

    await expect(page.getByRole("status").filter({ hasText: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("MPLS contracts ending in 2027");
  });

  test("reads in Spanish when the brief is Spanish", async ({ page }) => {
    await page.goto(`/briefs/${SPANISH_BRIEF}`);

    await expect(page.getByRole("heading", { name: "Ajuste Alkira" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Temas de Conversación" })).toBeVisible();
  });

  test("closes up around missing sections instead of showing empty tiles", async ({ page }) => {
    await page.goto(`/briefs/${SPARSE_BRIEF}`);

    await expect(page.getByRole("heading", { level: 1, name: "Zzyx Holdings" })).toBeVisible();
    await expect(page.getByText("Not scored")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Conversation Starters" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "References" })).toHaveCount(0);
  });

  test("says so when the brief does not exist, with a way back", async ({ page }) => {
    await page.goto(`/briefs/${MISSING_BRIEF}`);

    await expect(page.getByText("This brief isn't here")).toBeVisible();
    await page.getByRole("link", { name: "Back to your briefs" }).click();
    await expect(page).toHaveURL("/");
  });

  test("updating replaces the brief with freshly researched one", async ({ page }) => {
    const oldId = await generateBrief(page, "Update Me Corp");

    await page.getByRole("button", { name: /update brief/i }).first().click();

    await page.waitForURL((url) => /\/briefs\/[0-9a-f-]{36}/.test(url.pathname) && !url.pathname.endsWith(oldId));
    await expect(page.getByRole("heading", { level: 1, name: "Update Me Corp" })).toBeVisible();
    await page.goto(`/briefs/${oldId}`);
    await expect(page.getByText("This brief isn't here")).toBeVisible();
  });

  test("deleting asks first, and cancelling keeps the brief", async ({ page }) => {
    const id = await generateBrief(page, "Keep Me LLC");

    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("menuitem", { name: /delete brief/i }).click();
    await expect(page.getByRole("dialog", { name: "Delete this brief?" })).toContainText("Keep Me LLC");
    await page.getByRole("button", { name: "Cancel" }).click();

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Keep Me LLC" })).toBeVisible();
    expect(page.url()).toContain(id);
  });

  test("deleting removes it from the list and confirms", async ({ page }) => {
    await generateBrief(page, "Delete Me GmbH");

    await page.getByRole("button", { name: "More actions" }).first().click();
    await page.getByRole("menuitem", { name: /delete brief/i }).click();
    await page.getByRole("button", { name: "Delete brief" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByRole("status").filter({ hasText: "Brief deleted" })).toBeVisible();
    await expect(page.getByText("Delete Me GmbH")).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Delete Me GmbH")).toHaveCount(0);
  });
});
