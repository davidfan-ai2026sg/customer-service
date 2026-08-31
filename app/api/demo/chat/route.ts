import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { getOrCreateDemoConversation, processCustomerText } from "@/lib/pipeline";
import { listMessages } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = String(body.text || "").trim();
    const conv = getOrCreateDemoConversation();
    if (!text) {
      return NextResponse.json({ conversation: conv, messages: listMessages(conv.id), replies: [] });
    }
    const result = await processCustomerText({ conversationId: conv.id, text });
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e);
  }
}

export function GET() {
  try {
    const conv = getOrCreateDemoConversation();
    return NextResponse.json({ conversation: conv, messages: listMessages(conv.id) });
  } catch (e) {
    return jsonError(e);
  }
}
