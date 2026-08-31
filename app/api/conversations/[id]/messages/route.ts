import { NextResponse } from "next/server";
import { getConversation } from "@/lib/db";
import { staffReply } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const conv = getConversation(Number(id));
  if (!conv) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json();
  const text = String(body.content || body.text || "").trim();
  if (!text) return NextResponse.json({ error: "empty" }, { status: 400 });
  const messages = await staffReply(conv.id, text);
  return NextResponse.json({ messages });
}
