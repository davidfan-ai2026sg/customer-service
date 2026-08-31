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
    .join("; ");

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
            content: `You are Hong, customer-service bot for ${settings.company_name}. Reply in English, polite and concise. Do not invent prices or stock. Catalogue: ${products}. Lead time: ${settings.lead_time}`,
          },
          {
            role: "user",
            content: `The customer said: ${userText}\n\nPolish the reply below without changing facts (prices, quantities, order numbers, minimums). Keep every original fact:\n${draft}`,
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
