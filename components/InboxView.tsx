"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Smartphone, UserRound } from "lucide-react";
import { ConvBadge } from "./StatusBadge";
import { formatTime } from "@/lib/time";
import type { Conversation, Message } from "@/lib/types";

const QUICK = ["你好", "生抽多少钱？", "有哪些产品", "我要下单", "转人工"];

export function InboxView() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [q, setQ] = useState("");
  const [staffText, setStaffText] = useState("");
  const [simText, setSimText] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const res = await fetch("/api/conversations", { cache: "no-store" });
    const data = (await res.json()) as Conversation[];
    setConvs(data);
    setActiveId((id) => id ?? data[0]?.id ?? null);
  }, []);

  const loadThread = useCallback(async (id: number) => {
    const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    const data = await res.json();
    setActive(data.conversation);
    setMessages(data.messages);
  }, []);

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 4000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const t = setInterval(() => loadThread(activeId), 2500);
    return () => clearInterval(t);
  }, [activeId, loadThread]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
    simRef.current?.scrollTo({ top: simRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return convs;
    return convs.filter(
      (c) => c.customer_name.includes(s) || c.customer_phone.includes(s) || c.last_preview.includes(s)
    );
  }, [convs, q]);

  async function sendStaff() {
    if (!activeId || !staffText.trim()) return;
    const text = staffText.trim();
    setStaffText("");
    await fetch(`/api/conversations/${activeId}/takeover`, { method: "POST" });
    await fetch(`/api/conversations/${activeId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    await loadThread(activeId);
    await loadList();
  }

  async function takeover() {
    if (!activeId) return;
    await fetch(`/api/conversations/${activeId}/takeover`, { method: "POST" });
    await loadThread(activeId);
    await loadList();
  }

  async function resume() {
    if (!activeId) return;
    await fetch(`/api/conversations/${activeId}/resume`, { method: "POST" });
    await loadThread(activeId);
    await loadList();
  }

  async function sendSim(textRaw?: string) {
    const text = (textRaw ?? simText).trim();
    if (!text || busy) return;
    setBusy(true);
    setSimText("");
    try {
      await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const demo = convs.find((c) => c.channel === "demo") || convs[0];
      if (demo) {
        setActiveId(demo.id);
        await loadThread(demo.id);
      }
      await loadList();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen">
      <section className="flex w-80 shrink-0 flex-col border-r border-ink-100 bg-white">
        <div className="border-b border-ink-100 px-4 py-4">
          <div className="text-base font-semibold">会话</div>
          <div className="mt-1 text-xs text-ink-700/70">WhatsApp 风格收件箱 · 含演示会话</div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索客户 / 消息"
            className="mt-3 w-full rounded-xl border border-ink-100 bg-ink-50 px-3 py-2 text-sm"
          />
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`flex w-full items-start gap-3 border-b border-ink-50 px-4 py-3 text-left transition ${
                activeId === c.id ? "bg-brand-50" : "hover:bg-ink-50"
              }`}
            >
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  c.channel === "demo" ? "bg-brand-600 text-white" : "bg-ink-800 text-white"
                }`}
              >
                {c.customer_name.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{c.customer_name}</span>
                  <span className="shrink-0 text-[11px] text-ink-700/60">{formatTime(c.last_message_at)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <ConvBadge status={c.status} />
                  {c.channel === "demo" && (
                    <span className="rounded-full bg-ink-50 px-1.5 py-0.5 text-[10px] text-ink-700">模拟器</span>
                  )}
                  {c.unread > 0 && (
                    <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-[10px] text-white">{c.unread}</span>
                  )}
                </div>
                <div className="mt-1 truncate text-xs text-ink-700/70">{c.last_preview}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col bg-white">
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <div>
            <div className="font-semibold">{active?.customer_name || "选择会话"}</div>
            <div className="text-xs text-ink-700/70">
              {active ? `${active.customer_phone || "无号码"} · ${active.channel}` : "—"}
            </div>
          </div>
          {active && (
            <div className="flex items-center gap-2">
              <ConvBadge status={active.status} />
              {active.status === "staff" ? (
                <button
                  onClick={resume}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                >
                  恢复机器人
                </button>
              ) : (
                <button
                  onClick={takeover}
                  className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-ink-800"
                >
                  接管会话
                </button>
              )}
            </div>
          )}
        </header>
        <div ref={threadRef} className="chat-bg scrollbar-thin flex-1 overflow-y-auto px-6 py-4">
          {messages.map((m) => (
            <Bubble key={m.id} m={m} staffRight />
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t border-ink-100 bg-white px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            sendStaff();
          }}
        >
          <input
            value={staffText}
            onChange={(e) => setStaffText(e.target.value)}
            placeholder="以人工身份回复客户（发送后机器人自动暂停）"
            className="flex-1 rounded-xl border border-ink-100 bg-ink-50 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Send size={16} />
            发送
          </button>
        </form>
      </section>

      <section className="flex w-[360px] shrink-0 flex-col border-l border-ink-100 bg-ink-50">
        <div className="border-b border-ink-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone size={16} className="text-brand-700" />
            客户模拟器
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-700/70">
            无需 Meta 凭证。以客户身份发消息，机器人会查目录、收单并写入订单台。
          </p>
        </div>
        <div className="flex flex-1 flex-col p-4">
          <div className="mx-auto flex h-full w-[300px] flex-col overflow-hidden rounded-[28px] border-8 border-ink-900 bg-wa-chat shadow-float">
            <div className="bg-wa-header px-3 py-2 text-white">
              <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/30" />
              <div className="text-sm font-medium">味源食品</div>
              <div className="text-[10px] text-white/80">演示客户 · 在线</div>
            </div>
            <div ref={simRef} className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 py-2">
              {messages
                .filter((m) => active?.channel === "demo")
                .map((m) => (
                  <SimBubble key={m.id} m={m} />
                ))}
              {active?.channel !== "demo" && (
                <div className="p-3 text-center text-xs text-ink-700/70">
                  选择「演示客户」会话，或直接在下方发消息（会自动切到模拟器会话）。
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1 bg-[#f0f2f5] px-2 py-1">
              {QUICK.map((t) => (
                <button
                  key={t}
                  onClick={() => sendSim(t)}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] text-ink-800 ring-1 ring-ink-100 hover:bg-brand-50"
                >
                  {t}
                </button>
              ))}
            </div>
            <form
              className="flex items-center gap-1 bg-[#f0f2f5] p-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendSim();
              }}
            >
              <input
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
                placeholder={busy ? "发送中…" : "输入消息"}
                className="flex-1 rounded-full bg-white px-3 py-1.5 text-xs"
              />
              <button type="submit" className="rounded-full bg-brand-600 p-2 text-white">
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

function Bubble({ m, staffRight }: { m: Message; staffRight: boolean }) {
  const mine = staffRight && m.sender === "staff";
  const isBot = m.sender === "bot";
  return (
    <div className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm leading-6 shadow-sm ${
          mine
            ? "rounded-br-md bg-brand-600 text-white"
            : isBot
              ? "rounded-bl-md bg-white text-ink-900"
              : "rounded-bl-md bg-white text-ink-900"
        }`}
      >
        <div className="mb-1 flex items-center gap-1 text-[10px] opacity-70">
          {m.sender === "bot" ? <Bot size={10} /> : <UserRound size={10} />}
          {m.sender === "customer" ? "客户" : m.sender === "bot" ? "小源" : "客服"}
          <span className="ml-1">{formatTime(m.created_at)}</span>
        </div>
        <div className="whitespace-pre-wrap">{m.content}</div>
      </div>
    </div>
  );
}

function SimBubble({ m }: { m: Message }) {
  if (m.sender === "staff") {
    return (
      <div className="mb-1 flex justify-start">
        <div className="max-w-[90%] rounded-lg bg-white px-2 py-1 text-[11px] leading-5 shadow">
          <span className="text-[9px] text-sky-700">人工 </span>
          <span className="whitespace-pre-wrap">{m.content}</span>
        </div>
      </div>
    );
  }
  const mine = m.sender === "customer";
  return (
    <div className={`mb-1 flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[90%] rounded-lg px-2 py-1 text-[11px] leading-5 shadow ${
          mine ? "bg-wa-bubble" : "bg-white"
        }`}
      >
        <span className="whitespace-pre-wrap">{m.content}</span>
      </div>
    </div>
  );
}
