import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const product = await prisma.product.create({
    data: {
      name: body.name ?? "Prenda sin nombre",
      desc: body.desc ?? "",
      material: body.material ?? "",
      price: body.price ?? 0,
      offerPrice: body.offerPrice ?? null,
      sizes: body.sizes ?? [],
      stock: body.stock ?? {},
      colors: body.colors ?? [],
      img: body.img ?? "",
      imgPos: body.imgPos ?? "center 40%",
      published: body.published ?? true,
    },
  });
  return NextResponse.json(product);
}
