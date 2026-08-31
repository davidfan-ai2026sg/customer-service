import { listProducts, getSettings } from "./db";

export function llmEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function maybePolishReply(userText: string, draft: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return draft;

  const settings = getSettings();
  const products = listProducts(true)
    .slice(0, 20)
    .map((p) => `${p.name}(${p.sku}) ${p.price}/${p.unit} MOQ${p.moq}`)
    .join("；");

  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `你是${settings.company_name}的客服小源。用简体中文，语气礼貌简洁。不要编造价格或库存。可售商品：${products}。交期：${settings.lead_time}`,
          },
          {
            role: "user",
            content: `客户说：${userText}\n\n请在不改变事实（价格、数量、单号、起订量）的前提下润色下面回复，保持原有信息：\n${draft}`,
          },
        ],
      }),
    });
    if (!res.ok) return draft;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || draft;
  } catch {
    return draft;
  }
}
