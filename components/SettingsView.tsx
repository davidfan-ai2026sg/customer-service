"use client";

import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";

export function SettingsView() {
  const [form, setForm] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [health, setHealth] = useState<{ whatsapp: boolean; email: boolean; llm: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(setForm);
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth);
  }, []);

  async function save() {
    if (!form) return;
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm(await res.json());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (!form) return <div className="p-8 text-sm">Loading…</div>;

  const fields: Array<{ key: keyof Settings; label: string; rows?: number }> = [
    { key: "company_name", label: "Company name" },
    { key: "factory_email", label: "Kitchen email" },
    { key: "business_hours", label: "Hours" },
    { key: "greeting", label: "Greeting", rows: 6 },
    { key: "lead_time", label: "Lead time", rows: 3 },
    { key: "delivery_info", label: "Delivery", rows: 3 },
    { key: "pickup_info", label: "Collection", rows: 3 },
    { key: "payment_info", label: "Payment", rows: 3 },
  ];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-ink-700/70">These go into Hong’s replies and the kitchen sheet.</p>

      {health && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Pill ok={health.whatsapp} on="WhatsApp Cloud connected" off="WhatsApp not configured (simulator still works)" />
          <Pill ok={health.email} on="Kitchen email channel configured" off="Email not configured (you can still print the kitchen sheet)" />
          <Pill ok={health.llm} on="LLM polish on" off="LLM not configured (catalogue keyword matching)" />
        </div>
      )}

      <div className="mt-6 space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-card">
        {fields.map((f) => (
          <label key={String(f.key)} className="block text-sm">
            <span className="text-ink-700">{f.label}</span>
            {f.rows ? (
              <textarea
                rows={f.rows}
                className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm"
                value={String(form[f.key] ?? "")}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            ) : (
              <input
                className="mt-1 w-full rounded-xl border border-ink-100 px-3 py-2 text-sm"
                value={String(form[f.key] ?? "")}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <button onClick={save} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white">
          {saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Pill({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${ok ? "bg-brand-50 text-brand-800" : "bg-ink-50 text-ink-700"}`}>
      {ok ? on : off}
    </div>
  );
}
