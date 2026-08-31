export type Channel = "demo" | "whatsapp";

export type ConversationStatus = "bot" | "staff" | "waiting_staff";

export type Sender = "customer" | "bot" | "staff";

export type DeliveryType = "delivery" | "pickup";

export type OrderStatus =
  | "待确认"
  | "已确认"
  | "已发工厂"
  | "已完成"
  | "已取消";

export type OrderStep =
  | "product"
  | "qty"
  | "more"
  | "delivery"
  | "name"
  | "phone"
  | "address"
  | "notes"
  | "confirm";

export interface Settings {
  id: number;
  company_name: string;
  greeting: string;
  business_hours: string;
  factory_email: string;
  lead_time: string;
  delivery_info: string;
  pickup_info: string;
  payment_info: string;
  updated_at: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  unit: string;
  moq: number;
  description: string;
  in_stock: number;
  category: string;
  aliases: string;
  created_at: string;
  updated_at: string;
}

export interface Faq {
  id: number;
  keywords: string;
  question: string;
  answer: string;
}

export interface OrderItemDraft {
  productId: number;
  name: string;
  sku: string;
  unit: string;
  price: number;
  qty: number;
}

export interface BotOrderState {
  items: OrderItemDraft[];
  step: OrderStep;
  deliveryType?: DeliveryType;
  name?: string;
  phone?: string;
  address?: string;
  notes?: string;
  pendingProductId?: number;
}

export interface BotState {
  mode: "idle" | "ordering";
  order?: BotOrderState;
}

export interface Conversation {
  id: number;
  channel: Channel;
  customer_phone: string;
  customer_name: string;
  wa_id: string;
  status: ConversationStatus;
  bot_state: string;
  last_message_at: string;
  last_preview: string;
  unread: number;
  created_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: Sender;
  content: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_no: string;
  conversation_id: number | null;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address: string;
  notes: string;
  status: OrderStatus;
  factory_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  sku: string;
  unit: string;
  unit_price: number;
  qty: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  total: number;
}
