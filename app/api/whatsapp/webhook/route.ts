import { NextResponse } from "next/server";
import { getOrCreateWhatsAppConversation, processCustomerText } from "@/lib/pipeline";
import {
  parseIncomingPayload,
  verifySignature,
  verifyWebhookChallenge,
  whatsappEnabled,
} from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = verifyWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });
  if (challenge == null) {
    return new NextResponse("forbidden", { status: 403 });
  }
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifySignature(raw, sig)) {
    return NextResponse.json({ error: "bad signature" }, { status: 403 });
  }
  if (!whatsappEnabled()) {
    return NextResponse.json({ ok: true, ignored: "whatsapp not configured" });
  }
  let json: unknown = {};
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const incoming = parseIncomingPayload(json);
  const processed = [];
  for (const msg of incoming) {
    const conv = getOrCreateWhatsAppConversation(msg.from, msg.name);
    const result = await processCustomerText({
      conversationId: conv.id,
      text: msg.text,
      outboundWa: true,
    });
    processed.push({ from: msg.from, replies: result.replies });
  }
  return NextResponse.json({ ok: true, processed });
}
