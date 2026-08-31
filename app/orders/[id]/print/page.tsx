import { notFound } from "next/navigation";
import { getOrder, getSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = getOrder(Number(id));
  if (!order) notFound();
  const settings = getSettings();
  const ship = order.delivery_type === "pickup" ? "工厂自提" : "物流配送";

  return (
    <div className="mx-auto max-w-3xl bg-white p-10">
      <p className="no-print mb-6 text-sm text-ink-700/70">使用浏览器菜单打印，或按 Ctrl / Cmd + P。</p>
      <h1 className="text-xl font-semibold">
        {settings.company_name} · 工厂生产通知单
      </h1>
      <p className="mt-1 text-sm text-ink-700/70">单号 {order.order_no}</p>
      <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
        <div>状态：{order.status}</div>
        <div>下单：{order.created_at}</div>
        <div>客户：{order.customer_name}</div>
        <div>电话：{order.customer_phone}</div>
        <div>收货：{ship}</div>
        <div>工厂邮箱：{settings.factory_email}</div>
        <div className="col-span-2">地址：{order.address || "-"}</div>
        <div className="col-span-2">备注：{order.notes || "无"}</div>
      </div>
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">#</th>
            <th>商品</th>
            <th>SKU</th>
            <th>数量</th>
            <th>单价</th>
            <th>小计</th>
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
              <td>¥{it.unit_price.toFixed(2)}</td>
              <td>¥{(it.unit_price * it.qty).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-base font-semibold">合计 ¥{order.total.toFixed(2)}</p>
      <p className="mt-8 text-xs text-ink-700/70">请按明细备货 / 排产，冷链与常温请分装。</p>
    </div>
  );
}
