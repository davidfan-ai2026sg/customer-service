import { NextResponse } from "next/server";
import { deleteProduct, getProduct, updateProduct } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const cur = getProduct(Number(id));
  if (!cur) return NextResponse.json({ error: "not found" }, { status: 404 });
  const updated = updateProduct(Number(id), {
    name: body.name ?? cur.name,
    sku: body.sku ?? cur.sku,
    price: body.price != null ? Number(body.price) : cur.price,
    unit: body.unit ?? cur.unit,
    moq: body.moq != null ? Number(body.moq) : cur.moq,
    description: body.description ?? cur.description,
    in_stock: body.in_stock != null ? (body.in_stock ? 1 : 0) : cur.in_stock,
    category: body.category ?? cur.category,
    aliases: body.aliases ?? cur.aliases,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  deleteProduct(Number(id));
  return NextResponse.json({ ok: true });
}
