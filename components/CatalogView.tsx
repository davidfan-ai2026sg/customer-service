"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";

const empty = {
  name: "",
  sku: "",
  price: 0,
  unit: "tin",
  moq: 1,
  description: "",
  in_stock: 1,
  category: "Snacks",
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
      setErr("Could not save. Check the SKU is unique.");
      return;
    }
    setEditing(null);
    await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Catalogue</h1>
          <p className="mt-1 text-sm text-ink-700/70">Prices, stock and names are what Hong quotes to customers.</p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Add product
        </button>
      </div>

      {editing && (
        <div className="mb-6 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
          <div className="mb-3 text-sm font-semibold">{editing.id ? "Edit product" : "Add product"}</div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Name">
              <input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <Field label="SKU">
              <input value={editing.sku || ""} onChange={(e) => setEditing({ ...editing, sku: e.target.value })} />
            </Field>
            <Field label="Price (S$)">
              <input
                type="number"
                value={editing.price ?? 0}
                onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
              />
            </Field>
            <Field label="Unit">
              <input value={editing.unit || ""} onChange={(e) => setEditing({ ...editing, unit: e.target.value })} />
            </Field>
            <Field label="Min qty">
              <input
                type="number"
                value={editing.moq ?? 1}
                onChange={(e) => setEditing({ ...editing, moq: Number(e.target.value) })}
              />
            </Field>
            <Field label="Category">
              <input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
            </Field>
            <Field label="Aliases (comma-separated)">
              <input value={editing.aliases || ""} onChange={(e) => setEditing({ ...editing, aliases: e.target.value })} />
            </Field>
            <Field label="Stock">
              <select
                value={editing.in_stock ? "1" : "0"}
                onChange={(e) => setEditing({ ...editing, in_stock: e.target.value === "1" ? 1 : 0 })}
              >
                <option value="1">In stock</option>
                <option value="0">Sold out</option>
              </select>
            </Field>
            <div className="col-span-2 md:col-span-4">
              <Field label="Description">
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
              Save
            </button>
            <button onClick={() => setEditing(null)} className="rounded-lg bg-ink-50 px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink-50 text-xs text-ink-700">
            <tr>
              {["Product", "SKU", "Category", "Price", "Min", "Stock", "Actions"].map((h) => (
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
                  S${p.price.toFixed(2)}/{p.unit}
                </td>
                <td className="px-4 py-3">
                  {p.moq}
                  {p.unit}
                </td>
                <td className="px-4 py-3">{p.in_stock ? "In stock" : "Sold out"}</td>
                <td className="px-4 py-3">
                  <button className="mr-2 text-brand-700" onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  <button className="text-red-600" onClick={() => remove(p.id)}>
                    Delete
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
