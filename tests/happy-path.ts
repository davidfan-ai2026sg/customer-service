import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = path.join(os.tmpdir(), `weiyuan-test-${Date.now()}.db`);
process.env.DATABASE_PATH = tmp;

async function main() {
  const dbMod = await import("../lib/db");
  const { processDeterministic } = await import("../lib/pipeline");

  dbMod.resetDbForTests();
  const conv = dbMod.findDemoConversation();

  const log: string[] = [];
  function say(text: string) {
    const replies = processDeterministic(conv.id, text);
    log.push(`U: ${text}`);
    for (const r of replies) log.push(`B: ${r}`);
    return replies;
  }

  const r1 = say("生抽多少钱？");
  assert.ok(r1.some((t) => t.includes("味源特级生抽") && t.includes("28")), "应返回生抽价格");

  say("我要下单");
  say("味源特级生抽");
  const rQty = say("48");
  assert.ok(rQty.some((t) => t.includes("已加入") && t.includes("48")), `应加入购物车，实际：${rQty.join(" | ")}`);

  say("没有");
  say("配送");
  say("张三");
  say("13800138000");
  say("上海市浦东新区张江路 88 号后厨");
  say("无");
  const rDone = say("确认");
  assert.ok(rDone.some((t) => t.includes("订单已提交")), `应创建订单，实际：${rDone.join(" | ")}`);

  const orders = dbMod.listOrders();
  const created = orders.find((o) => o.customer_phone === "13800138000" && o.status === "待确认");
  assert.ok(created, "订单应出现在订单列表");
  assert.equal(created!.items.length, 1);
  assert.equal(created!.items[0].sku, "SS-001");
  assert.equal(created!.items[0].qty, 48);
  assert.equal(created!.delivery_type, "delivery");
  assert.match(created!.order_no, /^WY\d{11}$/);

  const factory = dbMod.markFactorySent(created!.id)!;
  assert.equal(factory.status, "已发工厂");
  assert.ok(factory.factory_sent_at);

  console.log("HAPPY_PATH_PASS");
  console.log(`order ${created!.order_no} total ${created!.total}`);
  console.log(log.join("\n"));

  dbMod.getDb().close();
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(tmp + ext);
    } catch {
      /* ignore */
    }
  }
}

main().catch((err) => {
  console.error("HAPPY_PATH_FAIL");
  console.error(err);
  process.exit(1);
});
