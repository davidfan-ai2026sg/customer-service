import { NextResponse } from "next/server";
import { addMessage, getConversation, setBotState, setConversationStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conv = getConversation(Number(id));
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
  setConversationStatus(conv.id, "bot");
  setBotState(conv.id, { mode: "idle" });
  addMessage(conv.id, "bot", "Hong is back on automatic replies.");
  return NextResponse.json({ ok: true, status: "bot" });
}
