import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      desc: body.desc,
      material: body.material,
      price: body.price,
      offerPrice: body.offerPrice,
      sizes: body.sizes,
      stock: body.stock,
      colors: body.colors,
      img: body.img,
      imgPos: body.imgPos,
      published: body.published,
    },
  });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
