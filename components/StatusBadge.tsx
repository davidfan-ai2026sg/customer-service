import type { ConversationStatus, OrderStatus } from "@/lib/types";

const ORDER_CLASS: Record<OrderStatus, string> = {
  Pending: "bg-amber-50 text-amber-800 ring-amber-200",
  Confirmed: "bg-sky-50 text-sky-800 ring-sky-200",
  "Sent to kitchen": "bg-violet-50 text-violet-800 ring-violet-200",
  Completed: "bg-brand-50 text-brand-800 ring-brand-200",
  Cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

const CONV_LABEL: Record<ConversationStatus, string> = {
  bot: "Hong",
  staff: "Taken over",
  waiting_staff: "Needs person",
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
