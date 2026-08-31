import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getSettings());
}

export async function PUT(req: Request) {
  const body = await req.json();
  const updated = updateSettings({
    company_name: String(body.company_name ?? ""),
    greeting: String(body.greeting ?? ""),
    business_hours: String(body.business_hours ?? ""),
    factory_email: String(body.factory_email ?? ""),
    lead_time: String(body.lead_time ?? ""),
    delivery_info: String(body.delivery_info ?? ""),
    pickup_info: String(body.pickup_info ?? ""),
    payment_info: String(body.payment_info ?? ""),
  });
  return NextResponse.json(updated);
}
