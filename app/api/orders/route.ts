import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

interface OrderItemInput {
  productId: string;
  name: string;
  talla: string;
  qty: number;
  price: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: OrderItemInput[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "El pedido no tiene productos" }, { status: 400 });
  }
  const total = items.reduce((n, i) => n + i.price * i.qty, 0);
  const order = await prisma.order.create({
    data: { items: items as unknown as Prisma.InputJsonValue, total },
  });
  return NextResponse.json({ orderNumber: order.orderNumber, id: order.id });
}
