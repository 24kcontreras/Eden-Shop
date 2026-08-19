import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(products);
}
