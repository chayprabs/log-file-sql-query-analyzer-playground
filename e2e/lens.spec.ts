import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Lens", () => {
  test("try sample log runs SQL on home workspace", async ({ page }) => {
    const cdnUrls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("sql.js.org")) {
        cdnUrls.push(request.url());
      }
    });

    await page.goto("/");

    await page.getByRole("button", { name: "Try sample log" }).click();
    await expect(page.locator("#workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/nginx access log/i).first()).toBeVisible();
    expect(cdnUrls).toEqual([]);

    await expect(page.locator("table tbody tr").first()).toBeVisible({
      timeout: 30_000,
    });
  });

  test("uploads file and shows query workspace", async ({ page }) => {
    await page.goto("/");
    const samplePath = path.join(__dirname, "../public/sample.log");
    await page.locator('input[type="file"]').first().setInputFiles(samplePath);
    await expect(page.locator("#workspace")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Status breakdown" }).click();
    await expect(page.locator("tbody tr").first()).toBeVisible({ timeout: 30_000 });
  });

  test("exports query results as CSV", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Try sample log" }).click();
    await expect(page.locator("#workspace")).toBeVisible({ timeout: 60_000 });
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

  test("legal and help pages load", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();

    await page.goto("/terms");
    await expect(
      page.getByRole("heading", { name: /terms & conditions/i })
    ).toBeVisible();

    await page.goto("/help");
    await expect(page.getByRole("heading", { name: /help & faq/i })).toBeVisible();
  });

  test("rejects a binary file with a clear message", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "binary.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0x00, 0xff, 0xd8, 0xff]),
    });
    await expect(
      page.getByText(/This does not appear to be a text file/i)
    ).toBeVisible({ timeout: 30_000 });
  });

  test("parses JSON lines format", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles({
      name: "app.jsonl",
      mimeType: "application/json",
      buffer: Buffer.from(
        '{"level":"info","message":"started","user_id":1}\n{"level":"error","message":"failed","user_id":2}\n'
      ),
    });
    await expect(page.locator("#workspace")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/JSON lines/i).first()).toBeVisible();
  });

  test("confirms before replacing the current file", async ({ page }) => {
    page.on("dialog", (dialog) => void dialog.accept());

    await page.goto("/");
    await page.getByRole("button", { name: "Try sample log" }).click();
    await expect(page.locator("#workspace")).toBeVisible({ timeout: 60_000 });

    await page.getByRole("button", { name: "Load another file" }).click();
    await page.locator('input[type="file"]').last().setInputFiles({
      name: "lines.jsonl",
      mimeType: "application/json",
      buffer: Buffer.from('{"level":"info","message":"e2e"}\n'),
    });

    await expect(page.getByText(/JSON lines/i).first()).toBeVisible({
      timeout: 60_000,
    });
  });
});
