import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-error";
import { createProduct, listProducts } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    return NextResponse.json(listProducts(true));
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  try {
    const product = createProduct({
      name: String(body.name),
      sku: String(body.sku),
      price: Number(body.price),
      unit: String(body.unit || "tin"),
      moq: Number(body.moq || 1),
      description: String(body.description || ""),
      in_stock: body.in_stock ? 1 : 0,
      category: String(body.category || "Other"),
      aliases: String(body.aliases || ""),
    });
    return NextResponse.json(product);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}
