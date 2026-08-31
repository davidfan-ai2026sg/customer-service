import { NextResponse } from "next/server";
import { getOrCreateDemoConversation } from "@/lib/pipeline";
import { listConversations } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  getOrCreateDemoConversation();
  return NextResponse.json(listConversations());
}
