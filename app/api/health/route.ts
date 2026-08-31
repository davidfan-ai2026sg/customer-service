import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { getSettings } from "@/lib/db";
import { whatsappEnabled } from "@/lib/whatsapp";
import { emailConfigured } from "@/lib/email";
import { llmEnabled } from "@/lib/llm";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json({
      ok: true,
      company: settings.company_name,
      whatsapp: whatsappEnabled(),
      email: emailConfigured(),
      llm: llmEnabled(),
    });
  } catch (e) {
    return jsonError(e);
  }
}
