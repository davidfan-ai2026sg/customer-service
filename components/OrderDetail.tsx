"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/time";
import type { OrderStatus, OrderWithItems } from "@/lib/types";

const STATUSES: OrderStatus[] = ["Pending", "Confirmed", "Sent to kitchen", "Completed", "Cancelled"];

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
      setEmailMsg(data.error || "Failed");
      return;
    }
    setOrder(data.order);
    setSheet(data.sheetText);
    if (data.email?.sent) setEmailMsg(`Sent (${data.email.via}) to the kitchen email.`);
    else setEmailMsg(data.email?.error || "Email is not configured. Copy or print the kitchen sheet.");
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
    a.download = order.order_no + "-kitchen.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!order) return <div className="p-8 text-sm text-ink-700">Loading…</div>;

  return (
    <div className="p-8">
      <Link href="/orders" className="text-sm text-brand-700">
        ← Back to orders
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
            Send to kitchen
          </button>
          <Link
            href={`/orders/${order.id}/print`}
            target="_blank"
            className="rounded-xl bg-ink-900 px-4 py-2 text-sm font-medium text-white"
          >
            Print kitchen sheet
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="text-sm font-semibold">Customer</div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row k="Name" v={order.customer_name} />
            <Row k="Phone" v={order.customer_phone} />
            <Row k="Method" v={order.delivery_type === "pickup" ? "Collection" : "Delivery"} />
            <Row k="Address" v={order.address || "-"} />
            <Row k="Notes" v={order.notes || "None"} />
            <Row k="Placed" v={formatDateTime(order.created_at)} />
            <Row k="Kitchen" v={order.factory_sent_at ? formatDateTime(order.factory_sent_at) : "Not sent yet"} />
          </dl>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="text-sm font-semibold">Items</div>
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
                  <td className="py-2 text-right">S${(it.unit_price * it.qty).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 text-right text-base font-semibold">Total S${order.total.toFixed(2)}</div>
        </div>
      </div>

      {(sheet || emailMsg) && (
        <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Kitchen sheet</div>
            <button onClick={copySheet} className="text-sm text-brand-700">
              {copied ? "Copied" : "Copy text"}
            </button>
            <button onClick={downloadSheet} className="text-sm text-brand-700">
              Download
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
