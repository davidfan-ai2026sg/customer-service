import { expect, test } from "@playwright/test";

test("ask product, place order, see it in dashboard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByText("Customer simulator")).toBeVisible();

  const box = page.getByPlaceholder("Type a message");
  async function customer(text: string) {
    await box.fill(text);
    await box.press("Enter");
    await page.waitForTimeout(400);
  }

  await customer("how much are the shrimp fries?");
  await expect(page.locator("text=shrimp fries").first()).toBeVisible({ timeout: 15_000 });

  await customer("place an order");
  await customer("gold tin");
  await customer("3");
  await customer("no");
  await customer("delivery");
  await customer("Priya Tan");
  await customer("+65 9123 4567");
  await customer("12 Marina Boulevard");
  await customer("none");
  await customer("confirm");

  await expect(page.locator("text=Order submitted").first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/orders");
  await expect(page.getByText("shrimp fries").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Pending").first()).toBeVisible();
});
