import { NextResponse } from "next/server";
import { addMessage, getConversation, setConversationStatus } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conv = getConversation(Number(id));
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
  setConversationStatus(conv.id, "staff");
  addMessage(conv.id, "staff", "（系统）同事已接管本会话，机器人暂停回复。");
  return NextResponse.json({ ok: true, status: "staff" });
}
