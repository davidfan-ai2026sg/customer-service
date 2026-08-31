import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DEFAULT_SETTINGS, FAQS, PRODUCTS } from "./seed";
import type {
  BotState,
  Conversation,
  ConversationStatus,
  Faq,
  Message,
  Order,
  OrderItem,
  OrderStatus,
  OrderWithItems,
  Product,
  Sender,
  Settings,
} from "./types";

const globalForDb = globalThis as unknown as {
  auntyHongDb?: Database.Database;
};

export function dbPath() {
  const raw = process.env.DATABASE_PATH || "data/app.db";
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function migrate(db: Database.Database) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      greeting TEXT NOT NULL,
      business_hours TEXT NOT NULL,
      factory_email TEXT NOT NULL,
      lead_time TEXT NOT NULL DEFAULT '',
      delivery_info TEXT NOT NULL DEFAULT '',
      pickup_info TEXT NOT NULL DEFAULT '',
      payment_info TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      moq INTEGER NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      in_stock INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT '',
      aliases TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keywords TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL DEFAULT 'demo',
      customer_phone TEXT NOT NULL DEFAULT '',
      customer_name TEXT NOT NULL DEFAULT '',
      wa_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'bot',
      bot_state TEXT NOT NULL DEFAULT '{"mode":"idle"}',
      last_message_at TEXT NOT NULL,
      last_preview TEXT NOT NULL DEFAULT '',
      unread INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      conversation_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      delivery_type TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      factory_sent_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      sku TEXT NOT NULL,
      unit TEXT NOT NULL,
      unit_price REAL NOT NULL,
      qty INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);
}

function seed(db: Database.Database) {
  const now = nowIso();
  const settingsCount = db.prepare("SELECT COUNT(*) AS c FROM settings").get() as { c: number };
  if (settingsCount.c === 0) {
    db.prepare(
      `INSERT INTO settings (id, company_name, greeting, business_hours, factory_email, lead_time, delivery_info, pickup_info, payment_info, updated_at)
       VALUES (1, @company_name, @greeting, @business_hours, @factory_email, @lead_time, @delivery_info, @pickup_info, @payment_info, @updated_at)`
    ).run({ ...DEFAULT_SETTINGS, updated_at: now });
  }

  const productCount = db.prepare("SELECT COUNT(*) AS c FROM products").get() as { c: number };
  if (productCount.c === 0) {
    const ins = db.prepare(
      `INSERT INTO products (name, sku, price, unit, moq, description, in_stock, category, aliases, created_at, updated_at)
       VALUES (@name, @sku, @price, @unit, @moq, @description, @in_stock, @category, @aliases, @now, @now)`
    );
    const tx = db.transaction(() => {
      for (const p of PRODUCTS) ins.run({ ...p, now });
    });
    tx();
  }

  const faqCount = db.prepare("SELECT COUNT(*) AS c FROM faqs").get() as { c: number };
  if (faqCount.c === 0) {
    const ins = db.prepare(
      `INSERT INTO faqs (keywords, question, answer) VALUES (@keywords, @question, @answer)`
    );
    for (const f of FAQS) ins.run(f);
  }

  const convCount = db.prepare("SELECT COUNT(*) AS c FROM conversations").get() as { c: number };
  if (convCount.c === 0) {
    const demoId = createConversation(db, {
      channel: "demo",
      customer_name: "Demo customer (simulator)",
      customer_phone: "+65 9000 0000",
      wa_id: "demo",
    });
    insertMessage(
      db,
      demoId,
      "bot",
      DEFAULT_SETTINGS.greeting
    );

    const histId = createConversation(db, {
      channel: "whatsapp",
      customer_name: "Priya Tan",
      customer_phone: "+65 9123 4567",
      wa_id: "6591234567",
    });
    insertMessage(db, histId, "customer", "Hi, how much are the shrimp fries?");
    insertMessage(
      db,
      histId,
      "bot",
      "Shrimp Fries | Prawn Crackers — Original - Golden Aunty Hong Tin is S$22.00 / tin. SKU SQ0179319. In stock. Online minimum is S$50."
    );
    insertMessage(db, histId, "customer", "3 gold tins, delivery to Marina Boulevard please.");
    insertMessage(db, histId, "staff", "Order noted. Kitchen will pack this week; we will confirm delivery.");
    db.prepare("UPDATE conversations SET status = 'staff', unread = 0 WHERE id = ?").run(histId);

    const orderNo = "AH20260828001";
    const orderNow = "2026-08-28T10:12:00.000+08:00";
    const info = db
      .prepare(
        `INSERT INTO orders (order_no, conversation_id, customer_name, customer_phone, delivery_type, address, notes, status, factory_sent_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'delivery', ?, 'Weekday delivery please', 'Completed', ?, ?, ?)`
      )
      .run(
        orderNo,
        histId,
        "Priya Tan",
        "+65 9123 4567",
        "12 Marina Boulevard, Singapore 018982",
        orderNow,
        orderNow,
        orderNow
      );
    const oid = Number(info.lastInsertRowid);
    db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, sku, unit, unit_price, qty)
       VALUES (?, (SELECT id FROM products WHERE sku = 'SQ0179319'), 'Shrimp Fries | Prawn Crackers — Original - Golden Aunty Hong Tin', 'SQ0179319', 'tin', 22, 3)`
    ).run(oid);
  }
}

export function nowIso() {
  return new Date().toISOString();
}

export function getDb(): Database.Database {
  if (globalForDb.auntyHongDb) return globalForDb.auntyHongDb;
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  migrate(db);
  seed(db);
  globalForDb.auntyHongDb = db;
  return db;
}

export function resetDbForTests() {
  if (globalForDb.auntyHongDb) {
    try {
      globalForDb.auntyHongDb.close();
    } catch {
      /* ignore */
    }
    globalForDb.auntyHongDb = undefined;
  }
  const file = dbPath();
  for (const ext of ["", "-wal", "-shm"]) {
    try {
      fs.unlinkSync(file + ext);
    } catch {
      /* ignore */
    }
  }
  return getDb();
}

export function getSettings(): Settings {
  return getDb().prepare("SELECT * FROM settings WHERE id = 1").get() as Settings;
}

export function updateSettings(patch: Partial<Settings>) {
  const cur = getSettings();
  const next = { ...cur, ...patch, id: 1, updated_at: nowIso() };
  getDb()
    .prepare(
      `UPDATE settings SET company_name=@company_name, greeting=@greeting, business_hours=@business_hours,
       factory_email=@factory_email, lead_time=@lead_time, delivery_info=@delivery_info,
       pickup_info=@pickup_info, payment_info=@payment_info, updated_at=@updated_at WHERE id=1`
    )
    .run(next);
  return getSettings();
}

export function listProducts(includeOut = true): Product[] {
  const sql = includeOut
    ? "SELECT * FROM products ORDER BY category, id"
    : "SELECT * FROM products WHERE in_stock = 1 ORDER BY category, id";
  return getDb().prepare(sql).all() as Product[];
}

export function getProduct(id: number): Product | undefined {
  return getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as Product | undefined;
}

export function createProduct(input: Omit<Product, "id" | "created_at" | "updated_at">) {
  const now = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO products (name, sku, price, unit, moq, description, in_stock, category, aliases, created_at, updated_at)
       VALUES (@name, @sku, @price, @unit, @moq, @description, @in_stock, @category, @aliases, @now, @now)`
    )
    .run({ ...input, now });
  return getProduct(Number(info.lastInsertRowid))!;
}

export function updateProduct(id: number, input: Partial<Product>) {
  const cur = getProduct(id);
  if (!cur) return undefined;
  const next = { ...cur, ...input, id, updated_at: nowIso() };
  getDb()
    .prepare(
      `UPDATE products SET name=@name, sku=@sku, price=@price, unit=@unit, moq=@moq, description=@description,
       in_stock=@in_stock, category=@category, aliases=@aliases, updated_at=@updated_at WHERE id=@id`
    )
    .run(next);
  return getProduct(id);
}

export function deleteProduct(id: number) {
  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
}

export function listFaqs(): Faq[] {
  return getDb().prepare("SELECT * FROM faqs").all() as Faq[];
}

export function listConversations(): Conversation[] {
  return getDb()
    .prepare("SELECT * FROM conversations ORDER BY last_message_at DESC")
    .all() as Conversation[];
}

export function getConversation(id: number): Conversation | undefined {
  return getDb().prepare("SELECT * FROM conversations WHERE id = ?").get(id) as
    | Conversation
    | undefined;
}

export function findConversationByWaId(waId: string): Conversation | undefined {
  return getDb().prepare("SELECT * FROM conversations WHERE wa_id = ?").get(waId) as
    | Conversation
    | undefined;
}

export function findDemoConversation(): Conversation {
  const existing = getDb()
    .prepare("SELECT * FROM conversations WHERE channel = 'demo' ORDER BY id ASC LIMIT 1")
    .get() as Conversation | undefined;
  if (existing) return existing;
  const id = createConversation(getDb(), {
    channel: "demo",
    customer_name: "Demo customer (simulator)",
    customer_phone: "+65 9000 0000",
    wa_id: "demo",
  });
  return getConversation(id)!;
}

export function createConversation(
  db: Database.Database,
  input: {
    channel: string;
    customer_name: string;
    customer_phone: string;
    wa_id: string;
  }
) {
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO conversations (channel, customer_phone, customer_name, wa_id, status, bot_state, last_message_at, last_preview, unread, created_at)
       VALUES (@channel, @customer_phone, @customer_name, @wa_id, 'bot', '{"mode":"idle"}', @now, '', 0, @now)`
    )
    .run({ ...input, now });
  return Number(info.lastInsertRowid);
}

export function insertMessage(db: Database.Database, conversationId: number, sender: Sender, content: string) {
  const now = nowIso();
  const info = db
    .prepare(
      `INSERT INTO messages (conversation_id, sender, content, created_at) VALUES (?, ?, ?, ?)`
    )
    .run(conversationId, sender, content, now);
  const unreadInc = sender === "customer" ? 1 : 0;
  db.prepare(
    `UPDATE conversations SET last_message_at = ?, last_preview = ?, unread = unread + ? WHERE id = ?`
  ).run(now, content.slice(0, 80), unreadInc, conversationId);
  return Number(info.lastInsertRowid);
}

export function addMessage(conversationId: number, sender: Sender, content: string) {
  return insertMessage(getDb(), conversationId, sender, content);
}

export function listMessages(conversationId: number): Message[] {
  return getDb()
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY id ASC")
    .all(conversationId) as Message[];
}

export function markRead(conversationId: number) {
  getDb().prepare("UPDATE conversations SET unread = 0 WHERE id = ?").run(conversationId);
}

export function setConversationStatus(id: number, status: ConversationStatus) {
  getDb().prepare("UPDATE conversations SET status = ? WHERE id = ?").run(status, id);
}

export function setBotState(id: number, state: BotState) {
  getDb().prepare("UPDATE conversations SET bot_state = ? WHERE id = ?").run(JSON.stringify(state), id);
}

export function parseBotState(raw: string): BotState {
  try {
    const v = JSON.parse(raw) as BotState;
    if (v && (v.mode === "idle" || v.mode === "ordering")) return v;
  } catch {
    /* ignore */
  }
  return { mode: "idle" };
}

export function updateCustomerProfile(
  id: number,
  patch: { customer_name?: string; customer_phone?: string }
) {
  const cur = getConversation(id);
  if (!cur) return;
  getDb()
    .prepare("UPDATE conversations SET customer_name = ?, customer_phone = ? WHERE id = ?")
    .run(patch.customer_name ?? cur.customer_name, patch.customer_phone ?? cur.customer_phone, id);
}

export function listOrders(): OrderWithItems[] {
  const orders = getDb().prepare("SELECT * FROM orders ORDER BY id DESC").all() as Order[];
  return orders.map(hydrateOrder);
}

export function getOrder(id: number): OrderWithItems | undefined {
  const order = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as Order | undefined;
  return order ? hydrateOrder(order) : undefined;
}

export function getOrderByNo(orderNo: string): OrderWithItems | undefined {
  const order = getDb().prepare("SELECT * FROM orders WHERE order_no = ?").get(orderNo) as
    | Order
    | undefined;
  return order ? hydrateOrder(order) : undefined;
}

function hydrateOrder(order: Order): OrderWithItems {
  const items = getDb()
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(order.id) as OrderItem[];
  const total = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  return { ...order, items, total };
}

export function nextOrderNo() {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const prefix = `AH${day}`;
  const row = getDb()
    .prepare("SELECT order_no FROM orders WHERE order_no LIKE ? ORDER BY order_no DESC LIMIT 1")
    .get(`${prefix}%`) as { order_no: string } | undefined;
  const seq = row ? Number(row.order_no.slice(-3)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export function createOrder(input: {
  conversation_id: number | null;
  customer_name: string;
  customer_phone: string;
  delivery_type: "delivery" | "pickup";
  address: string;
  notes: string;
  items: {
    productId: number;
    name: string;
    sku: string;
    unit: string;
    price: number;
    qty: number;
  }[];
}): OrderWithItems {
  const db = getDb();
  const now = nowIso();
  const orderNo = nextOrderNo();
  const tx = db.transaction(() => {
    const info = db
      .prepare(
         `INSERT INTO orders (order_no, conversation_id, customer_name, customer_phone, delivery_type, address, notes, status, created_at, updated_at)
         VALUES (@order_no, @conversation_id, @customer_name, @customer_phone, @delivery_type, @address, @notes, 'Pending', @now, @now)`
      )
      .run({
        order_no: orderNo,
        conversation_id: input.conversation_id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        delivery_type: input.delivery_type,
        address: input.address,
        notes: input.notes,
        now,
      });
    const id = Number(info.lastInsertRowid);
    const ins = db.prepare(
      `INSERT INTO order_items (order_id, product_id, product_name, sku, unit, unit_price, qty)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const it of input.items) {
      ins.run(id, it.productId, it.name, it.sku, it.unit, it.price, it.qty);
    }
    return id;
  });
  const id = tx();
  return getOrder(id)!;
}

export function updateOrderStatus(id: number, status: OrderStatus) {
  getDb()
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, nowIso(), id);
  return getOrder(id);
}

export function markFactorySent(id: number) {
  const now = nowIso();
  getDb()
    .prepare("UPDATE orders SET status = 'Sent to kitchen', factory_sent_at = ?, updated_at = ? WHERE id = ?")
    .run(now, now, id);
  return getOrder(id);
}
