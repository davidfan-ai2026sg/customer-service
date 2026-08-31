"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/time";
import type { OrderStatus, OrderWithItems } from "@/lib/types";

const STATUSES: OrderStatus[] = ["待确认", "已确认", "已发工厂", "已完成", "已取消"];

export function OrderDetail({ id }: { id: number }) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [sheet, setSheet] = useState("");
  const [emailMsg, setEmailMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) setOrder(await res.json());
  }
  useEffect(() => {
    load();
  }, [id]);

  async function setStatus(status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setOrder(await res.json());
  }

  async function sendFactory() {
    setEmailMsg("");
    const res = await fetch(`/api/orders/${id}/factory`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setEmailMsg(data.error || "失败");
      return;
    }
    setOrder(data.order);
    setSheet(data.sheetText);
    if (data.email?.sent) setEmailMsg(`已发信（${data.email.via}）到工厂邮箱。`);
    else setEmailMsg(data.email?.error || "未配置邮件，请复制或打印生产通知单。");
  }

  async function copySheet() {
    if (!sheet) return;
    await navigator.clipboard.writeText(sheet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function downloadSheet() {
    if (!sheet || !order) return;
    const blob = new Blob([sheet], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = order.order_no + "-factory.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!order) return <div className="p-8 text-sm text-ink-700">加载中…</div>;

  return (
    <div className="p-8">
      <Link href="/orders" className="text-sm text-brand-700">
        ← 返回订单列表
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{order.order_no}</h1>
          <div className="mt-2">
            <OrderBadge status={order.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={order.status}
            onChange={(e) => setStatus(e.target.value as OrderStatus)}
            className="rounded-xl border border-ink-100 bg-white px-3 py-2 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={sendFactory}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            发给工厂
          </button>
          <Link
            href={`/orders/${order.id}/print`}
            target="_blank"
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white"
          >
            打印通知单
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="text-sm font-semibold">客户</div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="名称" v={order.customer_name} />
            <Row k="电话" v={order.customer_phone} />
            <Row k="方式" v={order.delivery_type === "pickup" ? "工厂自提" : "物流配送"} />
            <Row k="地址" v={order.address || "-"} />
            <Row k="备注" v={order.notes || "无"} />
            <Row k="下单" v={formatDateTime(order.created_at)} />
            <Row k="发工厂" v={order.factory_sent_at ? formatDateTime(order.factory_sent_at) : "尚未发送"} />
          </dl>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="text-sm font-semibold">明细</div>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-t border-ink-50">
                  <td className="py-2">
                    {it.product_name}
                    <div className="text-xs text-ink-700/60">{it.sku}</div>
                  </td>
                  <td className="py-2 text-right">
                    {it.qty}
                    {it.unit}
                  </td>
                  <td className="py-2 text-right">¥{(it.unit_price * it.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-right text-base font-semibold">合计 ¥{order.total.toFixed(2)}</div>
        </div>
      </div>

      {(sheet || emailMsg) && (
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">生产通知单</div>
            <button onClick={copySheet} className="text-sm text-brand-700">
              {copied ? "已复制" : "复制文本"}</button>
            <button onClick={downloadSheet} className="text-sm text-brand-700">
              下载
            </button>
          </div>
          {emailMsg && <p className="mt-2 text-sm text-ink-700">{emailMsg}</p>}
          {sheet && (
            <pre className="mt-3 overflow-auto rounded-xl bg-ink-50 p-4 text-xs leading-6">{sheet}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-ink-700/60">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
