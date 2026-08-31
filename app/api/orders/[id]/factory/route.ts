import { NextResponse } from "next/server";
import { getOrder, getSettings, markFactorySent } from "@/lib/db";
import { orderSheetHtml, orderSheetText } from "@/lib/order-sheet";
import { emailConfigured, sendFactoryEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const existing = getOrder(Number(id));
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.status === "Cancelled") {
    return NextResponse.json({ error: "Order is cancelled and cannot be sent to the kitchen" }, { status: 400 });
  }
  const order = markFactorySent(existing.id)!;
  const settings = getSettings();
  const text = orderSheetText(order, settings);
  const html = orderSheetHtml(order, settings);
  let email: { sent: boolean; via?: string; error?: string } = { sent: false, error: "Email is not configured" };
  if (emailConfigured()) {
    email = await sendFactoryEmail({
      to: settings.factory_email,
      subject: `Kitchen sheet ${order.order_no} ${order.customer_name}`,
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
