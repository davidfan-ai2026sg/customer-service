import { notFound } from "next/navigation";
import { getOrder, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) notFound();
  const settings = getSettings();
  const ship = order.delivery_type === "pickup" ? "Collection" : "Delivery";

  return (
    <div className="mx-auto max-w-3xl bg-white p-10">
      <p className="no-print mb-6 text-sm text-ink-700/70">Use the browser print menu, or press Ctrl / Cmd + P.</p>
      <h1 className="text-xl font-semibold">
        {settings.company_name} · Kitchen sheet
      </h1>
      <p className="mt-1 text-sm text-ink-700/70">Order {order.order_no}</p>
      <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
        <div>Status: {order.status}</div>
        <div>Placed: {order.created_at}</div>
        <div>Customer: {order.customer_name}</div>
        <div>Phone: {order.customer_phone}</div>
        <div>Fulfilment: {ship}</div>
        <div>Kitchen email: {settings.factory_email}</div>
        <div className="col-span-2">Address: {order.address || "-"}</div>
        <div className="col-span-2">Notes: {order.notes || "None"}</div>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">#</th>
            <th>Product</th>
            <th>SKU</th>
            <th>Qty</th>
            <th>Unit price</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it, i) => (
            <tr key={it.id} className="border-b border-ink-50">
              <td className="py-2">{i + 1}</td>
              <td>{it.product_name}</td>
              <td>{it.sku}</td>
              <td>
                {it.qty}
                {it.unit}
              </td>
              <td>S${it.unit_price.toFixed(2)}</td>
              <td>S${(it.unit_price * it.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-base font-semibold">Total S${order.total.toFixed(2)}</p>
      <p className="mt-8 text-xs text-ink-700/70">Pack to the line items. Keep chilled and ambient goods separate.</p>
    </div>
  );
}
