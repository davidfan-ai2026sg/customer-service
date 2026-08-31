import type { OrderWithItems, Settings } from "./types";

function money(n: number) {
  return n.toFixed(2);
}

function shipLabel(order: OrderWithItems) {
  return order.delivery_type === "pickup" ? "工厂自提" : "物流配送";
}

export function orderSheetText(order: OrderWithItems, settings: Settings) {
  const lines = [
    `======== ${settings.company_name} · 工厂生产通知单 ========`,
    `订单号：${order.order_no}`,
    `状态：${order.status}`,
    `下单时间：${order.created_at}`,
    `发给工厂时间：${order.factory_sent_at || "（待发送）"}`,
    "",
    `客户：${order.customer_name}`,
    `电话：${order.customer_phone}`,
    `收货方式：${shipLabel(order)}`,
    `地址：${order.address || "-"}`,
    `备注：${order.notes || "无"}`,
    "",
    "---- 明细 ----",
  ];
  order.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.product_name}  SKU ${it.sku}  ${it.qty}${it.unit}  单价 ${money(it.unit_price)}  小计 ${money(it.unit_price * it.qty)}`
    );
  });
  lines.push("", `合计金额：${money(order.total)} 元`);
  lines.push("", `工厂邮箱：${settings.factory_email}`);
  lines.push("请按明细备货 / 排产，冷链与常温请分装。");
  lines.push("==========================================");
  return lines.join("\n");
}

export function orderSheetHtml(order: OrderWithItems, settings: Settings) {
  const rows = order.items
    .map(
      (it, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(it.product_name)}</td>
        <td>${escapeHtml(it.sku)}</td>
        <td>${it.qty}</td>
        <td>${escapeHtml(it.unit)}</td>
        <td>¥${money(it.unit_price)}</td>
        <td>¥${money(it.unit_price * it.qty)}</td>
      </tr>`
    )
    .join("");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>生产通知单 ${order.order_no}</title>
  <style>
    body { font-family: "Noto Sans SC", "PingFang SC", sans-serif; color: #12221e; margin: 32px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { color: #5b6f69; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; }
    th, td { border: 1px solid #c5d5cf; padding: 8px 10px; font-size: 13px; text-align: left; }
    th { background: #eefbf4; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; font-size: 14px; }
    .total { text-align: right; font-weight: 700; margin-top: 12px; }
    @media print { button { display: none; } body { margin: 12mm; } }
  </style>
</head>
<body>
  <button onclick="window.print()">打印</button>
  <h1>${escapeHtml(settings.company_name)} · 工厂生产通知单</h1>
  <div class="sub">请按明细备货，冷链与常温分装。单号 ${escapeHtml(order.order_no)}</div>
  <div class="grid">
    <div>订单号：${escapeHtml(order.order_no)}</div>
    <div>状态：${escapeHtml(order.status)}</div>
    <div>客户：${escapeHtml(order.customer_name)}</div>
    <div>电话：${escapeHtml(order.customer_phone)}</div>
    <div>收货：${escapeHtml(shipLabel(order))}</div>
    <div>下单：${escapeHtml(order.created_at)}</div>
    <div>地址：${escapeHtml(order.address || "-")}</div>
    <div>工厂邮箱：${escapeHtml(settings.factory_email)}</div>
  </div>
  <p>备注：${escapeHtml(order.notes || "无")}</p>
  <table>
    <thead>
      <tr><th>#</th><th>商品</th><th>SKU</th><th>数量</th><th>单位</th><th>单价</th><th>小计</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">合计：¥${money(order.total)}</div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
