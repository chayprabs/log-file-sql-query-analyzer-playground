import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Lens", () => {
  test("uploads sample nginx log, navigates to query, and shows results", async ({
    page,
  }) => {
    const cdnUrls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("sql.js.org")) {
        cdnUrls.push(request.url());
      }
    });

    await page.goto("/");

    await expect(
      page.getByText(/Your log files never leave your browser/i)
    ).toBeVisible();

    const samplePath = path.join(__dirname, "../public/sample.log");
    await page.locator('input[type="file"]').setInputFiles(samplePath);

    await page.waitForURL("**/query**", { timeout: 60_000 });

    await expect(page.getByText(/nginx access log/i).first()).toBeVisible();

    expect(cdnUrls).toEqual([]);

    await page.getByRole("button", { name: "Status breakdown" }).click();

    await expect(page.locator("table")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("exports query results as CSV", async ({ page }) => {
    await page.goto("/");
    const samplePath = path.join(__dirname, "../public/sample.log");
    await page.locator('input[type="file"]').setInputFiles(samplePath);
    await page.waitForURL("**/query**", { timeout: 60_000 });
    await page.getByRole("button", { name: "Status breakdown" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 30_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toBe("query-results.csv");
    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();
    const text = fs.readFileSync(savedPath!, "utf8");
    expect(text).toContain("status");
    expect(text).toMatch(/\d+/);
  });

  test("legal and credits pages load", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy/i })).toBeVisible();

    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();

    await page.goto("/credits");
    await expect(page.getByRole("heading", { name: /credits/i })).toBeVisible();
  });

  test("rejects a binary file with a clear message", async ({ page }) => {
    await page.goto("/");

    await page.locator('input[type="file"]').setInputFiles({
      name: "binary.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0x00, 0xff, 0xd8, 0xff]),
    });

    await expect(
      page.getByText(/This does not appear to be a text file/i)
    ).toBeVisible({ timeout: 30_000 });
  });

  test("confirms before replacing the current file", async ({ page }) => {
    page.on("dialog", (dialog) => {
      void dialog.accept();
    });

    await page.goto("/");
    const samplePath = path.join(__dirname, "../public/sample.log");
    await page.locator('input[type="file"]').setInputFiles(samplePath);
    await page.waitForURL("**/query**", { timeout: 60_000 });

    await page.getByRole("link", { name: "Home" }).click();
    await page.waitForURL("**/", { timeout: 15_000 });

    await page.locator('input[type="file"]').setInputFiles({
      name: "lines.jsonl",
      mimeType: "application/json",
      buffer: Buffer.from('{"level":"info","message":"e2e"}\n'),
    });

    await page.waitForURL("**/query**", { timeout: 60_000 });
    await expect(page.getByText(/JSON lines/i).first()).toBeVisible();
  });
});
