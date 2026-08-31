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

const ESCALATE = ["转人工", "人工", "找客服", "投诉", "退货", "退款", "经理", "骗子", "举报"];
const ORDER_START = ["下单", "订购", "购买", "采购", "要订", "下订单", "帮我订", "我要买", "我想买"];
const CANCEL = ["取消", "算了", "不要了下单", "停止下单"];
const YES = ["是", "对", "好", "要", "要的", "还有", "继续", "是的", "确认", "ok", "OK", "好的", "行"];
const NO_MORE = ["没有", "没有了", "就这些", "不用了", "不了", "否", "不要了", "没了", "就这样"];
const DELIVERY = ["配送", "快递", "送货", "物流", "冷链", "发货到"];
const PICKUP = ["自提", "到厂", "来拿", "工厂提货", "自己来"];
const GREET = ["你好", "您好", "在吗", "hi", "hello", "早上好", "下午好", "晚上好", "嗨"];
const CATALOG = ["产品", "目录", "菜单", "价目", "有什么", "商品", "报价单", "price list"];
const SKIP_NOTES = ["无", "没有", "跳过", "不用", "无备注", "没有备注"];

function norm(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, "");
}

function includesAny(text: string, words: string[]) {
  const t = text.trim();
  return words.some((w) => t.includes(w));
}

export function parseQty(text: string): number | null {
  const t = text.replace(/[，,]/g, " ").trim();
  const m = t.match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
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
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
      let score = 0;
      for (const n of names) {
        const nn = norm(n);
        if (!nn) continue;
        if (t === nn) score = Math.max(score, 100);
        else if (t.includes(nn)) score = Math.max(score, 80 + Math.min(nn.length, 10));
        else if (nn.includes(t) && t.length >= 2) score = Math.max(score, 50 + t.length);
      }
      return { p, score };
    })
    .filter((x) => x.score >= 50)
    .sort((a, b) => b.score - a.score);

  const top = scored[0]?.score ?? 0;
  if (top >= 80) return scored.filter((x) => x.score >= top - 5).map((x) => x.p);
  if (top >= 50) return scored.filter((x) => x.score >= 50).slice(0, 5).map((x) => x.p);

  if (/酱油/.test(raw)) return products.filter((p) => /酱油|生抽|老抽/.test(p.name + p.aliases));
  if (/饺子|水饺/.test(raw)) return products.filter((p) => /水饺/.test(p.name));
  return [];
}

function money(n: number) {
  return `¥${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export function formatProduct(p: Product) {
  const stock = p.in_stock ? "现货" : "暂无库存";
  return [
    `【${p.name}】`,
    `SKU：${p.sku}　分类：${p.category}`,
    `价格：${money(p.price)} / ${p.unit}　起订量：${p.moq} ${p.unit}`,
    `库存：${stock}`,
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
  const lines = ["这是味源食品当前可售目录（含税参考价）："];
  for (const [cat, items] of groups) {
    lines.push(`\n「${cat}」`);
    for (const p of items) {
      const stock = p.in_stock ? "" : "（缺货）";
      lines.push(
        `· ${p.name}  ${money(p.price)}/${p.unit}  起订 ${p.moq}${p.unit}  ${p.sku}${stock}`
      );
    }
  }
  lines.push("\n直接回复商品名可看详情，回复「下单」开始采购。");
  return lines.join("\n");
}

function cartText(order: BotOrderState) {
  if (!order.items.length) return "（购物车为空）";
  const lines = order.items.map(
    (i, idx) =>
      `${idx + 1}. ${i.name} × ${i.qty}${i.unit}　${money(i.price * i.qty)}`
  );
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  lines.push(`合计：${money(total)}`);
  return lines.join("\n");
}

function confirmText(order: BotOrderState) {
  const ship =
    order.deliveryType === "pickup"
      ? "工厂自提"
      : `配送　地址：${order.address || "（未填）"}`;
  return [
    "请确认订单信息：",
    cartText(order),
    `收货方式：${ship}`,
    `联系人：${order.name}　电话：${order.phone}`,
    `备注：${order.notes || "无"}`,
    "",
    "回复「确认」提交订单，回复「取消」放弃，回复「修改」重新选品。",
  ].join("\n");
}

function faqAnswer(text: string, settings: Settings): string | null {
  const t = text.trim();
  if (includesAny(t, ["营业时间", "上班", "几点", "开门", "工作时间", "值班"])) {
    return `我们的营业时间：${settings.business_hours}`;
  }
  const faqs = listFaqs();
  for (const f of faqs) {
    const keys = f.keywords.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    if (!keys.some((k) => t.includes(k))) continue;
    if (f.question === "交期") return `交期说明：${settings.lead_time}`;
    if (f.question === "配送") return `配送说明：${settings.delivery_info}`;
    if (f.question === "自提") return `自提说明：${settings.pickup_info}`;
    if (f.question === "付款") return `付款说明：${settings.payment_info}`;
    if (f.answer) return f.answer;
  }
  if (includesAny(t, ["交期", "货期", "多久发货", "交货"])) return `交期说明：${settings.lead_time}`;
  if (includesAny(t, ["运费", "配送", "物流", "冷链"])) return `配送说明：${settings.delivery_info}`;
  if (includesAny(t, ["自提", "工厂地址", "提货"])) return `自提说明：${settings.pickup_info}`;
  if (includesAny(t, ["付款", "转账", "账期", "月结"])) return `付款说明：${settings.payment_info}`;
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
      "已为您转接人工客服。工作时间内同事会尽快回复；您也可以在消息里补充公司名与需求。",
    ];
  }

  if (state.mode === "ordering" && state.order) {
    if (includesAny(trimmed, ["取消订单", "取消下单"]) || (state.order.step !== "more" && trimmed === "取消")) {
      setBotState(conversationId, idleBotState());
      return ["好的，已取消本次下单。需要时随时回复「下单」。"];
    }
    return continueOrder(conversationId, state.order, trimmed, products, settings);
  }

  if (includesAny(trimmed, CATALOG)) {
    return [formatCatalog(products.filter((p) => p.in_stock))];
  }

  const faq = faqAnswer(trimmed, settings);
  const hits = matchProducts(trimmed, products);
  const wantOrder = includesAny(trimmed, ORDER_START);
  const qtyInText = parseQty(trimmed);

  if (wantOrder || (hits.length === 1 && qtyInText && includesAny(trimmed, ["要", "订", "买", "来"]))) {
    return beginOrder(conversationId, trimmed, products, hits, qtyInText);
  }

  if (hits.length === 1) {
    const p = hits[0];
    const extra = faq ? `\n\n${faq}` : "";
    return [
      formatProduct(p) +
        extra +
        `\n\n交期：${settings.lead_time}\n回复「下单」或直接发数量（如「24」）即可采购。`,
    ];
  }

  if (hits.length > 1) {
    const list = hits.map((p) => `· ${p.name}　${money(p.price)}/${p.unit}　起订 ${p.moq}${p.unit}　${p.sku}`).join("\n");
    return [`找到多款相关商品：\n${list}\n\n请回复完整名称或 SKU。`];
  }

  if (faq) return [faq];

  if (includesAny(trimmed, GREET) || trimmed.length <= 2) {
    return [settings.greeting];
  }

  setConversationStatus(conversationId, "waiting_staff");
  return [
    "这个问题我还不太确定，已经帮您转给人工同事，避免给错信息。您可以再补充一下公司名称或具体需求。",
  ];
}

function beginOrder(
  conversationId: number,
  text: string,
  products: Product[],
  hits: Product[],
  qty: number | null
): string[] {
  setConversationStatus(conversationId, "bot");
  if (hits.length === 1) {
    const p = hits[0];
    if (!p.in_stock) {
      return [`抱歉，${p.name} 暂无库存。您可以回复「产品」看其他现货，或「转人工」咨询替代款。`];
    }
    if (qty && qty > 0) {
      if (qty < p.moq) {
        const state = startOrderState(p);
        setBotState(conversationId, state);
        return [
          `${p.name} 起订量为 ${p.moq} ${p.unit}，您刚才说的是 ${qty} ${p.unit}。请重新回复数量（≥ ${p.moq}）。`,
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
        `已加入：${p.name} × ${qty}${p.unit}。\n${cartText(order)}\n\n还要其他商品吗？回复「有」继续选品，回复「没有」进入收货信息。`,
      ];
    }
    setBotState(conversationId, startOrderState(p));
    return [
      `好的，准备订购【${p.name}】，${money(p.price)}/${p.unit}，起订 ${p.moq} ${p.unit}。\n请回复数量（数字即可）。`,
    ];
  }
  if (hits.length > 1) {
    setBotState(conversationId, startOrderState());
    const list = hits.map((p) => `· ${p.name}　${p.sku}`).join("\n");
    return [`请选择要订的具体商品：\n${list}`];
  }
  setBotState(conversationId, startOrderState());
  return ["好的，开始下单。请告诉我商品名称或 SKU（回复「产品」可看目录）。"];
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
        if (!p.in_stock) return [`${p.name} 暂无库存，请换一款，或回复「产品」查看目录。`];
        const qty = parseQty(text);
        if (qty) return addQty(conversationId, order, p, qty);
        save({ ...order, step: "qty", pendingProductId: p.id });
        return [`已选择【${p.name}】，起订 ${p.moq} ${p.unit}。请回复数量。`];
      }
      if (hits.length > 1) {
        return [`找到多款：\n${hits.map((p) => `· ${p.name}　${p.sku}`).join("\n")}\n请回复其中一款的全名或 SKU。`];
      }
      return ["没有匹配到商品。请回复名称 / SKU，或回复「产品」查看目录。"];
    }
    case "qty": {
      const p = products.find((x) => x.id === order.pendingProductId);
      if (!p) {
        save({ ...order, step: "product", pendingProductId: undefined });
        return ["商品信息丢失，请重新回复商品名称。"];
      }
      const qty = parseQty(text);
      if (!qty) return [`请回复一个数字数量（${p.name} 起订 ${p.moq} ${p.unit}）。`];
      return addQty(conversationId, order, p, qty);
    }
    case "more": {
      if (includesAny(text, NO_MORE) && !includesAny(text, ["还有"])) {
        save({ ...order, step: "delivery" });
        return [
          `好的。当前清单：\n${cartText(order)}\n\n请选择收货方式：回复「配送」或「自提」。\n配送：${settings.delivery_info}\n自提：${settings.pickup_info}`,
        ];
      }
      if (includesAny(text, YES) || includesAny(text, ["还有", "继续", "再来", "再订"])) {
        save({ ...order, step: "product", pendingProductId: undefined });
        return ["请告诉我下一款商品名称或 SKU。"];
      }
      const hits = matchProducts(text, products);
      if (hits.length === 1) {
        const p = hits[0];
        const qty = parseQty(text);
        if (qty) return addQty(conversationId, order, p, qty);
        save({ ...order, step: "qty", pendingProductId: p.id });
        return [`已选择【${p.name}】，请回复数量（起订 ${p.moq} ${p.unit}）。`];
      }
      return ["还要其他商品吗？回复「有」继续，或「没有 / 就这些」进入收货信息。也可以直接发下一款商品名。"];
    }
    case "delivery": {
      if (includesAny(text, PICKUP)) {
        save({ ...order, step: "name", deliveryType: "pickup" });
        return ["已选择工厂自提。请回复联系人姓名。"];
      }
      if (includesAny(text, DELIVERY) || text.includes("送")) {
        save({ ...order, step: "name", deliveryType: "delivery" });
        return ["已选择物流配送。请回复联系人姓名。"];
      }
      return ["请回复「配送」或「自提」。"];
    }
    case "name": {
      const name = text.replace(/姓名|名字|我叫/g, "").trim();
      if (name.length < 1 || name.length > 40) return ["请回复有效的联系人姓名。"];
      save({ ...order, step: "phone", name });
      return ["请回复手机号码（11 位）。"];
    }
    case "phone": {
      const digits = text.replace(/\D/g, "");
      const phone = digits.length === 13 && digits.startsWith("86") ? digits.slice(2) : digits;
      if (!/^1\d{10}$/.test(phone)) return ["请回复 11 位中国大陆手机号，例如 13800138000。"];
      updateCustomerProfile(conversationId, { customer_name: order.name, customer_phone: phone });
      if (order.deliveryType === "delivery") {
        save({ ...order, step: "address", phone });
        return ["请回复详细收货地址（省市区街道门牌）。"];
      }
      save({ ...order, step: "notes", phone });
      return ["如有备注请直接发送（送货时间、开票信息等）；没有请回复「无」。"];
    }
    case "address": {
      if (text.length < 6) return ["地址有点短，请补充省市区与门牌。"];
      save({ ...order, step: "notes", address: text });
      return ["如有备注请直接发送；没有请回复「无」。"];
    }
    case "notes": {
      const notes = includesAny(text, SKIP_NOTES) ? "" : text;
      const next = { ...order, notes, step: "confirm" as const };
      save(next);
      return [confirmText(next)];
    }
    case "confirm": {
      if (includesAny(text, ["修改", "改一下", "重来"])) {
        save({ ...order, step: "product", pendingProductId: undefined });
        return ["好的，请重新发送要订的商品。当前清单仍保留，新商品会追加。"];
      }
      if (includesAny(text, ["取消"])) {
        setBotState(conversationId, idleBotState());
        return ["已取消，未生成订单。"];
      }
      if (includesAny(text, ["确认", "是", "对", "提交", "没问题"])) {
        if (!order.items.length || !order.name || !order.phone || !order.deliveryType) {
          setBotState(conversationId, idleBotState());
          return ["订单信息不完整，已取消。请重新回复「下单」。"];
        }
        const created = createOrder({
          conversation_id: conversationId,
          customer_name: order.name,
          customer_phone: order.phone,
          delivery_type: order.deliveryType,
          address: order.deliveryType === "pickup" ? "工厂自提" : order.address || "",
          notes: order.notes || "",
          items: order.items,
        });
        updateCustomerProfile(conversationId, {
          customer_name: order.name,
          customer_phone: order.phone,
        });
        setBotState(conversationId, idleBotState());
        const ship =
          created.delivery_type === "pickup" ? "工厂自提" : `配送至 ${created.address}`;
        return [
          [
            `订单已提交，单号 ${created.order_no}，状态：待确认。`,
            cartText(order),
            ship,
            `联系人 ${created.customer_name} ${created.customer_phone}`,
            "工作人员确认后会安排排产与发货。如需修改请回复「转人工」。",
          ].join("\n"),
        ];
      }
      return ["请回复「确认」提交、「取消」放弃，或「修改」加商品。"];
    }
    default:
      setBotState(conversationId, idleBotState());
      return ["会话状态已重置，请重新回复「下单」或商品名。"];
  }
}

function addQty(conversationId: number, order: BotOrderState, p: Product, qty: number): string[] {
  if (!p.in_stock) {
    setBotState(conversationId, { mode: "ordering", order: { ...order, step: "product" } });
    return [`${p.name} 暂无库存，请换一款。`];
  }
  if (qty < p.moq) {
    setBotState(conversationId, {
      mode: "ordering",
      order: { ...order, step: "qty", pendingProductId: p.id },
    });
    return [`${p.name} 起订量为 ${p.moq} ${p.unit}，您回复的是 ${qty}。请重新输入数量。`];
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
    `已加入：${p.name} × ${qty}${p.unit}。\n${cartText(next)}\n\n还要其他商品吗？回复「有」或「没有」。`,
  ];
}

export function handleIncoming(conversationId: number, text: string, sender: "customer" = "customer") {
  addMessage(conversationId, sender, text);
  const replies = replyAsBot(conversationId, text);
  for (const r of replies) addMessage(conversationId, "bot", r);
  return replies;
}
