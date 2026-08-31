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

  if (!form) return <div className="p-8 text-sm">加载中…</div>;

  const fields: Array<{ key: keyof Settings; label: string; rows?: number }> = [
    { key: "company_name", label: "公司名称" },
    { key: "factory_email", label: "工厂邮箱" },
    { key: "business_hours", label: "营业时间" },
    { key: "greeting", label: "欢迎语（机器人）", rows: 6 },
    { key: "lead_time", label: "交期说明", rows: 3 },
    { key: "delivery_info", label: "配送说明", rows: 3 },
    { key: "pickup_info", label: "自提说明", rows: 3 },
    { key: "payment_info", label: "付款说明", rows: 3 },
  ];

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">公司设置</h1>
      <p className="mt-1 text-sm text-ink-700/70">这些内容会进入机器人回复与工厂通知单。</p>

      {health && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
          <Pill ok={health.whatsapp} on="WhatsApp Cloud 已连接" off="WhatsApp 未配置（演示可用）" />
          <Pill ok={health.email} on="工厂邮件通道已配置" off="未配置邮件（仍可打印通知单）" />
          <Pill ok={health.llm} on="LLM 润色已开启" off="未配置 LLM（目录匹配）" />
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
          {saved ? "已保存" : "保存设置"}
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
