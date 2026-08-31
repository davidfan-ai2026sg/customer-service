import {
  addMessage,
  createOrder,
  getConversation,
  getSettings,
  listFaqs,
  listProducts,
  parseBotState,
  setBotState,
  setConversationStatus,
  updateCustomerProfile,
} from "./db";
import type { BotOrderState, BotState, Product, Settings } from "./types";

const ESCALATE = [
  "human",
  "staff",
  "agent",
  "person",
  "operator",
  "refund",
  "complaint",
  "manager",
  "speak to someone",
  "talk to someone",
  "real person",
];
const ORDER_START = [
  "place an order",
  "place order",
  "i want to order",
  "i'd like to order",
  "id like to order",
  "i want to buy",
  "order now",
  "buy now",
  "checkout",
];
const CANCEL = ["cancel order", "stop ordering", "never mind", "forget it"];
const YES = ["yes", "yeah", "yep", "sure", "ok", "okay", "more", "another", "add more"];
const NO_MORE = [
  "no",
  "nope",
  "that's all",
  "thats all",
  "nothing else",
  "no more",
  "done",
  "that's it",
  "thats it",
];
const DELIVERY = ["delivery", "deliver", "ship", "courier", "send to"];
const PICKUP = ["collect", "pickup", "pick up", "self collect", "collection"];
const GREET = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
const CATALOG = ["menu", "catalogue", "catalog", "products", "price list", "what do you have", "what have you got"];
const SKIP_NOTES = ["none", "no", "nothing", "skip", "na", "n/a", "no notes"];
const CONFIRM = ["confirm", "yes", "submit", "looks good", "that's right", "thats right", "ok", "okay"];
const MIN_ORDER = 50;

function norm(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

function includesAny(text: string, words: string[]) {
  const t = text.trim().toLowerCase();
  return words.some((w) => {
    const w2 = w.toLowerCase();
    if (w2.length <= 3) {
      return new RegExp(`(?:^|\\b)${escapeRe(w2)}(?:\\b|$)`, "i").test(t);
    }
    return t.includes(w2);
  });
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGreet(text: string) {
  const t = text.trim().toLowerCase().replace(/[!?.,]/g, "");
  return GREET.some((g) => t === g || t.startsWith(g + " ")) || t.length <= 2;
}

export function parseQty(text: string): number | null {
  const t = text.replace(/[，,]/g, " ").trim();
  const m = t.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function parseSgPhone(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  let local = "";
  if (digits.length === 8 && /^[689]/.test(digits)) local = digits;
  else if (digits.length === 10 && digits.startsWith("65") && /^[689]/.test(digits.slice(2))) {
    local = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("065") && /^[689]/.test(digits.slice(3))) {
    local = digits.slice(3);
  } else {
    return null;
  }
  if (!/^[689]\d{7}$/.test(local)) return null;
  return `+65 ${local}`;
}

export function matchProducts(text: string, products: Product[]): Product[] {
  const raw = text.trim();
  const t = norm(text);
  if (!t) return [];

  const skuHit = products.filter((p) => t.includes(norm(p.sku)));
  if (skuHit.length) return skuHit;

  const scored = products
    .map((p) => {
      const names = [p.name, p.sku, p.category, p.aliases]
        .join(",")
        .split(/[,，|]/)
        .map((s) => s.trim())
        .filter(Boolean);
      let score = 0;
      for (const n of names) {
        const nn = norm(n);
        if (!nn) continue;
        if (t === nn) score = Math.max(score, 100);
        else if (t.includes(nn)) score = Math.max(score, 80 + Math.min(nn.length, 10));
        else if (nn.includes(t) && t.length >= 4) score = Math.max(score, 50 + t.length);
      }
      return { p, score };
    })
    .filter((x) => x.score >= 50)
    .sort((a, b) => b.score - a.score);

  const top = scored[0]?.score ?? 0;
  if (top >= 80) return scored.filter((x) => x.score >= top - 5).map((x) => x.p);
  if (top >= 50) return scored.filter((x) => x.score >= 50).slice(0, 5).map((x) => x.p);

  if (/shrimp\s*fries|prawn\s*cracker/i.test(raw)) {
    return products.filter((p) => /shrimp fries/i.test(p.name));
  }
  if (/belinjau|belinjo|emping/i.test(raw)) {
    return products.filter((p) => /belinjau|emping|belinjo/i.test(p.name + p.aliases));
  }
  return [];
}

function money(n: number) {
  return `S$${n.toFixed(2)}`;
}

function soldOutHint(p: Product): string {
  const n = p.name.toLowerCase();
  if (n.includes("spring blossom")) {
    return "The Prosperity Mix is in stock at S$128.00 if you would like a gift set.";
  }
  if (n.includes("almond butter") || n.includes("cashew butter")) {
    return "Handmade Melty Kuih Bangkit is in stock at S$28.00.";
  }
  if (n.includes("mini") && n.includes("refill")) {
    return "The Mini Traditional Shrimp Keropok tin is still available.";
  }
  return "Reply MENU to see what is in stock.";
}

export function formatProduct(p: Product) {
  const stock = p.in_stock ? "In stock" : "Sold out";
  return [
    `${p.name}`,
    `SKU: ${p.sku}  |  ${p.category}`,
    `Price: ${money(p.price)} / ${p.unit}  (min ${p.moq} ${p.unit})`,
    `Stock: ${stock}`,
    p.description,
  ].join("\n");
}

function formatCatalog(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const arr = groups.get(p.category) || [];
    arr.push(p);
    groups.set(p.category, arr);
  }
  const lines = ["Aunty Hong catalogue (SGD, inclusive of GST where applicable):"];
  for (const [cat, items] of groups) {
    lines.push(`\n${cat}`);
    for (const p of items) {
      const stock = p.in_stock ? "" : " [sold out]";
      lines.push(`- ${p.name}  ${money(p.price)}/${p.unit}  ${p.sku}${stock}`);
    }
  }
  lines.push("\nReply with a product name for details, or say PLACE AN ORDER to start.");
  lines.push("Online minimum is S$50.");
  return lines.join("\n");
}

function cartTotal(order: BotOrderState) {
  return order.items.reduce((s, i) => s + i.price * i.qty, 0);
}

function cartText(order: BotOrderState) {
  if (!order.items.length) return "(cart is empty)";
  const lines = order.items.map(
    (i, idx) => `${idx + 1}. ${i.name} x ${i.qty} ${i.unit}  ${money(i.price * i.qty)}`
  );
  lines.push(`Total: ${money(cartTotal(order))}`);
  return lines.join("\n");
}

function confirmText(order: BotOrderState) {
  const ship =
    order.deliveryType === "pickup"
      ? "Collection by arrangement (Aljunied kitchen, not a walk-in shop)"
      : `Delivery  address: ${order.address || "(missing)"}`;
  const lines = [
    "Please confirm this order:",
    cartText(order),
    `Fulfilment: ${ship}`,
    `Contact: ${order.name}  ${order.phone}`,
    `Notes: ${order.notes || "none"}`,
    "",
    "Reply CONFIRM to submit, CANCEL to drop it, or CHANGE to add items.",
  ];
  if (cartTotal(order) < MIN_ORDER) {
    lines.splice(
      2,
      0,
      `Note: website minimum is S$50. This cart is ${money(cartTotal(order))}. You can still confirm and we will follow up.`
    );
  }
  return lines.join("\n");
}

function faqAnswer(text: string, settings: Settings): string | null {
  const t = text.trim().toLowerCase();
  if (includesAny(t, ["hours", "open", "opening", "close", "closing"])) {
    return `Our hours: ${settings.business_hours}`;
  }
  const faqs = listFaqs();
  for (const f of faqs) {
    const keys = f.keywords.split(/[,，]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (!keys.some((k) => t.includes(k))) continue;
    if (f.question === "hours") return `Our hours: ${settings.business_hours}`;
    if (f.question === "lead time") return `Lead time: ${settings.lead_time}`;
    if (f.question === "delivery") return `Delivery: ${settings.delivery_info}`;
    if (f.question === "pickup") return `Collection: ${settings.pickup_info}`;
    if (f.question === "payment") return `Payment: ${settings.payment_info}`;
    if (f.answer) return f.answer;
  }
  if (includesAny(t, ["lead time", "how long", "when will it arrive", "shipping time"])) {
    return `Lead time: ${settings.lead_time}`;
  }
  if (includesAny(t, ["delivery", "shipping", "courier", "postage"])) {
    return `Delivery: ${settings.delivery_info}`;
  }
  if (includesAny(t, ["pickup", "collect", "walk-in", "walk in", "aljunied"])) {
    return `Collection: ${settings.pickup_info}`;
  }
  if (includesAny(t, ["paynow", "payment", "pay", "bank transfer"])) {
    return `Payment: ${settings.payment_info}`;
  }
  return null;
}

function idleBotState(): BotState {
  return { mode: "idle" };
}

function startOrderState(pending?: Product): BotState {
  return {
    mode: "ordering",
    order: {
      items: [],
      step: pending ? "qty" : "product",
      pendingProductId: pending?.id,
    },
  };
}

export function replyAsBot(conversationId: number, text: string): string[] {
  const conv = getConversation(conversationId);
  if (!conv) return [];
  if (conv.status === "staff") return [];

  const settings = getSettings();
  const products = listProducts(true);
  const state = parseBotState(conv.bot_state);
  const trimmed = text.trim();

  if (includesAny(trimmed, ESCALATE)) {
    setConversationStatus(conversationId, "waiting_staff");
    setBotState(conversationId, idleBotState());
    return [
      "I am handing this to a teammate. During business hours someone will reply on WhatsApp. You can also write to +65 9638 1788.",
    ];
  }

  if (state.mode === "ordering" && state.order) {
    if (
      includesAny(trimmed, CANCEL) ||
      (state.order.step !== "more" && state.order.step !== "confirm" && /^cancel$/i.test(trimmed))
    ) {
      setBotState(conversationId, idleBotState());
      return ["Okay, this order is cancelled. Say PLACE AN ORDER whenever you are ready."];
    }
    return continueOrder(conversationId, state.order, trimmed, products, settings);
  }

  if (includesAny(trimmed, CATALOG)) {
    return [formatCatalog(products.filter((p) => p.in_stock))];
  }

  const faq = faqAnswer(trimmed, settings);
  const hits = matchProducts(trimmed, products);
  const wantOrder =
    includesAny(trimmed, ORDER_START) ||
    (hits.length === 1 && Boolean(parseQty(trimmed)) && /\b(want|order|buy|get|take)\b/i.test(trimmed));
  const qtyInText = parseQty(trimmed);

  if (wantOrder) {
    return beginOrder(conversationId, trimmed, products, hits, qtyInText);
  }

  if (hits.length === 1) {
    const p = hits[0];
    const extra = faq ? `\n\n${faq}` : "";
    const sold = p.in_stock
      ? `\n\nLead time: ${settings.lead_time}\nSay PLACE AN ORDER, or reply with a quantity (e.g. 3). Online minimum is S$50.`
      : `\n\nThis item is sold out. ${soldOutHint(p)}`;
    return [formatProduct(p) + extra + sold];
  }

  if (hits.length > 1) {
    const list = hits
      .map((p) => `- ${p.name}  ${money(p.price)}/${p.unit}  ${p.sku}${p.in_stock ? "" : " [sold out]"}`)
      .join("\n");
    return [`A few matches:\n${list}\n\nReply with the full name or SKU.`];
  }

  if (faq) return [faq];

  if (isGreet(trimmed)) {
    return [settings.greeting];
  }

  setConversationStatus(conversationId, "waiting_staff");
  return [
    "I am not sure I have the right answer, so I have flagged this for a teammate rather than guess. You can also WhatsApp +65 9638 1788.",
  ];
}

function beginOrder(
  conversationId: number,
  _text: string,
  products: Product[],
  hits: Product[],
  qty: number | null
): string[] {
  setConversationStatus(conversationId, "bot");
  if (hits.length === 1) {
    const p = hits[0];
    if (!p.in_stock) {
      return [`Sorry, ${p.name} is sold out. ${soldOutHint(p)}`];
    }
    if (qty && qty > 0) {
      if (qty < p.moq) {
        const state = startOrderState(p);
        setBotState(conversationId, state);
        return [
          `${p.name} has a minimum of ${p.moq} ${p.unit}. You said ${qty}. Please send a new quantity.`,
        ];
      }
      const order: BotOrderState = {
        items: [
          {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            unit: p.unit,
            price: p.price,
            qty,
          },
        ],
        step: "more",
      };
      setBotState(conversationId, { mode: "ordering", order });
      return [
        `Added: ${p.name} x ${qty} ${p.unit}.\n${cartText(order)}\n\nAnything else? Reply YES to add more, or NO to continue.`,
      ];
    }
    setBotState(conversationId, startOrderState(p));
    return [
      `Great, ${p.name} at ${money(p.price)} / ${p.unit}. How many ${p.unit}s would you like?`,
    ];
  }
  if (hits.length > 1) {
    setBotState(conversationId, startOrderState());
    const list = hits.map((p) => `- ${p.name}  ${p.sku}`).join("\n");
    return [`Which one would you like?\n${list}`];
  }
  setBotState(conversationId, startOrderState());
  return ["Sure, let's start an order. Tell me the product name or SKU (or reply MENU)."];
}

function continueOrder(
  conversationId: number,
  order: BotOrderState,
  text: string,
  products: Product[],
  settings: Settings
): string[] {
  const save = (next: BotOrderState) => setBotState(conversationId, { mode: "ordering", order: next });

  switch (order.step) {
    case "product": {
      if (includesAny(text, CATALOG)) return [formatCatalog(products.filter((p) => p.in_stock))];
      const hits = matchProducts(text, products);
      if (hits.length === 1) {
        const p = hits[0];
        if (!p.in_stock) return [`${p.name} is sold out. ${soldOutHint(p)}`];
        const qty = parseQty(text);
        if (qty) return addQty(conversationId, order, p, qty);
        save({ ...order, step: "qty", pendingProductId: p.id });
        return [`${p.name} it is. How many ${p.unit}s?`];
      }
      if (hits.length > 1) {
        return [`A few matches:\n${hits.map((p) => `- ${p.name}  ${p.sku}`).join("\n")}\nReply with the full name or SKU.`];
      }
      return ["I could not match that. Send a product name or SKU, or reply MENU."];
    }
    case "qty": {
      const p = products.find((x) => x.id === order.pendingProductId);
      if (!p) {
        save({ ...order, step: "product", pendingProductId: undefined });
        return ["I lost that product. Please send the name again."];
      }
      const qty = parseQty(text);
      if (!qty) return [`Please send a number (how many ${p.unit}s of ${p.name}).`];
      return addQty(conversationId, order, p, qty);
    }
    case "more": {
      if (includesAny(text, NO_MORE)) {
        save({ ...order, step: "delivery" });
        const warn =
          cartTotal(order) < MIN_ORDER
            ? `\nOnline minimum is S$50; this cart is ${money(cartTotal(order))}. You can still continue.`
            : "";
        return [
          `Got it.\n${cartText(order)}${warn}\n\nDelivery or collection? Reply DELIVERY or COLLECT.\nDelivery: ${settings.delivery_info}\nCollection: ${settings.pickup_info}`,
        ];
      }
      if (includesAny(text, YES)) {
        save({ ...order, step: "product", pendingProductId: undefined });
        return ["What is the next product name or SKU?"];
      }
      const hits = matchProducts(text, products);
      if (hits.length === 1) {
        const p = hits[0];
        const qty = parseQty(text);
        if (qty) return addQty(conversationId, order, p, qty);
        save({ ...order, step: "qty", pendingProductId: p.id });
        return [`${p.name}. How many ${p.unit}s?`];
      }
      return ["Anything else? Reply YES to add more, or NO to continue. You can also send another product name."];
    }
    case "delivery": {
      if (includesAny(text, PICKUP)) {
        save({ ...order, step: "name", deliveryType: "pickup" });
        return [
          "Collection at 1005 Aljunied Ave 5 #01-42, by arrangement only (not a walk-in shop). What is the contact name?",
        ];
      }
      if (includesAny(text, DELIVERY)) {
        save({ ...order, step: "name", deliveryType: "delivery" });
        return ["Islandwide delivery. What is the contact name?"];
      }
      return ["Please reply DELIVERY or COLLECT."];
    }
    case "name": {
      const name = text.replace(/^(i am|i'm|im|name is|this is)\s+/i, "").trim();
      if (name.length < 2 || name.length > 40) return ["Please send a contact name."];
      save({ ...order, step: "phone", name });
      return ["Singapore mobile number please (8 digits, or +65)."];
    }
    case "phone": {
      const phone = parseSgPhone(text);
      if (!phone) return ["Please send a Singapore number, e.g. +65 9123 4567."];
      updateCustomerProfile(conversationId, { customer_name: order.name, customer_phone: phone });
      if (order.deliveryType === "delivery") {
        save({ ...order, step: "address", phone });
        return ["Delivery address in Singapore, including unit number if any."];
      }
      save({ ...order, step: "notes", phone });
      return ["Any notes (timing, gift message)? If none, reply NONE."];
    }
    case "address": {
      if (text.length < 6) return ["That address looks short. Please include street and unit."];
      save({ ...order, step: "notes", address: text });
      return ["Any notes? If none, reply NONE."];
    }
    case "notes": {
      const notes = includesAny(text, SKIP_NOTES) ? "" : text;
      const next = { ...order, notes, step: "confirm" as const };
      save(next);
      return [confirmText(next)];
    }
    case "confirm": {
      if (includesAny(text, ["change", "edit", "modify", "add"])) {
        save({ ...order, step: "product", pendingProductId: undefined });
        return ["Okay, send the next product. The current cart stays."];
      }
      if (includesAny(text, ["cancel"])) {
        setBotState(conversationId, idleBotState());
        return ["Cancelled. No order was created."];
      }
      if (includesAny(text, CONFIRM)) {
        if (!order.items.length || !order.name || !order.phone || !order.deliveryType) {
          setBotState(conversationId, idleBotState());
          return ["That order was incomplete, so I cancelled it. Say PLACE AN ORDER to start again."];
        }
        const created = createOrder({
          conversation_id: conversationId,
          customer_name: order.name,
          customer_phone: order.phone,
          delivery_type: order.deliveryType,
          address:
            order.deliveryType === "pickup"
              ? "Collection by arrangement, 1005 Aljunied Ave 5 #01-42"
              : order.address || "",
          notes: order.notes || "",
          items: order.items,
        });
        updateCustomerProfile(conversationId, {
          customer_name: order.name,
          customer_phone: order.phone,
        });
        setBotState(conversationId, idleBotState());
        const ship =
          created.delivery_type === "pickup"
            ? "Collection by arrangement"
            : `Delivery to ${created.address}`;
        return [
          [
            `Order submitted. Number ${created.order_no}. Status: Pending.`,
            cartText(order),
            ship,
            `Contact ${created.customer_name} ${created.customer_phone}`,
            "The kitchen will confirm packing and delivery. Reply HUMAN if you need to change anything.",
          ].join("\n"),
        ];
      }
      return ["Reply CONFIRM to submit, CANCEL to drop it, or CHANGE to add items."];
    }
    default:
      setBotState(conversationId, idleBotState());
      return ["I reset that chat. Say PLACE AN ORDER or a product name."];
  }
}

function addQty(conversationId: number, order: BotOrderState, p: Product, qty: number): string[] {
  if (!p.in_stock) {
    setBotState(conversationId, { mode: "ordering", order: { ...order, step: "product" } });
    return [`${p.name} is sold out. ${soldOutHint(p)}`];
  }
  if (qty < p.moq) {
    setBotState(conversationId, {
      mode: "ordering",
      order: { ...order, step: "qty", pendingProductId: p.id },
    });
    return [`${p.name} minimum is ${p.moq} ${p.unit}. You sent ${qty}. Please send a new quantity.`];
  }
  const items = order.items.filter((i) => i.productId !== p.id);
  const existing = order.items.find((i) => i.productId === p.id);
  items.push({
    productId: p.id,
    name: p.name,
    sku: p.sku,
    unit: p.unit,
    price: p.price,
    qty: (existing?.qty || 0) + qty,
  });
  const next: BotOrderState = { ...order, items, step: "more", pendingProductId: undefined };
  setBotState(conversationId, { mode: "ordering", order: next });
  return [
    `Added: ${p.name} x ${qty} ${p.unit}.\n${cartText(next)}\n\nAnything else? Reply YES or NO.`,
  ];
}

export function handleIncoming(conversationId: number, text: string, sender: "customer" = "customer") {
  addMessage(conversationId, sender, text);
  const replies = replyAsBot(conversationId, text);
  for (const r of replies) addMessage(conversationId, "bot", r);
  return replies;
}
