import { NextResponse } from "next/server";
import { getOrCreateDemoConversation, processCustomerText } from "@/lib/pipeline";
import { listMessages } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  const conv = getOrCreateDemoConversation();
  if (!text) {
    return NextResponse.json({ conversation: conv, messages: listMessages(conv.id), replies: [] });
  }
  const result = await processCustomerText({ conversationId: conv.id, text });
  return NextResponse.json(result);
}

export function GET() {
  const conv = getOrCreateDemoConversation();
  return NextResponse.json({ conversation: conv, messages: listMessages(conv.id) });
}
