import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const looks = await prisma.look.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(looks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const look = await prisma.look.create({
    data: {
      name: body.name ?? "Look sin nombre",
      productIds: body.productIds ?? [],
      price: body.price ?? 0,
    },
  });
  return NextResponse.json(look);
}
