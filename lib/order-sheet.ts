import type { OrderWithItems, Settings } from "./types";

function money(n: number) {
  return n.toFixed(2);
}

function shipLabel(order: OrderWithItems) {
  return order.delivery_type === "pickup" ? "Collection" : "Delivery";
}

export function orderSheetText(order: OrderWithItems, settings: Settings) {
  const lines = [
    `======== ${settings.company_name} · Kitchen sheet ========`,
    `Order no.: ${order.order_no}`,
    `Status: ${order.status}`,
    `Placed: ${order.created_at}`,
    `Sent to kitchen: ${order.factory_sent_at || "(not sent yet)"}`,
    "",
    `Customer: ${order.customer_name}`,
    `Phone: ${order.customer_phone}`,
    `Fulfilment: ${shipLabel(order)}`,
    `Address: ${order.address || "-"}`,
    `Notes: ${order.notes || "None"}`,
    "",
    "---- Items ----",
  ];
  order.items.forEach((it, i) => {
    lines.push(
      `${i + 1}. ${it.product_name}  SKU ${it.sku}  ${it.qty} ${it.unit}  unit S$${money(it.unit_price)}  line S$${money(it.unit_price * it.qty)}`
    );
  });
  lines.push("", `Total S$${money(order.total)}`);
  lines.push("", `Kitchen email: ${settings.factory_email}`);
  lines.push("Please pack to the line items. Keep chilled and ambient goods separate.");
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
        <td>S$${money(it.unit_price)}</td>
        <td>S$${money(it.unit_price * it.qty)}</td>
      </tr>`
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Kitchen sheet ${order.order_no}</title>
  <style>
    body { font-family: "Noto Sans", "Helvetica Neue", Arial, sans-serif; color: #12221e; margin: 32px; }
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
  <button onclick="window.print()">Print</button>
  <h1>${escapeHtml(settings.company_name)} · Kitchen sheet</h1>
  <div class="sub">Pack to the line items. Keep chilled and ambient goods separate. Order ${escapeHtml(order.order_no)}</div>
  <div class="grid">
    <div>Order no.: ${escapeHtml(order.order_no)}</div>
    <div>Status: ${escapeHtml(order.status)}</div>
    <div>Customer: ${escapeHtml(order.customer_name)}</div>
    <div>Phone: ${escapeHtml(order.customer_phone)}</div>
    <div>Fulfilment: ${escapeHtml(shipLabel(order))}</div>
    <div>Placed: ${escapeHtml(order.created_at)}</div>
    <div>Address: ${escapeHtml(order.address || "-")}</div>
    <div>Kitchen email: ${escapeHtml(settings.factory_email)}</div>
  </div>
  <p>Notes: ${escapeHtml(order.notes || "None")}</p>
  <table>
    <thead>
      <tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Line</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total S$${money(order.total)}</div>
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
