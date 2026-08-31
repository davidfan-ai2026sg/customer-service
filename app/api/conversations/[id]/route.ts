import { NextResponse } from "next/server";
import { getConversation, listMessages, markRead } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conv = getConversation(Number(id));
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
  markRead(conv.id);
  return NextResponse.json({ conversation: getConversation(conv.id), messages: listMessages(conv.id) });
}
