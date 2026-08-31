import { NextResponse } from "next/server";

export function jsonError(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  return NextResponse.json({ ok: false, error: message }, { status });
}
