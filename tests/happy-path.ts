import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseSgPhone } from "../lib/bot";

const tmp = path.join(os.tmpdir(), `auntyhong-test-${Date.now()}.db`);
process.env.DATABASE_PATH = tmp;

async function main() {
  const dbMod = await import("../lib/db");
  const { processDeterministic } = await import("../lib/pipeline");

  dbMod.resetDbForTests();
  const conv = dbMod.findDemoConversation();
  const expectedPhone = parseSgPhone("+65 9123 4567");
  assert.ok(expectedPhone, "parseSgPhone should accept +65 9123 4567");

  const log: string[] = [];
  function say(text: string) {
    const replies = processDeterministic(conv.id, text);
    log.push(`U: ${text}`);
    for (const r of replies) log.push(`B: ${r}`);
    return replies;
  }

  const r1 = say("how much are the shrimp fries?");
  assert.ok(
    r1.some((t) => /shrimp fries/i.test(t) && t.includes("22")),
    `should quote shrimp fries at 22, got: ${r1.join(" | ")}`
  );

  say("place an order");
  say("gold tin");
  const rQty = say("3");
  assert.ok(
    rQty.some((t) => t.includes("Added") && t.includes("3")),
    `should add to cart, got: ${rQty.join(" | ")}`
  );

  say("no");
  say("delivery");
  say("Priya Tan");
  say("+65 9123 4567");
  say("12 Marina Boulevard");
  say("none");
  const rDone = say("confirm");
  assert.ok(
    rDone.some((t) => t.includes("Order submitted")),
    `should create order, got: ${rDone.join(" | ")}`
  );

  const stored = dbMod.getConversation(conv.id);
  assert.equal(stored?.customer_phone, expectedPhone);

  const orders = dbMod.listOrders();
  const created = orders.find((o) => o.customer_phone === expectedPhone && o.status === "Pending");
  assert.ok(created, "order should appear in the list");
  assert.equal(created!.items.length, 1);
  assert.equal(created!.items[0].sku, "SQ0179319");
  assert.equal(created!.items[0].qty, 3);
  assert.equal(created!.total, 66);
  assert.equal(created!.delivery_type, "delivery");
  assert.match(created!.order_no, /^AH/);
  assert.equal(created!.customer_phone, expectedPhone);

  const factory = dbMod.markFactorySent(created!.id)!;
  assert.equal(factory.status, "Sent to kitchen");
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
