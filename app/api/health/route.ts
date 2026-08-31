import { NextResponse } from "next/server";
import { getSettings } from "@/lib/db";
import { whatsappEnabled } from "@/lib/whatsapp";
import { emailConfigured } from "@/lib/email";
import { llmEnabled } from "@/lib/llm";

export const dynamic = "force-dynamic";

export function GET() {
  const settings = getSettings();
  return NextResponse.json({
    ok: true,
    company: settings.company_name,
    whatsapp: whatsappEnabled(),
    email: emailConfigured(),
    llm: llmEnabled(),
  });
}
