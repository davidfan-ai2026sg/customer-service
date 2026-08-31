import { NextResponse } from "next/server";
import { getOrder, getSettings, markFactorySent } from "@/lib/db";
import { orderSheetHtml, orderSheetText } from "@/lib/order-sheet";
import { emailConfigured, sendFactoryEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = getOrder(Number(id));
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.status === "已取消") {
    return NextResponse.json({ error: "订单已取消，不能发给工厂" }, { status: 400 });
  }
  const order = markFactorySent(existing.id)!;
  const settings = getSettings();
  const text = orderSheetText(order, settings);
  const html = orderSheetHtml(order, settings);
  let email: { sent: boolean; via?: string; error?: string } = { sent: false, error: "未配置邮件" };
  if (emailConfigured()) {
    email = await sendFactoryEmail({
      to: settings.factory_email,
      subject: `【生产通知单】${order.order_no} ${order.customer_name}`,
      text,
      html,
    });
  }
  return NextResponse.json({
    order,
    sheetText: text,
    sheetHtml: html,
    email,
  });
}
