import { expect, test } from "@playwright/test";
const header =
  "customer_id,email,country,signup_date,order_amount,currency,payment_method,order_status,product_category,quantity,discount_percent,last_login_date";
const good =
  "C1,alice@example.com,DE,2026-04-01,125.50,EUR,card,completed,electronics,2,10,2026-04-10";
test("upload, inspect analytics, reopen history, preview and handle failure", async ({
  page,
}, info) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/");
  await page
    .getByLabel("CSV file")
    .setInputFiles({
      name: "portfolio-demo.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        [
          header,
          good,
          good.replace("C1", "C2").replace("125.50", "1500"),
          good.replace("alice@example.com", "invalid"),
        ].join("\n"),
      ),
    });
  await page.getByRole("button", { name: "Upload and Analyze CSV" }).click();
  await expect(
    page.getByRole("heading", { name: "portfolio-demo.csv" }),
  ).toBeVisible();
  // The accepted job survives a refresh while it may still be active.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "portfolio-demo.csv" }),
  ).toBeVisible();
  await expect(page.getByText("33.3% invalid")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "Validation", exact: true }).click();
  await expect(
    page.getByText("email must be valid", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Anomalies", exact: true }).click();
  await expect(page.getByText("High-value order detected.")).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("dashboard.png"),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: /#\d+ · portfolio-demo.csv/ }).click();
  await expect(
    page.getByRole("heading", { name: "portfolio-demo.csv" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate insights" }).click();
  await expect(page.getByRole("alert")).toContainText("LLM not configured");
  await page.getByRole("button", { name: "Preview files" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("customer_id", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByLabel("CSV file")
    .setInputFiles({
      name: "bad-header.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("email\nbad@example.com"),
    });
  await page.getByRole("button", { name: "Upload and Analyze CSV" }).click();
  await expect(
    page.getByRole("heading", { name: "bad-header.csv" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Missing required columns",
    { timeout: 20000 },
  );
  expect(failures).toEqual([]);
});
test("mobile layout has no horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /File Intake/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
