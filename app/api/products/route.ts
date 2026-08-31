import { NextResponse } from "next/server";
import { createProduct, listProducts } from "@/lib/db";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(listProducts(true));
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
