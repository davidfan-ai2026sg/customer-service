import type { ConversationStatus, OrderStatus } from "@/lib/types";

const ORDER_CLASS: Record<OrderStatus, string> = {
  待确认: "bg-amber-50 text-amber-800 ring-amber-200",
  已确认: "bg-sky-50 text-sky-800 ring-sky-200",
  已发工厂: "bg-violet-50 text-violet-800 ring-violet-200",
  已完成: "bg-brand-50 text-brand-800 ring-brand-200",
  已取消: "bg-slate-100 text-slate-600 ring-slate-200",
};

const CONV_LABEL: Record<ConversationStatus, string> = {
  bot: "机器人",
  staff: "已接管",
  waiting_staff: "待人工",
};

const CONV_CLASS: Record<ConversationStatus, string> = {
  bot: "bg-brand-50 text-brand-800 ring-brand-200",
  staff: "bg-sky-50 text-sky-800 ring-sky-200",
  waiting_staff: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function OrderBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${ORDER_CLASS[status]}`}>
      {status}
    </span>
  );
}

export function ConvBadge({ status }: { status: ConversationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${CONV_CLASS[status]}`}>
      {CONV_LABEL[status]}
    </span>
  );
}
