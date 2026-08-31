"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

const empty = {
  name: "",
  sku: "",
  price: 0,
  unit: "瓶",
  moq: 1,
  description: "",
  in_stock: 1,
  category: "调味汁",
  aliases: "",
};

export function CatalogView() {
  const [rows, setRows] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [err, setErr] = useState("");

  async function load() {
    const res = await fetch("/api/products", { cache: "no-store" });
    setRows(await res.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    setErr("");
    const isNew = !editing.id;
    const res = await fetch(isNew ? "/api/products" : `/api/products/${editing.id}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (!res.ok) {
      setErr("保存失败，请检查 SKU 是否重复。");
      return;
    }
    setEditing(null);
    await load();
  }

  async function remove(id: number) {
    if (!confirm("确定删除该商品？")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">商品目录</h1>
          <p className="mt-1 text-sm text-ink-700/70">价格、起订量与库存会直接被客服机器人引用。</p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          新增商品
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="mb-3 text-sm font-semibold">{editing.id ? "编辑商品" : "新增商品"}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="名称">
              <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <input value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
            </Field>
            <Field label="单价">
              <input
                type="number"
                value={editing.price ?? 0}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="单位">
              <input value={editing.unit || ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </Field>
            <Field label="起订量">
              <input
                type="number"
                value={editing.moq ?? 1}
                onChange={(e) => setEditing({ ...editing, moq: Number(e.target.value) })}
              />
            </Field>
            <Field label="分类">
              <input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
            <Field label="别名（逗号分隔）">
              <input value={editing.aliases || ""} onChange={(e) => setEditing({ ...editing, aliases: e.target.value })} />
            </Field>
            <Field label="库存">
              <select
                value={editing.in_stock ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, in_stock: e.target.value === "1" ? 1 : 0 })}
              >
                <option value="1">现货</option>
                <option value="0">缺货</option>
              </select>
            </Field>
            <div className="col-span-2 md:col-span-4">
              <Field label="描述">
                <textarea
                  rows={2}
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
            </div>
          </div>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white">
              保存
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg bg-ink-50 px-4 py-2 text-sm">
              取消
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs text-ink-700">
            <tr>
              {["商品", "SKU", "分类", "价格", "起订", "库存", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-ink-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-ink-700/70">{p.description}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-3">{p.category}</td>
                <td className="px-4 py-3">
                  ¥{p.price}/{p.unit}
                </td>
                <td className="px-4 py-3">
                  {p.moq}
                  {p.unit}
                </td>
                <td className="px-4 py-3">{p.in_stock ? "现货" : "缺货"}</td>
                <td className="px-4 py-3">
                  <button className="mr-2 text-brand-700" onClick={() => setEditing(p)}>
                    编辑
                  </button>
                  <button className="text-red-600" onClick={() => remove(p.id)}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-ink-700">
      {label}
      <div className="mt-1 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-ink-100 [&_input]:px-2.5 [&_input]:py-2 [&_input]:text-sm [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-ink-100 [&_select]:px-2.5 [&_select]:py-2 [&_select]:text-sm [&_textarea]:w-full [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-ink-100 [&_textarea]:px-2.5 [&_textarea]:py-2 [&_textarea]:text-sm">
        {children}
      </div>
    </label>
  );
}
