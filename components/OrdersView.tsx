"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderBadge } from "./StatusBadge";
import { formatDateTime } from "@/lib/time";
import type { OrderStatus, OrderWithItems } from "@/lib/types";

const FILTERS: Array<OrderStatus | "All"> = ["All", "Pending", "Confirmed", "Sent to kitchen", "Completed", "Cancelled"];

export function OrdersView() {
  const [rows, setRows] = useState<OrderWithItems[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "All">("All");

  async function load() {
    const res = await fetch("/api/orders", { cache: "no-store" });
    setRows(await res.json());
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  const shown = filter === "All" ? rows : rows.filter((o) => o.status === filter);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="mt-1 text-sm text-ink-700/70">Orders Hong confirmed with the customer. Send them to the kitchen from here.</p>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs ${
              filter === f ? "bg-ink-900 text-white" : "bg-white text-ink-700 ring-1 ring-ink-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs text-ink-700">
            <tr>
              {["No.", "Customer", "Items", "Total", "Status", "When", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((o) => (
              <tr key={o.id} className="border-t border-ink-50">
                <td className="px-4 py-3 font-mono text-xs font-medium">{o.order_no}</td>
                <td className="px-4 py-3">
                  <div>{o.customer_name}</div>
                  <div className="text-xs text-ink-700/70">{o.customer_phone}</div>
                </td>
                <td className="px-4 py-3 text-xs">
                  {o.items.map((i) => `${i.product_name} × ${i.qty}`).join(", ")}
                </td>
                <td className="px-4 py-3">S${o.total.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <OrderBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-xs text-ink-700/70">{formatDateTime(o.created_at)}</td>
                <td className="px-4 py-3">
                  <Link href={`/orders/${o.id}`} className="text-brand-700">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-ink-700/60">
                  No orders yet. Use the customer simulator on the inbox page.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
