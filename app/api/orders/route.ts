import { NextResponse } from "next/server";
import { listOrders } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listOrders());
}
