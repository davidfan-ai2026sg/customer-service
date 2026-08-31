import crypto from "node:crypto";

export function whatsappEnabled() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export function graphVersion() {
  return process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
}

export function verifyWebhookChallenge(params: {
  mode?: string | null;
  token?: string | null;
  challenge?: string | null;
}) {
  const expected = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expected) return null;
  if (params.mode === "subscribe" && params.token === expected) {
    return params.challenge ?? "";
  }
  return null;
}

export function verifySignature(rawBody: string, header: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true;
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const got = header.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got));
  } catch {
    return false;
  }
}

export async function sendWhatsAppText(to: string, body: string) {
  if (!whatsappEnabled()) {
    return { ok: false, skipped: true as const };
  }
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_TOKEN!;
  const url = `https://graph.facebook.com/${graphVersion()}/${phoneId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { preview_url: false, body },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, skipped: false as const, error: err.slice(0, 400) };
  }
  return { ok: true, skipped: false as const };
}

export type IncomingWa = { from: string; name: string; text: string };

export function parseIncomingPayload(json: unknown): IncomingWa[] {
  const out: IncomingWa[] = [];
  const root = json as {
    entry?: {
      changes?: {
        value?: {
          contacts?: { profile?: { name?: string }; wa_id?: string }[];
          messages?: { from?: string; type?: string; text?: { body?: string } }[];
        };
      }[];
    }[];
  };
  for (const entry of root.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const contacts = value?.contacts || [];
      for (const msg of value?.messages || []) {
        if (msg.type !== "text" || !msg.text?.body || !msg.from) continue;
        const contact = contacts.find((c) => c.wa_id === msg.from);
        out.push({
          from: msg.from,
          name: contact?.profile?.name || msg.from,
          text: msg.text.body,
        });
      }
    }
  }
  return out;
}
