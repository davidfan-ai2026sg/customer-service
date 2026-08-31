import { expect, test } from "@playwright/test";

test("ask product, place order, see it in dashboard", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByText("客户模拟器")).toBeVisible();

  const box = page.getByPlaceholder("输入消息");
  async function customer(text: string) {
    await box.fill(text);
    await box.press("Enter");
    await page.waitForTimeout(400);
  }

  await customer("生抽多少钱？");
  await expect(page.locator("text=味源特级生抽").first()).toBeVisible({ timeout: 15_000 });

  await customer("我要下单");
  await customer("味源特级生抽");
  await customer("48");
  await customer("没有");
  await customer("配送");
  await customer("张三");
  await customer("13800138000");
  await customer("上海市浦东新区张江路 88 号后厨");
  await customer("无");
  await customer("确认");

  await expect(page.locator("text=订单已提交").first()).toBeVisible({ timeout: 15_000 });

  await page.goto("/orders");
  await expect(page.getByText("味源特级生抽").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("待确认").first()).toBeVisible();
});
