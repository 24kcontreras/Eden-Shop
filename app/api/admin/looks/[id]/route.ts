import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const look = await prisma.look.update({
    where: { id },
    data: {
      name: body.name,
      productIds: body.productIds,
      price: body.price,
    },
  });
  return NextResponse.json(look);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.look.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
