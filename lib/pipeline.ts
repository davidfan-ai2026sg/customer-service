import { maybePolishReply } from "./llm";
import { handleIncoming, replyAsBot } from "./bot";
import {
  addMessage,
  createConversation,
  findConversationByWaId,
  findDemoConversation,
  getConversation,
  getDb,
  listMessages,
} from "./db";
import { sendWhatsAppText, whatsappEnabled } from "./whatsapp";

export async function processCustomerText(opts: {
  conversationId: number;
  text: string;
  outboundWa?: boolean;
}) {
  const conv = getConversation(opts.conversationId);
  if (!conv) throw new Error("conversation not found");
  addMessage(opts.conversationId, "customer", opts.text);
  const drafts = replyAsBot(opts.conversationId, opts.text);
  const replies: string[] = [];
  for (const draft of drafts) {
    const text = await maybePolishReply(opts.text, draft);
    addMessage(opts.conversationId, "bot", text);
    replies.push(text);
    if (opts.outboundWa && conv.channel === "whatsapp" && conv.wa_id && whatsappEnabled()) {
      await sendWhatsAppText(conv.wa_id, text);
    }
  }
  return {
    conversation: getConversation(opts.conversationId),
    messages: listMessages(opts.conversationId),
    replies,
  };
}

export function getOrCreateDemoConversation() {
  return findDemoConversation();
}

export function getOrCreateWhatsAppConversation(waId: string, name: string) {
  const existing = findConversationByWaId(waId);
  if (existing) return existing;
  const id = createConversation(getDb(), {
    channel: "whatsapp",
    customer_name: name || waId,
    customer_phone: waId,
    wa_id: waId,
  });
  return getConversation(id)!;
}

export async function staffReply(conversationId: number, text: string) {
  addMessage(conversationId, "staff", text);
  const conv = getConversation(conversationId);
  if (conv?.channel === "whatsapp" && conv.wa_id && whatsappEnabled()) {
    await sendWhatsAppText(conv.wa_id, text);
  }
  return listMessages(conversationId);
}

/** Direct pipeline used by unit-style happy path (no LLM, no WhatsApp). */
export function processDeterministic(conversationId: number, text: string) {
  return handleIncoming(conversationId, text);
}
