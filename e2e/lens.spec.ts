import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Lens", () => {
  test("uploads sample nginx log, navigates to query, and shows results", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByText(/Your log files never leave your browser/i)
    ).toBeVisible();

    const samplePath = path.join(__dirname, "../public/sample.log");
    await page.locator('input[type="file"]').setInputFiles(samplePath);

    await page.waitForURL("**/query**", { timeout: 60_000 });

    await expect(page.getByText(/nginx access log/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Status breakdown" }).click();

    await expect(page.locator("table")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("tbody tr").first()).toBeVisible();
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
});
