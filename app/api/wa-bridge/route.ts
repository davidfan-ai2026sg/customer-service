import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Thin Meta → Hong pipe only (not the CS brain).
 * GET: Meta hub.verify challenge
 * POST: forward raw body to Hong's Grok Bot webhook routine
 */

function metaVerifyToken() {
  return (
    process.env.WA_BRIDGE_VERIFY_TOKEN?.trim() ||
    process.env.WHATSAPP_VERIFY_TOKEN?.trim() ||
    ""
  );
}

function hongWebhookUrl() {
  return process.env.HONG_WEBHOOK_URL?.trim() || "";
}

function hongWebhookKey() {
  return process.env.HONG_WEBHOOK_KEY?.trim() || "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = metaVerifyToken();

  if (mode === "subscribe" && expected && token === expected && challenge != null) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const target = hongWebhookUrl();
  const key = hongWebhookKey();
  if (!target || !key) {
    return NextResponse.json(
      { error: "bridge not configured (HONG_WEBHOOK_URL / HONG_WEBHOOK_KEY)" },
      { status: 503 }
    );
  }

  const raw = await req.text();
  const headers: Record<string, string> = {
    "Content-Type": req.headers.get("content-type") || "application/json",
    Authorization: `Bearer ${key}`,
  };
  const sig = req.headers.get("x-hub-signature-256");
  if (sig) headers["x-hub-signature-256"] = sig;

  try {
    const res = await fetch(target, {
      method: "POST",
      headers,
      body: raw,
    });
    const text = await res.text().catch(() => "");
    // Always ack Meta quickly; include forward status for debugging
    return NextResponse.json(
      {
        ok: res.ok,
        forwarded_status: res.status,
        forwarded_body: text.slice(0, 200),
      },
      { status: res.ok ? 200 : 502 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "forward failed" },
      { status: 502 }
    );
  }
}
